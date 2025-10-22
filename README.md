# DPE-Leboncoin Matching System

Système production-ready de matching entre enregistrements DPE (Diagnostic de Performance Énergétique) et annonces Leboncoin avec architecture monorepo.

## 🏗️ Architecture

```
dpe-matching-monorepo/
├── packages/
│   ├── backend/          # API Node.js + Express + Prisma
│   ├── frontend/         # React 18 + TypeScript + Vite + Tailwind
│   └── shared/           # Types et constantes partagés
├── docker-compose.yml    # Configuration Docker
└── .github/workflows/    # CI/CD GitHub Actions
```

## 🚀 Stack Technique

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Tests**: Jest + Supertest
- **Logging**: Winston
- **Sécurité**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios + React Query
- **Tests**: Vitest
- **Router**: React Router DOM

### Shared
- **Validation**: Zod schemas
- **Types**: TypeScript types partagés
- **Constantes**: Configuration algorithmique

## 📋 Prérequis

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (pour le déploiement)
- PostgreSQL 16 (si développement local sans Docker)

## ⚡ Quick Start

### Installation

```bash
# Cloner le repository
git clone <repo-url>
cd MVP_DPE

# Installer les dépendances
pnpm install

# Générer Prisma Client
pnpm db:generate
```

### Développement

```bash
# Démarrer PostgreSQL avec Docker
docker-compose -f docker-compose.dev.yml up -d

# Créer le fichier .env backend
cp packages/backend/.env.example packages/backend/.env
# Éditer packages/backend/.env avec vos configurations

# Exécuter les migrations
pnpm db:migrate

# Démarrer backend et frontend en parallèle
pnpm dev

# OU démarrer individuellement
pnpm dev:backend  # Backend sur http://localhost:3001
pnpm dev:frontend # Frontend sur http://localhost:5173
```

### Production avec Docker

```bash
# Build et démarrer tous les services
docker-compose up -d

# L'application sera accessible sur:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - Postgres: localhost:5432
```

## 🧪 Tests

```bash
# Tous les tests
pnpm test

# Tests backend uniquement
pnpm --filter backend test

# Tests frontend uniquement
pnpm --filter frontend test

# Tests avec coverage
pnpm --filter backend test:coverage
```

## 🔧 Scripts disponibles

### Root
```bash
pnpm dev              # Démarrer backend + frontend
pnpm build            # Build tous les packages
pnpm test             # Exécuter tous les tests
pnpm lint             # Linter tous les packages
pnpm lint:fix         # Fix les erreurs de linting
pnpm format           # Formatter le code avec Prettier
pnpm typecheck        # Vérifier les types TypeScript
pnpm clean            # Nettoyer tous les builds
```

### Backend
```bash
pnpm dev              # Mode développement avec hot reload
pnpm build            # Build production
pnpm start            # Démarrer en production
pnpm test             # Tests avec Jest
pnpm db:generate      # Générer Prisma Client
pnpm db:migrate       # Exécuter migrations
pnpm db:studio        # Ouvrir Prisma Studio
```

### Frontend
```bash
pnpm dev              # Mode développement avec Vite
pnpm build            # Build production
pnpm preview          # Preview du build production
pnpm test             # Tests avec Vitest
```

## 🎯 Algorithme de Matching

L'algorithme de matching utilise un système de scoring sur 100 points :

### Critères Éliminatoires (obligatoires)
- Code postal identique
- Type de bien identique (Maison/Appartement)

### Score de Base (85 points max)
- **DPE** (25 pts) : Étiquette identique
- **GES** (25 pts) : Étiquette identique
- **Surface** (15 pts) : Différence < 5% = 15pts, < 10% = 10pts
- **Année** (10 pts) : Différence < 5 ans = 10pts
- **Pièces** (10 pts) : Nombre identique
- **Timing** (5 pts) : Proximité publication/date DPE

### Bonus (27 points max)
- **Distance GPS** (10 pts) : < 50m = 10pts, < 100m = 7pts, < 200m = 4pts
- **Quartier** (5 pts) : Même quartier détecté
- **Rue** (5 pts) : Même rue détectée
- **Chambres** (3 pts) : Nombre identique
- **Orientation** (2 pts) : Identique
- **Extérieur** (2 pts) : Présence identique

