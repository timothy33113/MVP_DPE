/**
 * Types spécifiques au module matching
 */

import { z } from 'zod';
import { StatutValidationSchema } from '@dpe-matching/shared';

export const RunMatchingSchema = z.object({
  body: z
    .object({
      maxCandidats: z.number().int().positive().optional(),
      seuilScoreMinimum: z.number().min(0).max(100).optional(),
      distanceMaxGPS: z.number().positive().optional(),
      includeScoreDetails: z.boolean().optional(),
    })
    .optional(),
  params: z.object({
    annonceId: z.string().uuid(),
  }),
});

export const ValidateClusterSchema = z.object({
  body: z.object({
    statut: StatutValidationSchema,
    dpeConfirmeId: z.string().uuid().optional(),
  }),
  params: z.object({
    clusterId: z.string().uuid(),
  }),
});
