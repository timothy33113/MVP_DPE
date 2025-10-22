/**
 * Tests pour l'authentification
 */

import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'Test1234',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toContain('test');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;

      await request(app).post('/api/auth/register').send({
        email,
        password: 'Test1234',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Test1234',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: `login${Date.now()}@example.com`,
      password: 'Test1234',
    };

    beforeAll(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `me${Date.now()}@example.com`,
          password: 'Test1234',
        });

      token = response.body.data.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email');
    });

    it('should reject without token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should reject with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});
