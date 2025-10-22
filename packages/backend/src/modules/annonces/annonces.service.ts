/**
 * Service Annonces
 */

import { annoncesRepository } from './annonces.repository';
import { CreateLeboncoinAnnonceDto, LeboncoinAnnonce } from '@dpe-matching/shared';
import { ConflictError, NotFoundError } from '@utils/errors';

export class AnnoncesService {
  async createAnnonce(data: CreateLeboncoinAnnonceDto): Promise<LeboncoinAnnonce> {
    const listId = typeof data.listId === 'bigint' ? data.listId : BigInt(data.listId);
    const existing = await annoncesRepository.getAnnonceByListId(listId);
    if (existing) {
      throw new ConflictError('Annonce with this listId already exists');
    }

    return await annoncesRepository.createAnnonce(data);
  }

  async getAnnonceById(id: string): Promise<LeboncoinAnnonce> {
    const annonce = await annoncesRepository.getAnnonceById(id);
    if (!annonce) {
      throw new NotFoundError('Annonce not found');
    }
    return annonce;
  }

  async listAnnonces(page: number, limit: number) {
    return await annoncesRepository.listAnnonces(page, limit);
  }

  async getAnnoncesWithoutDpe(limit: number) {
    return await annoncesRepository.getAnnoncesWithoutDpe(limit);
  }
}

export const annoncesService = new AnnoncesService();
