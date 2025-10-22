/**
 * Setup pour les tests Jest
 */

// Augmenter le timeout pour les tests d'intégration
jest.setTimeout(30000);

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://dpe_user:dpe_password@localhost:5432/dpe_matching';
