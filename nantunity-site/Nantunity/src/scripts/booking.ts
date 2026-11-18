/**
 * Sélecteur de créneau réutilisable (page de réservation et page de gestion) :
 * calendrier mensuel accessible au clavier + liste des créneaux du jour choisi.
 * Les horaires sont affichés en heure de Paris ; l'heure locale du visiteur est indiquée si elle diffère.
 */
export type PickerI18n = {
  lang: "fr" | "en";
  prevMonth: string; nextMonth: string; pickDay: string; noSlots: string; slotsFor: string;
  loading: string; loadError: string; tzLocal: string;
};
type Day = { date: string; slots: string[] };
export type AvailabilityResult = { configured: boolean; demo?: boolean; mode?: "calendar" | "request" };

const TZ = "Europe/Paris";

export function mountPicker(
  root: HTMLElement,
  i18n: PickerI18n,
  opts: { type: string; token?: string; onSelect: (iso: string | null) => void; onStatus?: (r: AvailabilityResult) => void },
) {
  const loc = i18n.lang === "fr" ? "fr-FR" : "en-GB";
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = (o: Intl.DateTimeFormatOptions, tz = TZ) => new Intl.DateTimeFormat(loc, { ...o, timeZone: tz });
  const cache = new Map<string, Day[]>();
  let type = opts.type;
  const todayParis = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const tp = Object.fromEntries(todayParis.map((p) => [p.type, p.value]));
  let month = `${tp.year}-${tp.month}`;
  const firstMonth = month;
  let selectedDay: string | null = null;
  let selectedSlot: string | null = null;
  let days: Day[] = [];
  let initial = true;

  root.innerHTML = `
    <div class="pk">
      <div class="pk__cal">
        <div class="pk__head">
          <button type="button" class="pk__nav" data-prev aria-label="${i18n.prevMonth}">‹</button>
          <p class="pk__month" aria-live="polite" data-month></p>
          <button type="button" class="pk__nav" data-next aria-label="${i18n.nextMonth}">›</button>
        </div>
        <div class="pk__grid" role="grid" data-grid></div>
      </div>
      <div class="pk__slots">
        <p class="pk__slots-title" data-slots-title>${i18n.pickDay}</p>
        <div class="pk__slot-list" role="listbox" data-slots></div>
      </div>
    </div>`;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const grid = $("[data-grid]"), slotsEl = $("[data-slots]"), slotsTitle = $("[data-slots-title]"), monthEl = $("[data-month]");
  const prev = $<HTMLButtonElement>("[data-prev]"), next = $<HTMLButtonElement>("[data-next]");

  const shiftMonth = (m: string, n: number) => {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  async function load() {
    monthEl.textContent = fmt({ month: "long", year: "numeric" }, "UTC").format(new Date(`${month}-15T12:00:00Z`));
    prev.disabled = month <= firstMonth;
    next.disabled = month >= shiftMonth(firstMonth, 2);
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = `<p class="pk__msg">${i18n.loading}</p>`;
    const key = `${type}|${month}`;
    try {
      if (!cache.has(key)) {
        const q = new URLSearchParams({ type, month, ...(opts.token ? { t: opts.token } : {}) });
        const res = await fetch(`/api/booking/availability?${q}`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        opts.onStatus?.({ configured: data.configured !== false, demo: data.demo, mode: data.mode });
        if (data.configured === false) { grid.innerHTML = ""; return; }
        cache.set(key, data.days);
      }
      days = cache.get(key)!;
      // Présélection du premier jour disponible du mois (évite un panneau vide)
      if (!selectedDay || !days.some((d) => d.date === selectedDay)) {
        const first = days.find((d) => d.slots.length);
        if (first) selectedDay = first.date;
        else if (initial) { initial = false; month = shiftMonth(month, 1); return load(); } // fin de mois sans créneau : mois suivant
      }
      renderGrid();
      renderSlots();
    } catch {
      grid.innerHTML = `<p class="pk__msg pk__msg--err" role="alert">${i18n.loadError}</p>`;
    } finally {
      grid.removeAttribute("aria-busy");
    }
  }

  function renderGrid() {
    const weekdays = Array.from({ length: 7 }, (_, i) => fmt({ weekday: "short" }, "UTC").format(new Date(Date.UTC(2024, 0, 1 + i))));
    const firstWd = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7; // lundi = 0
    let html = `<div class="pk__row pk__row--head" role="row">${weekdays.map((w) => `<span role="columnheader" class="pk__wd">${w.replace(".", "")}</span>`).join("")}</div><div class="pk__row" role="row">`;
    for (let i = 0; i < firstWd; i++) html += `<span class="pk__day pk__day--empty" role="gridcell"></span>`;
    days.forEach((d, i) => {
      if ((firstWd + i) % 7 === 0 && i > 0) html += `</div><div class="pk__row" role="row">`;
      const avail = d.slots.length > 0;
      const label = fmt({ weekday: "long", day: "numeric", month: "long" }, "UTC").format(new Date(`${d.date}T12:00:00Z`));
      html += `<span role="gridcell"><button type="button" class="pk__day${avail ? " is-avail" : ""}${d.date === selectedDay ? " is-sel" : ""}" data-day="${d.date}" ${avail ? "" : 'aria-disabled="true"'} aria-pressed="${d.date === selectedDay}" aria-label="${label}${avail ? ` — ${d.slots.length}` : ""}" tabindex="-1">${Number(d.date.slice(8))}</button></span>`;
    });
    grid.innerHTML = html + "</div>";
    const focusable = grid.querySelector<HTMLButtonElement>(".is-sel") ?? grid.querySelector<HTMLButtonElement>(".is-avail") ?? grid.querySelector<HTMLButtonElement>("[data-day]");
    if (focusable) focusable.tabIndex = 0;
    if (selectedDay && !days.some((d) => d.date === selectedDay)) { selectedDay = null; renderSlots(); }
  }

  function renderSlots() {
    const day = days.find((d) => d.date === selectedDay);
    if (!day) { slotsTitle.textContent = i18n.pickDay; slotsEl.innerHTML = ""; return; }
    slotsTitle.textContent = `${i18n.slotsFor} ${fmt({ weekday: "long", day: "numeric", month: "long" }, "UTC").format(new Date(`${day.date}T12:00:00Z`))}`;
    if (!day.slots.length) { slotsEl.innerHTML = `<p class="pk__msg">${i18n.noSlots}</p>`; return; }
    const showLocal = localTz && localTz !== TZ && fmt({ timeZoneName: "short" }).format(new Date()) !== fmt({ timeZoneName: "short" }, localTz).format(new Date());
    slotsEl.innerHTML = day.slots.map((iso) => {
      const t = fmt({ hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
      const local = showLocal ? `<small>${i18n.tzLocal} ${fmt({ hour: "2-digit", minute: "2-digit" }, localTz).format(new Date(iso))}</small>` : "";
      return `<button type="button" role="option" class="pk__slot${iso === selectedSlot ? " is-sel" : ""}" data-slot="${iso}" aria-selected="${iso === selectedSlot}">${t}${local}</button>`;
    }).join("");
  }

  grid.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-day]");
    if (!b || b.getAttribute("aria-disabled") === "true") return;
    selectedDay = b.dataset.day!;
    selectedSlot = null;
    opts.onSelect(null);
    renderGrid();
    renderSlots();
    grid.querySelector<HTMLButtonElement>(`[data-day="${selectedDay}"]`)?.focus();
  });
  // Navigation clavier dans le calendrier (flèches)
  grid.addEventListener("keydown", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-day]");
    if (!b) return;
    const all = [...grid.querySelectorAll<HTMLButtonElement>("[data-day]")];
    const i = all.indexOf(b);
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const target = all[Math.max(0, Math.min(all.length - 1, i + delta))];
    all.forEach((x) => (x.tabIndex = -1));
    target.tabIndex = 0;
    target.focus();
  });
  slotsEl.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-slot]");
    if (!b) return;
    selectedSlot = b.dataset.slot!;
    renderSlots();
    opts.onSelect(selectedSlot);
  });
  prev.addEventListener("click", () => { month = shiftMonth(month, -1); load(); });
  next.addEventListener("click", () => { month = shiftMonth(month, 1); load(); });

  load();

  return {
    setType(t: string) { type = t; selectedSlot = null; selectedDay = null; opts.onSelect(null); renderSlots(); load(); },
    /** Recharge après un conflit (créneau pris entre-temps) */
    refresh() { cache.clear(); selectedSlot = null; opts.onSelect(null); load().then(renderSlots); },
  };
}

/** Libellé complet d'un créneau, ex. « mardi 2 décembre 2026, 14:30 » */
export function slotLabel(iso: string, lang: "fr" | "en") {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "full", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}
