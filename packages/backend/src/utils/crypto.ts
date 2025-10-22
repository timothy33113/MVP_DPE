/**
 * Utilitaires cryptographiques pour les API keys
 */

import crypto from 'crypto';

/**
 * Génère une clé API aléatoire sécurisée
 * Format: dpm_<32 caractères hexadécimaux>
 * @returns Clé API en clair
 */
export const generateApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return `dpm_${key}`;
};

/**
 * Hash une clé API avec SHA-256
 * @param plainKey Clé en clair
 * @returns Hash de la clé
 */
export const hashApiKey = (plainKey: string): string => {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
};

/**
 * Vérifie si une clé correspond à son hash
 * @param plainKey Clé en clair à vérifier
 * @param hashedKey Hash stocké en base
 * @returns true si la clé correspond
 */
export const verifyApiKey = (plainKey: string, hashedKey: string): boolean => {
  const hash = hashApiKey(plainKey);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedKey));
};

/**
 * Génère un hash de clé API et retourne les deux
 * @returns { plainKey, hashedKey }
 */
export const generateAndHashApiKey = (): { plainKey: string; hashedKey: string } => {
  const plainKey = generateApiKey();
  const hashedKey = hashApiKey(plainKey);
  return { plainKey, hashedKey };
};
