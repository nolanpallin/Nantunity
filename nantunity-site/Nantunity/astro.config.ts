import { defineConfig, envField } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { site } from "./src/data/site";

const secret = () => envField.string({ context: "server", access: "secret", optional: true });

export default defineConfig({
  site: site.url,
  trailingSlash: "ignore",
  // Hébergement Vercel : pages statiques (CDN) + routes serveur /api/* en fonctions serverless
  // (prise de rendez-vous, formulaire de contact).
  adapter: vercel(),
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/api/") && !/\/(gerer|manage)\//.test(page) && page !== `${site.url}/`,
    }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  env: {
    schema: {
      // Agenda Google (compte de service)
      GOOGLE_SERVICE_ACCOUNT_EMAIL: secret(),
      GOOGLE_PRIVATE_KEY: secret(),
      GOOGLE_CALENDAR_ID: secret(),
      GOOGLE_BUSY_CALENDAR_IDS: secret(),
      // E-mails (Resend)
      RESEND_API_KEY: secret(),
      MAIL_FROM: secret(),
      TEAM_NOTIFY_EMAILS: secret(),
      // Sécurité des liens de gestion de rendez-vous
      BOOKING_SECRET: secret(),
      // Mode démonstration local (agenda en mémoire, e-mails affichés dans la console)
      BOOKING_DEMO: envField.boolean({ context: "server", access: "secret", default: false }),
    },
  },
});
