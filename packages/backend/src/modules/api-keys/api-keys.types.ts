/**
 * Types et schémas de validation pour les API keys
 */

import { z } from 'zod';
import { CreateApiKeySchema, UpdateApiKeySchema } from '@dpe-matching/shared';

export const CreateApiKeyBodySchema = z.object({
  body: CreateApiKeySchema,
});

export const UpdateApiKeyBodySchema = z.object({
  body: UpdateApiKeySchema,
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const GetApiKeySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
