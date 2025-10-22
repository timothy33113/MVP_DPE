import { Router } from 'express';
import { matchingController } from '@modules/matching/matching.controller';
import { validate } from '@middleware/validator';
import { authenticateJwtOrApiKey } from '@middleware/api-key-auth';
import { matchingRateLimiter } from '@middleware/rate-limiter';
import { RunMatchingSchema, ValidateClusterSchema } from '@modules/matching/matching.types';

const router = Router();

router.post(
  '/annonces/:annonceId',
  authenticateJwtOrApiKey,
  matchingRateLimiter,
  validate(RunMatchingSchema),
  matchingController.runMatching
);
router.get('/candidates/:annonceId', (req, res) => matchingController.getCandidatesByAnnonce(req, res));
router.get('/acquereurs/:annonceId', (req, res) => matchingController.getAcquereursForAnnonce(req, res));
router.get('/clusters/:clusterId', matchingController.getCluster);
router.get('/clusters-with-dpe', matchingController.listClustersWithDpe);
router.get('/clusters', matchingController.listClusters);
router.patch(
  '/clusters/:clusterId/validate',
  authenticateJwtOrApiKey,
  validate(ValidateClusterSchema),
  matchingController.validateCluster
);

// Routes pour le système d'apprentissage
router.post('/corrections/validate', matchingController.validateMatch);
router.post('/corrections/correct', matchingController.correctMatch);
router.get('/corrections/stats', matchingController.getCorrectionStats);

export default router;
