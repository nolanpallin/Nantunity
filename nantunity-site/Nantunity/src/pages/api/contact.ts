/** POST /api/contact → envoie la demande de projet à l'équipe + accusé de réception au visiteur */
import type { APIRoute } from "astro";
import { env } from "../../lib/env";
import { json, rateLimited, readJson, sameOrigin, str, EMAIL_RE, escapeHtml } from "../../lib/security";
import { sendMail, layout, rows } from "../../lib/mail";
import { emails } from "../../i18n/emails";
import { site } from "../../data/site";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const e = env();
  // Sans service d'e-mail ni équipe à prévenir, le navigateur bascule sur l'envoi par messagerie (mailto)
  if (!(e.mailReady && e.mail.team.length) && !e.demo) return json({ error: "not_configured" }, 503);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (rateLimited(`ct:${clientAddress}`, 5, 600_000)) return json({ error: "rate" }, 429);

  const body = await readJson(request);
  if (!body) return json({ error: "invalid" }, 400);
  if (body.website) return json({ ok: true });

  const d = {
    name: str(body.name, 120, true),
    email: str(body.email, 160, true),
    organisation: str(body.organisation, 160),
    phone: str(body.phone, 40),
    profile: str(body.profile, 60),
    deadline: str(body.deadline, 60),
    poles: str(body.poles, 300),
    message: str(body.message, 5000, true),
  };
  const lang = body.lang === "en" ? "en" : "fr";
  const bad = Object.entries(d).filter(([, v]) => v === null).map(([k]) => k);
  if (d.email && !EMAIL_RE.test(d.email)) bad.push("email");
  if (body.consent !== true) bad.push("consent");
  if (bad.length) return json({ error: "invalid", fields: bad }, 400);

  const F = emails.fr;
  const details: [string, string][] = [
    [F.name, d.name!], [F.email, d.email!], [F.organisation, d.organisation!], [F.phone, d.phone!],
    [F.profile, d.profile!], [F.poles, d.poles!], [F.deadline, d.deadline!], [F.message, d.message!],
  ];
  const teamOk = await sendMail({
    to: e.mail.team.length ? e.mail.team : [site.contact.email],
    subject: `[Site] ${F.teamContact} — ${d.name}`,
    html: layout(F.teamContact, rows(details), "Message envoyé depuis le formulaire de contact du site Nant’Unity."),
    text: details.map(([k, v]) => `${k} : ${v}`).join("\n"),
    replyTo: d.email!,
  });
  if (!teamOk) return json({ error: "server" }, 502);

  const L = emails[lang];
  await sendMail({
    to: [d.email!],
    subject: L.contactSubject,
    html: layout(L.contactTitle, `<p style="font-size:15px;line-height:1.6">${escapeHtml(L.contactIntro(d.name!))}</p>${rows([[L.message, d.message!]])}`, escapeHtml(L.footer)),
    text: `${L.contactIntro(d.name!)}\n\n${d.message}`,
    replyTo: site.contact.email,
  });
  return json({ ok: true });
};
