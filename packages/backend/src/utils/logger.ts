/**
 * Logger Winston configuré pour l'application
 * Gère les logs console et fichiers avec rotation
 */

import winston from 'winston';
import path from 'path';
import { config } from '@config/index';

/**
 * Format personnalisé pour les logs
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Ajouter le stack trace si disponible
    if (stack) {
      log += `\n${stack}`;
    }

    // Ajouter les métadonnées si disponibles
    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length > 0) {
      log += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return log;
  })
);

/**
 * Transports pour les logs
 */
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), customFormat),
  }),
];

// Ajouter les transports fichier (sauf en serverless Vercel)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerless && (config.isProduction || config.isDevelopment)) {
  transports.push(
    // Tous les logs
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'combined.log'),
      format: customFormat,
    }),
    // Logs d'erreur uniquement
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'error.log'),
      level: 'error',
      format: customFormat,
    })
  );
}

/**
 * Instance du logger
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports,
  exitOnError: false,
});

/**
 * Stream pour Morgan (HTTP logging)
 */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
