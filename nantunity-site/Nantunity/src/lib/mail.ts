/**
 * Envoi d'e-mails transactionnels via l'API Resend (https://resend.com).
 * Sans clé configurée : en mode démo, les e-mails sont affichés dans la console du serveur.
 */
import { env } from "./env";
import { escapeHtml } from "./security";

type Mail = { to: string[]; subject: string; html: string; text: string; replyTo?: string; ics?: string };

export async function sendMail(m: Mail): Promise<boolean> {
  const e = env();
  if (!e.mailReady) {
    if (e.demo) console.info(`\n[DEMO MAIL] → ${m.to.join(", ")}\n${m.subject}\n${m.text}\n`);
    else console.warn("[mail] RESEND_API_KEY / MAIL_FROM non configurés : e-mail non envoyé.");
    return e.demo;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.mail.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: e.mail.from,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      ...(m.ics ? { attachments: [{ filename: "rendez-vous-nantunity.ics", content: Buffer.from(m.ics).toString("base64"), content_type: "text/calendar; charset=utf-8" }] } : {}),
    }),
  });
  if (!res.ok) console.error(`[mail] Resend ${res.status}: ${await res.text()}`);
  return res.ok;
}

/** Gabarit HTML aux couleurs de Nant'Unity (compatible clients mail : tableaux + styles en ligne) */
export function layout(title: string, bodyHtml: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f2ec;font-family:Helvetica,Arial,sans-serif;color:#161513">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b0b0b;padding:28px 32px">
  <div style="font-family:Georgia,serif;font-size:22px;color:#ffbb54;line-height:1">Nant’</div>
  <div style="font-family:Impact,'Arial Narrow',sans-serif;font-size:40px;letter-spacing:1px;color:#ffbb54;line-height:1">UNITY</div>
</td></tr>
<tr><td style="height:6px;font-size:0;line-height:0;background:linear-gradient(90deg,#374a9a 0 25%,#293e14 25% 50%,#5e100b 50% 75%,#4d93d6 75%)">&nbsp;</td></tr>
<tr><td style="padding:32px">
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2">${escapeHtml(title)}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;background:#f5f2ec;font-size:12px;color:#5f5b54;line-height:1.5">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export const rows = (pairs: [string, string][]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">${pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #ebe8e2;color:#5f5b54;font-size:13px;width:38%;vertical-align:top">${escapeHtml(k)}</td><td style="padding:8px 0;border-bottom:1px solid #ebe8e2;font-size:14px;font-weight:bold">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;

export const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#ffbb54;color:#0b0b0b;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:999px;font-size:14px;letter-spacing:.5px">${escapeHtml(label)}</a></p>`;

/** Fichier iCalendar (.ics) pour ajouter le rendez-vous à son agenda */
export function ics(o: { uid: string; start: string; end: string; title: string; description: string; cancel?: boolean; sequence?: number }) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nant'Unity//Rendez-vous//FR", `METHOD:${o.cancel ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT", `UID:${o.uid}@nantunity`, `SEQUENCE:${o.sequence ?? 0}`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(o.start)}`, `DTEND:${f(o.end)}`, `SUMMARY:${esc(o.title)}`, `DESCRIPTION:${esc(o.description)}`,
    `STATUS:${o.cancel ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
