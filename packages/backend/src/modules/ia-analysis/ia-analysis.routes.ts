import { Router } from 'express';
import { iaAnalysisController } from './ia-analysis.controller.js';

const router = Router();

/**
 * GET /api/ia-analysis/:annonceId
 * Récupère l'analyse IA existante pour une annonce
 */
router.get('/:annonceId', (req, res) => iaAnalysisController.getAnalysis(req, res));

/**
 * POST /api/ia-analysis/:annonceId
 * Lance l'analyse IA des photos et description d'une annonce
 */
router.post('/:annonceId', (req, res) => iaAnalysisController.analyzeAnnonce(req, res));

export default router;
