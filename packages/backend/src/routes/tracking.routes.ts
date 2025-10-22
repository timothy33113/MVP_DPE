import { Router, Request, Response } from 'express';
import { trackingService } from '@services/tracking.service';
import { asyncHandler } from '@utils/async-handler';

const router = Router();

/**
 * GET /api/tracking/:annonceId
 * Récupérer le tracking d'une annonce
 */
router.get('/:annonceId', asyncHandler(async (req: Request, res: Response) => {
  const { annonceId } = req.params;
  const tracking = await trackingService.getByAnnonceId(annonceId);

  if (!tracking) {
    return res.status(404).json({ message: 'Tracking non trouvé' });
  }

  res.json(tracking);
}));

/**
 * POST /api/tracking/:annonceId/view
 * Marquer une annonce comme vue
 */
router.post('/:annonceId/view', asyncHandler(async (req: Request, res: Response) => {
  const { annonceId } = req.params;
  const tracking = await trackingService.markAsViewed(annonceId);
  res.json(tracking);
}));

/**
 * PUT /api/tracking/:annonceId
 * Mettre à jour le tracking d'une annonce
 */
router.put('/:annonceId', asyncHandler(async (req: Request, res: Response) => {
  const { annonceId } = req.params;
  const { statut, etapeMonday, notes, tacheAFaire } = req.body;

  const tracking = await trackingService.updateTracking(annonceId, {
    statut,
    etapeMonday,
    notes,
    tacheAFaire,
  });

  res.json(tracking);
}));

/**
 * PATCH /api/tracking/:annonceId
 * Mettre à jour partiellement le tracking d'une annonce
 */
router.patch('/:annonceId', asyncHandler(async (req: Request, res: Response) => {
  const { annonceId } = req.params;
  const { statut, etapeMonday, notes, tacheAFaire } = req.body;

  const tracking = await trackingService.updateTracking(annonceId, {
    statut,
    etapeMonday,
    notes,
    tacheAFaire,
  });

  res.json(tracking);
}));

/**
 * GET /api/tracking
 * Récupérer tous les trackings avec filtres
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { statut, hasMonday } = req.query;

  const tracking = await trackingService.getAllTracking({
    statut: statut as string,
    hasMonday: hasMonday === 'true' ? true : hasMonday === 'false' ? false : undefined,
  });

  res.json(tracking);
}));

export default router;
