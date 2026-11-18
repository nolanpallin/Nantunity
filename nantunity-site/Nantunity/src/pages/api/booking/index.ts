/** POST /api/booking → crée un rendez-vous (JSON) */
import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { json, rateLimited, readJson, sameOrigin, str, EMAIL_RE } from "../../../lib/security";
import { createBooking, sendBookingRequest, BookingError } from "../../../lib/booking/service";
import { bookingTypeIds } from "../../../data/booking";
import { publicOrigin } from "../../../lib/origin";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const e = env();
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (rateLimited(`book:${clientAddress}`, 8, 3600_000)) return json({ error: "rate" }, 429);

  const body = await readJson(request);
  if (!body) return json({ error: "invalid" }, 400);
  if (body.website) return json({ ok: true }); // champ piège anti-robots rempli : on ignore silencieusement

  const data = {
    type: str(body.type, 40, true),
    firstName: str(body.firstName, 80, true),
    lastName: str(body.lastName, 80, true),
    email: str(body.email, 160, true),
    company: str(body.company, 160),
    subject: str(body.subject, 200, true),
    channel: str(body.channel, 60, true),
    phone: str(body.phone, 40),
    message: str(body.message, 1000),
    lang: body.lang === "en" ? ("en" as const) : ("fr" as const),
  };
  const start = str(body.start, 40, true);
  const errors = Object.entries(data).filter(([, v]) => v === null).map(([k]) => k);
  if (!start) errors.push("start");
  if (data.email && !EMAIL_RE.test(data.email)) errors.push("email");
  if (data.type && !bookingTypeIds.includes(data.type)) errors.push("type");
  if (body.consent !== true) errors.push("consent");
  if (errors.length) return json({ error: "invalid", fields: errors }, 400);

  try {
    // Sans agenda connecté : simple demande de créneau, confirmée ensuite par l'équipe
    if (e.bookingMode === "request") {
      const sent = await sendBookingRequest(data as any, start!);
      // Envoi d'e-mails non configuré → le navigateur ouvre la messagerie du visiteur avec la demande pré-remplie
      if (!sent) return json({ error: "mail_not_configured", mode: "request" }, 503);
      return json({ ok: true, mode: "request", start: new Date(start!).toISOString() });
    }
    const { booking, manageUrl, ics } = await createBooking(data as any, start!, publicOrigin(request));
    return json({ ok: true, mode: "calendar", start: booking.start, end: booking.end, manageUrl, ics, demo: e.demo });
  } catch (err) {
    if (err instanceof BookingError) return json({ error: err.code }, err.code === "conflict" ? 409 : 400);
    console.error("[booking] create", err);
    return json({ error: "server" }, 502);
  }
};
