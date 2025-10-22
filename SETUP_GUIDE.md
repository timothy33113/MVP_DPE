# Guide de Setup - DPE Matching System

Guide complet pour installer et démarrer le projet.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 8.0.0 (`npm install -g pnpm`)
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/)) - Optionnel mais recommandé
- **PostgreSQL** 16 - Si vous n'utilisez pas Docker

Vérifier les installations :
```bash
node --version  # v20.x.x
pnpm --version  # 8.x.x
docker --version
```

## 🚀 Installation Rapide (Développement)

### 1. Cloner le Repository

```bash
git clone <repository-url>
cd MVP_DPE
```

### 2. Installer les Dépendances

```bash
pnpm install
```

Cette commande installe toutes les dépendances pour :
- Root workspace
- Backend package
- Frontend package
- Shared package

### 3. Démarrer PostgreSQL

**Option A : Avec Docker (Recommandé)**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Cela démarre PostgreSQL sur `localhost:5432` avec :
- User: `dpe_user`
- Password: `dpe_password`
- Database: `dpe_matching`

**Option B : PostgreSQL Local**
```bash
# Créer la database
createdb dpe_matching

# Ou via psql
psql -U postgres
CREATE DATABASE dpe_matching;
\q
```

### 4. Configuration Backend

```bash
# Copier le fichier d'exemple
cp packages/backend/.env.example packages/backend/.env

# Éditer le fichier .env
nano packages/backend/.env
```

Configuration minimale requise :
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://dpe_user:dpe_password@localhost:5432/dpe_matching
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
CORS_ORIGIN=http://localhost:5173
```

**IMPORTANT**: Générer un JWT_SECRET sécurisé :
```bash
# Sur macOS/Linux
openssl rand -base64 32

# Sur Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5. Générer Prisma Client

```bash
pnpm db:generate
```

### 6. Exécuter les Migrations

```bash
pnpm db:migrate
```

Cela crée toutes les tables dans la base de données.

### 7. Démarrer l'Application

```bash
# Démarrer backend + frontend simultanément
pnpm dev
```

**OU démarrer séparément :**

Terminal 1 - Backend :
```bash
pnpm dev:backend
```

Terminal 2 - Frontend :
```bash
pnpm dev:frontend
```

### 8. Vérifier le Démarrage

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3001
- **Backend Health** : http://localhost:3001/health

Vous devriez voir :
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🐳 Installation avec Docker (Production)

### 1. Configuration

```bash
# Créer le fichier .env à la racine
cp packages/backend/.env.example .env

# Éditer les variables
nano .env
```

Variables importantes :
```bash
JWT_SECRET=<générer-secret-sécurisé>
POSTGRES_PASSWORD=<changer-en-production>
```

### 2. Build et Démarrage

```bash
# Build et démarrer tous les services
docker-compose up -d --build
```

Services démarrés :
- **PostgreSQL** : localhost:5432
- **Backend** : localhost:3001
- **Frontend** : localhost:3000

### 3. Exécuter les Migrations

```bash
# Les migrations s'exécutent automatiquement au démarrage du backend
# Pour forcer manuellement :
docker-compose exec backend sh -c "cd packages/backend && npx prisma migrate deploy"
```

### 4. Vérifier les Services

```bash
# Voir les logs
docker-compose logs -f

# Vérifier le status
docker-compose ps

# Tester les endpoints
curl http://localhost:3001/health
curl http://localhost:3000/health
```

## 🔧 Commandes Utiles

### Base de Données

```bash
# Prisma Studio (Interface graphique)
pnpm db:studio

# Nouvelle migration
pnpm db:migrate

# Reset DB (⚠️ supprime toutes les données)
cd packages/backend && pnpm prisma migrate reset

# Seed data (si implémenté)
pnpm db:seed
```

### Développement

```bash
# Linter
pnpm lint
pnpm lint:fix

# Type checking
pnpm typecheck

# Formattage
pnpm format

# Tests
pnpm test
pnpm test:watch

# Clean build artifacts
pnpm clean
```

### Docker

```bash
# Voir les logs d'un service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Redémarrer un service
docker-compose restart backend

# Arrêter tout
docker-compose down

# Arrêter et supprimer volumes (⚠️ supprime les données)
docker-compose down -v

# Rebuild un service
docker-compose up -d --build backend
```

## 🧪 Tester l'API

### Avec cURL

```bash
# Health check
curl http://localhost:3001/health

# Créer un DPE (nécessite authentification)
curl -X POST http://localhost:3001/api/dpes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "numeroDpe": "123456789",
    "adresseBan": "10 Rue Example",
    "codePostalBan": "75001",
    "typeBatiment": "APPARTEMENT",
    "surfaceHabitable": 50,
    "etiquetteDpe": "C",
    "etiquetteGes": "D",
    "dateEtablissement": "2024-01-01"
  }'

# Lister les DPE
curl http://localhost:3001/api/dpes
```

### Avec Postman/Insomnia

Importer la collection depuis `docs/api-collection.json` (à créer).

## ❗ Dépannage

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Tuer le processus
kill -9 <PID>
```

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Voir les logs
docker-compose logs postgres

# Tester la connexion
psql postgresql://dpe_user:dpe_password@localhost:5432/dpe_matching
```

### Prisma Client non généré

```bash
cd packages/backend
pnpm prisma generate
```

### Erreurs de migration

```bash
# Reset et recommencer
cd packages/backend
pnpm prisma migrate reset
pnpm prisma migrate dev
```

### Module non trouvé

```bash
# Réinstaller les dépendances
pnpm clean
rm -rf node_modules packages/*/node_modules
pnpm install
```

### Frontend ne se connecte pas au Backend

1. Vérifier que le backend est démarré sur port 3001
2. Vérifier la configuration proxy dans `packages/frontend/vite.config.ts`
3. Vérifier CORS_ORIGIN dans `.env`

### Docker build échoue

```bash
# Nettoyer le cache Docker
docker-compose down
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Express](https://expressjs.com/)
- [Documentation React](https://react.dev/)
- [Documentation Vite](https://vitejs.dev/)
- [Documentation Tailwind CSS](https://tailwindcss.com/)
- [Documentation pnpm](https://pnpm.io/)

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifier cette documentation
2. Consulter les logs : `docker-compose logs` ou console Node
3. Ouvrir une issue GitHub
4. Contacter l'équipe de développement

## ✅ Checklist de Vérification

Avant de considérer le setup complet :

- [ ] Node.js 20+ installé
- [ ] pnpm installé
- [ ] PostgreSQL accessible
- [ ] Dépendances installées (`pnpm install`)
- [ ] `.env` configuré
- [ ] Prisma Client généré
- [ ] Migrations exécutées
- [ ] Backend démarre sans erreur (port 3001)
- [ ] Frontend démarre sans erreur (port 5173)
- [ ] `/health` retourne status ok
- [ ] Tests passent (`pnpm test`)

Félicitations ! Votre environnement est prêt 🎉
