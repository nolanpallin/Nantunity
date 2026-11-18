# Tutoriel — Mettre le site Nant'Unity sur votre compte GitHub

Ce guide vous permet de sauvegarder le code du site sur GitHub, puis de le relier à Vercel. Ensuite, **chaque modification envoyée sur GitHub met automatiquement le site en ligne**, sans rien relancer à la main.

Durée : 15 à 20 minutes la première fois. Aucune connaissance technique n'est nécessaire avec la méthode A.

---

## ⚠️ Avant de commencer : placer le projet dans un dossier durable

Le projet se trouve actuellement dans un dossier temporaire, créé par l'application Claude pour cette session. **Ce dossier sera supprimé avec la session.**

Avant tout, déplacez le projet dans un dossier à vous, par exemple `Documents\nantunity-site`. Vous pouvez demander à Claude : *« Déplace cette session dans Documents »*.

---

## Étape 1 — Créer votre compte GitHub (si ce n'est pas déjà fait)

1. Allez sur **https://github.com** et cliquez sur **Sign up**.
2. Choisissez un nom d'utilisateur (par exemple `nantunity`), votre e-mail et un mot de passe.
3. Validez le code reçu par e-mail.

> Conseil : créez une **organisation** GitHub au nom de l'association (*Your organizations → New organization → Free*). Le code ne dépend ainsi d'aucun compte personnel, ce qui est pratique quand le bureau change chaque année.

---

## Étape 2 — Créer le dépôt (l'espace qui va contenir le code)

