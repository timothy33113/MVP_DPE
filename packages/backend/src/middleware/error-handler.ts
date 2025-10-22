/**
 * Middleware de gestion centralisée des erreurs
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { AppError, InternalServerError } from '@utils/errors';
import { logger } from '@utils/logger';
import { config } from '@config/index';
import { ERROR_CODES, ERROR_MESSAGES } from '@dpe-matching/shared';
import type { ApiResponse } from '@dpe-matching/shared';

/**
 * Middleware de gestion d'erreurs
 * Doit être le dernier middleware dans la chaîne
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void => {
  let error = err;

  // Convertir les erreurs connues en AppError
  if (!(error instanceof AppError)) {
    // Erreurs de validation Zod
    if (error instanceof ZodError) {
      error = new AppError(
        ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
        422,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        error.errors
      );
    }
    // Erreurs Prisma
    else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      error = handlePrismaError(error);
    }
    // Erreurs inconnues
    else {
      error = new InternalServerError(
        config.isProduction ? ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR] : error.message,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        config.isDevelopment ? { originalError: error.message, stack: error.stack } : undefined
      );
    }
  }

  const appError = error as AppError;

  // Logger l'erreur
  if (appError.statusCode >= 500) {
    logger.error('Server Error:', {
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      details: appError.details,
    });
  } else if (appError.statusCode >= 400) {
    logger.warn('Client Error:', {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    });
  }

  // Envoyer la réponse d'erreur
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: config.isDevelopment ? appError.details : undefined,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Convertit les erreurs Prisma en AppError
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Violation de contrainte unique
      return new AppError(
        ERROR_MESSAGES[ERROR_CODES.RESOURCE_ALREADY_EXISTS],
        409,
        ERROR_CODES.RESOURCE_ALREADY_EXISTS,
        true,
        { field: error.meta?.target }
      );

    case 'P2025':
      // Enregistrement non trouvé
      return new AppError(
        ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND],
        404,
        ERROR_CODES.RESOURCE_NOT_FOUND,
        true
      );

    case 'P2003':
      // Violation de contrainte de clé étrangère
      return new AppError(
        'Foreign key constraint violation',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        { field: error.meta?.field_name }
      );

    default:
      return new InternalServerError(
        'Database error',
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        config.isDevelopment ? { code: error.code, meta: error.meta } : undefined
      );
  }
};

/**
 * Middleware pour gérer les routes non trouvées
 */
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError('Route not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND, true);
  next(error);
};
