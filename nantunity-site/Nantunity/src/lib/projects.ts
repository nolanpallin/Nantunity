import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "../i18n";

export type Project = CollectionEntry<"projets"> & { slug: string; key: string; lang: Lang };

/** Projets d'une langue, triés par ordre. slug = nom du fichier, key = identifiant commun FR/EN. */
export async function getProjects(lang: Lang): Promise<Project[]> {
  const all = await getCollection("projets", (p) => p.id.startsWith(`${lang}/`));
  return all
    .map((p) => {
      const slug = p.id.slice(lang.length + 1);
      return Object.assign(p, { slug, key: p.data.key ?? slug, lang });
    })
    .sort((a, b) => a.data.order - b.data.order);
}
