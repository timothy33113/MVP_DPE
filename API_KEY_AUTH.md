# Authentification par API Key

Ce système propose deux méthodes d'authentification : **JWT** (pour les utilisateurs web) et **API Keys** (pour l'accès programmatique).

## 📋 Vue d'ensemble

### JWT Authentication
- **Usage** : Authentification des utilisateurs via l'interface web
- **Format** : `Authorization: Bearer <jwt_token>`
- **Durée** : Configurable (par défaut 7 jours)
- **Cas d'usage** : Sessions utilisateur, interface web

### API Key Authentication
- **Usage** : Accès programmatique, scripts, intégrations tierces
- **Format** : `X-API-Key: dpm_<64_hex_chars>` ou `Authorization: Bearer dpm_<64_hex_chars>`
- **Durée** : Optionnelle (peut être sans expiration ou avec date d'expiration)
- **Cas d'usage** : Automatisation, webhooks, intégrations

## 🔑 Gestion des API Keys

### Créer une API Key

**Endpoint** : `POST /api/api-keys`

**Headers** :
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body** :
```json
{
  "name": "Production Integration",
  "description": "API key for production data sync",
  "permissions": [
    "dpe:read",
    "dpe:write",
    "matching:run",
    "matching:read"
  ],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response** :
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "Production Integration",
      "description": "API key for production data sync",
      "permissions": ["dpe:read", "dpe:write", "matching:run", "matching:read"],
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "plainTextKey": "dpm_a1b2c3d4e5f6...xyz",
    "message": "API key created successfully. Save this key securely - it will not be shown again."
  }
}
```

**⚠️ IMPORTANT** : La clé en clair (`plainTextKey`) n'est retournée qu'**une seule fois** à la création. Sauvegardez-la de manière sécurisée !

### Lister les API Keys

**Endpoint** : `GET /api/api-keys`

**Headers** :
```
Authorization: Bearer <jwt_token>
```

**Response** :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production Integration",
      "description": "API key for production data sync",
      "permissions": ["dpe:read", "dpe:write"],
      "lastUsedAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Récupérer une API Key

**Endpoint** : `GET /api/api-keys/:id`

**Headers** :
```
Authorization: Bearer <jwt_token>
```

### Mettre à jour une API Key

**Endpoint** : `PATCH /api/api-keys/:id`

**Headers** :
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body** :
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "permissions": ["dpe:read"],
  "isActive": false
}
```

### Désactiver une API Key

**Endpoint** : `POST /api/api-keys/:id/disable`

**Headers** :
```
Authorization: Bearer <jwt_token>
```

### Supprimer une API Key

**Endpoint** : `DELETE /api/api-keys/:id`

**Headers** :
```
Authorization: Bearer <jwt_token>
```

## 🔐 Utilisation des API Keys

### Avec le header X-API-Key

```bash
curl -X GET http://localhost:3001/api/dpes \
  -H "X-API-Key: dpm_a1b2c3d4e5f6...xyz"
```

### Avec Authorization Bearer

```bash
curl -X GET http://localhost:3001/api/dpes \
  -H "Authorization: Bearer dpm_a1b2c3d4e5f6...xyz"
```

### Avec JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'X-API-Key': 'dpm_a1b2c3d4e5f6...xyz',
  },
});

// Utilisation
const { data } = await api.get('/dpes');
```

### Avec Python

```python
import requests

headers = {
    'X-API-Key': 'dpm_a1b2c3d4e5f6...xyz'
}

response = requests.get('http://localhost:3001/api/dpes', headers=headers)
data = response.json()
```

## 🎯 Permissions Disponibles

### DPE
- `dpe:read` - Lire les DPE records
- `dpe:write` - Créer/modifier des DPE records

### Annonces
- `annonces:read` - Lire les annonces
- `annonces:write` - Créer/modifier des annonces

### Matching
- `matching:run` - Exécuter l'algorithme de matching
- `matching:read` - Consulter les résultats de matching
- `matching:validate` - Valider les matchs

### Admin
- `admin:*` - Accès complet à toutes les ressources

## 🛡️ Sécurité

