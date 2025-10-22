/**
 * Classes d'erreurs personnalisées pour l'application
 * Permet une gestion d'erreurs typée et structurée
 */

import { ERROR_CODES, ERROR_MESSAGES } from '@dpe-matching/shared';

/**
 * Classe de base pour toutes les erreurs de l'application
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * Erreur 400 - Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string, code = ERROR_CODES.VALIDATION_ERROR, details?: unknown) {
    super(message, 400, code, true, details);
  }
}

/**
 * Erreur 401 - Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.AUTH_UNAUTHORIZED],
    code:
      | typeof ERROR_CODES.AUTH_UNAUTHORIZED
      | typeof ERROR_CODES.AUTH_TOKEN_INVALID
      | typeof ERROR_CODES.AUTH_TOKEN_EXPIRED
      | typeof ERROR_CODES.AUTH_INVALID_CREDENTIALS = ERROR_CODES.AUTH_UNAUTHORIZED,
    details?: unknown
  ) {
    super(message, 401, code, true, details);
  }
}

/**
 * Erreur 403 - Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string, code = ERROR_CODES.AUTH_UNAUTHORIZED, details?: unknown) {
    super(message, 403, code, true, details);
  }
}

/**
 * Erreur 404 - Not Found
 */
export class NotFoundError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND],
    code = ERROR_CODES.RESOURCE_NOT_FOUND,
    details?: unknown
  ) {
    super(message, 404, code, true, details);
  }
}

/**
 * Erreur 409 - Conflict
 */
export class ConflictError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.RESOURCE_ALREADY_EXISTS],
    code = ERROR_CODES.RESOURCE_ALREADY_EXISTS,
    details?: unknown
  ) {
    super(message, 409, code, true, details);
  }
}

/**
 * Erreur 422 - Unprocessable Entity
 */
export class ValidationError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.VALIDATION_INVALID_INPUT],
    code = ERROR_CODES.VALIDATION_INVALID_INPUT,
    details?: unknown
  ) {
    super(message, 422, code, true, details);
  }
}

/**
 * Erreur 429 - Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
    code = ERROR_CODES.RATE_LIMIT_EXCEEDED,
    details?: unknown
  ) {
    super(message, 429, code, true, details);
  }
}

/**
 * Erreur 500 - Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    details?: unknown
  ) {
    super(message, 500, code, false, details);
  }
}

/**
 * Erreur 503 - Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = ERROR_MESSAGES[ERROR_CODES.SERVICE_UNAVAILABLE],
    code = ERROR_CODES.SERVICE_UNAVAILABLE,
    details?: unknown
  ) {
    super(message, 503, code, true, details);
  }
}

/**
 * Vérifie si une erreur est une erreur opérationnelle
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};
