/**
 * Middleware de validation des requêtes avec Zod
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

import { ValidationError } from '@utils/errors';
import { ERROR_CODES } from '@dpe-matching/shared';

/**
 * Middleware pour valider les données de la requête avec un schéma Zod
 * @param schema Schéma Zod à utiliser pour la validation
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Invalid request data',
            ERROR_CODES.VALIDATION_INVALID_INPUT,
            error.errors
          )
        );
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware pour valider uniquement le body
 * @param schema Schéma Zod pour le body
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Invalid request body',
            ERROR_CODES.VALIDATION_INVALID_INPUT,
            error.errors
          )
        );
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware pour valider uniquement les query params
 * @param schema Schéma Zod pour les query params
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Invalid query parameters',
            ERROR_CODES.VALIDATION_INVALID_INPUT,
            error.errors
          )
        );
      } else {
        next(error);
      }
    }
  };
};

/**
 * Middleware pour valider uniquement les params
 * @param schema Schéma Zod pour les params
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Invalid path parameters',
            ERROR_CODES.VALIDATION_INVALID_INPUT,
            error.errors
          )
        );
      } else {
        next(error);
      }
    }
  };
};
