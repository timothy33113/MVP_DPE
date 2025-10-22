/**
 * Routes pour la gestion des acquéreurs (base de données locale)
 */

import { Router } from 'express';
import { acquereursController } from '@modules/acquereurs/acquereurs.controller';
import { generalRateLimiter } from '../middleware/rate-limiter';

const router = Router();

// Route pour envoyer une sélection par email (DOIT être avant les routes avec :id)
router.post('/send-selection', generalRateLimiter, acquereursController.sendSelection);

// Routes CRUD
router.post('/', generalRateLimiter, acquereursController.createAcquereur);
router.get('/', generalRateLimiter, acquereursController.listAcquereurs);
router.get('/:id', generalRateLimiter, acquereursController.getAcquereur);
router.get('/:id/matches', generalRateLimiter, acquereursController.getMatches);
router.patch('/:id', generalRateLimiter, acquereursController.updateAcquereur);
router.delete('/:id', generalRateLimiter, acquereursController.deleteAcquereur);

export default router;
