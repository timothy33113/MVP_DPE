import { Router } from 'express';
import { dpeController } from '@modules/dpe/dpe.controller';
import { validate } from '@middleware/validator';
import { authenticateJwtOrApiKey } from '@middleware/api-key-auth';
import { CreateDpeSchema, GetDpeSchema } from '@modules/dpe/dpe.types';

const router = Router();

router.post('/', authenticateJwtOrApiKey, validate(CreateDpeSchema), dpeController.createDpe);
router.get('/search', dpeController.searchDpes); // IMPORTANT: Avant /:id sinon "search" sera interprété comme un ID
router.get('/map', dpeController.getDpesForMap); // IMPORTANT: Avant /:id pour éviter conflits
router.get('/:id', validate(GetDpeSchema), dpeController.getDpe);
router.get('/', dpeController.listDpes);

export default router;
