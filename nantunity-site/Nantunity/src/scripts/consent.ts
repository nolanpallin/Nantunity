/**
 * Consentement cookies (CNIL). Stockage : localStorage « nu-consent » = { v, date, analytics, media }.
 * Durée de validité : 6 mois. API publique : window.nuConsent.get() / .open() et l'événement « nu:consent ».
 */
export type Consent = { v: number; date: number; analytics: boolean; media: boolean };
const KEY = "nu-consent";
const VERSION = 1;
const MAX_AGE = 1000 * 60 * 60 * 24 * 182; // ~6 mois

export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null") as Consent | null;
    if (!c || c.v !== VERSION || Date.now() - c.date > MAX_AGE) return null;
    return c;
  } catch {
    return null;
  }
}

function activate(c: Consent) {
  document.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-consent]').forEach((s) => {
    const cat = s.dataset.consent as "analytics" | "media";
    if (!c[cat] || s.dataset.loaded) return;
    s.dataset.loaded = "1";
    const el = document.createElement("script");
    if (s.dataset.src) {
      el.src = s.dataset.src;
      el.defer = true;
      try { Object.entries(JSON.parse(s.dataset.attrs || "{}")).forEach(([k, v]) => el.setAttribute(k, String(v))); } catch {}
    } else el.textContent = s.textContent;
    document.head.appendChild(el);
  });
}

export function initConsent() {
  const banner = document.querySelector<HTMLElement>("[data-cc]");
  const dialog = document.querySelector<HTMLDialogElement>("[data-cc-dialog]");
  const form = document.querySelector<HTMLFormElement>("[data-cc-form]");
  if (!banner || !dialog || !form) return;

  const save = (analytics: boolean, media: boolean) => {
    const prev = readConsent();
    const c: Consent = { v: VERSION, date: Date.now(), analytics, media };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
    banner.hidden = true;
    if (dialog.open) dialog.close();
    activate(c);
    // Retrait d'un consentement : rechargement pour décharger les scripts déjà actifs
    if (prev && ((prev.analytics && !analytics) || (prev.media && !media))) location.reload();
    window.dispatchEvent(new CustomEvent("nu:consent", { detail: c }));
  };

  const open = () => {
    const c = readConsent();
    (form.elements.namedItem("analytics") as HTMLInputElement).checked = !!c?.analytics;
    (form.elements.namedItem("media") as HTMLInputElement).checked = !!c?.media;
    dialog.showModal();
  };

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-cookie-open]")) { e.preventDefault(); open(); }
    else if (target.closest("[data-cc-accept]")) save(true, true);
    else if (target.closest("[data-cc-reject]")) save(false, false);
    else if (target.closest("[data-cc-save]")) {
      save((form.elements.namedItem("analytics") as HTMLInputElement).checked, (form.elements.namedItem("media") as HTMLInputElement).checked);
    }
  });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  const current = readConsent();
  if (current) activate(current);
  else banner.hidden = false;

  (window as any).nuConsent = { get: readConsent, open };
}
