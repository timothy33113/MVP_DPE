# 🚀 Déploiement avec Vercel + Supabase

## 🎯 Architecture

```
Frontend (Vercel) → Backend API (Vercel Serverless) → PostgreSQL (Supabase)
```

### Avantages de cette architecture

- **100% Gratuit** pour commencer (Vercel Hobby + Supabase Free tier)
- **PostgreSQL géré** par Supabase (500 MB gratuit)
- **Interface d'admin** Supabase pour gérer les données
- **API REST auto-générée** par Supabase (optionnel)
- **Backups automatiques** inclus dans Supabase
- **SSL/HTTPS** automatique sur Vercel
- **CDN global** pour le frontend

### Coûts

| Service | Plan Gratuit | Plan Payant |
|---------|--------------|-------------|
| **Vercel** | ✅ Frontend illimité | $20/mois (Pro) |
| **Supabase** | ✅ 500 MB DB, 2 GB bandwidth | $25/mois (Pro) |
| **Total** | **$0/mois** | $45/mois si scale |

---

## 📋 PARTIE 1 : Configurer Supabase

### Étape 1 : Créer un projet Supabase

1. Allez sur **https://supabase.com**
2. Cliquez sur **"Start your project"**
3. Connectez-vous avec **GitHub**
4. Cliquez sur **"New Project"**

### Étape 2 : Configurer le projet

- **Organization** : Créez-en une nouvelle ou utilisez existante
- **Name** : `dpe-matching`
- **Database Password** : Générez un mot de passe fort (sauvegardez-le !)
- **Region** : `Europe (Paris)` ou `Europe (Frankfurt)`
- **Plan** : Free (pour commencer)

Cliquez sur **"Create new project"** et attendez ~2 minutes.

### Étape 3 : Récupérer les informations de connexion

Une fois le projet créé, allez dans **Settings** → **Database** :

Vous verrez :
- **Host** : `db.xxx.supabase.co`
- **Database name** : `postgres`
- **Port** : `5432`
- **User** : `postgres`
- **Password** : celui que vous avez défini

### Étape 4 : Construire la DATABASE_URL

Format PostgreSQL standard :
```
postgresql://postgres:[VOTRE_PASSWORD]@db.xxx.supabase.co:5432/postgres
```

⚠️ **Important** : Remplacez `[VOTRE_PASSWORD]` et `xxx` par vos vraies valeurs.

**Exemple** :
```
postgresql://postgres:MySecurePass123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### Étape 5 : Récupérer les clés API Supabase (optionnel)

Dans **Settings** → **API**, notez :
- **Project URL** : `https://xxx.supabase.co`
- **anon public** key : `eyJhbG...` (pour le frontend)
- **service_role** key : `eyJhbG...` (pour le backend, privée)

---

## 📊 PARTIE 2 : Migrer le Schéma Prisma vers Supabase

### Étape 1 : Mettre à jour le .env local

Créez ou modifiez `packages/backend/.env` :

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

### Étape 2 : Exécuter les migrations Prisma

Depuis la racine du projet :

```bash
cd packages/backend
npx prisma migrate deploy
```

Cela va créer toutes vos tables dans Supabase :
- `leboncoin_annonces`
- `dpe_records`
- `annonce_dpe_clusters`
- etc.

### Étape 3 : Vérifier dans Supabase

1. Allez sur Supabase → **Table Editor**
2. Vous devriez voir toutes vos tables créées
3. Cliquez sur une table pour voir sa structure

---

## 🔧 PARTIE 3 : Adapter le Backend pour Vercel Serverless

Votre backend Express actuel ne peut pas tourner tel quel sur Vercel (qui utilise des fonctions serverless). Deux options :

### Option A : Backend sur Vercel Serverless (Recommandé)

Convertir votre API Express en fonctions Vercel.

### Option B : Backend sur Railway + DB sur Supabase

Garder votre backend Express sur Railway mais utiliser Supabase uniquement pour la DB.

**Je recommande l'Option B** car :
- ✅ Aucun code à modifier
- ✅ Votre backend Express fonctionne déjà
- ✅ Simplicité maximale
- ✅ Supabase offre une meilleure DB que Railway (interface, backups, etc.)

---

## 🚀 PARTIE 4 : Déployer avec Railway (Backend) + Supabase (DB) + Vercel (Frontend)

### Architecture finale :
```
Frontend (Vercel) → Backend Express (Railway) → PostgreSQL (Supabase)
```

### Coûts :
- Vercel : Gratuit
- Railway : ~$5/mois
- Supabase : Gratuit (500 MB)
- **Total : ~$5/mois**

---

## 📦 Étape 4.1 : Déployer le Backend sur Railway

1. Allez sur **https://railway.app**
2. Connectez-vous avec **GitHub**
3. Cliquez sur **"New Project"** → **"Deploy from GitHub repo"**
4. Sélectionnez **`MVP_DPE`**

### Configuration Railway :

**Settings** → **Root Directory** :
```
packages/backend
```

**Build Command** :
```bash
pnpm install && npx prisma generate && pnpm build
```

**Start Command** :
```bash
npx prisma migrate deploy && node dist/index.js
```

**Variables d'Environnement** :
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
JWT_SECRET=<générer avec: openssl rand -base64 32>
CORS_ORIGIN=*
NODE_OPTIONS=--max-old-space-size=4096
RAPIDAPI_KEY=<votre clé>
MONDAY_API_KEY=<votre clé>
MONDAY_BOARD_ID=<votre board>
```

⚠️ **Important** : Utilisez la `DATABASE_URL` de Supabase !

Cliquez sur **"Deploy"** et attendez 2-3 minutes.

**Notez l'URL** : `https://votre-backend.up.railway.app`

