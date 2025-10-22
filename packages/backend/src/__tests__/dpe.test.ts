/**
 * Tests pour le module DPE
 */

import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '@config/database';

const app = createApp();

describe('DPE Module', () => {
  let authToken: string;
  let testDpeId: string;

  beforeAll(async () => {
    // Créer un utilisateur et obtenir un token
    const response = await request(app).post('/api/auth/register').send({
      email: `dpe-test-${Date.now()}@example.com`,
      password: 'Test1234',
    });
    authToken = response.body.data.token;
  });

  describe('POST /api/dpes', () => {
    it('should create a new DPE record', async () => {
      const response = await request(app)
        .post('/api/dpes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numeroDpe: `TEST_DPE_${Date.now()}`,
          adresseBan: '123 Test Street',
          codePostalBan: '75001',
          typeBatiment: 'APPARTEMENT',
          surfaceHabitable: 55,
          anneConstruction: 2010,
          etiquetteDpe: 'C',
          etiquetteGes: 'D',
          coordonneeX: 2.3522,
          coordonneeY: 48.8566,
          dateEtablissement: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      testDpeId = response.body.data.id;
    });

    it('should reject duplicate numeroDpe', async () => {
      const numeroDpe = `DUP_${Date.now()}`;

      // Créer le premier
      await request(app)
        .post('/api/dpes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numeroDpe,
          adresseBan: '123 Test',
          codePostalBan: '75001',
          typeBatiment: 'APPARTEMENT',
          surfaceHabitable: 50,
          etiquetteDpe: 'C',
          etiquetteGes: 'D',
          coordonneeX: 2.3522,
          coordonneeY: 48.8566,
          dateEtablissement: new Date().toISOString(),
        });

      // Tenter de créer un doublon
      const response = await request(app)
        .post('/api/dpes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numeroDpe,
          adresseBan: '456 Test',
          codePostalBan: '75001',
          typeBatiment: 'MAISON',
          surfaceHabitable: 100,
          etiquetteDpe: 'B',
          etiquetteGes: 'C',
          coordonneeX: 2.3522,
          coordonneeY: 48.8566,
          dateEtablissement: new Date().toISOString(),
        });

      // Le code d'erreur peut être 409 (conflict) ou 422 (validation)
      expect([409, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/dpes')
        .send({
          numeroDpe: 'TEST',
          adresseBan: 'Test',
          codePostalBan: '75001',
        })
        .expect(401);
    });
  });

  describe('GET /api/dpes/:id', () => {
    it('should retrieve a DPE record by ID', async () => {
      const response = await request(app)
        .get(`/api/dpes/${testDpeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDpeId);
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app)
        .get('/api/dpes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/dpes', () => {
    it('should list DPE records with pagination', async () => {
      const response = await request(app)
        .get('/api/dpes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should filter by code postal', async () => {
      const response = await request(app)
        .get('/api/dpes?codePostalBan=75001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (testDpeId) {
      await prisma.dpeRecord.deleteMany({
        where: {
          OR: [{ id: testDpeId }, { numeroDpe: { contains: 'TEST_DPE_' } }],
        },
      });
    }
  });
});
