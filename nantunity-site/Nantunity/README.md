# Site Nant'Unity

Site de Nant'Unity, Junior-Entreprise de communication à Nantes. Construit avec [Astro](https://astro.build) : pages statiques (rapides, bien référencées) + quelques routes serveur (`/api/*`) pour la prise de rendez-vous et le formulaire de contact.

```bash
npm install
cp .env.example .env        # puis renseigner les variables (ou BOOKING_DEMO=true pour tester en local)
npm run dev                 # http://localhost:4321
npm run build               # build de production (sortie Vercel dans .vercel/output)
```

**En ligne : https://nantunity.vercel.app** (projet Vercel `nantunity`).
Mettre le code sur GitHub : voir **[TUTO-GITHUB.md](TUTO-GITHUB.md)**.

### Police des titres : Extenda
Extenda (Zetafonts) est une police **commerciale**, qui n'est donc pas incluse dans le projet. Pour l'activer :
1. Achetez une licence qui autorise l'usage web (« webfont »).
2. Déposez le fichier choisi, de préférence en `.woff2` (ex. `Extenda-50-Peta.woff2`), dans `public/fonts/extenda/`.
3. Relancez le build ou redéployez.

Le fichier est détecté automatiquement et tous les titres passent en Extenda. Sans fichier, les titres restent en Anton. Les textes utilisent Roboto.

---

## Fonctionnalités

| Fonctionnalité | Où |
| --- | --- |
| Site bilingue FR (défaut) / EN, URLs `/fr/…` et `/en/…` à slugs traduits, `hreflang`, métadonnées par langue | `src/i18n/`, `src/pages/[lang]/[...path].astro` |
| Thème clair / sombre (thème système à la 1re visite, choix mémorisé, transition circulaire) | `src/styles/tokens.css`, `src/components/ThemeToggle.astro` |
| Prise de rendez-vous synchronisée avec Google Agenda, e-mails de confirmation, modification et annulation | `src/views/Booking*.astro`, `src/lib/booking/`, `src/pages/api/booking/` |
| Formulaire de contact avec envoi d'e-mails (équipe + accusé de réception) | `src/views/Contact.astro`, `src/pages/api/contact.ts` |
| Bandeau cookies conforme CNIL (accepter / refuser / personnaliser, accès permanent depuis le pied de page) | `src/components/CookieConsent.astro`, `src/scripts/consent.ts` |
| Mentions légales, confidentialité, cookies, CGU, CGV (FR + traduction EN à valider) | `src/legal/`, `src/views/Legal.astro` |

---

## ✅ Ce que l'association doit fournir pour la mise en ligne

### 1. Hébergement : Vercel (déjà configuré)
Le site est hébergé sur **Vercel** grâce à l'adaptateur `@astrojs/vercel` :
- les pages sont servies en statique depuis le CDN ;
- les routes `/api/*` tournent en fonctions serverless.

Les réglages sont dans `vercel.json` (build, en-têtes de sécurité, cache), et `.vercelignore` empêche l'envoi des fichiers `.env` locaux.

**Mettre à jour le site en ligne**, depuis ce dossier :
```bash
npx vercel deploy --prod
```

**Recommandé : relier un dépôt GitHub** pour un déploiement automatique à chaque modification :
1. Créer un dépôt GitHub et y pousser le projet.
2. Sur vercel.com, ouvrir le projet `nantunity`, puis *Settings → Git → Connect Git Repository* et choisir le dépôt.
3. Chaque `git push` sur la branche principale met alors le site en ligne. Les autres branches obtiennent une URL de prévisualisation.

**Variables d'environnement** : dans le projet Vercel, aller dans *Settings → Environment Variables* et ajouter celles de `.env.example`, sans `BOOKING_DEMO`. Redéployer ensuite.

Sans ces variables, le site fonctionne mais :
- la page Rendez-vous affiche « bientôt disponible » ;
- le formulaire de contact ouvre la messagerie du visiteur.

⚠️ La limitation anti-abus des formulaires est en mémoire, par instance. C'est suffisant pour un site de cette taille.

