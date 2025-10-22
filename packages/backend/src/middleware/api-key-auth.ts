/**
 * Middleware d'authentification par API Key
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/database';
import { UnauthorizedError, ForbiddenError } from '@utils/errors';
import { hashApiKey } from '@utils/crypto';
import { logger } from '@utils/logger';
import { ERROR_CODES } from '@dpe-matching/shared';
import type { ApiKeyPermission } from '@dpe-matching/shared';

/**
 * Extension de Request pour ajouter l'API key
 */
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId?: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware pour authentifier avec une API key
 * Supporte les formats:
 * - Header: X-API-Key: dpm_xxx
 * - Header: Authorization: Bearer dpm_xxx
 */
export const authenticateApiKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Récupérer la clé API du header
    let apiKey = req.headers['x-api-key'] as string;

    // Alternative: Authorization Bearer
    if (!apiKey) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer dpm_')) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey) {
      throw new UnauthorizedError(
        'API key required. Provide it via X-API-Key header or Authorization: Bearer header',
        ERROR_CODES.AUTH_UNAUTHORIZED
      );
    }

    // Vérifier le format
    if (!apiKey.startsWith('dpm_')) {
      throw new UnauthorizedError('Invalid API key format', ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    // Hasher la clé pour la recherche en base
    const hashedKey = hashApiKey(apiKey);

    // Rechercher la clé en base
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      select: {
        id: true,
        userId: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!apiKeyRecord) {
      logger.warn('Invalid API key attempt', { key: apiKey.substring(0, 10) + '...' });
      throw new UnauthorizedError('Invalid API key', ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    // Vérifier si la clé est active
    if (!apiKeyRecord.isActive) {
      throw new UnauthorizedError('API key is disabled', ERROR_CODES.AUTH_TOKEN_INVALID);
    }

    // Vérifier si la clé a expiré
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      throw new UnauthorizedError('API key has expired', ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }

    // Attacher les informations de l'API key à la requête
    req.apiKey = {
      id: apiKeyRecord.id,
      userId: apiKeyRecord.userId ?? undefined,
      permissions: apiKeyRecord.permissions as string[],
    };

    // Mettre à jour la date de dernière utilisation (async, sans attendre)
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        logger.error('Failed to update API key lastUsedAt:', error);
      });

    logger.info('API key authenticated', { keyId: apiKeyRecord.id });
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware pour vérifier les permissions de l'API key
 * @param requiredPermissions Permissions requises (OR logic)
 */
export const requireApiKeyPermissions = (...requiredPermissions: ApiKeyPermission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      throw new UnauthorizedError('API key authentication required', ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    const userPermissions = req.apiKey.permissions;

    // Admin a tous les droits
    if (userPermissions.includes('admin:*')) {
      return next();
    }

    // Vérifier si l'utilisateur a au moins une des permissions requises
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Insufficient API key permissions', {
        keyId: req.apiKey.id,
        required: requiredPermissions,
        actual: userPermissions,
      });

      throw new ForbiddenError(
        'Insufficient permissions for this action',
        ERROR_CODES.AUTH_UNAUTHORIZED
      );
    }

    next();
  };
};

/**
 * Middleware pour authentifier avec JWT OU API key
 * Permet les deux méthodes d'authentification
 */
export const authenticateJwtOrApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Vérifier d'abord si on a une API key
  const hasApiKey =
    req.headers['x-api-key'] || req.headers.authorization?.startsWith('Bearer dpm_');

  if (hasApiKey) {
    return authenticateApiKey(req, res, next);
  }

  // Sinon, utiliser l'authentification JWT
  const { authenticate } = await import('./auth');
  return authenticate(req, res, next);
};
