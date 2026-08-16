# Kitchu Mobile

Application iOS et Android native de Kitchu, construite avec Expo SDK 57,
Expo Router et TanStack Query. Elle utilise l'application Next.js de
`apps/web` comme backend et ne contient aucun accès direct à Prisma.

Le workspace nécessite Node.js 22.13 ou plus récent. Les builds iOS SDK 57
nécessitent Xcode 26.4 ou plus récent.

## Démarrage

Depuis la racine du monorepo :

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm dev:web
pnpm mobile:ios # première compilation native locale
pnpm dev:mobile
```

Sur un appareil physique, `EXPO_PUBLIC_API_URL` doit pointer vers l'adresse IP
locale de l'ordinateur (et non `localhost`). `pnpm dev:mobile` démarre Metro
pour le development build Kitchu installé sur l'appareil. Expo Go n'est pas le
workflow principal ; `pnpm --filter @kitchu/mobile start:go` reste uniquement
un outil de dépannage facultatif.

Les commandes `pnpm mobile:ios` et `pnpm mobile:android` exécutent la
Continuous Native Generation, compilent l'application native et l'installent
sur le simulateur ou l'émulateur. Les dossiers générés `ios/` et `android/`
restent ignorés par Git.

Si `pnpm install` est exécuté après la génération du dossier `ios/`, resynchronisez
les Pods avant de relancer un build directement depuis Xcode :

```bash
pnpm mobile:pods
```

Cette étape recrée notamment les sources SQLite copiées par le podspec
`expo-sqlite` dans son dossier `ios/`.

Le workspace applique aussi le patch pnpm versionné
`patches/expo-sqlite@57.0.1.patch`. Il donne au header SQLite embarqué un nom
non ambigu afin que Xcode n'importe pas le `sqlite3.h` système à sa place.
Supprimez ce patch lorsqu'une version corrective officielle d'`expo-sqlite`
reprend le même correctif.

Si Xcode conserve ensuite un module Swift/Clang construit avec les anciens
headers, forcez une compilation sans Derived Data :

```bash
pnpm mobile:ios:clean
```

## EAS Build

La première configuration nécessite un compte Expo et crée le projet distant :

```bash
pnpm --filter @kitchu/mobile eas:init
```

Configurez ensuite `EXPO_PUBLIC_API_URL` dans les environnements EAS
`development`, `preview` et `production`. Il s'agit uniquement d'une URL
publique : les secrets Better Auth, OAuth et Prisma restent sur Vercel.

```bash
# Development builds internes iOS et Android
pnpm build:mobile:development

# Version distribuable aux testeurs
pnpm build:mobile:preview

# Binaires signés App Store et Google Play
pnpm build:mobile:production

# Ou une plateforme uniquement
pnpm build:mobile:ios
pnpm build:mobile:android

# Envoi des derniers binaires aux stores
pnpm submit:mobile:production
```

Les profils sont définis dans `eas.json`. `development` inclut les outils du
dev client, `preview` produit une application autonome distribuée en interne,
et `production` produit les binaires autonomes destinés aux stores.

## Architecture

- `app/` contient les onglets et écrans Expo Router.
- `components/` contient uniquement des composants React Native.
- `lib/api-client.ts` centralise les appels HTTP et le cookie Better Auth.
- `lib/query-client.ts` persiste les dernières lectures dans SQLite.
- `@kitchu/domain` fournit les schémas, types et calculs partagés avec le web.

Les mutations sont refusées hors connexion. Le cache privé est segmenté par
utilisateur et supprimé lors de la déconnexion.
