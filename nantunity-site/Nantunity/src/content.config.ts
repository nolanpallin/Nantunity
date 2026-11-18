import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Projets du portfolio : un fichier Markdown par projet et par langue.
 *   src/content/projets/fr/mon-projet.md  → /fr/projets/mon-projet/
 *   src/content/projets/en/my-project.md  → /en/projects/my-project/
 * La version anglaise indique `key: mon-projet` (nom du fichier français) pour relier les deux langues.
 * Les fichiers commençant par « _ » (ex. _MODELE.md) sont ignorés.
 * Tant qu'aucun projet n'est publié, la page « Nos projets » affiche un état « bientôt disponible ».
 */
const projets = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!**/_*.md"], base: "./src/content/projets" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Identifiant commun aux deux langues (par défaut : nom du fichier) */
      key: z.string().optional(),
      pole: z.enum(["strategie", "web", "graphique", "evenementiel", "audiovisuel"]),
      client: z.string(),
      year: z.number(),
      summary: z.string(),
      services: z.array(z.string()).default([]),
      /** Image de couverture (dans src/assets/projets). Sans image, un visuel est généré aux couleurs du pôle. */
      cover: image().optional(),
      /** Variante du visuel généré (0 à 5) */
      pattern: z.number().int().min(0).max(5).default(0),
      featured: z.boolean().default(false),
      order: z.number().default(100),
      /** true = projet d'exemple, affiché avec un badge « Projet exemple » et exclu des moteurs de recherche */
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { projets };
