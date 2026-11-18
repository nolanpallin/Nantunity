/**
 * Fuseaux horaires sans dépendance : conversion « heure murale » d'un fuseau ↔ instant UTC.
 * Gère correctement les changements d'heure (Europe/Paris : UTC+1 / UTC+2).
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

/** Composantes de la date dans le fuseau donné */
export function partsInZone(date: Date, tz: string) {
  const p = Object.fromEntries(dtf(tz).formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, weekday: wd };
}

/** Décalage (ms) du fuseau par rapport à UTC à l'instant donné */
export function zoneOffset(date: Date, tz: string) {
  const p = partsInZone(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-11-18" + "14:30" en heure de Paris → instant UTC */
export function zonedToUtc(day: string, time: string, tz: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ts = guess - zoneOffset(new Date(guess), tz);
  ts = guess - zoneOffset(new Date(ts), tz); // 2e passe : changement d'heure
  return new Date(ts);
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau */
export function dayInZone(date: Date, tz: string) {
  const p = partsInZone(date, tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;