### 2. Agenda Google (prise de rendez-vous)
1. Sur [console.cloud.google.com](https://console.cloud.google.com) : créer un projet, activer l'**API Google Calendar**.
2. *IAM et administration → Comptes de service* : créer un compte de service, puis *Clés → Ajouter une clé → JSON*. Conserver le fichier.
3. Dans Google Agenda (compte de l'association) : créer un agenda dédié, ex. « RDV site Nant'Unity ». *Paramètres → Partager avec des personnes* : ajouter l'e-mail du compte de service avec le droit **« Apporter des modifications aux événements »**.
4. Partager cet agenda avec les membres concernés : ils voient les rendez-vous en temps réel.
5. Variables à renseigner :
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` du JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` du JSON (entre guillemets, avec les `\n`)
   - `GOOGLE_CALENDAR_ID` = *Paramètres de l'agenda → Intégrer l'agenda → ID de l'agenda*
   - facultatif `GOOGLE_BUSY_CALENDAR_IDS` = autres agendas à consulter pour bloquer les créneaux (agendas personnels des membres, partagés eux aussi avec le compte de service, au moins en « Voir uniquement les infos de disponibilité »).

**Fonctionnement** : les créneaux sont calculés à partir des horaires d'ouverture (`src/data/booking.ts`) moins tous les événements présents dans l'agenda (y compris ceux ajoutés à la main par l'équipe). Chaque réservation crée un événement. Le créneau est revérifié au moment de la réservation, et une double vérification après écriture empêche les doubles réservations. Fuseau : Europe/Paris, changements d'heure inclus.

### 3. E-mails (Resend)
1. Créer un compte sur [resend.com](https://resend.com) et **vérifier le domaine** de l'association (enregistrements DNS fournis par Resend).
2. Créer une clé API.
3. Variables : `RESEND_API_KEY`, `MAIL_FROM` (ex. `Nant'Unity <rendez-vous@nantunity.fr>`), `TEAM_NOTIFY_EMAILS` (adresses de l'équipe, séparées par des virgules).

Sans Resend configuré, le formulaire de contact ouvre la messagerie du visiteur avec la demande pré-remplie.

### 4. Secret de sécurité
`BOOKING_SECRET` : chaîne aléatoire qui signe les liens « modifier / annuler » envoyés par e-mail.
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 5. Informations juridiques et contenus
Dans `src/data/site.ts` (bloc `legal`) :
- numéro RNA et SIRET, n° de TVA ou mention d'exonération ;
- adresse du siège, préfecture et date de déclaration ;
- directeur·rice de la publication, référent·e RGPD et adresse e-mail dédiée ;
- hébergeur (nom, adresse, téléphone) ;
- médiateur de la consommation, si l'association travaille pour des particuliers.

Également :
- nom de domaine définitif (`site.url`), e-mail et réseaux sociaux ;
- **CGV** : les conditions de paiement, l'acompte, les délais et l'assurance sont à compléter et à faire valider ;
- **Appellation « Junior-Entreprise »** : c'est une marque de la CNJE. Il faut vérifier le statut de l'association avant d'utiliser ce terme publiquement.
- Dans les pages légales, les champs « À compléter » sont **surlignés**. Les traductions anglaises des pages légales restent à faire valider.

Les durées de conservation indiquées dans la politique de confidentialité sont des **propositions** (référentiels CNIL), à valider par le bureau.

---

## Modifier les contenus

| Je veux modifier… | Fichier |
| --- | --- |
| Textes du site (FR / EN), y compris pôles, FAQ, valeurs, formulaires | `src/i18n/fr.ts` et `src/i18n/en.ts` |
| Slugs d'URL traduits | `src/i18n/config.ts` (`routes`) |
| Couleurs et slugs des pôles | `src/data/poles.ts` |
| Équipe, témoignages, logos clients | `src/data/about.ts` (témoignages et logos masqués tant que les listes sont vides) |
| Horaires, durées, délais, jours fermés des rendez-vous | `src/data/booking.ts` |
| Coordonnées, réseaux, infos légales, outil d'audience | `src/data/site.ts` |
| Couleurs de marque, thèmes clair/sombre, typos | `src/styles/tokens.css` |
| Projets | `src/content/projets/fr/*.md` et `src/content/projets/en/*.md` |
| Pages légales | `src/legal/fr/*.astro` et `src/legal/en/*.astro` |

### Ajouter un projet
Aucun projet n'est publié pour l'instant : la page « Nos projets » et l'accueil affichent un état « Nos premières réalisations arrivent bientôt ». Il disparaît automatiquement dès qu'un projet est ajouté.
1. Copier `src/content/projets/_MODELE.md` vers `src/content/projets/fr/mon-projet.md` et remplir les champs.
2. Créer la version anglaise `src/content/projets/en/my-project.md` avec `key: mon-projet`, pour relier les deux langues.
3. Pour une image réelle : `cover: ../../../assets/projets/image.jpg`. Sans image, un visuel est généré aux couleurs du pôle.

### Ajouter un outil de mesure d'audience
Renseigner `site.analytics` (ex. Plausible). Le script n'est chargé **qu'après consentement** (catégorie « Mesure d'audience ») ; la politique cookies doit alors être complétée.

---

## Direction artistique
- **Typographies :**
  - Anton pour les titres, en écho à « UNITY » ;
  - Roboto, police principale, pour les textes, menus, boutons et formulaires ;
  - Fraunces italique pour les mots d'accent : un serif moderne et lisible, en écho à « Nant’ ».

  Toutes les polices sont hébergées sur le site.
- **Couleurs :** orange `#ffbb54` et noir pour l'identité, un duo de couleurs du logo pour chaque pôle.
- **Thèmes clair et sombre :** toutes les surfaces suivent le thème (sections, en-tête, menus, pop-ups, formulaires, footer). Les couleurs sont définies une seule fois, dans `src/styles/tokens.css`.
  - En mode clair, les fonds sont clairs et le logo noir.
  - En mode sombre, les fonds sont noirs ou anthracite et le logo orange.
  - Les bandeaux orange et les sections aux couleurs des pôles restent identiques dans les deux modes.
- **Couleurs des pôles :** chaque pôle a une couleur de titre (`--pole-title`) qui garantit le contraste. Pour Événementiel, l'accent pêche sur le bleu n'atteignait que 1,9:1 ; les titres sont donc en noir (6,4:1).

## Accessibilité
- Lien d'évitement et focus visible.
- Navigation complète au clavier (menu déroulant, calendrier piloté aux flèches, FAQ en `<details>`).
- Libellés de formulaire et erreurs annoncées (`aria-live`).
- Couleurs de texte choisies pour viser le niveau AA dans les deux thèmes (audit RGAA complet recommandé avant la mise en ligne).
- `prefers-reduced-motion` respecté.
- Attribut `lang` correct sur chaque page.
