/**
 * Point d'entrée de l'application backend
 */

import { createApp } from './app';
import { config } from '@config/index';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { logger } from '@utils/logger';

/**
 * Démarre le serveur
 */
const startServer = async (): Promise<void> => {
  try {
    // Connexion à la base de données
    await connectDatabase();

    // Créer l'application Express
    const app = createApp();

    // Démarrer le serveur
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 Server started on http://${config.server.host}:${config.server.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`✓ Ready to accept connections`);
    });

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      logger.info('Shutting down gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
