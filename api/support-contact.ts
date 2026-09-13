import { requireEnv } from "./_lib/env.js";
import { jsonResponse, readJson } from "./_lib/http.js";

/* ==========================================================
   HEADER 001
   StreamSafe support form email endpoint
   ========================================================== */

type SupportContactPayload = {
  name?: unknown;
  email?: unknown;
  issueType?: unknown;
  version?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

const supportRecipient = "inquiry@onetimelabs.net";

function textValue(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ==========================================================
   HEADER 002
   POST /api/support-contact
   ========================================================== */

export async function POST(request: Request) {
  try {
    const payload = await readJson<SupportContactPayload>(request);

    const name = textValue(payload.name, 120);
    const email = textValue(payload.email, 200);
    const issueType = textValue(payload.issueType, 80);
    const version = textValue(payload.version, 40);
    const subject = textValue(payload.subject, 180);
    const message = textValue(payload.message, 5000);
    const website = textValue(payload.website, 200);

    // Honeypot submissions are accepted silently so bots do not learn
    // that the field is being used as a spam filter.
    if (website) {
      return jsonResponse({ ok: true });
    }

    if (!name || !email || !issueType || !subject || !message) {
      return jsonResponse(
        { error: "Please complete all required fields." },
        400,
      );
    }

    if (!looksLikeEmail(email)) {
      return jsonResponse(
        { error: "Please enter a valid email address." },
        400,
      );
    }

    const resendApiKey = requireEnv("RESEND_API_KEY");
    const from = requireEnv("SUPPORT_FROM_EMAIL");

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeIssueType = escapeHtml(issueType);
    const safeVersion = escapeHtml(version || "Not provided");
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

    const emailSubject = `[StreamSafe Support] ${subject}`;

    const plainText = [
      "StreamSafe Support Request",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Issue type: ${issueType}`,
      `StreamSafe version: ${version || "Not provided"}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
      "",
      "Sent from store.onetimelabs.net/support",
    ].join("\n");

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.5;max-width:720px">
        <h2 style="margin:0 0 18px">StreamSafe Support Request</h2>
        <table style="border-collapse:collapse;width:100%;margin-bottom:22px">
          <tbody>
            <tr><td style="padding:6px 12px 6px 0;font-weight:700">Name</td><td style="padding:6px 0">${safeName}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;font-weight:700">Email</td><td style="padding:6px 0">${safeEmail}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;font-weight:700">Issue type</td><td style="padding:6px 0">${safeIssueType}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;font-weight:700">Version</td><td style="padding:6px 0">${safeVersion}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;font-weight:700">Subject</td><td style="padding:6px 0">${safeSubject}</td></tr>
          </tbody>
        </table>
        <div style="border-top:1px solid #dbe3ec;padding-top:18px">
          <strong>Message</strong>
          <p style="margin:8px 0 0">${safeMessage}</p>
        </div>
        <p style="margin:24px 0 0;color:#6d7889;font-size:12px">
          Sent from store.onetimelabs.net/support
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [supportRecipient],
        reply_to: email,
        subject: emailSubject,
        text: plainText,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Support email delivery failed:", body);
      return jsonResponse(
        { error: "Unable to send your message right now. Please try again." },
        502,
      );
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        error:
          error instanceof Error &&
          (error.message.includes("RESEND_API_KEY") ||
            error.message.includes("SUPPORT_FROM_EMAIL"))
            ? "Support email is not configured yet."
            : "Unable to send your message right now. Please try again.",
      },
      500,
    );
  }
}
