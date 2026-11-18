/**
 * Accès centralisé aux variables d'environnement serveur (jamais exposées au navigateur).
 * Voir .env.example pour la liste complète.
 */
import { getSecret } from "astro:env/server";

const s = (k: string) => {
  const v = getSecret(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export function env() {
  const demoRaw = getSecret("BOOKING_DEMO");
  const demo = demoRaw === true || demoRaw === "true";
  const google = {
    email: s("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    // Les retours à la ligne de la clé sont souvent échappés (\n) dans les hébergeurs
    privateKey: s("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
    calendarId: s("GOOGLE_CALENDAR_ID"),
    busyCalendarIds: (s("GOOGLE_BUSY_CALENDAR_IDS") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
  };
  const googleReady = !!(google.email && google.privateKey && google.calendarId);
  const mail = {
    resendKey: s("RESEND_API_KEY"),
    from: s("MAIL_FROM"),
    team: (s("TEAM_NOTIFY_EMAILS") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
  };
  const secret = s("BOOKING_SECRET") ?? (demo ? "demo-secret-not-for-production" : undefined);
  const bookingReady = demo || (googleReady && !!secret);
  return {
    demo,
    google,
    mail,
    mailReady: !!(mail.resendKey && mail.from),
    secret,
    /** La réservation synchronisée est opérationnelle : agenda Google + secret, ou mode démo */
    bookingReady,
    /**
     * Mode de la prise de rendez-vous :
     *  - "calendar" : réservation réelle synchronisée avec Google Agenda (ou agenda de démo)
     *  - "request"  : sans agenda connecté, le visiteur choisit un créneau parmi les horaires d'ouverture
     *                 et envoie une DEMANDE, confirmée ensuite par l'équipe par e-mail
     */
    bookingMode: (bookingReady ? "calendar" : "request") as "calendar" | "request",
  };
}
