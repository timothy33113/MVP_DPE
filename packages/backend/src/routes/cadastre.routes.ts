import { Router, Request, Response } from 'express';
import { cadastreService } from '@services/cadastre.service';
import { asyncHandler } from '@utils/async-handler';

const router = Router();

/**
 * GET /api/cadastre/location
 * Recherche des parcelles par coordonnées GPS
 * Query params: lat, lon, radius (optionnel, défaut 50m)
 */
router.get('/location', asyncHandler(async (req: Request, res: Response) => {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      message: 'Paramètres lat et lon requis',
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);
  const searchRadius = radius ? parseInt(radius as string) : 50;

  const parcelles = await cadastreService.getParcellsByLocation(
    latitude,
    longitude,
    searchRadius
  );

  res.json({
    success: true,
    data: {
      parcelles,
      count: parcelles.length,
    },
  });
}));

/**
 * GET /api/cadastre/address
 * Recherche des parcelles par adresse
 * Query params: adresse, expectedSurface (optionnel)
 */
router.get('/address', asyncHandler(async (req: Request, res: Response) => {
  const { adresse, expectedSurface } = req.query;

  if (!adresse) {
    return res.status(400).json({
      success: false,
      message: 'Paramètre adresse requis',
    });
  }

  const expectedSurfaceNum = expectedSurface ? parseFloat(expectedSurface as string) : undefined;

  const parcelles = await cadastreService.getParcellsByAddress(
    adresse as string,
    expectedSurfaceNum
  );

  res.json({
    success: true,
    data: {
      parcelles,
      count: parcelles.length,
    },
  });
}));

export default router;
