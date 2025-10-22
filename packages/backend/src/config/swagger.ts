/**
 * Configuration Swagger/OpenAPI
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'DPE-Leboncoin Matching API',
    version: '1.0.0',
    description: `
      API backend pour le système de matching entre diagnostics DPE et annonces Leboncoin.

      ## Fonctionnalités

      - **Authentification**: JWT et API Keys
      - **DPE**: Gestion des diagnostics de performance énergétique
      - **Annonces**: Gestion des annonces Leboncoin
      - **Matching**: Algorithme de scoring et clustering
      - **Clusters**: Validation et gestion des matches

      ## Authentification

      L'API supporte deux méthodes d'authentification:

      1. **JWT Token**: Pour les utilisateurs web (header: \`Authorization: Bearer <token>\`)
      2. **API Key**: Pour les intégrations (header: \`X-API-Key: <key>\`)
    `,
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}`,
      description: 'Development server',
    },
    {
      url: 'https://api.production.example.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtenu via /api/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key pour les intégrations',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_INVALID_INPUT',
              },
              message: {
                type: 'string',
                example: 'Invalid input data',
              },
              details: {
                type: 'object',
                nullable: true,
              },
            },
          },
        },
      },
      DPERecord: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          numeroDpe: {
            type: 'string',
            description: 'Numéro unique du DPE',
          },
          adresseBan: {
            type: 'string',
          },
          codePostalBan: {
            type: 'string',
          },
          typeBatiment: {
            type: 'string',
            enum: ['APPARTEMENT', 'MAISON'],
          },
          surfaceHabitable: {
            type: 'number',
          },
          anneConstruction: {
            type: 'integer',
            nullable: true,
          },
          etiquetteDpe: {
            type: 'string',
            enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          },
          etiquetteGes: {
            type: 'string',
            enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          },
          coordonneeX: {
            type: 'number',
            description: 'Longitude',
          },
          coordonneeY: {
            type: 'number',
            description: 'Latitude',
          },
          dateEtablissement: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      LeboncoinAnnonce: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          listId: {
            type: 'string',
            description: 'ID Leboncoin',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
          codePostal: {
            type: 'string',
          },
          typeBien: {
            type: 'string',
            enum: ['APPARTEMENT', 'MAISON'],
          },
          surface: {
            type: 'number',
          },
          pieces: {
            type: 'integer',
            nullable: true,
          },
          lat: {
            type: 'number',
          },
          lng: {
            type: 'number',
          },
          datePublication: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      MatchCluster: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          annonceId: {
            type: 'string',
            format: 'uuid',
          },
          statut: {
            type: 'string',
            enum: ['EN_ATTENTE', 'VALIDE', 'REJETE'],
          },
          meilleurScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
          nombreCandidats: {
            type: 'integer',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'DPE',
      description: 'DPE management',
    },
    {
      name: 'Annonces',
      description: 'Leboncoin annonces management',
    },
    {
      name: 'Matching',
      description: 'Matching algorithm',
    },
    {
      name: 'Clusters',
      description: 'Match clusters validation',
    },
    {
      name: 'API Keys',
      description: 'API key management',
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/modules/*/*.controller.ts',
    './src/modules/*/*.types.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
