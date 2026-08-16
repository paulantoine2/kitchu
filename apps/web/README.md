# Kitchu Web et API

Application Next.js de Kitchu. Elle héberge l'interface web, Prisma, Better Auth
et les routes HTTP consommées par l'application Expo.

## Démarrage

Depuis la racine du monorepo :

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web
```

Le serveur répond par défaut sur `http://localhost:3000`. Les routes mobiles
sont exposées sous `/api/v1`; Better Auth reste sous `/api/auth`.

## Base et déploiement

Les commandes Prisma sont orchestrées depuis la racine :

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

La configuration Vercel racine construit ce workspace et conserve les
migrations dans `apps/web/prisma`.
