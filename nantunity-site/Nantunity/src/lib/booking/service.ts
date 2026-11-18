/**
 * Logique métier de la prise de rendez-vous : disponibilités, réservation, modification, annulation.
 * Anti double-réservation :
 *   1. le créneau est revérifié contre l'agenda juste avant l'écriture ;
 *   2. les écritures sont sérialisées dans le processus ;
 *   3. après création, on relit l'agenda : si un autre rendez-vous a été créé avant le nôtre sur ce créneau
 *      (autre instance du serveur), le nôtre est supprimé et le visiteur est invité à choisir un autre créneau.
 */
import { bookingConfig as cfg, bookingTypeIds } from "../../data/booking";
import { useT, url, type Lang } from "../../i18n";
import { emails } from "../../i18n/emails";
import { site } from "../../data/site";
import { env } from "../env";
import { sendMail, layout, rows, button, ics } from "../mail";
import { escapeHtml, signToken } from "../security";
import { calendar, type Booking, type BookingData } from "./calendar";
import { candidateSlots, daysOfMonth, isOfferedSlot, removeBusy, bookingWindow } from "./availability";
import { zonedToUtc, addDays } from "./time";

export class BookingError extends Error {
  constructor(public code: "conflict" | "invalid" | "not_found" | "past" | "unavailable", msg = code) { super(msg); }
}

/* ---------- File d'attente des écritures ---------- */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

const duration = (type: string) => cfg.types[type]?.duration ?? 30;

/* ---------- Disponibilités d'un mois ---------- */
export async function monthAvailability(type: string, month: string, excludeId?: string) {
  if (!bookingTypeIds.includes(type)) throw new BookingError("invalid");
  const days = daysOfMonth(month);
  const { firstDay, lastDay } = bookingWindow();
  const inWindow = days.filter((d) => d >= firstDay && d <= lastDay);
  if (!inWindow.length) return days.map((date) => ({ date, slots: [] as string[] }));
  const from = zonedToUtc(inWindow[0], "00:00", cfg.timeZone);
  const to = zonedToUtc(addDays(inWindow[inWindow.length - 1], 1), "00:00", cfg.timeZone);
  const busy = await calendar().busy(from, to, excludeId);
  const free = removeBusy(candidateSlots(inWindow, duration(type)), busy, duration(type));
  return days.map((date) => free.find((f) => f.date === date) ?? { date, slots: [] });
}

/* ---------- Mode « demande de créneau » (sans agenda connecté) ---------- */
/** Créneaux du mois selon les seuls horaires d'ouverture (délai de prévenance, jours fermés inclus) */
export function monthOpenings(type: string, month: string) {
  if (!bookingTypeIds.includes(type)) throw new BookingError("invalid");
  return candidateSlots(daysOfMonth(month), duration(type));
}

/**
 * Enregistre une demande de créneau : e-mail à l'équipe (qui confirme ensuite) + accusé de réception au visiteur.
 * Renvoie false si l'envoi d'e-mails n'est pas configuré (le navigateur bascule alors sur la messagerie du visiteur).
 */
