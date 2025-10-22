/**
 * Tests pour le module Annonces
 */

import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '@config/database';

const app = createApp();

describe('Annonces Module', () => {
  let authToken: string;
  let testAnnonceId: string;

  beforeAll(async () => {
    // Créer un utilisateur et obtenir un token
    const response = await request(app).post('/api/auth/register').send({
      email: `annonce-test-${Date.now()}@example.com`,
      password: 'Test1234',
    });
    authToken = response.body.data.token;
  });

  describe('POST /api/annonces', () => {
    it('should create a new annonce', async () => {
      const response = await request(app)
        .post('/api/annonces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          listId: Date.now().toString(),
          url: 'https://www.leboncoin.fr/test/123',
          codePostal: '75001',
          typeBien: 'APPARTEMENT',
          surface: 45,
          pieces: 2,
          anneConstruction: 2005,
          etiquetteDpe: 'C',
          etiquetteGes: 'D',
          lat: 48.8566,
          lng: 2.3522,
          datePublication: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      testAnnonceId = response.body.data.id;
    });

    it('should reject duplicate listId', async () => {
      const listId = Date.now().toString();

      // Créer la première annonce
      await request(app)
        .post('/api/annonces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          listId,
          url: 'https://www.leboncoin.fr/test/1',
          codePostal: '75001',
          typeBien: 'APPARTEMENT',
          surface: 50,
          lat: 48.8566,
          lng: 2.3522,
          datePublication: new Date().toISOString(),
        });

      // Tenter de créer un doublon
      const response = await request(app)
        .post('/api/annonces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          listId,
          url: 'https://www.leboncoin.fr/test/2',
          codePostal: '75002',
          typeBien: 'MAISON',
          surface: 100,
          lat: 48.8566,
          lng: 2.3522,
          datePublication: new Date().toISOString(),
        });

      // Le code d'erreur peut être 409 (conflict) ou 422 (validation)
      expect([409, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/annonces')
        .send({
          listId: '999',
          url: 'https://test.com',
        })
        .expect(401);
    });
  });

  describe('GET /api/annonces/:id', () => {
    it('should retrieve an annonce by ID', async () => {
      const response = await request(app)
        .get(`/api/annonces/${testAnnonceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAnnonceId);
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app)
        .get('/api/annonces/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/annonces', () => {
    it('should list annonces with pagination', async () => {
      const response = await request(app)
        .get('/api/annonces?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (testAnnonceId) {
      await prisma.leboncoinAnnonce.deleteMany({
        where: { id: testAnnonceId },
      });
    }
  });
});