### Niveaux de Confiance
- **CERTAIN** : Score >= 90%
- **TRES_FIABLE** : Score >= 75%
- **PROBABLE** : Score >= 60%
- **POSSIBLE** : Score >= 40%
- **DOUTEUX** : Score < 40%

## 📁 Structure des Données

### Modèles Prisma

#### DpeRecord
```typescript
{
  id: string
  numeroDpe: string (unique)
  adresseBan: string
  codePostalBan: string
  typeBatiment: MAISON | APPARTEMENT
  surfaceHabitable: number
  anneConstruction: number?
  etiquetteDpe: A|B|C|D|E|F|G
  etiquetteGes: A|B|C|D|E|F|G
  coordonneeX: number?
  coordonneeY: number?
  dateEtablissement: Date
  rawData: JSON?
}
```

#### LeboncoinAnnonce
```typescript
{
  id: string
  listId: bigint (unique)
  url: string
  codePostal: string
  typeBien: MAISON | APPARTEMENT
  surface: number?
  pieces: number?
  anneConstruction: number?
  etiquetteDpe: A|B|C|D|E|F|G?
  etiquetteGes: A|B|C|D|E|F|G?
  lat: number?
  lng: number?
  datePublication: Date
  rawData: JSON?
}
```

#### MatchCluster
```typescript
{
  id: string
  annonceId: string
  nombreCandidats: number
  meilleurScore: number
  statut: StatutValidation
  dpeConfirmeId: string?
  dateValidation: Date?
  candidats: MatchCandidat[]
}
```

## 🔒 Sécurité

### Middleware Implémentés
- **Helmet**: Headers HTTP sécurisés
- **CORS**: Restriction des origines
- **Rate Limiting**: Protection anti-DDoS
- **JWT Authentication**: Authentification sécurisée
- **Input Validation**: Validation Zod de tous les inputs
- **Error Handling**: Gestion centralisée des erreurs

### Variables d'Environnement

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=<générer-secret-sécurisé>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## 📡 API Endpoints

### DPE
- `POST /api/dpes` - Créer un DPE record
- `GET /api/dpes/:id` - Récupérer un DPE
- `GET /api/dpes` - Liste paginée des DPE

### Annonces
- `POST /api/annonces` - Créer une annonce
- `GET /api/annonces/:id` - Récupérer une annonce
- `GET /api/annonces` - Liste paginée des annonces

### Matching
- `POST /api/matching/annonces/:annonceId` - Lancer le matching
- `GET /api/matching/clusters/:clusterId` - Récupérer un cluster
- `GET /api/matching/clusters` - Liste des clusters
- `PATCH /api/matching/clusters/:clusterId/validate` - Valider un match

## 🐳 Docker

### Développement
```bash
# Démarrer uniquement PostgreSQL
docker-compose -f docker-compose.dev.yml up -d
```

### Production
```bash
# Build et démarrer tous les services
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

## 🚢 Déploiement

### GitHub Actions CI/CD

Le workflow CI/CD automatique :
1. **Lint & Type Check** : Vérifie le code
2. **Tests Backend** : Tests Jest avec PostgreSQL
3. **Tests Frontend** : Tests Vitest
4. **Build** : Build tous les packages
5. **Docker Build** : Build et push des images Docker

### Configuration requise
Ajouter ces secrets GitHub :
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

## 📊 Monitoring & Logging

### Winston Logging
- Logs console colorés (développement)
- Logs fichiers rotatifs (production)
- Niveaux: error, warn, info, debug

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /health` (via Nginx)
- Database: PostgreSQL health check

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Standards de Code
- TypeScript strict mode
- ESLint + Prettier
- Tests obligatoires pour nouvelles features
- Documentation JSDoc pour fonctions publiques

## 📝 License

MIT

## 👥 Auteurs

Votre équipe

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue GitHub
- Consulter la documentation Prisma: https://www.prisma.io/docs
- Consulter la documentation React: https://react.dev