export async function sendBookingRequest(data: BookingData, startIso: string) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime()) || !isOfferedSlot(start.toISOString(), duration(data.type), [])) throw new BookingError("invalid");
  const e = env();
  if (!e.mailReady) return false;
  const end = new Date(start.getTime() + duration(data.type) * 60_000);
  const b: Booking = { ...data, id: "request", start: start.toISOString(), end: end.toISOString(), created: new Date().toISOString() };
  const F = emails.fr;
  const tDetails: [string, string][] = [
    [F.name, `${b.firstName} ${b.lastName}`], [F.email, b.email], [F.company, b.company], [F.phone, b.phone],
    [F.type, useT("fr").booking.types[b.type as "premier-echange"]?.name ?? b.type], [F.when, when(b, "fr")], [F.format, b.channel],
    [F.subject, b.subject], [F.message, b.message],
  ];
  const teamOk = await sendMail({
    to: e.mail.team.length ? e.mail.team : [site.contact.email],
    subject: `[Site] ${F.teamRequest} — ${b.firstName} ${b.lastName} — ${when(b, "fr")}`,
    html: layout(F.teamRequest, `<p style="font-size:14px;line-height:1.6">${escapeHtml(F.teamRequestHint)}</p>${rows(tDetails)}`, "Notification automatique du site Nant’Unity."),
    text: `${F.teamRequestHint}\n\n${tDetails.map(([k, v]) => `${k} : ${v}`).join("\n")}`,
    replyTo: b.email,
  });
  if (!teamOk) throw new Error("mail_failed");
  const L = emails[b.lang];
  const typeName = useT(b.lang).booking.types[b.type as "premier-echange"]?.name ?? b.type;
  const details: [string, string][] = [[L.type, typeName], [L.when, `${when(b, b.lang)}\n${L.tzNote}`], [L.format, b.channel], [L.subject, b.subject]];
  await sendMail({
    to: [b.email],
    subject: L.requestSubject,
    html: layout(L.requestTitle, `<p style="margin:0 0 8px;font-size:15px;line-height:1.6">${escapeHtml(L.requestIntro(b.firstName))}</p>${rows(details)}`, escapeHtml(L.footer)),
    text: [L.requestIntro(b.firstName), "", ...details.map(([k, v]) => `${k} : ${v}`)].join("\n"),
    replyTo: site.contact.email,
  });
  return true;
}

async function assertFree(type: string, start: Date, excludeId?: string) {
  const end = new Date(start.getTime() + duration(type) * 60_000);
  const margin = cfg.buffer * 60_000;
  const busy = await calendar().busy(new Date(start.getTime() - margin), new Date(end.getTime() + margin), excludeId);
  if (!isOfferedSlot(start.toISOString(), duration(type), busy)) throw new BookingError("conflict");
  return end;
}

/** Après écriture : si un autre rendez-vous antérieur occupe le même créneau, on retire le nôtre */
async function ensureNoRace(b: Booking) {
  const others = (await calendar().bookingsBetween(new Date(b.start), new Date(b.end))).filter((x) => x.id !== b.id);
  const earlier = others.some((o) => o.created < b.created || (o.created === b.created && o.id < b.id));
  if (earlier) {
    await calendar().cancel(b.id).catch(() => {});
    throw new BookingError("conflict");
  }
}

/* ---------- Réservation ---------- */
export async function createBooking(data: BookingData, startIso: string, origin: string) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) throw new BookingError("invalid");
  const booking = await serialize(async () => {
    const end = await assertFree(data.type, start);
    const b = await calendar().create(data, start, end);
    await ensureNoRace(b);
    return b;
  });
  const manageUrl = manageLink(booking, origin);
  await notify("new", booking, manageUrl, origin);
  return { booking, manageUrl, ics: icsFor(booking) };
}

export async function getBooking(id: string) {
  const b = await calendar().get(id);
  if (!b) throw new BookingError("not_found");
  return b;
}

const canChange = (b: Booking) => Date.parse(b.start) - Date.now() > cfg.changeDeadlineHours * 3600_000;

export async function rescheduleBooking(id: string, startIso: string, origin: string) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) throw new BookingError("invalid");
  const updated = await serialize(async () => {
    const b = await getBooking(id);
    if (!canChange(b)) throw new BookingError("past");
    const end = await assertFree(b.type, start, b.id);
    // Un rendez-vous déplacé garde sa date de création : en cas de réservation concurrente sur ce créneau,
    // c'est la réservation la plus récente qui se retire (voir ensureNoRace).
    return calendar().move(b.id, start, end);
  });
  await notify("moved", updated, manageLink(updated, origin), origin);
  return updated;
}

export async function cancelBooking(id: string, origin: string) {
  const b = await getBooking(id);
  if (!canChange(b)) throw new BookingError("past");
  await calendar().cancel(b.id);
  await notify("cancel", b, "", origin);
  return b;
}

