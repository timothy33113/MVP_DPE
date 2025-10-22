/**
 * Types pour l'authentification par API Key
 */

import { z } from 'zod';

/**
 * Permissions disponibles pour les API keys
 */
export enum ApiKeyPermission {
  // DPE
  DPE_READ = 'dpe:read',
  DPE_WRITE = 'dpe:write',

  // Annonces
  ANNONCES_READ = 'annonces:read',
  ANNONCES_WRITE = 'annonces:write',

  // Matching
  MATCHING_RUN = 'matching:run',
  MATCHING_READ = 'matching:read',
  MATCHING_VALIDATE = 'matching:validate',

  // Admin
  ADMIN_FULL = 'admin:*',
}

/**
 * API Key
 */
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  userId?: string;
  permissions: ApiKeyPermission[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schéma pour créer une API key
 */
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.nativeEnum(ApiKeyPermission)).min(1),
  expiresAt: z.coerce.date().optional(),
});

export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;

/**
 * Schéma pour mettre à jour une API key
 */
export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.nativeEnum(ApiKeyPermission)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateApiKeyDto = z.infer<typeof UpdateApiKeySchema>;

/**
 * Réponse de création d'API key (inclut la clé en clair une seule fois)
 */
export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  plainTextKey: string; // Clé en clair, à afficher une seule fois
  message: string;
}
