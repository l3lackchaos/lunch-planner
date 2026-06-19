// Server-only module (reads a secret + calls LINE). Do not import from client code.

/**
 * LINE Messaging API push notifications to individual Members (T5.4).
 *
 * Best-effort and INERT by default: if LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not
 * configured, every function is a no-op so the app runs without a Messaging API
 * channel. Failures never throw into the caller (notifications must not break the
 * core flow). Group auto-posting of the menu is intentionally NOT done here —
 * that stays manual (ADR / decision in 05-task-plan T5.4).
 */

const PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

function token(): string | null {
  return process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || null;
}

/** True when push notifications are configured. */
export function notificationsEnabled(): boolean {
  return token() !== null;
}

/** Low-level push of up to 5 text messages to one LINE userId. No-op if unconfigured. */
export async function pushText(lineUserId: string | null, ...texts: string[]): Promise<void> {
  const accessToken = token();
  if (!accessToken || !lineUserId || texts.length === 0) return;

  try {
    await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: texts.slice(0, 5).map((text) => ({ type: "text", text })),
      }),
    });
  } catch {
    // Swallow — notifications are best-effort and must not break the caller.
  }
}

// ── Domain events ────────────────────────────────────────────────────────────

export function notifyPaymentConfirmed(lineUserId: string | null, amount: number): Promise<void> {
  return pushText(lineUserId, `✅ ยืนยันการชำระเงินแล้ว ${amount.toLocaleString("th-TH")} บาท ขอบคุณค่ะ`);
}

export function notifyPaymentRejected(lineUserId: string | null, reason: string): Promise<void> {
  return pushText(
    lineUserId,
    `❌ การชำระเงินถูกปฏิเสธ\nเหตุผล: ${reason}\nกรุณาแจ้งชำระอีกครั้งในแอปนะคะ`,
  );
}

export function notifyOrderOpen(lineUserId: string | null, weekLabel: string): Promise<void> {
  return pushText(lineUserId, `📢 เปิดรับสั่งอาหารสัปดาห์ ${weekLabel} แล้ว แตะเปิดแอปเพื่อสั่งได้เลยค่ะ`);
}
