
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

INDIA_TZ = ZoneInfo("Asia/Kolkata")


def extract_memory(raw_text: str) -> dict:
    """Extract memory details and reminder dates from natural language."""

    text = raw_text.strip()
    lowered = text.lower()
    now = datetime.now(INDIA_TZ)

    result = {
        "raw_text": text,
        "title": re.sub(r"\s+", " ", text).strip()[:200],
        "category": "other",
        "person_name": None,
        "item_name": None,
        "amount": None,
        "due_at": None,
        "location": None,
    }

    reminder_requested = bool(
        re.search(r"\bremind(?:er)?\b", lowered)
    )

    relative_match = re.search(
        r"\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)\b",
        lowered,
    )

    due = None

    if reminder_requested and relative_match:
        count = int(relative_match.group(1))
        unit = relative_match.group(2)

        if unit.startswith(("minute", "min")):
            delta = timedelta(minutes=count)
        elif unit.startswith(("hour", "hr")):
            delta = timedelta(hours=count)
        elif unit.startswith("day"):
            delta = timedelta(days=count)
        else:
            delta = timedelta(weeks=count)

        due = now + delta

    elif reminder_requested and "tomorrow" in lowered:
        due = (now + timedelta(days=1)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )

    elif reminder_requested and "next week" in lowered:
        due = (now + timedelta(days=7)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )

    elif reminder_requested and "today" in lowered:
        due = now.replace(
            hour=18, minute=0, second=0, microsecond=0
        )
        if due <= now:
            due = now + timedelta(minutes=2)

    # Store reminder timestamps in UTC for production database consistency.
    if due is not None:
        result["due_at"] = due.astimezone(timezone.utc)

    # Extract a person's name.
    person_patterns = [
        r"\b(?:lent|gave to|give to)\s+([A-Z][a-z]+)\b",
        r"\b([A-Z][a-z]+)\s+owes me\b",
        r"\bborrowed from\s+([A-Z][a-z]+)\b",
    ]

    for pattern in person_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["person_name"] = match.group(1)
            break

    # Extract common monetary formats.
    amount_pattern = (
        r"(?:₹|rs\.?\s*)"
        r"(\d+(?:,\d{3})*(?:\.\d{1,2})?)"
        r"|"
        r"(\d+(?:,\d{3})*(?:\.\d{1,2})?)"
        r"\s*(?:rupees|rs\.?)"
    )

    amount_match = re.search(amount_pattern, text, re.IGNORECASE)

    if amount_match:
        amount_text = next(
            group
            for group in amount_match.groups()
            if group is not None
        )
        result["amount"] = float(amount_text.replace(",", ""))

    # Extract items from notes such as:
    # "I lent Rahul my calculator yesterday."
    item_match = re.search(
        r"\blent\s+[A-Z][a-z]+\s+my\s+(.+?)"
        r"(?=\s+(?:yesterday|today|tomorrow|next week|last week)\b|[.!?,]|$)",
        text,
        re.IGNORECASE,
    )

    if item_match:
        result["item_name"] = item_match.group(1).strip()
        result["category"] = "item"
    elif result["amount"] is not None or "owes me" in lowered:
        result["category"] = "money"
    elif "promise" in lowered or "promised" in lowered:
        result["category"] = "promise"
    elif " at " in lowered or " near " in lowered:
        result["category"] = "place"
    elif result["person_name"]:
        result["category"] = "people"

    # Create clearer titles when possible.
    if result["person_name"] and result["item_name"]:
        result["title"] = (
            f"Collect {result['item_name']} from "
            f"{result['person_name']}"
        )[:200]

    elif result["person_name"] and result["amount"] is not None:
        result["title"] = (
            f"Money involving {result['person_name']}: "
            f"{result['amount']:g}"
        )[:200]

    return result
