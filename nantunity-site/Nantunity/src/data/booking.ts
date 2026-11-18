/**
 * Réglages de la prise de rendez-vous. Tous les horaires sont exprimés en heure de Paris.
 * Les libellés des types sont dans src/i18n (booking.types).
 */
export const bookingConfig = {
  timeZone: "Europe/Paris",

  /** Types de rendez-vous : identifiant → durée en minutes */
  types: {
    "premier-echange": { duration: 30 },
    "presentation-projet": { duration: 45 },
    "demande-infos": { duration: 20 },
  } as Record<string, { duration: number }>,

  /**
   * Plages d'ouverture par jour de la semaine (0 = dimanche … 6 = samedi).
   * Plusieurs plages possibles par jour. Jour absent = fermé.
   */
  openingHours: {
    1: [["10:00", "12:00"], ["14:00", "19:00"]],
    2: [["10:00", "12:00"], ["14:00", "19:00"]],
    3: [["10:00", "12:00"], ["14:00", "19:00"]],
    4: [["10:00", "12:00"], ["14:00", "19:00"]],
    5: [["10:00", "12:00"], ["14:00", "17:00"]],
  } as Record<number, [string, string][]>,

  /** Pas entre deux créneaux proposés (minutes) */
  slotStep: 30,
  /** Battement minimum avant/après un événement déjà dans l'agenda (minutes) */
  buffer: 10,
  /** Délai de prévenance minimum (heures) */
  minNoticeHours: 24,
  /** Réservation possible jusqu'à N jours à l'avance */
  maxDaysAhead: 60,
  /** Annulation / modification possible jusqu'à N heures avant le rendez-vous */
  changeDeadlineHours: 2,
  /** Jours fermés (vacances, jours fériés…) au format AAAA-MM-JJ */
  closedDates: [
    "2026-12-24", "2026-12-25", "2026-12-26", "2026-12-31", "2027-01-01",
    "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-08", "2027-05-17", "2027-07-14", "2027-08-15",
  ] as string[],
};

export const bookingTypeIds = Object.keys(bookingConfig.types);
