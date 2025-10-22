/**
 * Constantes partagées pour le système de matching DPE-Leboncoin
 */

/**
 * Seuils de distance GPS pour le calcul des bonus (en mètres)
 */
export const GPS_DISTANCE_THRESHOLDS = {
  EXCELLENT: 50, // < 50m = 10 points
  GOOD: 100, // < 100m = 7 points
  ACCEPTABLE: 200, // < 200m = 4 points
  // > 200m = 0 points
} as const;

/**
 * Seuils de différence de surface pour le calcul du score (en %)
 */
export const SURFACE_DIFF_THRESHOLDS = {
  PERFECT: 5, // < 5% = 15 points
  GOOD: 10, // < 10% = 10 points
  // > 10% = 0 points
} as const;

/**
 * Seuils de différence d'année de construction (en années)
 */
export const ANNEE_DIFF_THRESHOLDS = {
  PERFECT: 5, // < 5 ans = 10 points
  // > 5 ans = 0 points
} as const;

/**
 * Seuils de timing entre publication annonce et date DPE (en jours)
 */
export const TIMING_THRESHOLDS = {
  PERFECT: 17, // < 17 jours = 15 points (très précis)
  EXCELLENT: 22, // < 22 jours = 12 points
  GOOD: 90, // < 90 jours = 8 points
  ACCEPTABLE: 180, // < 180 jours = 3 points
  // > 180 jours = 0 points
} as const;

/**
 * Scores de base maximum
 */
export const MAX_SCORES = {
  DPE: 25,
  GES: 25,
  SURFACE: 5, // Très réduit car souvent imprécis
  SURFACE_TERRAIN: 10, // Surface du terrain
  ANNEE: 10,
  PIECES: 10,
  NIVEAUX_ETAGE: 5,
  CHAUFFAGE: 5,
  TIMING: 15, // Très augmenté car c'est le critère le plus discriminant avec le coût
  COUT_ENERGIE: 30, // Coût énergie annuel (TRÈS discriminant - poids triplé)
} as const;

/**
 * Bonus maximum
 */
export const MAX_BONUS = {
  DISTANCE_GPS: 10,
  VILLE: 5,
  QUARTIER: 5,
  RUE: 5,
  CHAMBRES: 3,
  ORIENTATION: 2,
  EXTERIEUR: 2,
  TRAVERSANT: 3, // Logement traversant
} as const;

/**
 * Score total théorique maximum
 */
export const SCORE_TOTAL_MAX = 100;

/**
 * Score de base théorique maximum
 */
export const SCORE_BASE_MAX = Object.values(MAX_SCORES).reduce((a, b) => a + b, 0);

/**
 * Bonus théorique maximum
 */
export const BONUS_TOTAL_MAX = Object.values(MAX_BONUS).reduce((a, b) => a + b, 0);

/**
 * Seuils de confiance basés sur le score normalisé
 */
export const CONFIANCE_THRESHOLDS = {
  CERTAIN: 90, // >= 90%
  TRES_FIABLE: 75, // >= 75%
  PROBABLE: 60, // >= 60%
  POSSIBLE: 40, // >= 40%
  // < 40% = DOUTEUX
} as const;

/**
 * Nombre maximum de candidats à retourner par défaut
 */
export const DEFAULT_MAX_CANDIDATS = 10;

/**
 * Score minimum pour être considéré comme candidat valide
 */
export const DEFAULT_SEUIL_SCORE_MINIMUM = 30;

/**
 * Distance GPS maximum pour être considéré (en mètres)
 */
export const DEFAULT_DISTANCE_MAX_GPS = 500;

/**
 * Configuration de rate limiting (par défaut)
 */
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
} as const;

/**
 * Configuration JWT
 */
export const JWT_CONFIG = {
  DEFAULT_EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
} as const;

/**
 * Codes d'erreur API
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // Matching
  MATCHING_NO_CANDIDATES: 'MATCHING_NO_CANDIDATES',
  MATCHING_INVALID_CRITERIA: 'MATCHING_INVALID_CRITERIA',

  // Server
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Messages d'erreur par défaut
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Token expiré, veuillez vous reconnecter',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Token invalide',
  [ERROR_CODES.AUTH_UNAUTHORIZED]: 'Non autorisé',
  [ERROR_CODES.VALIDATION_ERROR]: 'Erreur de validation',
  [ERROR_CODES.VALIDATION_INVALID_INPUT]: 'Données invalides',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Ressource non trouvée',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'Cette ressource existe déjà',
  [ERROR_CODES.MATCHING_NO_CANDIDATES]: 'Aucun candidat trouvé',
  [ERROR_CODES.MATCHING_INVALID_CRITERIA]: 'Critères de matching invalides',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Erreur interne du serveur',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporairement indisponible',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Trop de requêtes, veuillez réessayer plus tard',
} as const;
