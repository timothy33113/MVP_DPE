import { Router } from 'express';
import authRoutes from './auth.routes';
import dpeRoutes from './dpe.routes';
import annoncesRoutes from './annonces.routes';
import matchingRoutes from './matching.routes';
import apiKeysRoutes from './api-keys.routes';
import clustersRoutes from './clusters.routes';
import quartiersRoutes from './quartiers.routes';
import trackingRoutes from './tracking.routes';
import mondayRoutes from './monday.routes';
import cadastreRoutes from './cadastre.routes';
import integrationRoutes from './integration.routes';
import acquereursRoutes from './acquereurs.routes';
import matchingTriggerRoutes from './matching-trigger.routes';
import zonesRoutes from './zones';
import pdfRoutes from '../modules/pdf/pdf.routes.js';
import iaAnalysisRoutes from '../modules/ia-analysis/ia-analysis.routes.js';
// import webhooksRoutes from './webhooks.routes'; // Temporarily disabled - Supabase dependency

const router = Router();

router.use('/auth', authRoutes);
router.use('/dpes', dpeRoutes);
router.use('/annonces', annoncesRoutes);
router.use('/matching', matchingRoutes);
router.use('/matching', matchingTriggerRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/clusters', clustersRoutes);
router.use('/quartiers', quartiersRoutes);
router.use('/tracking', trackingRoutes);
router.use('/monday', mondayRoutes);
router.use('/cadastre', cadastreRoutes);
router.use('/integration', integrationRoutes);
router.use('/acquereurs', acquereursRoutes);
router.use('/zones', zonesRoutes);
router.use('/pdf', pdfRoutes);
router.use('/ia-analysis', iaAnalysisRoutes);
// router.use('/webhooks', webhooksRoutes); // Temporarily disabled - Supabase dependency

export default router;