1. Sur GitHub, cliquez sur le **+** en haut à droite, puis sur **New repository**.
2. Remplissez :
   - **Owner** : votre compte ou l'organisation de l'association ;
   - **Repository name** : `nantunity-site` ;
   - **Visibility** : **Private** (recommandé : le code n'est visible que par vous et les personnes que vous invitez).
3. **Ne cochez rien d'autre** : pas de README, pas de .gitignore, pas de licence. Le projet a déjà tout ce qu'il faut.
4. Cliquez sur **Create repository**. Gardez cette page ouverte : elle affiche l'adresse du dépôt, du type `https://github.com/VOTRE-COMPTE/nantunity-site.git`.

---

## Étape 3 — Envoyer le code sur GitHub

### Méthode A — GitHub Desktop (recommandée, sans ligne de commande)

1. Téléchargez et installez **GitHub Desktop** : https://desktop.github.com. Git est inclus, pas besoin de l'installer à part.
2. Ouvrez GitHub Desktop, puis connectez-vous : *File → Options → Accounts → Sign in to GitHub.com*.
3. Menu **File → Add local repository…**, puis choisissez le dossier du projet (`nantunity-site`).
4. GitHub Desktop indique que ce dossier n'est pas encore un dépôt Git : cliquez sur **create a repository**, puis sur **Create repository**. Laissez les options par défaut.
5. Dans la colonne de gauche apparaissent les fichiers du site. Vérifiez qu'**aucun fichier `.env` ni `.env.local`** ne figure dans la liste. Ils sont exclus automatiquement par le fichier `.gitignore` du projet, car ils contiennent des secrets.
6. En bas à gauche, dans **Summary**, écrivez `Première version du site`, puis cliquez sur **Commit to main**.
7. Cliquez sur **Publish repository** en haut. Choisissez le nom `nantunity-site`, cochez **Keep this code private**, et pour une organisation, sélectionnez-la dans **Organization**. Cliquez sur **Publish repository**.

C'est fait : actualisez la page du dépôt sur GitHub, le code y est.

> Si vous avez déjà créé le dépôt à l'étape 2 et que GitHub Desktop indique qu'il existe déjà, publiez sous un autre nom ou supprimez le dépôt vide sur GitHub (*Settings → Danger zone → Delete*), puis recommencez le point 7.

### Méthode B — Ligne de commande

1. Installez Git : https://git-scm.com/download/win (options par défaut).
2. Ouvrez un terminal **dans le dossier du projet**, puis lancez ces commandes une par une, en remplaçant `VOTRE-COMPTE` :

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Première version du site"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/VOTRE-COMPTE/nantunity-site.git
```

```bash
git push -u origin main
```

3. À la première commande `git push`, une fenêtre de connexion GitHub s'ouvre : connectez-vous dans le navigateur. Le mot de passe n'est jamais tapé dans le terminal.

Vérification : `git status` doit afficher *« nothing to commit, working tree clean »*, et les fichiers `.env` ne doivent pas apparaître sur GitHub.

---

## Étape 4 — Relier GitHub à Vercel (mise en ligne automatique)

Le site est déjà en ligne sur Vercel (projet `nantunity`, adresse https://nantunity.vercel.app). Il reste à le connecter au dépôt :

1. Allez sur **https://vercel.com** et connectez-vous avec le compte qui héberge déjà le projet.
2. Ouvrez le projet **nantunity**, puis **Settings → Git**.
3. Cliquez sur **Connect Git Repository**, puis choisissez **GitHub**. La première fois, autorisez Vercel à accéder à votre compte ou à votre organisation : limitez l'accès au seul dépôt `nantunity-site` si vous le souhaitez.
4. Sélectionnez le dépôt **nantunity-site**, puis cliquez sur **Connect**.
5. Vérifiez que la **Production Branch** est bien `main` (*Settings → Git*).

Désormais :
- **chaque envoi sur la branche `main`** met à jour https://nantunity.vercel.app en une à deux minutes ;
- **chaque autre branche** obtient une adresse de prévisualisation privée, pratique pour faire valider une modification avant de la publier.

---

## Étape 5 — Les secrets (agenda, e-mails) : jamais sur GitHub

Les clés Google Agenda, Resend et le secret de sécurité **ne doivent jamais être envoyés sur GitHub**. Ils se renseignent uniquement dans Vercel :

1. Sur Vercel, ouvrez le projet **nantunity**, puis **Settings → Environment Variables**.
2. Ajoutez une à une les variables listées dans le fichier `.env.example` du projet (sans `BOOKING_DEMO`).
3. Ouvrez l'onglet **Deployments**, puis sur le dernier déploiement cliquez sur **⋯ → Redeploy** pour qu'elles soient prises en compte.

Le README du projet explique comment obtenir chaque clé.

---

## Au quotidien : modifier le site

**Avec GitHub Desktop**
1. Modifiez les fichiers (textes dans `src/i18n/fr.ts` et `src/i18n/en.ts`, projets dans `src/content/projets/`…).
2. Dans GitHub Desktop, écrivez un résumé, par exemple *« Ajout du projet Boulangerie Dupont »*, puis cliquez sur **Commit to main**.
3. Cliquez sur **Push origin**. Le site se met à jour tout seul sur Vercel.

**En ligne de commande**

```bash
git add .
```

```bash
git commit -m "Description de la modification"
```

```bash
git push
```

**Directement sur GitHub**, pour une petite correction de texte : ouvrez le fichier sur github.com, cliquez sur le crayon ✏️, modifiez, puis **Commit changes**. Vercel publie automatiquement.

---

## Donner accès à d'autres membres de l'association

- **Organisation GitHub** : *Organization → People → Invite member*.
- **Dépôt personnel** : *Repository → Settings → Collaborators → Add people*.
- Sur Vercel, invitez aussi les membres dans l'équipe du projet si nécessaire (*Team Settings → Members*).

---

## En cas de problème

| Problème | Solution |
| --- | --- |
| Un fichier `.env` apparaît dans la liste à envoyer | Ne validez pas. Vérifiez que le fichier `.gitignore` est bien à la racine du projet. |
| Le site ne se met pas à jour après un envoi | Sur Vercel, ouvrez l'onglet **Deployments** : un déploiement en rouge affiche l'erreur (cliquez dessus pour voir le journal). |
| `git push` est refusé (« rejected ») | Quelqu'un a envoyé des modifications avant vous. Faites d'abord **Fetch / Pull** dans GitHub Desktop (ou `git pull`), puis renvoyez. |
| Vous voulez revenir à une version précédente du site | Sur Vercel, ouvrez **Deployments**, choisissez l'ancienne version, puis **⋯ → Promote to Production**. Le retour est instantané. |
