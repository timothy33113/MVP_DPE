/**
 * Service pour la gestion des API keys
 */

import { apiKeysRepository } from './api-keys.repository';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  CreateApiKeyResponse,
  ApiKey,
} from '@dpe-matching/shared';
import { generateAndHashApiKey } from '@utils/crypto';
import { NotFoundError, ForbiddenError } from '@utils/errors';
import { logger } from '@utils/logger';

export class ApiKeysService {
  /**
   * Crée une nouvelle API key pour un utilisateur
   */
  async createApiKey(userId: string, data: CreateApiKeyDto): Promise<CreateApiKeyResponse> {
    logger.info('Creating new API key', { userId, name: data.name });

    // Générer la clé et son hash
    const { plainKey, hashedKey } = generateAndHashApiKey();

    // Créer en base avec le hash
    const apiKey = await apiKeysRepository.createApiKey({
      key: hashedKey,
      name: data.name,
      description: data.description,
      userId,
      permissions: data.permissions,
      expiresAt: data.expiresAt,
    });

    logger.info('API key created successfully', { keyId: apiKey.id, userId });

    return {
      apiKey: {
        ...apiKey,
        key: '***', // Ne pas retourner le hash
      },
      plainTextKey: plainKey,
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
    };
  }

  /**
   * Liste les API keys d'un utilisateur
   */
  async listUserApiKeys(userId: string): Promise<Omit<ApiKey, 'key'>[]> {
    return await apiKeysRepository.listApiKeysByUserId(userId);
  }

  /**
   * Récupère une API key par ID
   */
  async getApiKeyById(apiKeyId: string, userId: string): Promise<Omit<ApiKey, 'key'>> {
    const apiKey = await apiKeysRepository.getApiKeyById(apiKeyId);

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    // Vérifier que l'utilisateur est propriétaire
    if (apiKey.userId !== userId) {
      throw new ForbiddenError('You do not have access to this API key');
    }

    // Ne pas retourner le hash de la clé
    const { key, ...apiKeyWithoutKey } = apiKey;
    return apiKeyWithoutKey;
  }

  /**
   * Met à jour une API key
   */
  async updateApiKey(
    apiKeyId: string,
    userId: string,
    data: UpdateApiKeyDto
  ): Promise<Omit<ApiKey, 'key'>> {
    // Vérifier que l'utilisateur est propriétaire
    const isOwner = await apiKeysRepository.isApiKeyOwnedByUser(apiKeyId, userId);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this API key');
    }

    logger.info('Updating API key', { keyId: apiKeyId, userId });

    const updatedApiKey = await apiKeysRepository.updateApiKey(apiKeyId, data);

    // Ne pas retourner le hash de la clé
    const { key, ...apiKeyWithoutKey } = updatedApiKey;
    return apiKeyWithoutKey;
  }

  /**
   * Désactive une API key
   */
  async disableApiKey(apiKeyId: string, userId: string): Promise<void> {
    await this.updateApiKey(apiKeyId, userId, { isActive: false });
    logger.info('API key disabled', { keyId: apiKeyId, userId });
  }

  /**
   * Supprime une API key
   */
  async deleteApiKey(apiKeyId: string, userId: string): Promise<void> {
    // Vérifier que l'utilisateur est propriétaire
    const isOwner = await apiKeysRepository.isApiKeyOwnedByUser(apiKeyId, userId);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this API key');
    }

    await apiKeysRepository.deleteApiKey(apiKeyId);
    logger.info('API key deleted', { keyId: apiKeyId, userId });
  }
}

export const apiKeysService = new ApiKeysService();
