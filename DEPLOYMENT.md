# 🚀 Guide de Déploiement en Production

Ce guide vous accompagne pour mettre l'application DPE-Matching en production.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration](#configuration)
3. [Déploiement avec Docker](#déploiement-avec-docker)
4. [Déploiement sur un VPS](#déploiement-sur-un-vps)
5. [Déploiement sur des services cloud](#déploiement-sur-des-services-cloud)
6. [Configuration SSL/HTTPS](#configuration-sslhttps)
7. [Maintenance et monitoring](#maintenance-et-monitoring)
8. [Backup et restauration](#backup-et-restauration)

---

## 🔧 Prérequis

### Ressources serveur minimales recommandées :
- **CPU**: 2 cores minimum (4 recommandés)
- **RAM**: 4 GB minimum (8 GB recommandés)
- **Stockage**: 20 GB minimum (SSD recommandé)
- **Bande passante**: illimitée ou 1 TB/mois minimum

### Logiciels requis :
- Docker 24.0+ et Docker Compose 2.0+
- Git
- Un nom de domaine (optionnel mais recommandé)

---

## ⚙️ Configuration

### 1. Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
cp packages/backend/.env.production .env
```

Éditer le fichier `.env` et remplir les valeurs :

```env
# Database
POSTGRES_USER=dpe_user
POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE
POSTGRES_DB=dpe_matching

# JWT (générer avec: openssl rand -base64 32)
JWT_SECRET=VOTRE_CLE_SECRETE_JWT

# CORS (URL de votre domaine)
CORS_ORIGIN=https://votre-domaine.com

# APIs externes
RAPIDAPI_KEY=votre-cle-rapidapi
MONDAY_API_KEY=votre-cle-monday
MONDAY_BOARD_ID=votre-board-id

# Email (optionnel)
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=mot-de-passe-application
```

### 2. Générer un secret JWT sécurisé

```bash
openssl rand -base64 32
```

Copier le résultat dans `JWT_SECRET`.

---

## 🐳 Déploiement avec Docker (Recommandé)

### Option A : Déploiement complet avec Docker Compose

**1. Cloner le repository**

```bash
git clone <votre-repo-url>
cd MVP_DPE
```

**2. Configurer les variables d'environnement**

```bash
cp packages/backend/.env.production .env
# Éditer .env avec vos vraies valeurs
nano .env
```

**3. Build et lancer les services**

```bash
# Build des images
docker-compose -f docker-compose.prod.yml build

# Lancer tous les services
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f
```

**4. Importer les données DPE**

```bash
# Copier votre fichier CSV dans le container backend
docker cp /chemin/vers/dpe03existant.csv dpe-matching-backend:/app/data.csv

# Exécuter l'import
docker exec -it dpe-matching-backend sh -c "cd packages/backend && npm run import:dpe /app/data.csv"
```

**5. Vérifier le déploiement**

- Frontend : http://votre-serveur
- Backend API : http://votre-serveur:3001
- Health check : http://votre-serveur:3001/health

---

## 🖥️ Déploiement sur un VPS

### Recommandations de fournisseurs :

1. **DigitalOcean** (Droplet 4GB RAM) - ~$24/mois
2. **Hetzner** (CX31) - ~€8/mois
3. **Contabo** (VPS M SSD) - ~€7/mois
4. **OVH** (VPS Starter) - ~€4/mois

### Étapes de déploiement sur un VPS :

**1. Connexion SSH au serveur**

```bash
ssh root@votre-serveur-ip
```

**2. Installer Docker et Docker Compose**

```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer Docker Compose
apt install docker-compose-plugin -y

# Vérifier l'installation
docker --version
docker compose version
```

**3. Cloner le projet**

```bash
cd /opt
git clone <votre-repo-url> dpe-matching
cd dpe-matching
```

**4. Configuration**

```bash
# Créer le fichier .env
nano .env
# Copier le contenu de .env.production et remplir les valeurs
```

**5. Déploiement**

```bash
# Build et lancer
docker compose -f docker-compose.prod.yml up -d

# Vérifier les services
docker compose ps
docker compose logs -f
```

**6. Configurer le pare-feu**

```bash
# UFW (Ubuntu)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

---

## ☁️ Déploiement sur des services cloud

### Option 1 : Railway.app (Recommandé - Facile)

**Avantages** : Déploiement automatique, PostgreSQL inclus, SSL gratuit

**Étapes** :

1. Créer un compte sur [railway.app](https://railway.app)
2. Créer un nouveau projet "Deploy from GitHub"
3. Connecter votre repository
4. Railway détectera automatiquement les Dockerfiles
5. Ajouter les variables d'environnement dans le dashboard
6. Railway génère automatiquement une URL : `votre-app.railway.app`

**Coût estimé** : $5-20/mois selon l'usage

### Option 2 : Render.com

**Avantages** : PostgreSQL gratuit (500MB), déploiement facile

**Étapes** :

1. Créer un compte sur [render.com](https://render.com)
2. Créer un "Web Service" depuis GitHub
3. Configurer :
   - Build Command : `pnpm install && pnpm build`
   - Start Command : `node packages/backend/dist/index.js`
4. Créer une base PostgreSQL (plan gratuit)
5. Lier la database au service
6. Ajouter les variables d'environnement

**Coût estimé** : Gratuit (plan Starter) ou $7/mois (plan Standard)

### Option 3 : Fly.io

**Avantages** : Déploiement global, excellentes performances

**Étapes** :

1. Installer flyctl : `curl -L https://fly.io/install.sh | sh`
2. Se connecter : `flyctl auth login`
3. Lancer depuis le projet :
```bash
flyctl launch
flyctl deploy
```

**Coût estimé** : ~$10/mois

---

## 🔐 Configuration SSL/HTTPS

### Option A : Avec Let's Encrypt (Gratuit) - Recommandé

**1. Installer Certbot**

```bash
apt install certbot python3-certbot-nginx -y
```

**2. Obtenir un certificat SSL**

```bash
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

**3. Renouvellement automatique**

```bash
# Tester le renouvellement
certbot renew --dry-run

# Le renouvellement automatique est configuré via cron
systemctl status certbot.timer
```

### Option B : Avec Cloudflare (Recommandé pour la simplicité)

**Avantages** : SSL gratuit, CDN, protection DDoS

**Étapes** :

1. Créer un compte sur [cloudflare.com](https://cloudflare.com)
2. Ajouter votre domaine
3. Changer les nameservers chez votre registrar
4. Activer "Always Use HTTPS" dans Cloudflare
5. SSL/TLS mode : "Full (Strict)"

---

## 📊 Maintenance et Monitoring

### Logs en temps réel

```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Backend uniquement
docker compose logs -f backend

# Les 100 dernières lignes
docker compose logs --tail=100 backend
```

### Redémarrer les services

```bash
# Redémarrer un service spécifique
docker compose -f docker-compose.prod.yml restart backend

# Redémarrer tous les services
docker compose -f docker-compose.prod.yml restart
```

### Mettre à jour l'application

```bash
# Pull les derniers changements
git pull origin main

# Rebuild et redéployer
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Appliquer les migrations
docker exec -it dpe-matching-backend sh -c "cd packages/backend && npx prisma migrate deploy"
```

### Monitoring des ressources

```bash
# Utilisation CPU/RAM par container
docker stats

# Espace disque
df -h

# Logs de la base de données
docker compose logs -f postgres
```

### Monitoring avancé (optionnel)

**Installation de Prometheus + Grafana** :

```bash
# Télécharger docker-compose-monitoring.yml depuis le repo
docker compose -f docker-compose-monitoring.yml up -d
```

Accéder à Grafana : http://votre-serveur:3000

---

## 💾 Backup et Restauration

### Backup automatique quotidien

**1. Configuration du cron pour backup quotidien**

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (backup tous les jours à 2h du matin)
0 2 * * * cd /opt/dpe-matching && docker compose -f docker-compose.prod.yml run --rm backup
```

**2. Backup manuel**

```bash
# Créer un backup immédiatement
docker compose -f docker-compose.prod.yml run --rm backup

# Les backups sont stockés dans ./backups/
ls -lh backups/
```

### Restauration depuis un backup

**1. Arrêter le backend**

```bash
docker compose -f docker-compose.prod.yml stop backend
```

**2. Restaurer la base de données**

```bash
# Copier le backup dans le container postgres
docker cp backups/dpe_matching_20250101_020000.sql.gz dpe-matching-postgres:/tmp/backup.sql.gz

# Restaurer
docker exec -it dpe-matching-postgres sh -c "
  gunzip < /tmp/backup.sql.gz | psql -U dpe_user -d dpe_matching
"
```

**3. Redémarrer les services**

```bash
docker compose -f docker-compose.prod.yml start backend
```

---

## 🔥 Dépannage

### Le frontend ne charge pas

```bash
# Vérifier les logs nginx
docker compose logs frontend

# Rebuild le frontend
docker compose build frontend
docker compose up -d frontend
```

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps postgres

# Vérifier les logs
docker compose logs postgres

# Test de connexion
docker exec -it dpe-matching-postgres psql -U dpe_user -d dpe_matching
```

### Mémoire insuffisante (heap out of memory)

```bash
# Augmenter la mémoire allouée à Node.js
# Dans .env ou docker-compose, ajouter :
NODE_OPTIONS=--max-old-space-size=4096

# Redémarrer
docker compose restart backend
```

### Nettoyer Docker

```bash
# Supprimer les images inutilisées
docker system prune -a

# Supprimer les volumes non utilisés
docker volume prune
```

---

## 📞 Support

Pour toute question :
- Consulter les logs : `docker compose logs -f`
- Vérifier la santé des services : `docker compose ps`
- Tester les endpoints :
  - Backend health : `curl http://localhost:3001/health`
  - Frontend : `curl http://localhost`

---

## ✅ Checklist de déploiement

- [ ] Variables d'environnement configurées (`.env`)
- [ ] Secret JWT généré et sécurisé
- [ ] Base de données PostgreSQL accessible
- [ ] Docker et Docker Compose installés
- [ ] Pare-feu configuré (ports 80, 443)
- [ ] SSL/HTTPS configuré
- [ ] Backup automatique configuré
- [ ] Monitoring en place
- [ ] Nom de domaine pointé vers le serveur
- [ ] Tests de fonctionnement effectués
- [ ] Import des données DPE effectué

---

🎉 **Félicitations !** Votre application est maintenant en production !
