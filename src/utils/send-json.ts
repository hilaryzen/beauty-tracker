export type SendResult = { ok: true; data: unknown } | { ok: false; message: string };

const notSaved = "Your change was not saved.";

/**
 * Sends one JSON request. On success, returns the parsed response body (undefined if it has none);
 * on failure, the message to show: the server's `error`, or a generic "not saved" message.
 */
// @spec PROD-SAVE-011, PROD-SAVE-012, PROD-SAVE-014, PURCH-SAVE-007, PURCH-SAVE-008, PURCH-SAVE-009
export async function sendJson(url: string, method: "POST" | "PUT", body: unknown): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: notSaved };
  }
  const parsed = await response.json().catch(() => undefined);
  if (response.ok) return { ok: true, data: parsed };
  const message = typeof parsed?.error === "string" && parsed.error !== "" ? parsed.error : notSaved;
  return { ok: false, message };
}
