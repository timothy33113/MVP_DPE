import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TrackingService {
  async getByAnnonceId(annonceId: string) {
    return prisma.annonceTracking.findUnique({
      where: { annonceId },
    });
  }

  async markAsViewed(annonceId: string) {
    const existing = await this.getByAnnonceId(annonceId);

    if (!existing) {
      return prisma.annonceTracking.create({
        data: {
          annonceId,
          statut: 'vu',
          firstViewedAt: new Date(),
        },
      });
    }

    return existing;
  }

  async updateTracking(annonceId: string, data: {
    statut?: string;
    etapeMonday?: string;
    notes?: string;
    tacheAFaire?: boolean;
  }) {
    const existing = await this.getByAnnonceId(annonceId);

    if (existing) {
      return prisma.annonceTracking.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return prisma.annonceTracking.create({
        data: {
          annonceId,
          firstViewedAt: new Date(),
          ...data,
        },
      });
    }
  }

  async updateMondaySync(annonceId: string, mondayItemId: string, boardId: string) {
    const existing = await this.getByAnnonceId(annonceId);

    const data = {
      mondayItemId,
      mondayBoardId: boardId,
      mondaySyncedAt: new Date(),
      statut: 'envoye_monday',
    };

    if (existing) {
      return prisma.annonceTracking.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return prisma.annonceTracking.create({
        data: {
          annonceId,
          firstViewedAt: new Date(),
          ...data,
        },
      });
    }
  }

  async getAllTracking(filters?: {
    statut?: string;
    hasMonday?: boolean;
  }) {
    const where: any = {};

    if (filters?.statut) {
      where.statut = filters.statut;
    }

    if (filters?.hasMonday !== undefined) {
      where.mondayItemId = filters.hasMonday ? { not: null } : null;
    }

    return prisma.annonceTracking.findMany({
      where,
      include: {
        annonce: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}

export const trackingService = new TrackingService();
