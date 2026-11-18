/**
 * Connecteurs d'agenda.
 *  - GoogleCalendar : API REST Google Calendar avec un compte de service (JWT signé côté serveur).
 *  - MemoryCalendar : agenda en mémoire pour le mode démonstration local.
 * Les rendez-vous sont des événements portant la propriété privée nuBooking=1 et leurs informations.
 */
import { createSign } from "node:crypto";
import { env } from "../env";
import { bookingConfig as cfg } from "../../data/booking";
import { zonedToUtc } from "./time";
import type { Interval } from "./availability";

export type BookingData = {
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  subject: string;
  channel: string;
  phone: string;
  lang: "fr" | "en";
  message: string;
};
export type Booking = BookingData & { id: string; start: string; end: string; created: string };

export interface Calendar {
  /** Périodes occupées entre deux instants (tous événements confondus), en excluant éventuellement un rendez-vous */
  busy(from: Date, to: Date, excludeId?: string): Promise<Interval[]>;
  /** Rendez-vous Nant'Unity qui chevauchent une période */
  bookingsBetween(from: Date, to: Date): Promise<Booking[]>;
  create(data: BookingData, start: Date, end: Date): Promise<Booking>;
  get(id: string): Promise<Booking | null>;
  move(id: string, start: Date, end: Date): Promise<Booking>;
  cancel(id: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Google Calendar                                                      */
/* ------------------------------------------------------------------ */
const API = "https://www.googleapis.com/calendar/v3";
let tokenCache: { token: string; exp: number } | null = null;

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const { email, privateKey } = env().google;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/calendar", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signature = b64url(createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey!));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google auth ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function g<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 404 || res.status === 410) throw Object.assign(new Error("not_found"), { status: 404 });
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

type GEvent = {
  id: string; status?: string; transparency?: string; created: string;
  start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

const toInterval = (e: GEvent): Interval => ({
  start: e.start.dateTime ? Date.parse(e.start.dateTime) : zonedToUtc(e.start.date!, "00:00", cfg.timeZone).getTime(),
  end: e.end.dateTime ? Date.parse(e.end.dateTime) : zonedToUtc(e.end.date!, "00:00", cfg.timeZone).getTime(),
});

function toBooking(e: GEvent): Booking | null {
  const p = e.extendedProperties?.private;
  if (!p || p.nuBooking !== "1" || e.status === "cancelled") return null;
  return {
    id: e.id, created: e.created, start: e.start.dateTime!, end: e.end.dateTime!,
    type: p.type, firstName: p.firstName, lastName: p.lastName, email: p.email, company: p.company ?? "",
    subject: p.subject ?? "", channel: p.channel ?? "", phone: p.phone ?? "", lang: p.lang === "en" ? "en" : "fr", message: p.message ?? "",
  };
}

function eventBody(d: BookingData, start: Date, end: Date) {
  const lines = [
    `Type : ${d.type}`, `Nom : ${d.firstName} ${d.lastName}`, `E-mail : ${d.email}`,
    d.company && `Structure : ${d.company}`, d.phone && `Téléphone : ${d.phone}`, `Format : ${d.channel}`,
    `Objet : ${d.subject}`, d.message && `\n${d.message}`, `\n— Réservé via le site Nant'Unity (${d.lang.toUpperCase()})`,
  ].filter(Boolean);
  return {
    summary: `RDV Nant'Unity — ${d.firstName} ${d.lastName}${d.company ? ` (${d.company})` : ""}`,
    description: lines.join("\n"),
    start: { dateTime: start.toISOString(), timeZone: cfg.timeZone },
    end: { dateTime: end.toISOString(), timeZone: cfg.timeZone },
    transparency: "opaque",
    extendedProperties: { private: { nuBooking: "1", ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v).slice(0, 1000)])) } },
  };
}

class GoogleCalendar implements Calendar {
  private get id() { return encodeURIComponent(env().google.calendarId!); }

  private async list(from: Date, to: Date, extra = "") {
    const q = `singleEvents=true&showDeleted=false&maxResults=2500&timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}${extra}`;
    return (await g<{ items: GEvent[] }>(`/calendars/${this.id}/events?${q}`)).items ?? [];
  }

  async busy(from: Date, to: Date, excludeId?: string) {
    const own = (await this.list(from, to))
      .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent" && e.id !== excludeId)
      .map(toInterval);
    const others = env().google.busyCalendarIds;
    if (!others.length) return own;
    const fb = await g<{ calendars: Record<string, { busy: { start: string; end: string }[] }> }>("/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: cfg.timeZone, items: others.map((id) => ({ id })) }),
    });
    const ext = Object.values(fb.calendars ?? {}).flatMap((c) => (c.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) })));
    return [...own, ...ext];
  }

  async bookingsBetween(from: Date, to: Date) {
    return (await this.list(from, to, "&privateExtendedProperty=nuBooking%3D1")).map(toBooking).filter(Boolean) as Booking[];
  }

  async create(d: BookingData, start: Date, end: Date) {
    return toBooking(await g<GEvent>(`/calendars/${this.id}/events`, { method: "POST", body: JSON.stringify(eventBody(d, start, end)) }))!;
  }

  async get(id: string) {
    try { return toBooking(await g<GEvent>(`/calendars/${this.id}/events/${encodeURIComponent(id)}`)); }
    catch (e: any) { if (e.status === 404) return null; throw e; }
  }

  async move(id: string, start: Date, end: Date) {
    const body = { start: { dateTime: start.toISOString(), timeZone: cfg.timeZone }, end: { dateTime: end.toISOString(), timeZone: cfg.timeZone } };
    return toBooking(await g<GEvent>(`/calendars/${this.id}/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }))!;
  }

  async cancel(id: string) {
    await g(`/calendars/${this.id}/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

/* ------------------------------------------------------------------ */
/* Agenda en mémoire (démo)                                             */
/* ------------------------------------------------------------------ */
const store: Map<string, Booking> = ((globalThis as any).__nuDemoStore ??= new Map());

class MemoryCalendar implements Calendar {
  async busy(from: Date, to: Date, excludeId?: string) {
    return [...store.values()].filter((b) => b.id !== excludeId).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
      .filter((i) => i.start < to.getTime() && i.end > from.getTime());
  }
  async bookingsBetween(from: Date, to: Date) {
    return [...store.values()].filter((b) => Date.parse(b.start) < to.getTime() && Date.parse(b.end) > from.getTime());
  }
  async create(d: BookingData, start: Date, end: Date) {
    const b: Booking = { ...d, id: `demo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, start: start.toISOString(), end: end.toISOString(), created: new Date().toISOString() };
    store.set(b.id, b);
    return b;
  }
  async get(id: string) { return store.get(id) ?? null; }
  async move(id: string, start: Date, end: Date) {
    const b = store.get(id)!;
    const nb = { ...b, start: start.toISOString(), end: end.toISOString() };
    store.set(id, nb);
    return nb;
  }
  async cancel(id: string) { store.delete(id); }
}

export function calendar(): Calendar {
  return env().demo ? new MemoryCalendar() : new GoogleCalendar();
}
