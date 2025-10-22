/**
 * Types spécifiques au module Annonces
 */

import { z } from 'zod';
import { CreateLeboncoinAnnonceSchema } from '@dpe-matching/shared';

export const CreateAnnonceSchema = z.object({
  body: CreateLeboncoinAnnonceSchema,
});

export const GetAnnonceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
