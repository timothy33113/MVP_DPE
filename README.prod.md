# 🏠 DPE-Matching Platform - Guide de Production

Application de matching entre les Diagnostics de Performance Énergétique (DPE) et les annonces immobilières LeBonCoin, avec intégration Monday.com pour le suivi commercial.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)

---

## 📋 Vue d'ensemble

Cette application permet de :

✅ **Importer et gérer 46,000+ DPE** de la zone Pau et alentours
✅ **Synchroniser 5,000+ annonces** LeBonCoin immobilières
✅ **Matcher automatiquement** DPE et annonces (score de matching intelligent)
✅ **Visualiser sur carte interactive** (Leaflet.js) avec filtres avancés
✅ **Envoyer vers Monday.com** pour qualification commerciale
✅ **Filtrer par zone, surface, DPE, type, etc.**

### Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Frontend      │────────▶│   Backend API   │────────▶│  PostgreSQL  │
│   React + Vite  │         │   Node.js       │         │              │
│   Leaflet Maps  │         │   Express       │         │  46K+ DPE    │
└─────────────────┘         │   Prisma ORM    │         │  5K+ Annonces│
                            └─────────────────┘         └──────────────┘
                                     │
                                     ├────────▶ ADEME API (DPE)
                                     ├────────▶ RapidAPI (LeBonCoin)
                                     └────────▶ Monday.com API
```

### Stack Technique

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Leaflet.js (cartographie)
- TailwindCSS (styling)
- React Router (routing)

**Backend**
- Node.js 20 + TypeScript
- Express.js (API REST)
- Prisma ORM (base de données)
- PostgreSQL 16 (database)
- JWT (authentification)

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Let's Encrypt (SSL)

---

## 🚀 Déploiement Rapide

### Option 1 : Déploiement en 1 commande

```bash
./deploy.sh
```

📖 **Voir** : [QUICKSTART.md](./QUICKSTART.md) pour le guide détaillé en 5 minutes

### Option 2 : Déploiement manuel

```bash
# 1. Configuration
cp .env.example .env
nano .env  # Éditer les variables

# 2. Build et déploiement
docker compose -f docker-compose.prod.yml up -d

# 3. Import des DPE
docker cp dpe03existant.csv dpe-matching-backend:/app/data.csv
docker exec -it dpe-matching-backend npm run import:dpe /app/data.csv
```

**URLs** :
- Frontend : http://localhost
- Backend : http://localhost:3001
- Health : http://localhost:3001/health

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](./QUICKSTART.md) | 🚀 Démarrage rapide (5-10 min) |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 📖 Guide complet de déploiement |
| [.env.example](./.env.example) | ⚙️ Variables d'environnement |

---

## 🛠️ Développement Local

### Prérequis

- Node.js 20+
- pnpm 8+
- PostgreSQL 16
- Docker (optionnel)

### Installation

```bash
# 1. Cloner le repo
git clone <repo-url>
cd MVP_DPE

# 2. Installer les dépendances
pnpm install

# 3. Configurer la base de données
docker compose up -d postgres

# 4. Configurer l'environnement
cp packages/backend/.env.example packages/backend/.env
# Éditer packages/backend/.env

# 5. Migrations Prisma
pnpm db:migrate

# 6. Lancer en dev
pnpm dev
```

**URLs en développement** :
- Frontend : http://localhost:5173
- Backend : http://localhost:3001

---

## 📊 Données

### Import DPE

```bash
# Via script
pnpm --filter backend import:dpe /path/to/dpe.csv

# Via Docker
docker exec -it dpe-matching-backend npm run import:dpe /app/data.csv
```

**Source des données** : ADEME - Base nationale des DPE

### Synchronisation LeBonCoin

```bash
# Import manuel
pnpm --filter backend import:leboncoin

# Synchronisation automatique
pnpm --filter backend auto:sync
```

### Matching

```bash
# Créer les clusters de matching
pnpm --filter backend create:clusters

# Tester le matching
pnpm --filter backend test:matching
```

---

## 🔧 Configuration

### Variables d'environnement critiques

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dpe_matching

# JWT (générer avec: openssl rand -base64 32)
JWT_SECRET=votre-secret-securise

# APIs externes
RAPIDAPI_KEY=votre-cle-rapidapi
MONDAY_API_KEY=votre-cle-monday
MONDAY_BOARD_ID=votre-board-id

# CORS
CORS_ORIGIN=https://votre-domaine.com
```

---

## 🚢 Options de Déploiement

### 1. Railway.app (Recommandé - Le plus simple)

✅ Déploiement automatique depuis GitHub
✅ PostgreSQL inclus
✅ SSL/HTTPS automatique
✅ Gratuit pour démarrer

