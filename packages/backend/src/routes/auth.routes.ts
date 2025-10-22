/**
 * Routes pour l'authentification
 */

import { Router } from 'express';

import { authController } from '@modules/auth/auth.controller';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validator';
import { RegisterBodySchema, LoginBodySchema } from '@modules/auth/auth.types';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Enregistrer un nouvel utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Doit contenir majuscule, minuscule et chiffre
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       409:
 *         description: Email déjà utilisé
 *       422:
 *         description: Données invalides
 */
router.post('/register', validate(RegisterBodySchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connecter un utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', validate(LoginBodySchema), authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Récupérer les informations de l'utilisateur connecté
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Informations utilisateur
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authenticate, authController.me);

export default router;
