/**
 * Controller pour la gestion des API keys
 */

import { Request, Response } from 'express';
import { apiKeysService } from './api-keys.service';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';

export class ApiKeysController {
  /**
   * POST /api/api-keys
   * Crée une nouvelle API key
   */
  createApiKey = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const result = await apiKeysService.createApiKey(req.user.userId, req.body);

    res.status(201).json({
      success: true,
      data: result,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/api-keys
   * Liste les API keys de l'utilisateur
   */
  listApiKeys = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const apiKeys = await apiKeysService.listUserApiKeys(req.user.userId);

    res.json({
      success: true,
      data: apiKeys,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/api-keys/:id
   * Récupère une API key
   */
  getApiKey = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const apiKey = await apiKeysService.getApiKeyById(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: apiKey,
    } as ApiResponse<any>);
  });

  /**
   * PATCH /api/api-keys/:id
   * Met à jour une API key
   */
  updateApiKey = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const apiKey = await apiKeysService.updateApiKey(req.params.id, req.user.userId, req.body);

    res.json({
      success: true,
      data: apiKey,
    } as ApiResponse<any>);
  });

  /**
   * POST /api/api-keys/:id/disable
   * Désactive une API key
   */
  disableApiKey = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    await apiKeysService.disableApiKey(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: { message: 'API key disabled successfully' },
    } as ApiResponse<any>);
  });

  /**
   * DELETE /api/api-keys/:id
   * Supprime une API key
   */
  deleteApiKey = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    await apiKeysService.deleteApiKey(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: { message: 'API key deleted successfully' },
    } as ApiResponse<any>);
  });
}

export const apiKeysController = new ApiKeysController();
