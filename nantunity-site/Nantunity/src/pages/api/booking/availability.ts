/**
 * GET /api/booking/availability?type=premier-echange&month=2026-12[&t=jeton] → créneaux libres du mois
 * - mode "calendar" : horaires d'ouverture moins les événements de l'agenda Google
 * - mode "request"  : horaires d'ouverture seuls (aucun agenda connecté), le créneau sera confirmé par l'équipe
 */
import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { json, rateLimited, verifyToken } from "../../../lib/security";
import { monthAvailability, monthOpenings, BookingError } from "../../../lib/booking/service";
import { bookingConfig } from "../../../data/booking";

export const prerender = false;

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const e = env();
  if (rateLimited(`av:${clientAddress}`, 90, 60_000)) return json({ error: "rate" }, 429);

  const type = url.searchParams.get("type") ?? "";
  const month = url.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "invalid" }, 400);

  try {
    if (e.bookingMode === "request") {
      return json({ configured: true, mode: "request", timeZone: bookingConfig.timeZone, days: monthOpenings(type, month) });
    }
    // Lors d'une modification, le créneau actuel du visiteur ne doit pas compter comme occupé
    const token = url.searchParams.get("t");
    const excludeId = token ? verifyToken(token, e.secret!) ?? undefined : undefined;
    const days = await monthAvailability(type, month, excludeId);
    return json({ configured: true, mode: "calendar", demo: e.demo, timeZone: bookingConfig.timeZone, days });
  } catch (err) {
    if (err instanceof BookingError) return json({ error: err.code }, 400);
    console.error("[booking] availability", err);
    return json({ error: "server" }, 502);
  }
};
