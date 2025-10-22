/**
 * Repository pour les annonces Leboncoin
 */

import { prisma } from '@config/database';
import { LeboncoinAnnonce, CreateLeboncoinAnnonceDto } from '@dpe-matching/shared';

export class AnnoncesRepository {
  async createAnnonce(data: CreateLeboncoinAnnonceDto): Promise<LeboncoinAnnonce> {
    return (await prisma.leboncoinAnnonce.create({
      data: data as any,
    })) as any;
  }

  async getAnnonceById(id: string): Promise<LeboncoinAnnonce | null> {
    return (await prisma.leboncoinAnnonce.findUnique({
      where: { id },
      include: {
        tracking: true,
      },
    })) as any;
  }

  async getAnnonceByListId(listId: bigint): Promise<LeboncoinAnnonce | null> {
    return (await prisma.leboncoinAnnonce.findUnique({
      where: { listId },
    })) as any;
  }

  async listAnnonces(page: number, limit: number) {
    const where = {
      statutAnnonce: {
        not: 'DESACTIVEE' as const, // Exclure les annonces désactivées
      },
    };

    const [annonces, total] = await Promise.all([
      prisma.leboncoinAnnonce.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { datePublication: 'desc' },
      }),
      prisma.leboncoinAnnonce.count({ where }),
    ]);

    return { annonces: annonces as any[], total };
  }

  async getAnnoncesWithoutDpe(limit: number): Promise<LeboncoinAnnonce[]> {
    // Utiliser une requête SQL brute car Prisma ne supporte pas bien les relations one-to-many inversées
    const annonces = await prisma.$queryRaw<any[]>`
      SELECT la.*
      FROM leboncoin_annonces la
      LEFT JOIN match_clusters mc ON la.id = mc."annonceId"
      WHERE mc.id IS NULL
        AND la."rawData"->>'location' IS NOT NULL
        AND la."statutAnnonce" != 'DESACTIVEE'
      ORDER BY la."datePublication" DESC
      LIMIT ${limit}
    `;

    // Parser le rawData qui est retourné comme string JSON
    return annonces.map((annonce: any) => ({
      ...annonce,
      rawData: typeof annonce.rawData === 'string' ? JSON.parse(annonce.rawData) : annonce.rawData,
    })) as any[];
  }
}

export const annoncesRepository = new AnnoncesRepository();
