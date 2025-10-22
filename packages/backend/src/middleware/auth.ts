/**
 * Middleware d'authentification JWT
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '@config/index';
import { UnauthorizedError } from '@utils/errors';
import { ERROR_CODES, ERROR_MESSAGES } from '@dpe-matching/shared';
import type { JwtPayload, UserRole } from '@dpe-matching/shared';

/**
 * Extension de Request pour ajouter l'utilisateur authentifié
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware pour vérifier l'authentification
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided', ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    const token = authHeader.substring(7);

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Attacher les informations de l'utilisateur à la requête
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(
        new UnauthorizedError(
          ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_EXPIRED],
          ERROR_CODES.AUTH_TOKEN_EXPIRED
        )
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(
        new UnauthorizedError(
          ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_INVALID],
          ERROR_CODES.AUTH_TOKEN_INVALID
        )
      );
    } else {
      next(error);
    }
  }
};

/**
 * Middleware pour vérifier les rôles utilisateur
 * @param roles Rôles autorisés
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions', ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    next();
  };
};

/**
 * Middleware optionnel pour authentification (n'échoue pas si pas de token)
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans authentification
    next();
  }
};
