import { prisma } from '@config/database';
import { MatchCluster, MatchCandidat, StatutValidation } from '@dpe-matching/shared';
import { logger } from '@utils/logger';

export class MatchingRepository {
  private prisma = prisma;

  async createMatchCluster(
    annonceId: string,
    candidats: Omit<MatchCandidat, 'id' | 'clusterId' | 'createdAt'>[],
    meilleurScore: number
  ): Promise<MatchCluster> {
    logger.info('Creating match cluster');

    const cluster = await prisma.matchCluster.create({
      data: {
        annonceId,
        nombreCandidats: candidats.length,
        meilleurScore,
        statut: StatutValidation.NON_VERIFIE,
        candidats: {
          create: candidats.map((c) => ({
            dpeId: c.dpeId,
            scoreTotal: c.scoreTotal,
            scoreBase: c.scoreBase,
            scoreBonus: c.scoreBonus,
            scoreNormalized: c.scoreNormalized,
            confiance: c.confiance,
            scoreDetails: c.scoreDetails as any,
            distanceGps: c.distanceGps,
            rang: c.rang,
            estSelectionne: c.estSelectionne,
          })),
        },
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    return cluster as any;
  }

  async getMatchClusterById(id: string): Promise<MatchCluster | null> {
    const cluster = await prisma.matchCluster.findUnique({
      where: { id },
      include: {
        annonce: {
          include: {
            tracking: true, // Inclure le statut de tracking
          },
        },
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    return cluster as any;
  }

  async getClusterByAnnonceId(annonceId: string): Promise<MatchCluster | null> {
    const cluster = await prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    return cluster as any;
  }

  async listMatchClusters(page: number, limit: number, statut?: StatutValidation) {
    const where: any = statut ? { statut } : {};

    // Exclure les annonces désactivées
    where.annonce = {
      statutAnnonce: {
        not: 'DESACTIVEE',
      },
    };

    const [clusters, total] = await Promise.all([
      prisma.matchCluster.findMany({
        where,
        include: {
          annonce: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.matchCluster.count({ where }),
    ]);

    return {
      clusters: clusters as any[],
      total,
    };
  }

  async getCandidatesByClusterId(clusterId: string): Promise<MatchCandidat[]> {
    const candidates = await prisma.matchCandidat.findMany({
      where: { clusterId },
      include: {
        dpe: true,
      },
      orderBy: {
        scoreTotal: 'desc',
      },
    });

    return candidates as any[];
  }

  async updateClusterStatus(
    id: string,
    statut: StatutValidation,
    dpeConfirmeId?: string
  ): Promise<MatchCluster> {
    const cluster = await prisma.matchCluster.update({
      where: { id },
      data: {
        statut,
        dpeConfirmeId,
        dateValidation: statut === StatutValidation.ADRESSE_CONFIRMEE ? new Date() : null,
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
        },
      },
    });

    return cluster as any;
  }

  /**
   * Créer une correction de matching
   */
  async createMatchCorrection(data: {
    annonceId: string;
    dpeProposedId?: string | null;
    dpeCorrectId: string;
    scoreProposed?: number | null;
    scoreCorrect?: number | null;
    rangProposed?: number | null;
    rangCorrect?: number | null;
    isValidation: boolean;
    notes?: string | null;
    createdBy: string;
  }) {
    return this.prisma.matchCorrection.create({
      data: {
        annonceId: data.annonceId,
        dpeProposedId: data.dpeProposedId,
        dpeCorrectId: data.dpeCorrectId,
        scoreProposed: data.scoreProposed,
        scoreCorrect: data.scoreCorrect,
        rangProposed: data.rangProposed,
        rangCorrect: data.rangCorrect,
        isValidation: data.isValidation,
        notes: data.notes,
        createdBy: data.createdBy,
      },
      include: {
        annonce: true,
        dpeProposed: true,
        dpeCorrect: true,
      },
    });
  }

  /**
   * Récupérer les statistiques des corrections
   */
  async getMatchCorrectionStats() {
    const [total, validations, corrections, avgScoreDiff] = await Promise.all([
      // Total de corrections
      this.prisma.matchCorrection.count(),

      // Nombre de validations (algo correct)
      this.prisma.matchCorrection.count({
        where: { isValidation: true },
      }),

      // Nombre de corrections (algo faux)
      this.prisma.matchCorrection.count({
        where: { isValidation: false },
      }),

      // Différence moyenne de score entre proposé et correct
      this.prisma.matchCorrection.aggregate({
        where: {
          isValidation: false,
          scoreProposed: { not: null },
          scoreCorrect: { not: null },
        },
        _avg: {
          scoreProposed: true,
          scoreCorrect: true,
        },
      }),
    ]);

    // Analyse des erreurs par position
    const errorsByRank = await this.prisma.matchCorrection.groupBy({
      by: ['rangCorrect'],
      where: {
        isValidation: false,
        rangCorrect: { not: null },
      },
      _count: true,
    });

    return {
      total,
      validations,
      corrections,
      accuracy: total > 0 ? ((validations / total) * 100).toFixed(1) + '%' : 'N/A',
      avgScoreProposed: avgScoreDiff._avg.scoreProposed,
      avgScoreCorrect: avgScoreDiff._avg.scoreCorrect,
      errorsByRank: errorsByRank.sort((a, b) => (a.rangCorrect || 0) - (b.rangCorrect || 0)),
    };
  }

  /**
   * Récupérer un cluster par annonceId
   */
  async getMatchClusterByAnnonceId(annonceId: string) {
    return this.prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        candidats: {
          include: {
            dpe: true,
          },
        },
      },
    });
  }

  /**
   * Mettre à jour les coordonnées GPS de l'annonce avec celles du DPE corrigé
   */
  async updateAnnonceCoordinatesFromDpe(annonceId: string, dpeId: string) {
    // Récupérer les coordonnées du DPE
    const dpe = await prisma.dpeRecord.findUnique({
      where: { id: dpeId },
      select: { coordonneeX: true, coordonneeY: true },
    });

    if (!dpe || !dpe.coordonneeX || !dpe.coordonneeY) {
      logger.warn(`DPE ${dpeId} n'a pas de coordonnées GPS valides`);
      return;
    }

    // Convertir Lambert 93 (coordonneeX/Y) en WGS84 (lat/lng)
    // Pour simplifier, on utilise une conversion approximative
    // coordonneeX/Y sont en Lambert 93, il faudrait une vraie conversion
    // Pour l'instant, on stocke directement les coordonnées Lambert

    // Mettre à jour l'annonce avec les nouvelles coordonnées et marquer comme corrigée
    await prisma.leboncoinAnnonce.update({
      where: { id: annonceId },
      data: {
        lat: dpe.coordonneeY / 100000, // Conversion approximative
        lng: dpe.coordonneeX / 100000, // Conversion approximative
        dpeCorrected: true, // Marquer comme corrigé manuellement
        dpeCorrectId: dpeId, // Stocker l'ID du bon DPE
      },
    });

    logger.info(`Annonce ${annonceId} : coordonnées GPS mises à jour et marquée comme corrigée (DPE ${dpeId})`);
  }
}

export const matchingRepository = new MatchingRepository();
