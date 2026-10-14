
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser.");
  }

  if (Notification.permission === "denied") {
    throw new Error(
      "Notifications are blocked. Enable them in your browser settings."
    );
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Please allow notifications for LifeLoop.");
  }

  const registration = await navigator.serviceWorker.ready;

  const keyResponse = await fetch(`${API_BASE}/api/push/public-key`);

  if (!keyResponse.ok) {
    throw new Error("Could not retrieve the VAPID public key from the backend.");
  }

  const { publicKey } = await keyResponse.json();

  if (!publicKey) {
    throw new Error("The backend returned no VAPID public key.");
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to save subscription: ${details}`);
  }

  return "LifeLoop notifications enabled successfully!";
}

export async function sendTestPushNotification() {
  const response = await fetch(`${API_BASE}/api/push/test`, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.detail || "Could not send the test notification."
    );
  }

  if (!result.sent || result.sent < 1) {
    throw new Error(
      `No notification was delivered. Failed: ${result.failed ?? "unknown"}.`
    );
  }

  return `Test notification sent! Devices reached: ${result.sent}.`;
}
