/**
 * Calcul des créneaux disponibles à partir des horaires d'ouverture et des périodes occupées de l'agenda.
 */
import { bookingConfig as cfg } from "../../data/booking";
import { addDays, dayInZone, overlaps, weekdayOf, zonedToUtc } from "./time";

export type Interval = { start: number; end: number };
export type DaySlots = { date: string; slots: string[] }; // slots = instants ISO (UTC)

/** Fenêtre réservable : [maintenant + délai de prévenance ; aujourd'hui + maxDaysAhead] */
export function bookingWindow(now = new Date()) {
  const min = now.getTime() + cfg.minNoticeHours * 3600_000;
  const lastDay = addDays(dayInZone(now, cfg.timeZone), cfg.maxDaysAhead);
  return { min, firstDay: dayInZone(new Date(min), cfg.timeZone), lastDay };
}

/** Créneaux candidats (sans tenir compte de l'agenda) pour une liste de jours */
export function candidateSlots(days: string[], duration: number, now = new Date()): DaySlots[] {
  const { min, lastDay } = bookingWindow(now);
  const step = cfg.slotStep * 60_000;
  const dur = duration * 60_000;
  return days.map((date) => {
    const slots: string[] = [];
    const ranges = cfg.openingHours[weekdayOf(date)] ?? [];
    if (date > lastDay || cfg.closedDates.includes(date)) return { date, slots };
    for (const [from, to] of ranges) {
      const end = zonedToUtc(date, to, cfg.timeZone).getTime();
      for (let t = zonedToUtc(date, from, cfg.timeZone).getTime(); t + dur <= end; t += step) {
        if (t >= min) slots.push(new Date(t).toISOString());
      }
    }
    return { date, slots };
  });
}

/** Retire les créneaux qui chevauchent une période occupée (avec battement) */
export function removeBusy(days: DaySlots[], busy: Interval[], duration: number): DaySlots[] {
  const dur = duration * 60_000;
  const buf = cfg.buffer * 60_000;
  return days.map((d) => ({
    date: d.date,
    slots: d.slots.filter((iso) => {
      const s = Date.parse(iso);
      return !busy.some((b) => overlaps(s - buf, s + dur + buf, b.start, b.end));
    }),
  }));
}

/** Liste des jours (AAAA-MM-JJ) d'un mois « AAAA-MM » */
export function daysOfMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** Vérifie qu'un instant correspond exactement à un créneau proposé */
export function isOfferedSlot(startIso: string, duration: number, busy: Interval[], now = new Date()) {
  const day = dayInZone(new Date(startIso), cfg.timeZone);
  const [res] = removeBusy(candidateSlots([day], duration, now), busy, duration);
  return res.slots.includes(new Date(startIso).toISOString());
}
