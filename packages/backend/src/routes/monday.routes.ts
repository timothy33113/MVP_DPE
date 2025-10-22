import { Router, Request, Response } from 'express';
import { mondayService } from '@services/monday.service';
import { asyncHandler } from '@utils/async-handler';

const router = Router();

/**
 * GET /api/monday/board-info
 * Récupère les informations du board (colonnes et groupes)
 */
router.get('/board-info', asyncHandler(async (req: Request, res: Response) => {
  const [columns, groups] = await Promise.all([
    mondayService.getBoardColumns(),
    mondayService.getBoardGroups(),
  ]);

  res.json({
    success: true,
    data: {
      columns,
      groups,
    },
  });
}));

/**
 * POST /api/monday/create-qualification
 * Créer un item de qualification dans Monday.com
 */
router.post('/create-qualification', asyncHandler(async (req: Request, res: Response) => {
  const {
    annonceId,
    annonceUrl,
    typeBien,
    surface,
    pieces,
    codePostal,
    etiquetteDpe,
    score,
    etape,
    notes,
    tacheAFaire,
    datePublication,
  } = req.body;

  const result = await mondayService.createQualificationItem({
    annonceId,
    annonceUrl,
    typeBien,
    surface,
    pieces,
    codePostal,
    etiquetteDpe,
    score,
    etape,
    notes,
    tacheAFaire,
    datePublication,
  });

  res.json(result);
}));

/**
 * PUT /api/monday/update-qualification/:mondayItemId
 * Mettre à jour un item de qualification dans Monday.com
 */
router.put('/update-qualification/:mondayItemId', asyncHandler(async (req: Request, res: Response) => {
  const { mondayItemId } = req.params;
  const { etape, notes, tacheAFaire } = req.body;

  const result = await mondayService.updateQualificationItem(mondayItemId, {
    etape,
    notes,
    tacheAFaire,
  });

  res.json(result);
}));

/**
 * POST /api/monday/create-dpe-qualification
 * Créer un item de qualification DPE dans Monday.com
 */
router.post('/create-dpe-qualification', asyncHandler(async (req: Request, res: Response) => {
  const {
    dpeId,
    numeroDpe,
    adresse,
    codePostal,
    typeBatiment,
    surface,
    etiquetteDpe,
    etiquetteGes,
    anneConstruction,
    etape,
    notes,
    tacheAFaire,
  } = req.body;

  const result = await mondayService.createDpeQualificationItem({
    dpeId,
    numeroDpe,
    adresse,
    codePostal,
    typeBatiment,
    surface,
    etiquetteDpe,
    etiquetteGes,
    anneConstruction,
    etape,
    notes,
    tacheAFaire,
  });

  res.json(result);
}));

export default router;
