/**
 * Internationalisation : langues, routes traduites et helpers.
 * Les URLs sont préfixées par la langue (/fr/…, /en/…) et les slugs sont traduits.
 */
export const locales = ["fr", "en"] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = "fr";
export const htmlLang: Record<Lang, string> = { fr: "fr-FR", en: "en-GB" };
export const ogLocale: Record<Lang, string> = { fr: "fr_FR", en: "en_GB" };
export const langNames: Record<Lang, string> = { fr: "Français", en: "English" };

/** Slugs traduits des pages. "" = accueil. */
export const routes = {
  home: { fr: "", en: "" },
  poles: { fr: "poles", en: "services" },
  projects: { fr: "projets", en: "projects" },
  about: { fr: "a-propos", en: "about" },
  contact: { fr: "contact", en: "contact" },
  booking: { fr: "rendez-vous", en: "book-a-meeting" },
  bookingManage: { fr: "rendez-vous/gerer", en: "book-a-meeting/manage" },
  legal: { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy-policy" },
  cookies: { fr: "cookies", en: "cookies" },
  terms: { fr: "cgu", en: "terms-of-use" },
  sales: { fr: "cgv", en: "terms-of-sale" },
} satisfies Record<string, Record<Lang, string>>;
export type RouteKey = keyof typeof routes;

/** URL d'une page : url("about", "en") → /en/about/ ; url("poles", "fr", "web") → /fr/poles/web/ */
export function url(key: RouteKey, lang: Lang, ...rest: string[]) {
  const parts = [lang, routes[key][lang], ...rest].filter(Boolean);
  return `/${parts.join("/")}/`;
}

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}

export const otherLang = (l: Lang): Lang => (l === "fr" ? "en" : "fr");
