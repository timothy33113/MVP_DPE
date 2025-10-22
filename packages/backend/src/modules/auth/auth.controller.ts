/**
 * Controller pour l'authentification
 */

import { Request, Response } from 'express';

import { authService } from './auth.service';
import { asyncHandler } from '@utils/async-handler';

import type { RegisterBody, LoginBody } from './auth.types';

export const authController = {
  /**
   * POST /api/auth/register
   * Enregistrer un nouvel utilisateur
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RegisterBody;
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  /**
   * POST /api/auth/login
   * Connecter un utilisateur
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as LoginBody;
    const result = await authService.login(data);

    res.json({
      success: true,
      data: result,
    });
  }),

  /**
   * GET /api/auth/me
   * Récupérer les informations de l'utilisateur connecté
   */
  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Non autorisé',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  }),
};
