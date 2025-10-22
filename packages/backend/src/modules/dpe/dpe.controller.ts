/**
 * Controller DPE
 */

import { Request, Response } from 'express';
import { dpeService } from './dpe.service';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';

export class DpeController {
  createDpe = asyncHandler(async (req: Request, res: Response) => {
    const dpe = await dpeService.createDpe(req.body);
    res.status(201).json({ success: true, data: dpe } as ApiResponse<any>);
  });

  getDpe = asyncHandler(async (req: Request, res: Response) => {
    const dpe = await dpeService.getDpeById(req.params.id);
    res.json({ success: true, data: dpe } as ApiResponse<any>);
  });

  listDpes = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { dpes, total } = await dpeService.listDpes(Number(page), Number(limit));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: dpes,
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

  searchDpes = asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Address parameter is required',
      });
    }

    const dpes = await dpeService.searchDpesByAddress(address);

    res.json({
      success: true,
      data: dpes,
    } as ApiResponse<any>);
  });

  getDpesForMap = asyncHandler(async (req: Request, res: Response) => {
    const { limit, dateMin, dateMax } = req.query;

    const filters: any = {};
    if (limit) filters.limit = Number(limit);
    if (dateMin) filters.dateMin = new Date(dateMin as string);
    if (dateMax) filters.dateMax = new Date(dateMax as string);

    const dpes = await dpeService.getDpesForMap(filters);

    res.json({
      success: true,
      data: dpes,
    } as ApiResponse<any>);
  });
}

export const dpeController = new DpeController();
