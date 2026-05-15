````markdown
# TickView

Une plateforme de gestion de tickets multi-rôles conçue pour le traitement des plaintes clients et des demandes de support.

Développée avec React, TypeScript, Vite, Tailwind CSS et Supabase.

## Rôles

- **Client** — Soumettre et suivre ses réclamations
- **Agent** — Gérer et répondre aux tickets
- **Expert** — Prendre en charge les tickets techniques escaladés
- **Administrateur** — Supervision complète, tableau de bord KPI, gestion des utilisateurs et configuration des SLA

## Fonctionnalités

- Authentification multi-rôles avec routes protégées
- Mises à jour des tickets en temps réel via les canaux Supabase
- Notifications intégrées et par email
- Tableau de bord KPI avec graphiques multi-périodes (area, pie, bar)
- Exportation des données en CSV et PDF
- Escalade SLA automatisée avec tâches cron
- Système de mot de passe oublié / réinitialisation
- Listes de tickets paginées avec filtres avancés

## Installation

1. Cloner le dépôt.

2. Installer les dépendances :
   ```bash
   npm install
````

3. Copier le fichier d’environnement et renseigner vos identifiants Supabase :

   ```bash
   cp .env.example .env
   ```

4. Lancer le serveur de développement :

   ```bash
   npm run dev
   ```

## Variables d’environnement

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | URL de votre projet Supabase  |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anonyme Supabase |

## Base de données

L’application repose sur une base de données PostgreSQL Supabase avec Row Level Security (RLS) activé.

Les scripts SQL de configuration des notifications, des tâches cron SLA et des règles avancées de notifications se trouvent dans le dossier de documentation du projet.

## Stack Technique

* React 18 + TypeScript
* Vite
* Tailwind CSS
* Supabase (Auth, Database, Realtime, Storage)
* Recharts
* date-fns
* React Router v6
* Lucide React

```
```
