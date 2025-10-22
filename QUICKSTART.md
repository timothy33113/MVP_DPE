# 🚀 Démarrage Rapide - Mise en Production

Ce guide vous permet de déployer l'application en **moins de 10 minutes**.

## 📦 Méthode 1 : Déploiement Local avec Docker (Plus Rapide)

### Étape 1 : Prérequis

```bash
# Installer Docker et Docker Compose
# macOS : Télécharger Docker Desktop depuis docker.com
# Linux : curl -fsSL https://get.docker.com | sh
# Windows : Télécharger Docker Desktop depuis docker.com
```

### Étape 2 : Configuration

```bash
# 1. Cloner le projet (si pas déjà fait)
cd /Users/timothy/MVP_DPE

# 2. Copier et éditer les variables d'environnement
cp .env.example .env
nano .env  # ou code .env pour VSCode

# 3. Modifier AU MINIMUM ces valeurs dans .env :
#    - POSTGRES_PASSWORD (choisir un mot de passe fort)
#    - JWT_SECRET (générer avec: openssl rand -base64 32)
#    - RAPIDAPI_KEY (votre clé RapidAPI)
#    - MONDAY_API_KEY (votre clé Monday.com)
```

### Étape 3 : Déploiement

```bash
# Lancer le script de déploiement automatique
./deploy.sh

# OU manuellement :
docker compose -f docker-compose.prod.yml up -d
```

### Étape 4 : Importer les données DPE

```bash
# Copier votre fichier CSV dans le container
docker cp /Users/timothy/Downloads/dpe03existant.csv dpe-matching-backend:/app/data.csv

# Lancer l'import (prend environ 30 secondes)
docker exec -it dpe-matching-backend sh -c "cd packages/backend && npm run import:dpe /app/data.csv"
```

### Étape 5 : Accéder à l'application

- **Frontend** : http://localhost
- **Backend API** : http://localhost:3001
- **Health Check** : http://localhost:3001/health

**✅ C'est tout ! Votre application est en ligne.**

---

## ☁️ Méthode 2 : Déploiement sur Vercel + Supabase + Railway (Recommandé pour Production)

### Architecture séparée (le plus moderne)

- **Frontend** : Vercel (CDN global, gratuit)
- **Backend** : Railway (~$5/mois)
- **Base de données** : Supabase (gratuit)
- **Total** : ~$5/mois (ou $0 si peu de trafic)
- **Avantages** :
  - ✅ Frontend ultra-rapide (CDN Vercel)
  - ✅ Déploiement automatique depuis GitHub
  - ✅ HTTPS/SSL automatique sur les deux
  - ✅ Scaling automatique

📖 **[Voir le guide complet Vercel + Supabase](./SUPABASE_DEPLOYMENT.md)** (Recommandé)

### Quick Start Vercel + Railway :

**1. Backend sur Railway** (5 minutes)
```bash
1. Créer compte sur railway.app
2. "New Project" → "Deploy from GitHub" → Sélectionner MVP_DPE
3. Ajouter PostgreSQL (bouton "+ New" → "Database" → "PostgreSQL")
4. Configurer les variables d'env (voir VERCEL_DEPLOYMENT.md)
5. Railway déploie → URL générée : https://votre-backend.railway.app
```

**2. Frontend sur Vercel** (3 minutes)
```bash
1. Créer compte sur vercel.com
2. "Add New..." → "Project" → Importer MVP_DPE
3. Root Directory: packages/frontend
4. Ajouter variable: VITE_API_URL=https://votre-backend.railway.app
5. Vercel déploie → URL générée : https://votre-app.vercel.app
```

**3. Finaliser**
```bash
# Sur Railway, mettre à jour CORS_ORIGIN :
CORS_ORIGIN=https://votre-app.vercel.app
```

✅ **Application en ligne avec URLs automatiques !**

---

## ☁️ Méthode 3 : Déploiement tout-en-un sur Railway.app

### Pourquoi Railway ?
- ✅ Déploiement en 1 clic depuis GitHub
- ✅ PostgreSQL inclus gratuitement
- ✅ SSL/HTTPS automatique
- ✅ URL fournie automatiquement
- ✅ Logs en temps réel
- ✅ Gratuit pour démarrer, puis ~$5-10/mois

### Étapes

**1. Créer un compte Railway**

