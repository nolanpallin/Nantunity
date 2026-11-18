/**
 * Les cinq pôles de Nant'Unity — données visuelles et techniques.
 * Les textes (nom, prestations…) sont dans src/i18n/fr.ts et en.ts, clé `poles`.
 *
 * Chaque pôle reprend le duo de couleurs de sa déclinaison de logo (PDF « Logo Communication ») :
 *  - bg     : couleur de fond du pôle
 *  - accent : couleur du logo sur ce fond (titres, éléments forts)
 *  - ink    : couleur du texte courant sur ce fond (choisie pour la lisibilité)
 *  - title  : couleur des titres sur ce fond (= accent, sauf si l'accent manque de contraste)
 *  - onAccent : couleur du texte posé sur l'accent (boutons du pôle)
 *  - textLight : couleur du pôle utilisée comme texte sur fond clair (mode clair)
 *
 * Événementiel : l'accent pêche (#ffcf80) sur le bleu (#4d93d6) n'offre qu'un contraste de 1,9:1.
 * Ses titres passent donc en noir (6,4:1), comme les autres pôles qui sont tous au-dessus de 4,5:1.
 */
import { useT, type Lang } from "../i18n";

export type PoleId = "strategie" | "web" | "graphique" | "evenementiel" | "audiovisuel";
export const poleIds: PoleId[] = ["strategie", "web", "graphique", "evenementiel", "audiovisuel"];

type Colors = { bg: string; accent: string; ink: string; title?: string; onAccent?: string; textLight?: string };
const base: Record<PoleId, { index: string; logo: string; slug: Record<Lang, string>; colors: Colors }> = {
  strategie: { index: "01", logo: "strategie", slug: { fr: "strategie", en: "strategy" }, colors: { bg: "#374a9a", accent: "#bdd002", ink: "#ffffff" } },
  web: { index: "02", logo: "web", slug: { fr: "web", en: "web-digital" }, colors: { bg: "#293e14", accent: "#f1ff6b", ink: "#ffffff" } },
  graphique: { index: "03", logo: "graphique", slug: { fr: "graphique", en: "graphic-design" }, colors: { bg: "#5e100b", accent: "#b0f3ff", ink: "#ffffff" } },
  evenementiel: {
    index: "04", logo: "evenementiel", slug: { fr: "evenementiel", en: "events" },
    colors: { bg: "#4d93d6", accent: "#ffcf80", ink: "#0b0b0b", title: "#0b0b0b", onAccent: "#0b0b0b", textLight: "#235f9c" },
  },
  // Duo officiel de la déclinaison « Audiovisuel » du logo : brun / rose (contraste 13:1)
  audiovisuel: { index: "05", logo: "audiovisuel", slug: { fr: "audiovisuel", en: "audiovisual" }, colors: { bg: "#45260a", accent: "#ffcfef", ink: "#ffffff" } },
};

export function getPoles(lang: Lang) {
  const t = useT(lang).poles;
  return poleIds.map((id) => ({ id, ...base[id], urlSlug: base[id].slug[lang], ...t[id] }));
}
export type Pole = ReturnType<typeof getPoles>[number];

export const getPole = (id: string, lang: Lang) => getPoles(lang).find((p) => p.id === id);

/** Variables CSS d'un pôle, à placer dans un attribut style. */
export const poleVars = ({ colors: c }: { colors: Colors }) =>
  `--pole-bg:${c.bg};--pole-accent:${c.accent};--pole-ink:${c.ink};--pole-title:${c.title ?? c.accent};--pole-on-accent:${c.onAccent ?? c.bg};--pole-tl:${c.textLight ?? c.bg};`;
