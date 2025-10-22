/**
 * Types spécifiques au module DPE
 */

import { z } from 'zod';
import { CreateDpeRecordSchema } from '@dpe-matching/shared';

export const CreateDpeSchema = z.object({
  body: CreateDpeRecordSchema,
});

export const GetDpeSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
