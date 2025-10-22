/**
 * Configuration et initialisation de Prisma Client
 */

import { PrismaClient } from '@prisma/client';

import { config } from './index';
import { logger } from '@utils/logger';

/**
 * Instance Prisma Client avec logging configuré
 */
const prisma = new PrismaClient({
  log: config.isDevelopment
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ]
    : [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
});

/**
 * Logger les requêtes SQL en développement
 */
if (config.isDevelopment) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
  });
}

/**
 * Connecte à la base de données
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✓ Database connected successfully');
  } catch (error) {
    logger.error('✗ Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Déconnecte de la base de données
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('✓ Database disconnected successfully');
  } catch (error) {
    logger.error('✗ Failed to disconnect from database:', error);
    throw error;
  }
};

/**
 * Instance Prisma Client exportée
 */
export { prisma };
