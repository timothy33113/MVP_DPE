/**
 * Controller pour la gestion des acquéreurs
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';
import { acquereurRepository } from './acquereurs.repository';

export class AcquereursController {
  /**
   * POST /api/acquereurs
   * Crée un nouvel acquéreur avec ses critères de recherche
   */
  createAcquereur = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const acquereurData = req.body;

    const acquereur = await acquereurRepository.createAcquereur(acquereurData);

    res.status(201).json({
      success: true,
      data: acquereur,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/acquereurs
   * Liste tous les acquéreurs actifs
   */
  listAcquereurs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { actifs = true } = req.query;

    const acquereurs = await acquereurRepository.findAll({
      statutActif: actifs === 'true' || actifs === true,
    });

    res.json({
      success: true,
      data: acquereurs,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/acquereurs/:id
   * Récupère un acquéreur par son ID
   */
  getAcquereur = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const acquereur = await acquereurRepository.findById(id);

    if (!acquereur) {
      res.status(404).json({
        success: false,
        error: 'Acquéreur not found',
      });
      return;
    }

    res.json({
      success: true,
      data: acquereur,
    } as ApiResponse<any>);
  });

  /**
   * PATCH /api/acquereurs/:id
   * Met à jour un acquéreur
   */
  updateAcquereur = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    const acquereur = await acquereurRepository.updateAcquereur(id, updateData);

    res.json({
      success: true,
      data: acquereur,
    } as ApiResponse<any>);
  });

  /**
   * DELETE /api/acquereurs/:id
   * Désactive un acquéreur (soft delete)
   */
  deleteAcquereur = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await acquereurRepository.updateAcquereur(id, { statutActif: false });

    res.json({
      success: true,
      data: { message: 'Acquéreur désactivé' },
    } as ApiResponse<any>);
  });

  /**
   * GET /api/acquereurs/:id/matches
   * Récupère tous les biens qui correspondent aux critères de l'acquéreur
   */
  getMatches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const acquereur = await acquereurRepository.findById(id);
    if (!acquereur) {
      res.status(404).json({
        success: false,
        error: 'Acquéreur not found',
      });
      return;
    }

    const matches = await acquereurRepository.findMatchingAnnonces(id);

    res.json({
      success: true,
      data: matches,
    } as ApiResponse<any>);
  });

  /**
   * POST /api/acquereurs/send-selection
   * Envoie une sélection de biens par email à un acquéreur
   */
  sendSelection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { acquereurId, annonceIds } = req.body;

    if (!acquereurId || !annonceIds || !Array.isArray(annonceIds)) {
      res.status(400).json({
        success: false,
        error: 'acquereurId et annonceIds sont requis',
      });
      return;
    }

    const result = await acquereurRepository.sendSelectionEmail(acquereurId, annonceIds);

    res.json({
      success: true,
      data: result,
    } as ApiResponse<any>);
  });
}

export const acquereursController = new AcquereursController();
