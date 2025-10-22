# 🚀 Déploiement sur Vercel + Railway

Ce guide explique comment déployer l'application DPE-Matching en utilisant :
- **Vercel** pour le frontend (gratuit, rapide, CDN global)
- **Railway.app** pour le backend + PostgreSQL (simple, tout-en-un)

## 📊 Architecture de déploiement

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  VERCEL (Frontend)                                          │
│  ├── React + Vite build                                     │
│  ├── CDN Global                                             │
│  ├── HTTPS automatique                                      │
│  └── URL: https://votre-app.vercel.app                      │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ API calls
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  RAILWAY (Backend + Database)                               │
│  ├── Node.js API (Express)                                  │
│  ├── PostgreSQL 16                                          │
│  ├── HTTPS automatique                                      │
│  └── URL: https://votre-backend.railway.app                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Coûts estimés

| Service | Plan | Coût | Inclus |
|---------|------|------|--------|
| **Vercel** | Hobby (gratuit) | $0/mois | 100GB bandwidth, builds illimités |
| **Railway** | Developer | ~$5-10/mois | 512MB RAM, 1GB storage, PostgreSQL |
| **Total** | | **~$5-10/mois** | |

---

## 📋 Prérequis

- Un compte GitHub (pour connecter les repos)
- Un compte Vercel (créer sur [vercel.com](https://vercel.com))
- Un compte Railway (créer sur [railway.app](https://railway.app))

---

## 🎯 PARTIE 1 : Déployer le Backend sur Railway

### Étape 1 : Créer un projet Railway

1. Aller sur [railway.app](https://railway.app)
2. Se connecter avec GitHub
3. Cliquer sur "New Project"
4. Choisir "Deploy from GitHub repo"
5. Sélectionner votre repository `MVP_DPE`

### Étape 2 : Configurer PostgreSQL

1. Dans le projet Railway, cliquer sur "+ New"
2. Choisir "Database" → "PostgreSQL"
3. Railway crée automatiquement la base de données
4. La variable `DATABASE_URL` est créée automatiquement ✅

### Étape 3 : Configurer le service Backend

1. Dans Railway, aller dans le service backend
2. Aller dans l'onglet "Settings"
3. **Root Directory** : `/packages/backend`
4. **Build Command** :
   ```bash
   pnpm install && pnpm prisma generate && pnpm build
   ```
5. **Start Command** :
   ```bash
   pnpm prisma migrate deploy && node dist/index.js
   ```

### Étape 4 : Ajouter les variables d'environnement

Dans l'onglet "Variables" du service backend, ajouter :

```env
NODE_ENV=production
PORT=3001
NODE_OPTIONS=--max-old-space-size=4096

# JWT (générer avec: openssl rand -base64 32)
JWT_SECRET=VOTRE_CLE_SECRETE_ICI

# CORS (URL Vercel - on configurera après)
CORS_ORIGIN=https://votre-app.vercel.app

# APIs externes
RAPIDAPI_KEY=votre-cle-rapidapi
MONDAY_API_KEY=votre-cle-monday
MONDAY_BOARD_ID=votre-board-id

# Email (optionnel)
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Étape 5 : Générer un JWT Secret

```bash
# Sur votre machine locale
openssl rand -base64 32
```

Copier le résultat dans `JWT_SECRET` sur Railway.

### Étape 6 : Déployer

1. Railway détecte automatiquement les changements
2. Le build démarre automatiquement
3. Attendre 2-3 minutes
4. Railway génère une URL : `https://votre-backend.railway.app`

### Étape 7 : Vérifier le déploiement backend

```bash
# Tester le health check
curl https://votre-backend.railway.app/health

# Devrait retourner : {"status":"ok"}
```

### Étape 8 : Importer les données DPE (optionnel)

**Via Railway CLI** :

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Lier au projet
railway link

# Shell dans le container
railway shell

# Une fois dans le shell :
cd packages/backend
npm run import:dpe /path/to/dpe.csv
```

**Ou** via une requête POST (si vous créez un endpoint d'import).

✅ **Backend déployé sur Railway !**

---

## 🌐 PARTIE 2 : Déployer le Frontend sur Vercel

### Étape 1 : Préparer le repository

Votre repository contient déjà :
- ✅ `vercel.json` - Configuration principale
- ✅ `packages/frontend/vercel.json` - Configuration frontend
- ✅ `.vercelignore` - Fichiers exclus du déploiement

### Étape 2 : Créer un projet Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer sur "Add New..." → "Project"
4. Importer votre repository `MVP_DPE`

### Étape 3 : Configurer le build

Vercel lit automatiquement le fichier `vercel.json` qui contient déjà la bonne configuration :

- ✅ **Framework Preset** : Vite (auto-détecté)
- ✅ **Root Directory** : `packages/frontend` (configuré)
- ✅ **Build Command** : `cd packages/frontend && pnpm install && pnpm build` (configuré)
- ✅ **Output Directory** : `packages/frontend/dist` (configuré)
- ✅ **Install Command** : `pnpm install` (configuré)

Vous n'avez **rien à modifier** dans l'interface Vercel, tout est déjà configuré dans `vercel.json`.

### Étape 4 : Ajouter les variables d'environnement

Dans "Environment Variables" sur Vercel :

```env
# URL du backend Railway (obtenue à l'étape précédente)
VITE_API_URL=https://votre-backend.railway.app
```

⚠️ **Important** : Les variables VITE_ sont disponibles côté client.

### Étape 5 : Déployer

1. Cliquer sur "Deploy"
2. Vercel build et déploie automatiquement
3. Attendre 1-2 minutes
4. Vercel génère une URL : `https://votre-app.vercel.app`

### Étape 6 : Mettre à jour le CORS sur Railway

1. Retourner sur Railway
2. Aller dans les variables du backend
3. Mettre à jour `CORS_ORIGIN` :
   ```env
   CORS_ORIGIN=https://votre-app.vercel.app
   ```
4. Railway redéploie automatiquement

### Étape 7 : Configurer un domaine personnalisé (optionnel)

**Sur Vercel** :
1. Aller dans "Settings" → "Domains"
2. Ajouter votre domaine : `votre-domaine.com`
3. Suivre les instructions DNS

Vercel configure automatiquement SSL/HTTPS ✅

**Sur Railway** :
1. Aller dans "Settings" → "Domains"
2. Ajouter un domaine : `api.votre-domaine.com`
3. Mettre à jour votre DNS

Puis mettre à jour les variables d'environnement :
- **Railway CORS_ORIGIN** : `https://votre-domaine.com`
- **Vercel VITE_API_URL** : `https://api.votre-domaine.com`

✅ **Frontend déployé sur Vercel !**

---

## 🔧 Configuration avancée

### Modifier l'API URL dans le frontend

Si vous devez changer l'URL de l'API après déploiement :

**Option 1 : Via variable d'environnement (recommandé)**

Sur Vercel, mettre à jour `VITE_API_URL` et redéployer.

**Option 2 : Fichier de configuration**

Créer `packages/frontend/src/config.ts` :

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Puis dans vos composants :
```typescript
import { API_URL } from './config';

fetch(`${API_URL}/api/dpes`)
```

### Activer les logs Railway

```bash
# Via Railway CLI
railway logs --service backend
```

Ou dans le dashboard Railway → onglet "Logs"

### Rollback en cas de problème

**Sur Vercel** :
1. Aller dans "Deployments"
2. Sélectionner un déploiement précédent
3. Cliquer sur "..." → "Promote to Production"

**Sur Railway** :
1. Aller dans "Deployments"
2. Sélectionner un déploiement précédent
3. Cliquer sur "Rollback"

---

## 🎯 Checklist complète

### Backend (Railway)

- [ ] Projet Railway créé
- [ ] PostgreSQL ajouté
- [ ] Variables d'environnement configurées
- [ ] JWT_SECRET généré
- [ ] Build et start commands configurés
- [ ] Backend déployé avec succès
- [ ] Health check fonctionne
- [ ] CORS_ORIGIN configuré avec URL Vercel
- [ ] Données DPE importées (optionnel)

### Frontend (Vercel)

- [ ] Projet Vercel créé depuis GitHub
- [ ] Root directory configuré (`packages/frontend`)
- [ ] Build command configuré
- [ ] VITE_API_URL configuré avec URL Railway
- [ ] Frontend déployé avec succès
- [ ] Application accessible
- [ ] API calls fonctionnent
- [ ] Carte s'affiche correctement
- [ ] Filtres fonctionnent

---

## 🧪 Tests après déploiement

### 1. Tester le backend

```bash
# Health check
curl https://votre-backend.railway.app/health

# Récupérer des DPE
curl https://votre-backend.railway.app/api/dpes?limit=5
```

### 2. Tester le frontend

1. Ouvrir `https://votre-app.vercel.app`
2. Vérifier que la carte charge
3. Vérifier que les DPE s'affichent
4. Tester les filtres
5. Tester un clic sur un point DPE
6. Vérifier la console du navigateur (F12) - pas d'erreurs CORS

### 3. Tester l'intégration complète

1. Ouvrir un DPE sur la carte
2. Cliquer sur "Envoyer à Monday"
3. Vérifier dans Monday.com que l'item a été créé

---

## 🔥 Dépannage

### Erreur CORS

**Symptôme** : Console navigateur affiche "CORS policy blocked"

**Solution** :
1. Vérifier `CORS_ORIGIN` sur Railway
2. Doit matcher exactement l'URL Vercel (avec https://)
3. Redéployer le backend sur Railway

### API calls échouent

**Symptôme** : "Failed to fetch" ou erreurs 404

**Solutions** :
1. Vérifier `VITE_API_URL` sur Vercel
2. Tester l'API directement : `curl https://votre-backend.railway.app/api/dpes`
3. Vérifier les logs Railway : `railway logs`

### Build échoue sur Vercel

**Symptôme** : Build fails avec erreurs de dépendances

**Solutions** :
1. Vérifier que `pnpm-lock.yaml` est commité
2. Vérifier le build localement : `cd packages/frontend && pnpm build`
3. Vérifier les logs de build Vercel

### Backend crash sur Railway

**Symptôme** : Service redémarre constamment

**Solutions** :
1. Vérifier les logs : `railway logs`
2. Vérifier `DATABASE_URL` est bien configurée
3. Augmenter la mémoire sur Railway si "out of memory"
4. Vérifier `NODE_OPTIONS=--max-old-space-size=4096`

### Base de données vide

**Symptôme** : Aucun DPE n'apparaît sur la carte

**Solutions** :
1. Importer les données via Railway CLI (voir Étape 8 de la Partie 1)
2. Vérifier les migrations :
   ```bash
   railway shell
   cd packages/backend
   npx prisma migrate status
   ```

---

## 📊 Monitoring

### Railway Dashboard

- **Metrics** : CPU, RAM, Network
- **Logs** : Logs en temps réel
- **Deployments** : Historique des déploiements

### Vercel Analytics

Dans le dashboard Vercel :
- **Analytics** : Visiteurs, pages vues
- **Speed Insights** : Performance
- **Logs** : Logs de fonction

---

## 💰 Optimisation des coûts

### Railway

**Plan gratuit** : 500 heures gratuites/mois (environ 21 jours)
- Idéal pour développement/démo
- Après épuisement : ~$5/mois

**Conseils** :
- Désactiver les services inutilisés
- Utiliser `railway down` pour arrêter temporairement

### Vercel

**Plan Hobby (gratuit)** :
- Builds illimités
- 100GB bandwidth/mois
- Amplement suffisant pour démarrer

**Upgrade vers Pro ($20/mois) si** :
- Plus de 100GB bandwidth
- Besoin de plus de membres d'équipe
- Analytics avancés

---

## 🚀 Déploiement automatique

Les deux services déploient automatiquement à chaque `git push` :

```bash
# Faire des modifications
git add .
git commit -m "Update feature"
git push origin main

# Railway et Vercel déploient automatiquement ✅
```

Suivre les déploiements :
- Railway : Dashboard → Deployments
- Vercel : Dashboard → Deployments

---

## 🎉 Résumé

**✅ Ce que vous avez maintenant** :

- Frontend sur Vercel avec CDN global
- Backend sur Railway avec PostgreSQL
- HTTPS/SSL automatique sur les deux
- Déploiement automatique depuis GitHub
- 46,000+ DPE accessibles
- Matching fonctionnel
- Intégration Monday.com

**📍 URLs** :
- Frontend : `https://votre-app.vercel.app`
- Backend : `https://votre-backend.railway.app`
- API : `https://votre-backend.railway.app/api/*`

**💰 Coût total** : ~$5-10/mois

**⏱️ Temps de déploiement** : 15-20 minutes

---

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Railway](https://docs.railway.app)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Express CORS](https://expressjs.com/en/resources/middleware/cors.html)

---

🎯 **Prêt à déployer ?** Suivez les étapes ci-dessus et votre application sera en ligne en moins de 20 minutes !
