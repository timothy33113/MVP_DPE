/**
 * Repository pour les opérations DPE
 */

import { prisma } from '@config/database';
import { DpeRecord, CreateDpeRecordDto, TypeBatiment } from '@dpe-matching/shared';

export class DpeRepository {
  async createDpe(data: CreateDpeRecordDto): Promise<DpeRecord> {
    return (await prisma.dpeRecord.create({
      data: data as any,
    })) as any;
  }

  async getDpeById(id: string): Promise<DpeRecord | null> {
    return (await prisma.dpeRecord.findUnique({
      where: { id },
    })) as any;
  }

  async getDpeByNumeroDpe(numeroDpe: string): Promise<DpeRecord | null> {
    return (await prisma.dpeRecord.findUnique({
      where: { numeroDpe },
    })) as any;
  }

  async findDpesByFilters(filters: {
    codePostalBan?: string;
    typeBatiment?: TypeBatiment;
    limit?: number;
  }): Promise<DpeRecord[]> {
    const { limit, ...whereFilters } = filters;
    return (await prisma.dpeRecord.findMany({
      where: whereFilters,
      take: limit,
      orderBy: { dateEtablissement: 'desc' },
    })) as any[];
  }

  async listDpes(page: number, limit: number) {
    const [dpes, total] = await Promise.all([
      prisma.dpeRecord.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dpeRecord.count(),
    ]);

    return { dpes: dpes as any[], total };
  }

  async searchDpesByAddress(address: string): Promise<DpeRecord[]> {
    // Nettoyer l'adresse : enlever virgules, espaces multiples, normaliser
    const cleanedAddress = address
      .replace(/,/g, ' ') // Remplacer virgules par espaces
      .replace(/\s+/g, ' ') // Remplacer espaces multiples par un seul
      .trim();

    // Diviser en mots-clés pour recherche flexible
    const keywords = cleanedAddress.split(' ').filter((k) => k.length > 0);

    // Recherche avec tous les mots-clés (AND)
    return (await prisma.dpeRecord.findMany({
      where: {
        AND: keywords.map((keyword) => ({
          adresseBan: {
            contains: keyword,
            mode: 'insensitive',
          },
        })),
      },
      take: 20, // Limiter à 20 résultats
      orderBy: { dateEtablissement: 'desc' },
    })) as any[];
  }

  async getDpesForMap(filters: {
    limit?: number;
    dateMin?: Date;
    dateMax?: Date;
  } = {}): Promise<DpeRecord[]> {
    const { limit = 50000, dateMin, dateMax } = filters;

    const whereConditions: any[] = [
      { coordonneeX: { not: null } },
      { coordonneeY: { not: null } },
      { codePostalBan: { startsWith: '64' } }, // Pau et alentours
    ];

    // Filtre par date d'établissement
    if (dateMin || dateMax) {
      const dateFilter: any = {};
      if (dateMin) dateFilter.gte = dateMin;
      if (dateMax) dateFilter.lte = dateMax;
      whereConditions.push({ dateEtablissement: dateFilter });
    }

    return (await prisma.dpeRecord.findMany({
      where: {
        AND: whereConditions,
      },
      take: limit,
      orderBy: { dateEtablissement: 'desc' },
    })) as any[];
  }
}

export const dpeRepository = new DpeRepository();
