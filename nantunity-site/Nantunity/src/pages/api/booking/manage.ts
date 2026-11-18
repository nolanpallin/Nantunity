/**
 * Gestion d'un rendez-vous via le lien signé reçu par e-mail.
 *  GET  /api/booking/manage?t=jeton                       → récapitulatif
 *  POST /api/booking/manage { t, action: "cancel" }        → annulation
 *  POST /api/booking/manage { t, action: "reschedule", start } → déplacement
 */
import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { json, rateLimited, readJson, sameOrigin, str, verifyToken } from "../../../lib/security";
import { getBooking, cancelBooking, rescheduleBooking, publicView, BookingError } from "../../../lib/booking/service";
import { publicOrigin } from "../../../lib/origin";

export const prerender = false;

const fail = (err: unknown) => {
  if (err instanceof BookingError) {
    const status = err.code === "not_found" ? 404 : err.code === "conflict" ? 409 : err.code === "past" ? 410 : 400;
    return json({ error: err.code }, status);
  }
  console.error("[booking] manage", err);
  return json({ error: "server" }, 502);
};

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const e = env();
  if (!e.bookingReady) return json({ error: "not_configured" }, 503);
  if (rateLimited(`mg:${clientAddress}`, 60, 60_000)) return json({ error: "rate" }, 429);
  const id = verifyToken(url.searchParams.get("t"), e.secret!);
  if (!id) return json({ error: "invalid_token" }, 403);
  try { return json({ ok: true, booking: publicView(await getBooking(id)) }); } catch (err) { return fail(err); }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const e = env();
  if (!e.bookingReady) return json({ error: "not_configured" }, 503);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (rateLimited(`mgp:${clientAddress}`, 10, 3600_000)) return json({ error: "rate" }, 429);
  const body = await readJson(request);
  const id = verifyToken(body?.t, e.secret!);
  if (!body || !id) return json({ error: "invalid_token" }, 403);
  try {
    if (body.action === "cancel") {
      await cancelBooking(id, publicOrigin(request));
      return json({ ok: true });
    }
    if (body.action === "reschedule") {
      const start = str(body.start, 40, true);
      if (!start) return json({ error: "invalid" }, 400);
      const b = await rescheduleBooking(id, start, publicOrigin(request));
      return json({ ok: true, booking: publicView(b) });
    }
    return json({ error: "invalid" }, 400);
  } catch (err) { return fail(err); }
};