export function publicView(b: Booking) {
  return {
    type: b.type, start: b.start, end: b.end, firstName: b.firstName, lastName: b.lastName,
    channel: b.channel, lang: b.lang, canChange: canChange(b),
  };
}

/* ---------- Liens & e-mails ---------- */
function manageLink(b: Booking, origin: string) {
  return `${origin}${url("bookingManage", b.lang)}?t=${encodeURIComponent(signToken(b.id, env().secret!))}`;
}

function when(b: Booking, lang: Lang) {
  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  const d = new Intl.DateTimeFormat(loc, { dateStyle: "full", timeZone: cfg.timeZone }).format(new Date(b.start));
  const t = (iso: string) => new Intl.DateTimeFormat(loc, { timeStyle: "short", timeZone: cfg.timeZone }).format(new Date(iso));
  return `${d}, ${t(b.start)} – ${t(b.end)}`;
}

function icsFor(b: Booking, cancel = false) {
  const tt = useT(b.lang).booking.types[b.type as keyof ReturnType<typeof useT>["booking"]["types"]];
  return ics({ uid: b.id, start: b.start, end: b.end, title: `Nant’Unity — ${tt?.name ?? b.type}`, description: `${b.subject}\n${site.contact.email}`, cancel, sequence: cancel ? 2 : 1 });
}

async function notify(kind: "new" | "moved" | "cancel", b: Booking, manageUrl: string, origin: string) {
  const L = emails[b.lang];
  const typeName = useT(b.lang).booking.types[b.type as "premier-echange"]?.name ?? b.type;
  const details: [string, string][] = [
    [L.type, typeName], [L.when, `${when(b, b.lang)}\n${L.tzNote}`], [L.format, b.channel], [L.subject, b.subject],
  ];
  const title = kind === "new" ? L.confirmTitle : kind === "moved" ? L.movedTitle : L.cancelTitle;
  const intro = (kind === "new" ? L.confirmIntro : kind === "moved" ? L.movedIntro : L.cancelIntro)(b.firstName);
  const cta = kind === "cancel" ? button(`${origin}${url("booking", b.lang)}`, L.rebook) : button(manageUrl, L.manage);
  const html = layout(title, `<p style="margin:0 0 8px;font-size:15px;line-height:1.6">${escapeHtml(intro)}</p>${rows(details)}${cta}`, escapeHtml(L.footer));
  const text = [intro, "", ...details.map(([k, v]) => `${k} : ${v}`), "", kind === "cancel" ? "" : `${L.manage} : ${manageUrl}`].join("\n");
  const subject = kind === "new" ? L.confirmSubject : kind === "moved" ? L.movedSubject : L.cancelSubject;

  const tasks: Promise<unknown>[] = [
    sendMail({ to: [b.email], subject, html, text, replyTo: site.contact.email, ics: icsFor(b, kind === "cancel") }),
  ];

  // Notification équipe (toujours en français)
  const team = env().mail.team;
  if (team.length) {
    const F = emails.fr;
    const label = kind === "new" ? F.teamNew : kind === "moved" ? F.teamMoved : F.teamCancel;
    const tDetails: [string, string][] = [
      [F.name, `${b.firstName} ${b.lastName}`], [F.email, b.email], [F.company, b.company], [F.phone, b.phone],
      [F.type, useT("fr").booking.types[b.type as "premier-echange"]?.name ?? b.type], [F.when, when(b, "fr")], [F.format, b.channel],
      [F.subject, b.subject], [F.message, b.message],
    ];
    tasks.push(sendMail({
      to: team,
      subject: `[Site] ${label} — ${b.firstName} ${b.lastName} — ${when(b, "fr")}`,
      html: layout(label, rows(tDetails), "Notification automatique du site Nant’Unity. L’événement est enregistré dans l’agenda partagé."),
      text: tDetails.map(([k, v]) => `${k} : ${v}`).join("\n"),
      replyTo: b.email,
    }));
  }
  await Promise.allSettled(tasks);
}