### Génération des Clés
- **Format** : `dpm_` + 64 caractères hexadécimaux (256 bits d'entropie)
- **Stockage** : Hash SHA-256 en base de données
- **Comparaison** : Timing-safe pour éviter les timing attacks

### Bonnes Pratiques

1. **Ne jamais commiter les API keys** dans le code source
2. **Utiliser des variables d'environnement** pour stocker les clés
3. **Rotation régulière** des clés (désactiver les anciennes, créer de nouvelles)
4. **Principe du moindre privilège** : attribuer uniquement les permissions nécessaires
5. **Date d'expiration** : définir une date d'expiration pour les clés temporaires
6. **Monitoring** : surveiller `lastUsedAt` pour détecter les clés inutilisées
7. **Désactivation immédiate** en cas de compromission

### Stockage Sécurisé

#### En développement
```bash
# .env.local
API_KEY=dpm_a1b2c3d4e5f6...xyz
```

#### En production
Utiliser un gestionnaire de secrets :
- **AWS Secrets Manager**
- **Azure Key Vault**
- **Google Cloud Secret Manager**
- **HashiCorp Vault**
- Variables d'environnement chiffrées

## 🔄 Migration JWT vers API Key

Si vous avez une intégration existante avec JWT et souhaitez migrer vers API Key :

### Avant (JWT)
```typescript
const token = await login(email, password);
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Après (API Key)
```typescript
// Plus de login nécessaire !
api.defaults.headers.common['X-API-Key'] = process.env.API_KEY;
```

## 📊 Monitoring

### Suivi de l'utilisation

Chaque appel avec une API key met à jour `lastUsedAt`. Vous pouvez monitorer :
- Fréquence d'utilisation
- Dernière utilisation
- Clés inactives (à désactiver)

### Logs

Le système log automatiquement :
- ✅ Authentifications réussies
- ❌ Tentatives avec clés invalides
- ⚠️ Permissions insuffisantes
- 🔒 Clés expirées/désactivées

## 🧪 Tests

### Tester l'authentification

```bash
# Clé valide
curl -X GET http://localhost:3001/api/dpes \
  -H "X-API-Key: dpm_valid_key" \
  -v

# Clé invalide (401)
curl -X GET http://localhost:3001/api/dpes \
  -H "X-API-Key: invalid_key" \
  -v

# Sans clé (401)
curl -X GET http://localhost:3001/api/dpes \
  -v
```

### Tester les permissions

```bash
# Avec permission dpe:read
curl -X GET http://localhost:3001/api/dpes \
  -H "X-API-Key: dpm_read_only_key"

# Sans permission dpe:write (403)
curl -X POST http://localhost:3001/api/dpes \
  -H "X-API-Key: dpm_read_only_key" \
  -H "Content-Type: application/json" \
  -d '{"numeroDpe": "123"}'
```

## 🔧 Configuration des Routes

### Routes protégées par API Key uniquement

```typescript
import { authenticateApiKey, requireApiKeyPermissions } from '@middleware/api-key-auth';
import { ApiKeyPermission } from '@dpe-matching/shared';

router.get(
  '/dpes',
  authenticateApiKey,
  requireApiKeyPermissions(ApiKeyPermission.DPE_READ),
  dpeController.listDpes
);
```

### Routes acceptant JWT OU API Key

```typescript
import { authenticateJwtOrApiKey } from '@middleware/api-key-auth';

router.get(
  '/dpes',
  authenticateJwtOrApiKey,
  dpeController.listDpes
);
```

## 📝 Schema Prisma

```prisma
model ApiKey {
  id          String    @id @default(uuid())
  key         String    @unique @db.VarChar(64)  // Hash SHA-256
  name        String
  description String?
  userId      String?
  user        User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  permissions Json      // Array de ApiKeyPermission
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([key])
  @@index([userId])
  @@map("api_keys")
}
```

## ❓ FAQ

### Quelle est la différence entre JWT et API Key ?
- **JWT** : Sessions utilisateur courtes, interface web, login/logout
- **API Key** : Accès machine-to-machine longue durée, pas de login nécessaire

### Puis-je avoir plusieurs API keys ?
Oui ! Vous pouvez créer autant de clés que nécessaire (une par environnement, service, etc.).

### Que faire si une clé est compromise ?
1. Désactivez immédiatement : `POST /api/api-keys/:id/disable`
2. Créez une nouvelle clé avec les mêmes permissions
3. Mettez à jour vos services avec la nouvelle clé
4. Supprimez l'ancienne : `DELETE /api/api-keys/:id`

### Les API keys expirent-elles ?
Uniquement si vous définissez `expiresAt` lors de la création. Par défaut, elles n'expirent pas.

### Comment tester en local ?
1. Authentifiez-vous avec JWT
2. Créez une API key via `POST /api/api-keys`
3. Copiez la `plainTextKey` retournée
4. Utilisez-la dans vos requêtes avec `X-API-Key`

## 📚 Ressources

- [Documentation API complète](./README.md)
- [Guide de sécurité](./SECURITY.md)
- [Exemples d'intégration](./examples/)
