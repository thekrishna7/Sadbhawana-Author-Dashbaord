export async function sendNotification(params: {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, any> | null;
}) {
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Failed to send notification via API:", errData.error);
      return { ok: false, error: errData.error };
    }

    return await res.json();
  } catch (err: any) {
    console.error("Network error sending notification:", err);
    return { ok: false, error: err?.message || "Network error" };
  }
}
