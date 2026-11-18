import fr from "./fr";
import en from "./en";
import type { Lang } from "./config";

export * from "./config";
export type { Dict } from "./fr";

const dicts = { fr, en };
export const useT = (lang: Lang) => dicts[lang];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Mise en forme légère des textes traduits (à utiliser avec set:html) :
 *   |mot|   → accent en serif italique (signature « Nant’ » du logo)
 *   **mot** → gras
 */
export function rich(s: string, accentClass = "serif-i") {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\|([^|]*)\|?/g, (_m, inner) => (inner ? `<span class="${accentClass}">${inner}</span>` : ""));
}

export function formatDateLong(d: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "full", timeZone: "Europe/Paris" }).format(d);
}
