# Guide de Déploiement

Ce guide vous explique comment déployer l'application LoL Draft Betting sur Firebase Hosting.

## Prérequis

1. **Firebase CLI installé** :
```bash
npm install -g firebase-tools
```

2. **Connecté à Firebase** :
```bash
firebase login
```

3. **Projet Firebase configuré** :
```bash
firebase use draft-betting
```

## Étapes de Déploiement

### 1. Vérifier les Variables d'Environnement

Assurez-vous que votre fichier `.env.local` contient toutes les variables Firebase nécessaires :
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### 2. Build de Production

```bash
npm run build
```

Cela créera un dossier `dist/` avec les fichiers optimisés pour la production.

### 3. Tester le Build Localement (Optionnel)

```bash
npm run preview
```

Ouvrez http://localhost:4173 pour vérifier que tout fonctionne.

### 4. Déployer Firestore Rules

```bash
npm run deploy:rules
```

Ou manuellement :
```bash
firebase deploy --only firestore:rules
```

### 5. Déployer Cloud Functions (si nécessaire)

```bash
npm run deploy:functions
```

Ou manuellement :
```bash
firebase deploy --only functions
```

### 6. Déployer l'Application Web

```bash
npm run deploy
```

Ou manuellement :
```bash
firebase deploy --only hosting
```

### 7. Déployer Tout en Une Fois

```bash
npm run deploy:all
```

## Configuration Firebase Hosting

La configuration est dans `firebase.json` :

- **Public directory**: `dist` (fichiers buildés par Vite)
- **Rewrites**: Toutes les routes redirigent vers `/index.html` (SPA routing)
- **Cache headers**: Optimisés pour les assets statiques

## Variables d'Environnement en Production

⚠️ **Important** : Les variables d'environnement Vite sont intégrées au build. 

**Pour la production**, vous avez deux options :

### Option 1: Build avec .env.local (Recommandé pour début)

1. Assurez-vous que `.env.local` contient les bonnes valeurs
2. Exécutez `npm run build`
3. Les variables seront intégrées dans le build

### Option 2: Variables d'environnement Firebase Hosting

1. Allez dans Firebase Console → Hosting → Settings
2. Ajoutez les variables d'environnement
3. Redéployez

## Vérification Post-Déploiement

1. **Vérifier l'URL** : https://draft-betting.web.app (ou votre domaine personnalisé)
2. **Tester l'authentification** : Créer un compte, se connecter
3. **Tester les fonctionnalités** : Créer un match (admin), placer un bet, etc.
4. **Vérifier les règles Firestore** : S'assurer que les permissions fonctionnent

## Rollback

Si quelque chose ne va pas, vous pouvez revenir à une version précédente :

```bash
firebase hosting:clone SOURCE_SITE_ID:TARGET_CHANNEL_ID
```

Ou depuis la console Firebase : Hosting → Releases → Sélectionner une version précédente

## Troubleshooting

### Erreur : "Missing required Firebase environment variables"
- Vérifiez que `.env.local` existe et contient toutes les variables
- Redémarrez le serveur de dev après avoir créé/modifié `.env.local`

### Erreur : "Firebase hosting not configured"
- Vérifiez que `firebase.json` contient la section `hosting`
- Vérifiez que le dossier `dist/` existe après le build

### L'application ne charge pas
- Vérifiez que les Firestore rules sont déployées
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez les logs Firebase dans la console

## Commandes Utiles

```bash
# Voir l'état du déploiement
firebase hosting:channel:list

# Voir les logs
firebase functions:log

# Tester les règles Firestore localement
firebase emulators:start --only firestore
```

