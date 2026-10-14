
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

INDIA_TZ = ZoneInfo("Asia/Kolkata")


def extract_memory(raw_text: str) -> dict:
    """Extract memory details and reminder dates from natural language."""

    text = raw_text.strip()
    lowered = text.lower()
    now = datetime.now(INDIA_TZ)

    result = {
        "raw_text": text,
        "title": text[:200],
        "category": "other",
        "person_name": None,
        "item_name": None,
        "amount": None,
        "due_at": None,
        "location": None,
    }

    # Recognize reminders such as:
    # "Remind me in 2 minutes"
    # "Send me a reminder in 1 hour"
    # "Remind me to call Rahul in 3 days"
    reminder_requested = bool(
        re.search(r"\bremind(?:er)?\b", lowered)
    )

    relative_match = re.search(
        r"\bin\s+(\d+)\s*"
        r"(minutes?|mins?|hours?|hrs?|days?|weeks?)\b",
        lowered,
    )

    if reminder_requested and relative_match:
        amount = int(relative_match.group(1))
        unit = relative_match.group(2)

        if unit.startswith(("minute", "min")):
            delta = timedelta(minutes=amount)
        elif unit.startswith(("hour", "hr")):
            delta = timedelta(hours=amount)
        elif unit.startswith("day"):
            delta = timedelta(days=amount)
        else:
            delta = timedelta(weeks=amount)

        # Store local India time as a naive datetime for compatibility
        # with databases that store local datetimes without timezone info.
        result["due_at"] = (now + delta).replace(tzinfo=None)

    # Recognize common calendar reminders.
    elif reminder_requested and "tomorrow" in lowered:
        result["due_at"] = (
            (now + timedelta(days=1))
            .replace(hour=10, minute=0, second=0, microsecond=0)
            .replace(tzinfo=None)
        )

    elif reminder_requested and "next week" in lowered:
        result["due_at"] = (
            (now + timedelta(days=7))
            .replace(hour=10, minute=0, second=0, microsecond=0)
            .replace(tzinfo=None)
        )

    elif reminder_requested and "today" in lowered:
        due = now.replace(hour=18, minute=0, second=0, microsecond=0)

        if due <= now:
            due = now + timedelta(minutes=2)

        result["due_at"] = due.replace(tzinfo=None)

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

    # Extract amounts such as ₹500, Rs. 500, or 500 rupees.
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
            group for group in amount_match.groups()
            if group is not None
        )
        result["amount"] = float(amount_text.replace(",", ""))

    # Extract an item from "I lent Rahul my calculator".
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

    # Create clearer titles where possible.
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
