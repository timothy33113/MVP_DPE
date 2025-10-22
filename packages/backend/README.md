# Backend - DPE Matching API

API REST Node.js + Express pour le système de matching DPE-Leboncoin.

## Architecture

```
src/
├── config/           # Configuration centralisée
│   ├── index.ts     # Variables d'environnement
│   └── database.ts  # Connexion Prisma
├── middleware/      # Middleware Express
│   ├── auth.ts      # Authentification JWT
│   ├── error-handler.ts
│   ├── rate-limiter.ts
│   └── validator.ts
├── modules/         # Modules métier
│   ├── dpe/
│   │   ├── dpe.service.ts
│   │   ├── dpe.controller.ts
│   │   ├── dpe.repository.ts
│   │   └── dpe.types.ts
│   ├── matching/
│   │   ├── matching.service.ts    # Algorithme de matching
│   │   ├── matching.controller.ts
│   │   ├── matching.repository.ts
│   │   └── matching.types.ts
│   └── annonces/
├── routes/          # Routes Express
├── utils/           # Utilitaires
│   ├── logger.ts
│   ├── errors.ts
│   ├── distance.ts
│   └── async-handler.ts
├── types/           # Types TypeScript
├── app.ts           # Configuration Express
└── index.ts         # Point d'entrée

prisma/
├── schema.prisma    # Schéma de base de données
└── migrations/      # Migrations SQL
```

## Modules

### DPE Module
Gestion des enregistrements DPE.

**Service**: Logique métier DPE
**Repository**: Accès base de données
**Controller**: Handlers HTTP

### Matching Module
Algorithme de matching et gestion des clusters.

**Service**: Implémentation de l'algorithme de scoring
**Repository**: Persistance des matchs
**Controller**: Endpoints de matching

### Annonces Module
Gestion des annonces Leboncoin.

## Middleware

### Authentication (`auth.ts`)
- `authenticate`: Vérifie le JWT
- `authorize`: Vérifie les rôles
- `optionalAuthenticate`: Auth optionnelle

### Error Handler (`error-handler.ts`)
- Gestion centralisée des erreurs
- Conversion des erreurs Prisma/Zod
- Logging automatique
- Réponses API standardisées

### Rate Limiter (`rate-limiter.ts`)
- `generalRateLimiter`: 100 req/15min
- `authRateLimiter`: 5 req/15min
- `matchingRateLimiter`: 10 req/min

### Validator (`validator.ts`)
- Validation Zod des requêtes
- Helpers pour body/query/params

## Base de Données

### Connexion
```typescript
import { prisma } from '@config/database';

const users = await prisma.user.findMany();
```

### Migrations
```bash
# Créer une migration
pnpm prisma migrate dev --name add_user_table

# Appliquer les migrations
pnpm prisma migrate deploy

# Réinitialiser la DB
pnpm prisma migrate reset
```

## Logging

Winston logger avec niveaux configurables:
```typescript
import { logger } from '@utils/logger';

logger.error('Error message', { context: 'details' });
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');
```

## Gestion d'Erreurs

Classes d'erreurs personnalisées:
```typescript
import { BadRequestError, NotFoundError } from '@utils/errors';

throw new NotFoundError('User not found');
throw new BadRequestError('Invalid input', 'VALIDATION_ERROR', { field: 'email' });
```

## Tests

```bash
# Tous les tests
pnpm test

# Mode watch
pnpm test:watch

# Coverage
pnpm test:coverage
```

Structure des tests:
```
tests/
├── setup.ts
├── unit/
│   ├── services/
│   └── utils/
└── integration/
    └── api/
```

## Configuration

Variables d'environnement (`.env`):
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

## Développement

```bash
# Mode watch avec tsx
pnpm dev

# Build TypeScript
pnpm build

# Production
pnpm start
```

## API Documentation

### Response Format
```typescript
{
  "success": true,
  "data": { /* ... */ },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Format
```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { /* optionnel */ }
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Bonnes Pratiques

1. **Repository Pattern**: Séparer logique métier et accès données
2. **Dependency Injection**: Services injectables
3. **Async Handlers**: Wrapper pour capturer erreurs async
4. **Validation**: Zod schemas pour tous les inputs
5. **Logging**: Logger toutes les opérations importantes
6. **Error Handling**: Utiliser classes d'erreurs typées
7. **TypeScript Strict**: Mode strict activé
8. **Tests**: Coverage minimum 70%
