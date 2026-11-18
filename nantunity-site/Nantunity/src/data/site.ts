/**
 * Informations générales du site.
 * ⚠️ Les valeurs marquées « À REMPLACER » ou contenant « [À compléter » sont temporaires.
 */
export const site = {
  name: "Nant'Unity",
  url: "https://nantunity.vercel.app", // à remplacer si un nom de domaine personnalisé est acheté
  city: "Nantes",

  contact: {
    email: "nantunity@outlook.fr",
    phone: "", // À compléter (laisser vide pour masquer)
    address: "Nantes, Loire-Atlantique", // À préciser
  },

  /**
   * Formulaire de contact : laisser vide pour utiliser l'API du site (/api/contact, e-mails via Resend).
   * Peut aussi pointer vers un service externe (Formspree…). Si aucun envoi n'est possible,
   * le formulaire ouvre la messagerie du visiteur avec la demande pré-remplie.
   */
  formEndpoint: "",

  /** Réseaux sociaux : laisser url vide pour masquer un réseau. */
  socials: [
    { name: "Instagram", handle: "@nantunity", url: "https://www.instagram.com/nantunity/" },
    { name: "LinkedIn", handle: "", url: "" },
    { name: "TikTok", handle: "", url: "" },
    { name: "Facebook", handle: "", url: "" },
  ],

  /**
   * Mesure d'audience — chargée UNIQUEMENT après consentement (catégorie « analytics »).
   * Exemple Plausible : { src: "https://plausible.io/js/script.js", attrs: { "data-domain": "nantunity.fr" } }
   * Laisser src vide : aucun outil de mesure n'est chargé.
   */
  analytics: { src: "", attrs: {} as Record<string, string> },

  /**
   * Informations juridiques (mentions légales, politique de confidentialité, CGV).
   * Tant qu'un champ commence par « [À compléter », il est affiché en surbrillance sur les pages légales.
   */
  legal: {
    legalName: "Nant'Unity",
    legalForm: "Association régie par la loi du 1er juillet 1901",
    rna: "[À compléter : numéro RNA (W…)]",
    siret: "[À compléter : numéro SIRET, le cas échéant]",
    vat: "[À compléter : n° de TVA intracommunautaire, ou mention d'exonération applicable]",
    headOffice: "[À compléter : adresse complète du siège social], Nantes",
    declaration: "[À compléter : préfecture et date de déclaration, date de publication au JOAFE]",
    publisher: "[À compléter : prénom et nom du/de la directeur·rice de la publication, qualité (ex. Président·e)]",
    privacyContact: "nantunity@outlook.fr", // adresse pour les demandes RGPD
    host: {
      name: "[À compléter : nom de l'hébergeur]",
      address: "[À compléter : adresse de l'hébergeur]",
      phone: "[À compléter : téléphone de l'hébergeur]",
    },
    mediator: "[À compléter : médiateur de la consommation (obligatoire en cas de prestations aux particuliers)]",
    lastUpdate: "2026-11-18",
  },
};

export const activeSocials = site.socials.filter((s) => s.url);
