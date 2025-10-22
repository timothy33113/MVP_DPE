/**
 * Repository pour les API keys
 */

import { prisma } from '@config/database';
import { ApiKey, ApiKeyPermission } from '@dpe-matching/shared';

export class ApiKeysRepository {
  /**
   * Crée une nouvelle API key
   */
  async createApiKey(data: {
    key: string;
    name: string;
    description?: string;
    userId?: string;
    permissions: ApiKeyPermission[];
    expiresAt?: Date;
  }): Promise<ApiKey> {
    return (await prisma.apiKey.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        userId: data.userId,
        permissions: data.permissions as unknown as any,
        expiresAt: data.expiresAt,
      },
    })) as ApiKey;
  }

  /**
   * Récupère une API key par son ID
   */
  async getApiKeyById(id: string): Promise<ApiKey | null> {
    return (await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        userId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as ApiKey | null;
  }

  /**
   * Liste les API keys d'un utilisateur
   */
  async listApiKeysByUserId(userId: string): Promise<Omit<ApiKey, 'key'>[]> {
    return (await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        key: false, // Ne jamais retourner la clé hashée
      },
      orderBy: { createdAt: 'desc' },
    })) as Omit<ApiKey, 'key'>[];
  }

  /**
   * Met à jour une API key
   */
  async updateApiKey(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: ApiKeyPermission[];
      isActive?: boolean;
    }
  ): Promise<ApiKey> {
    return (await prisma.apiKey.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.permissions && { permissions: data.permissions as unknown as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })) as ApiKey;
  }

  /**
   * Supprime une API key
   */
  async deleteApiKey(id: string): Promise<void> {
    await prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * Vérifie si une API key appartient à un utilisateur
   */
  async isApiKeyOwnedByUser(apiKeyId: string, userId: string): Promise<boolean> {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: userId,
      },
    });

    return apiKey !== null;
  }
}

export const apiKeysRepository = new ApiKeysRepository();
