import { Router } from 'express';
import { pdfController } from './pdf.controller.js';

const router = Router();

/**
 * GET /api/pdf/fiche/:annonceId
 * Génère et télécharge une fiche PDF pour une annonce
 */
router.get('/fiche/:annonceId', (req, res) => pdfController.generateFichePdf(req, res));

export default router;
