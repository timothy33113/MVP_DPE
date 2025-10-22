/**
 * Routes pour les clusters de matching
 */

import { Router } from 'express';
import { clustersController } from '@modules/clusters/clusters.controller';

const router = Router();

// GET /api/clusters - Liste des clusters avec filtres
router.get('/', clustersController.getClusters);

// GET /api/clusters/stats - Statistiques
router.get('/stats', clustersController.getStats);

// GET /api/clusters/export/validated - Export des clusters validés
router.get('/export/validated', clustersController.exportValidated);

// GET /api/clusters/:id - Détails d'un cluster
router.get('/:id', clustersController.getClusterById);

// PATCH /api/clusters/:id/status - Mettre à jour le statut
router.patch('/:id/status', clustersController.updateStatus);

export default router;
