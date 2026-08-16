# Kitchu

Monorepo pnpm contenant l’application web Next.js et l’application native Expo.

## Développement

```bash
pnpm install
pnpm dev:web
pnpm dev:mobile
```

- `apps/web` : interface web, API, authentification Better Auth et accès Prisma.
- `apps/mobile` : application Expo pour iOS et Android.
- `packages/domain` : contrats et logique métier partagés.

Consultez les README de chaque application pour leur configuration d’environnement.

L'application mobile utilise un Expo development build pendant le
développement et EAS Build pour les binaires de production. Expo Go n'est pas
une cible de livraison.
