/**
 * Routes pour la gestion des API keys
 */

import { Router } from 'express';
import { apiKeysController } from '@modules/api-keys/api-keys.controller';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validator';
import {
  CreateApiKeyBodySchema,
  UpdateApiKeyBodySchema,
  GetApiKeySchema,
} from '@modules/api-keys/api-keys.types';

const router = Router();

// Toutes les routes nécessitent une authentification JWT (pas d'API key pour gérer les API keys)
router.use(authenticate);

// POST /api/api-keys - Créer une nouvelle API key
router.post('/', validate(CreateApiKeyBodySchema), apiKeysController.createApiKey);

// GET /api/api-keys - Lister ses API keys
router.get('/', apiKeysController.listApiKeys);

// GET /api/api-keys/:id - Récupérer une API key
router.get('/:id', validate(GetApiKeySchema), apiKeysController.getApiKey);

// PATCH /api/api-keys/:id - Mettre à jour une API key
router.patch('/:id', validate(UpdateApiKeyBodySchema), apiKeysController.updateApiKey);

// POST /api/api-keys/:id/disable - Désactiver une API key
router.post('/:id/disable', validate(GetApiKeySchema), apiKeysController.disableApiKey);

// DELETE /api/api-keys/:id - Supprimer une API key
router.delete('/:id', validate(GetApiKeySchema), apiKeysController.deleteApiKey);

export default router;