Aller sur [railway.app](https://railway.app) et s'inscrire (gratuit).

**2. Nouveau projet**

- Cliquer sur "New Project"
- Choisir "Deploy from GitHub repo"
- Connecter votre repository GitHub
- Railway détecte automatiquement les Dockerfiles ✅

**3. Ajouter PostgreSQL**

- Dans le projet, cliquer sur "+ New"
- Choisir "Database" > "PostgreSQL"
- Railway crée automatiquement `DATABASE_URL`

**4. Configurer les variables d'environnement**

Dans le service backend, aller dans "Variables" et ajouter :

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<générer avec: openssl rand -base64 32>
CORS_ORIGIN=https://votre-app.railway.app
RAPIDAPI_KEY=votre-cle
MONDAY_API_KEY=votre-cle
MONDAY_BOARD_ID=votre-board-id
NODE_OPTIONS=--max-old-space-size=4096
```

**5. Déployer**

- Railway build et déploie automatiquement
- Attendre 2-3 minutes
- Une URL est générée : `https://votre-app.railway.app`

**6. Importer les DPE**

Via Railway CLI :

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Lier au projet
railway link

# Uploader et importer les données
railway run npm run import:dpe /path/to/dpe03existant.csv
```

**✅ Votre application est en ligne avec HTTPS !**

---

## 🌐 Méthode 3 : Déploiement sur un VPS (DigitalOcean, Hetzner, etc.)

### VPS Recommandés

| Fournisseur | Plan | Prix | RAM | CPU | Stockage |
|-------------|------|------|-----|-----|----------|
| Hetzner | CX31 | €8/mois | 8GB | 2 vCPU | 80GB SSD |
| DigitalOcean | Droplet | $24/mois | 4GB | 2 vCPU | 80GB SSD |
| Contabo | VPS M | €7/mois | 8GB | 4 vCPU | 200GB SSD |

### Étapes Rapides

**1. Créer un VPS et se connecter**

```bash
ssh root@votre-ip-serveur
```

**2. Installation Docker**

```bash
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y
```

**3. Cloner et configurer**

```bash
cd /opt
git clone <votre-repo-url> dpe-matching
cd dpe-matching
cp .env.example .env
nano .env  # Remplir les valeurs
```

**4. Déployer**

```bash
./deploy.sh
```

**5. Configurer le pare-feu**

```bash
ufw allow 22   # SSH
ufw allow 80   # HTTP
ufw allow 443  # HTTPS
ufw enable
```

**6. Configurer un nom de domaine (optionnel)**

Chez votre registrar (ex: Namecheap, OVH) :
- Type A : `@` → `votre-ip-serveur`
- Type A : `www` → `votre-ip-serveur`

**7. SSL avec Let's Encrypt (optionnel)**

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d votre-domaine.com
```

**✅ Application accessible sur http://votre-ip ou https://votre-domaine.com**

---

## 🔧 Commandes Utiles

### Gestion des services

```bash
# Voir les logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Arrêter tous les services
docker compose -f docker-compose.prod.yml down

# Voir l'état des services
docker compose -f docker-compose.prod.yml ps
```

### Backup de la base de données

```bash
# Backup manuel
docker compose -f docker-compose.prod.yml run --rm backup

# Configurer backup automatique quotidien (cron)
crontab -e
# Ajouter : 0 2 * * * cd /opt/dpe-matching && docker compose -f docker-compose.prod.yml run --rm backup
```

### Mettre à jour l'application

```bash
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring

### Vérifier la santé des services

```bash
# Health check backend
curl http://localhost:3001/health

# État des containers
docker compose ps

# Utilisation CPU/RAM
docker stats
```

---

## 🆘 Dépannage Rapide

### Le backend ne démarre pas

```bash
# Voir les logs
docker compose logs backend

# Vérifier la connexion DB
docker compose exec postgres psql -U dpe_user -d dpe_matching -c "SELECT 1;"
```

### Mémoire insuffisante

Augmenter dans `.env` :
```env
NODE_OPTIONS=--max-old-space-size=8192
```

### Nettoyer Docker

```bash
docker system prune -a
docker volume prune
```

---

## 📚 Documentation Complète

Pour plus de détails, consulter [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🎯 Récapitulatif

**Pour un déploiement local rapide** :
```bash
./deploy.sh
```

**Pour une production sérieuse** :
- Utiliser Railway.app (le plus simple)
- Ou un VPS avec le script deploy.sh
- Configurer un nom de domaine
- Activer SSL/HTTPS
- Configurer les backups automatiques

**Temps estimé** : 5-10 minutes pour local, 15-30 minutes pour production.

🎉 **Bon déploiement !**
