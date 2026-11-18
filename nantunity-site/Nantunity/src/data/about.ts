/**
 * Équipe et éléments de confiance (témoignages, logos clients).
 * Les valeurs, la méthode et les textes sont dans src/i18n/fr.ts et en.ts.
 * ⚠️ placeholder: true = information temporaire à remplacer.
 */
import type { PoleId } from "./poles";

export type Member = {
  name: string;
  role: { fr: string; en: string };
  pole?: PoleId;
  photo?: string; // chemin dans /public, ex. "/equipe/prenom-nom.jpg" (portrait 4:5)
  linkedin?: string;
  placeholder?: boolean;
};

/** Équipe : remplacer les noms, fonctions et ajouter les portraits. */
export const team: Member[] = [
  { name: "Prénom Nom", role: { fr: "Présidence", en: "President" }, placeholder: true },
  { name: "Prénom Nom", role: { fr: "Vice-présidence", en: "Vice-President" }, placeholder: true },
  { name: "Prénom Nom", role: { fr: "Trésorerie", en: "Treasurer" }, placeholder: true },
  { name: "Prénom Nom", role: { fr: "Secrétariat général", en: "General Secretary" }, placeholder: true },
  { name: "Prénom Nom", role: { fr: "Responsable Stratégie & Communication", en: "Head of Strategy & Communications" }, pole: "strategie", placeholder: true },
  { name: "Prénom Nom", role: { fr: "Responsable Web & Digital", en: "Head of Web & Digital" }, pole: "web", placeholder: true },
  { name: "Prénom Nom", role: { fr: "Responsable Création Graphique", en: "Head of Graphic Design" }, pole: "graphique", placeholder: true },
  { name: "Prénom Nom", role: { fr: "Responsable Événementiel", en: "Head of Events" }, pole: "evenementiel", placeholder: true },
];

/**
 * Témoignages clients — section masquée tant que la liste est vide.
 * N'ajouter que des témoignages réels, avec l'accord du client.
 * Exemple : { quote: { fr: "…", en: "…" }, author: "Prénom Nom", org: "Structure", pole: "web" }
 */
export const testimonials: { quote: { fr: string; en: string }; author: string; org: string; pole?: PoleId }[] = [];

/**
 * Logos des clients / partenaires — bandeau masqué tant que la liste est vide.
 * Exemple : { name: "Structure", logo: "/clients/structure.svg", url: "https://…" }
 */
export const clients: { name: string; logo: string; url?: string }[] = [];
