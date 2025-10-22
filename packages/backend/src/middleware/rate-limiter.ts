/**
 * Middleware de rate limiting pour protéger l'API contre les abus
 */

import rateLimit from 'express-rate-limit';

import { config } from '@config/index';
import { ERROR_CODES, ERROR_MESSAGES } from '@dpe-matching/shared';
import type { ApiResponse } from '@dpe-matching/shared';

/**
 * Rate limiter général pour toutes les routes
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.isDevelopment ? 10000 : config.rateLimit.maxRequests, // Très permissif en dev
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  } as ApiResponse<never>,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse<never>);
  },
});

/**
 * Rate limiter strict pour les routes d'authentification
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  } as ApiResponse<never>,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour les routes de matching (calculs intensifs)
 */
export const matchingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requêtes max par minute
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Trop de requêtes de matching, veuillez patienter',
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  } as ApiResponse<never>,
  standardHeaders: true,
  legacyHeaders: false,
});
