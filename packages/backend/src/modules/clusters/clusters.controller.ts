/**
 * Contrôleur pour les clusters de matching
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { StatutValidation } from '@dpe-matching/shared';
import { asyncHandler } from '@utils/async-handler';
import { clustersService } from './clusters.service';

// Schémas de validation
const ClusterFiltersSchema = z.object({
  statut: z.nativeEnum(StatutValidation).optional(),
  scoreMin: z.coerce.number().min(0).max(100).optional(),
  scoreMax: z.coerce.number().min(0).max(100).optional(),
  codePostal: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const UpdateStatusSchema = z.object({
  statut: z.nativeEnum(StatutValidation),
});

export const clustersController = {
  /**
   * GET /api/clusters
   * Récupérer tous les clusters avec filtres
   */
  getClusters: asyncHandler(async (req: Request, res: Response) => {
    const filters = ClusterFiltersSchema.parse(req.query);
    const clusters = await clustersService.getClusters(filters);

    const serializedClusters = clusters.map((cluster) => ({
      ...cluster,
      annonce: {
        ...cluster.annonce,
        listId: cluster.annonce.listId.toString(),
      },
    }));

    res.json({
      success: true,
      data: serializedClusters,
      count: serializedClusters.length,
    });
  }),

  /**
   * GET /api/clusters/stats
   * Obtenir les statistiques des clusters
   */
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await clustersService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  }),

  /**
   * GET /api/clusters/:id
   * Récupérer un cluster par ID
   */
  getClusterById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cluster = await clustersService.getClusterById(id);

    const serializedCluster = {
      ...cluster,
      annonce: {
        ...cluster.annonce,
        listId: cluster.annonce.listId.toString(),
      },
    };

    res.json({
      success: true,
      data: serializedCluster,
    });
  }),

  /**
   * PATCH /api/clusters/:id/status
   * Mettre à jour le statut d'un cluster
   */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = UpdateStatusSchema.parse(req.body);

    const cluster = await clustersService.updateClusterStatus(id, data);

    res.json({
      success: true,
      data: cluster,
      message: `Cluster status updated to ${data.statut}`,
    });
  }),

  /**
   * GET /api/clusters/export/validated
   * Exporter les clusters validés
   */
  exportValidated: asyncHandler(async (_req: Request, res: Response) => {
    const data = await clustersService.exportValidated();

    res.json({
      success: true,
      data,
      count: data.length,
    });
  }),
};
