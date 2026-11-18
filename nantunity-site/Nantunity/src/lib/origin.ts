import { site } from "../data/site";

/** URL publique utilisée dans les e-mails : celle du site en production, celle de la requête en développement */
export const publicOrigin = (request: Request) => (import.meta.env.DEV ? new URL(request.url).origin : site.url.replace(/\/$/, ""));
