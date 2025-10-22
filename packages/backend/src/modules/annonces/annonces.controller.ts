/**
 * Controller Annonces
 */

import { Request, Response } from 'express';
import { annoncesService } from './annonces.service';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';

export class AnnoncesController {
  createAnnonce = asyncHandler(async (req: Request, res: Response) => {
    const annonce = await annoncesService.createAnnonce(req.body);
    res.status(201).json({ success: true, data: annonce } as ApiResponse<any>);
  });

  getAnnonce = asyncHandler(async (req: Request, res: Response) => {
    const annonce = await annoncesService.getAnnonceById(req.params.id);
    res.json({ success: true, data: annonce } as ApiResponse<any>);
  });

  listAnnonces = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { annonces, total } = await annoncesService.listAnnonces(Number(page), Number(limit));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: annonces,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<any>);
  });

  listAnnoncesWithoutDpe = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 5000 } = req.query;
    const annonces = await annoncesService.getAnnoncesWithoutDpe(Number(limit));

    res.json({
      success: true,
      data: {
        items: annonces,
        total: annonces.length,
      },
    } as ApiResponse<any>);
  });
}

export const annoncesController = new AnnoncesController();
