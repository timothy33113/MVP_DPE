/**
 * Repository pour les clusters de matching
 */

import { prisma } from '@config/database';
import { StatutValidation } from '@dpe-matching/shared';
import { ClusterListFilters, ClusterWithDetails, ClusterStats } from './clusters.types';

export const clustersRepository = {
  /**
   * Récupérer tous les clusters avec filtres
   */
  async findMany(filters: ClusterListFilters = {}): Promise<ClusterWithDetails[]> {
    const { statut, scoreMin, scoreMax, codePostal, limit = 50, offset = 0 } = filters;

    const where: any = {};

    if (statut) {
      where.statut = statut;
    }

    if (scoreMin !== undefined || scoreMax !== undefined) {
      where.meilleurScore = {};
      if (scoreMin !== undefined) where.meilleurScore.gte = scoreMin;
      if (scoreMax !== undefined) where.meilleurScore.lte = scoreMax;
    }

    if (codePostal) {
      where.annonce = {
        codePostal,
      };
    }

    return prisma.matchCluster.findMany({
      where,
      include: {
        annonce: {
          select: {
            id: true,
            listId: true,
            url: true,
            codePostal: true,
            typeBien: true,
            surface: true,
            pieces: true,
            etiquetteDpe: true,
            etiquetteGes: true,
          },
        },
        candidats: {
          include: {
            dpe: {
              select: {
                id: true,
                adresseBan: true,
                codePostalBan: true,
                typeBatiment: true,
                surfaceHabitable: true,
                etiquetteDpe: true,
                etiquetteGes: true,
                anneConstruction: true,
              },
            },
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
      orderBy: {
        meilleurScore: 'desc',
      },
      take: limit,
      skip: offset,
    }) as unknown as ClusterWithDetails[];
  },

  /**
   * Récupérer un cluster par ID
   */
  async findById(id: string): Promise<ClusterWithDetails | null> {
    return prisma.matchCluster.findUnique({
      where: { id },
      include: {
        annonce: {
          select: {
            id: true,
            listId: true,
            url: true,
            codePostal: true,
            typeBien: true,
            surface: true,
            pieces: true,
            etiquetteDpe: true,
            etiquetteGes: true,
          },
        },
        candidats: {
          include: {
            dpe: {
              select: {
                id: true,
                adresseBan: true,
                codePostalBan: true,
                typeBatiment: true,
                surfaceHabitable: true,
                etiquetteDpe: true,
                etiquetteGes: true,
                anneConstruction: true,
              },
            },
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    }) as unknown as ClusterWithDetails | null;
  },

  /**
   * Mettre à jour le statut d'un cluster
   */
  async updateStatus(id: string, statut: StatutValidation) {
    return prisma.matchCluster.update({
      where: { id },
      data: { statut },
    });
  },

  /**
   * Obtenir les statistiques des clusters
   */
  async getStats(): Promise<ClusterStats> {
    const [total, parStatut, scoreStats] = await Promise.all([
      // Total
      prisma.matchCluster.count(),

      // Par statut
      prisma.matchCluster.groupBy({
        by: ['statut'],
        _count: true,
      }),

      // Stats de score
      prisma.matchCluster.aggregate({
        _avg: {
          meilleurScore: true,
        },
        _max: {
          meilleurScore: true,
        },
      }),
    ]);

    const statutCounts: Record<StatutValidation, number> = {
      [StatutValidation.NON_VERIFIE]: 0,
      [StatutValidation.EN_COURS]: 0,
      [StatutValidation.ADRESSE_CONFIRMEE]: 0,
      [StatutValidation.FAUX_POSITIF]: 0,
      [StatutValidation.IGNORE]: 0,
    };

    parStatut.forEach((item) => {
      statutCounts[item.statut as StatutValidation] = item._count;
    });

    return {
      total,
      parStatut: statutCounts,
      scoreMoyen: scoreStats._avg.meilleurScore || 0,
      meilleurScore: scoreStats._max.meilleurScore || 0,
    };
  },
};
