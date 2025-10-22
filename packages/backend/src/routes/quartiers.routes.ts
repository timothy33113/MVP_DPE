/**
 * Routes pour la géolocalisation par quartiers
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@utils/async-handler';
import {
  findQuartier,
  findQuartiersNearby,
  searchQuartierByName,
  getQuartiersByVille,
} from '@utils/quartiers';
import { ApiResponse } from '@dpe-matching/shared';

const router = Router();

/**
 * GET /api/quartiers/:ville
 * Liste tous les quartiers d'une ville
 */
router.get(
  '/:ville',
  asyncHandler(async (req: Request, res: Response) => {
    const { ville } = req.params;
    const quartiers = getQuartiersByVille(ville);

    res.json({
      success: true,
      data: {
        ville,
        count: quartiers.length,
        quartiers: quartiers.map((q) => ({
          name: q.name,
          codePostal: q.codePostal,
          center: q.center,
        })),
      },
    } as ApiResponse<any>);
  })
);

/**
 * GET /api/quartiers/search
 * Recherche un quartier par nom
 * Query params: name (required), ville (optional)
 */
router.get(
  '/search/name',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, ville } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_INPUT',
          message: 'Le paramètre "name" est requis',
        },
      });
    }

    const quartier = searchQuartierByName(name, ville as string | undefined);

    if (!quartier) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Quartier non trouvé',
        },
      });
    }

    res.json({
      success: true,
      data: quartier,
    } as ApiResponse<any>);
  })
);

/**
 * POST /api/quartiers/locate
 * Trouve le quartier correspondant à des coordonnées GPS
 * Body: { lat: number, lng: number, codePostal?: string }
 */
router.post(
  '/locate',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, codePostal } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_INPUT',
          message: 'Les coordonnées lat et lng sont requises',
        },
      });
    }

    const quartier = findQuartier(lng, lat, codePostal);

    if (!quartier) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Aucun quartier trouvé pour ces coordonnées',
        },
      });
    }

    res.json({
      success: true,
      data: quartier,
    } as ApiResponse<any>);
  })
);

/**
 * GET /api/quartiers/nearby
 * Trouve les quartiers à proximité d'un point
 * Query params: lat, lng, distance (en mètres, défaut: 2000), codePostal (optional)
 */
router.get(
  '/nearby/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, distance = '2000', codePostal } = req.query;

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    const distanceNum = parseInt(distance as string, 10);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_INPUT',
          message: 'Les coordonnées lat et lng sont requises',
        },
      });
    }

    if (isNaN(distanceNum) || distanceNum < 0 || distanceNum > 50000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_INPUT',
          message: 'La distance doit être entre 0 et 50000 mètres',
        },
      });
    }

    const quartiers = findQuartiersNearby(lngNum, latNum, distanceNum, codePostal as string);

    res.json({
      success: true,
      data: {
        count: quartiers.length,
        maxDistance: distanceNum,
        quartiers,
      },
    } as ApiResponse<any>);
  })
);

export default router;
