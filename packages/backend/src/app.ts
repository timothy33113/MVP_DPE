/**
 * Configuration Express
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { config } from '@config/index';
import { swaggerSpec } from '@config/swagger';
import { errorHandler, notFoundHandler } from '@middleware/error-handler';
import { generalRateLimiter } from '@middleware/rate-limiter';
import routes from '@routes/index';

// BigInt serialization for JSON
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Rate limiting
  app.use(generalRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DPE-Leboncoin API Documentation',
  }));

  // Swagger JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
