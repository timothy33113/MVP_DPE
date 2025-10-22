import { Router } from 'express';
import { annoncesController } from '@modules/annonces/annonces.controller';
import { validate } from '@middleware/validator';
import { authenticateJwtOrApiKey } from '@middleware/api-key-auth';
import { CreateAnnonceSchema, GetAnnonceSchema } from '@modules/annonces/annonces.types';

const router = Router();

router.post(
  '/',
  authenticateJwtOrApiKey,
  validate(CreateAnnonceSchema),
  annoncesController.createAnnonce
);
router.get('/without-dpe', annoncesController.listAnnoncesWithoutDpe);
router.get('/:id', validate(GetAnnonceSchema), annoncesController.getAnnonce);
router.get('/', annoncesController.listAnnonces);

export default router;