---

## 🌐 Étape 4.2 : Déployer le Frontend sur Vercel

1. Allez sur **https://vercel.com**
2. Connectez-vous avec **GitHub**
3. Cliquez sur **"Add New..."** → **"Project"**
4. Sélectionnez **`MVP_DPE`**

### Configuration Vercel :

Vercel lit automatiquement `vercel.json`, vous n'avez qu'à ajouter :

**Environment Variables** :
```
VITE_API_URL=https://votre-backend.up.railway.app
```

Cliquez sur **"Deploy"** et attendez 2-3 minutes.

**Notez l'URL** : `https://votre-app.vercel.app`

---

## 🔗 Étape 4.3 : Configurer CORS

Retournez sur **Railway** → **Variables**, modifiez :
```
CORS_ORIGIN=https://votre-app.vercel.app
```

Railway va redéployer automatiquement (~1 min).

---

## 📊 PARTIE 5 : Importer les Données DPE dans Supabase

### Option A : Via script local (Recommandé)

1. Assurez-vous que votre `.env` local pointe vers Supabase :
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
   ```

2. Exécutez l'import depuis votre machine :
   ```bash
   cd packages/backend
   npx tsx scripts/import-dpe.ts
   ```

3. Cela va importer vos **46,073 DPE** directement dans Supabase

### Option B : Via Railway CLI

```bash
railway login
railway link
railway run npx tsx packages/backend/scripts/import-dpe.ts
```

### Vérifier l'import

1. Allez sur Supabase → **Table Editor** → **dpe_records**
2. Vous devriez voir ~46,000 lignes
3. Cliquez sur **"View all rows"** pour vérifier

---

## ✅ PARTIE 6 : Tester l'Application

### 6.1 - Tester le Backend

Ouvrez dans un navigateur :
```
https://votre-backend.up.railway.app/health
```

Vous devriez voir :
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T..."
}
```

### 6.2 - Tester le Frontend

1. Ouvrez `https://votre-app.vercel.app`
2. La carte devrait s'afficher
3. Les points DPE devraient apparaître (46,000+)
4. Testez les filtres à gauche
5. Testez l'ajout d'un DPE à Monday.com

---

## 🎉 Félicitations !

Votre application est maintenant en production avec :

- ✅ **Frontend** sur Vercel (CDN global, HTTPS)
- ✅ **Backend** sur Railway (Node.js, Express)
- ✅ **Base de données** sur Supabase (PostgreSQL géré)
- ✅ **46,073 DPE** importés
- ✅ **5,216 annonces LeBonCoin**
- ✅ **1,302 clusters de matching**

---

## 📊 Monitoring et Administration

### Supabase Dashboard

- **Table Editor** : Voir et éditer vos données
- **SQL Editor** : Exécuter des requêtes SQL
- **Database** → **Backups** : Backups automatiques quotidiens
- **Logs** : Voir les requêtes et erreurs

### Railway Dashboard

- **Deployments** : Historique des déploiements
- **Metrics** : CPU, RAM, Network
- **Logs** : Console de votre backend

### Vercel Dashboard

- **Deployments** : Historique des builds
- **Analytics** : Visites, performances
- **Logs** : Erreurs frontend

---

## 🆘 Troubleshooting

### Erreur : "Failed to fetch"

1. Vérifiez que le backend Railway est en ligne
2. Testez : `https://votre-backend.up.railway.app/health`
3. Vérifiez les logs Railway

### Erreur : "CORS policy"

1. Sur Railway, vérifiez `CORS_ORIGIN=https://votre-app.vercel.app`
2. Pas d'espace, pas de slash final
3. Redéployez Railway

### Base de données vide

1. Vérifiez la connexion Supabase : Table Editor → dpe_records
2. Relancez l'import : `npx tsx scripts/import-dpe.ts`
3. Vérifiez les logs dans le terminal

### Out of memory

1. Sur Railway, augmentez les ressources (Variables) :
   ```
   NODE_OPTIONS=--max-old-space-size=8192
   ```
2. Ou passez au plan payant Railway ($5/mois)

---

## 💰 Quand passer aux plans payants ?

### Supabase Free Limits :
- 500 MB de stockage
- 2 GB de bandwidth/mois
- Backups 7 jours

**Quand upgrader ?** Si vous dépassez 500 MB de DB ou avez beaucoup de trafic.

### Railway Free Credits :
- $5 de crédits gratuits/mois
- Puis pay-as-you-go

**Quand upgrader ?** Si vous dépassez $5/mois (après quelques semaines d'usage).

### Vercel Free :
- Bandwidth illimité
- 100 GB-hours/mois

**Quand upgrader ?** Rarement nécessaire pour votre app.

---

## 🔐 Sécurité

### À faire après le déploiement :

1. ✅ Changez le `JWT_SECRET` (ne pas utiliser celui du .env.example)
2. ✅ Configurez un CORS strict : `CORS_ORIGIN=https://votre-app.vercel.app`
3. ✅ Activez le firewall Supabase (Settings → Database → Connection pooling)
4. ✅ Limitez l'accès à la DB Supabase (ne gardez que l'IP de Railway)
5. ✅ Surveillez les logs Supabase pour détecter des accès suspects

---

## 📚 Ressources

- **Supabase Docs** : https://supabase.com/docs
- **Railway Docs** : https://docs.railway.app
- **Vercel Docs** : https://vercel.com/docs
- **Prisma + Supabase** : https://www.prisma.io/docs/guides/database/supabase

---

**Besoin d'aide ?** Lisez les sections suivantes du guide ou demandez de l'aide !
