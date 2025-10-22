/**
 * Configuration centralisée pour l'application backend
 * Utilise les variables d'environnement avec validation stricte
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Charger les variables d'environnement
dotenv.config();

/**
 * Schéma de validation pour les variables d'environnement
 */
const EnvSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().optional().default('./logs'),

  // External APIs
  RAPIDAPI_KEY: z.string().optional(),

  // Integration API (n8n/Supabase)
  N8N_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Matching Algorithm
  DEFAULT_MAX_CANDIDATS: z.coerce.number().int().positive().default(10),
  DEFAULT_SEUIL_SCORE_MINIMUM: z.coerce.number().int().min(0).max(100).default(30),
  DEFAULT_DISTANCE_MAX_GPS: z.coerce.number().int().positive().default(500),
});

/**
 * Valide et parse les variables d'environnement
 */
const parseEnv = (): z.infer<typeof EnvSchema> => {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
};

// Valider les variables d'environnement au démarrage
const env = parseEnv();

/**
 * Configuration de l'application
 */
export const config = {
  /**
   * Environment de l'application
   */
  env: env.NODE_ENV,

  /**
   * Indique si l'application est en mode production
   */
  isProduction: env.NODE_ENV === 'production',

  /**
   * Indique si l'application est en mode développement
   */
  isDevelopment: env.NODE_ENV === 'development',

  /**
   * Indique si l'application est en mode test
   */
  isTest: env.NODE_ENV === 'test',

  /**
   * Configuration du serveur
   */
  server: {
    port: env.PORT,
    host: env.HOST,
  },

  /**
   * Configuration de la base de données
   */
  database: {
    url: env.DATABASE_URL,
  },

  /**
   * Configuration JWT
   */
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  /**
   * Configuration CORS
   */
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  },

  /**
   * Configuration du rate limiting
   */
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  /**
   * Configuration des logs
   */
  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH,
  },

  /**
   * Configuration des APIs externes
   */
  externalApis: {
    rapidApiKey: env.RAPIDAPI_KEY,
    n8nApiKey: env.N8N_API_KEY,
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  /**
   * Configuration de l'algorithme de matching
   */
  matching: {
    defaultMaxCandidats: env.DEFAULT_MAX_CANDIDATS,
    defaultSeuilScoreMinimum: env.DEFAULT_SEUIL_SCORE_MINIMUM,
    defaultDistanceMaxGPS: env.DEFAULT_DISTANCE_MAX_GPS,
  },
};

/**
 * Type pour la configuration
 */
export type Config = typeof config;