[➡️ Guide Railway](./QUICKSTART.md#méthode-2-déploiement-sur-railwayapp)

### 2. VPS (DigitalOcean, Hetzner, Contabo)

✅ Contrôle total
✅ Performances optimales
✅ ~€8-24/mois

[➡️ Guide VPS](./QUICKSTART.md#méthode-3-déploiement-sur-un-vps)

### 3. Docker Local

✅ Parfait pour tests
✅ Déploiement identique à production

```bash
./deploy.sh
```

---

## 📦 Structure du Projet

```
MVP_DPE/
├── packages/
│   ├── backend/          # API Node.js + Prisma
│   │   ├── src/
│   │   ├── prisma/       # Schéma DB et migrations
│   │   └── scripts/      # Scripts d'import/matching
│   ├── frontend/         # React + Vite
│   │   └── src/
│   └── shared/           # Types TypeScript partagés
├── docker-compose.prod.yml   # Production
├── docker-compose.dev.yml    # Développement
├── Dockerfile.backend
├── Dockerfile.frontend
├── deploy.sh             # Script de déploiement
├── DEPLOYMENT.md         # Guide complet
├── QUICKSTART.md         # Démarrage rapide
└── README.prod.md        # Ce fichier
```

---

## 🔐 Sécurité

- ✅ JWT pour l'authentification
- ✅ Rate limiting (100 req/15min par IP)
- ✅ CORS configuré
- ✅ Variables d'environnement sécurisées
- ✅ Sanitisation des inputs
- ✅ HTTPS/SSL en production

---

## 🧪 Tests

```bash
# Tests unitaires
pnpm test

# Tests du matching
pnpm --filter backend test:matching
```

---

## 📈 Monitoring

### Logs

```bash
# Logs en temps réel
docker compose logs -f

# Logs backend uniquement
docker compose logs -f backend

# Dernières 100 lignes
docker compose logs --tail=100
```

### Health Checks

```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost/health

# État des containers
docker compose ps
```

### Statistiques

```bash
# Utilisation CPU/RAM
docker stats

# Espace disque
df -h

# Taille des volumes
docker system df -v
```

---

## 💾 Backup

### Backup automatique quotidien

```bash
# Configurer le cron
crontab -e

# Ajouter (backup à 2h du matin)
0 2 * * * cd /opt/dpe-matching && docker compose run --rm backup
```

### Backup manuel

```bash
docker compose run --rm backup
```

Les backups sont stockés dans `./backups/`

### Restauration

```bash
# Copier le backup dans le container
docker cp backups/dpe_matching_20250101.sql.gz dpe-matching-postgres:/tmp/

# Restaurer
docker exec -it dpe-matching-postgres sh -c "
  gunzip < /tmp/dpe_matching_20250101.sql.gz | psql -U dpe_user -d dpe_matching
"
```

---

## 🆘 Support

### Problèmes courants

**Mémoire insuffisante**
```bash
# Augmenter la mémoire Node.js
export NODE_OPTIONS=--max-old-space-size=4096
```

**Base de données inaccessible**
```bash
# Vérifier PostgreSQL
docker compose logs postgres
docker compose restart postgres
```

**Frontend ne charge pas**
```bash
# Rebuild
docker compose build frontend
docker compose up -d frontend
```

### Commandes utiles

```bash
# Redémarrer tout
docker compose restart

# Nettoyer Docker
docker system prune -a

# Voir les processus
docker compose ps

# Shell dans un container
docker exec -it dpe-matching-backend sh
```

---

## 📞 Contact et Contribution

Pour toute question ou suggestion :
- Ouvrir une issue sur GitHub
- Consulter [DEPLOYMENT.md](./DEPLOYMENT.md) pour plus de détails

---

## 📄 Licence

MIT License - Voir LICENSE file

---

## ✅ Checklist de Production

Avant de déployer en production, vérifier :

- [ ] Variables d'environnement configurées (`.env`)
- [ ] JWT_SECRET généré et sécurisé
- [ ] POSTGRES_PASSWORD changé
- [ ] Base de données PostgreSQL configurée
- [ ] RAPIDAPI_KEY et MONDAY_API_KEY configurés
- [ ] CORS_ORIGIN configuré avec le domaine de production
- [ ] Docker et Docker Compose installés
- [ ] Pare-feu configuré (ports 80, 443)
- [ ] SSL/HTTPS configuré
- [ ] Backup automatique configuré
- [ ] Monitoring en place
- [ ] Tests de fonctionnement effectués
- [ ] Import des données DPE effectué

---

🎉 **Application prête pour la production !**

Bon déploiement ! 🚀
