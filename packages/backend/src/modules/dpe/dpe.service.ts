/**
 * Service DPE
 */

import { dpeRepository } from './dpe.repository';
import { CreateDpeRecordDto, DpeRecord } from '@dpe-matching/shared';
import { ConflictError, NotFoundError } from '@utils/errors';

export class DpeService {
  async createDpe(data: CreateDpeRecordDto): Promise<DpeRecord> {
    const existing = await dpeRepository.getDpeByNumeroDpe(data.numeroDpe);
    if (existing) {
      throw new ConflictError('DPE record with this numero already exists');
    }

    return await dpeRepository.createDpe(data);
  }

  async getDpeById(id: string): Promise<DpeRecord> {
    const dpe = await dpeRepository.getDpeById(id);
    if (!dpe) {
      throw new NotFoundError('DPE record not found');
    }
    return dpe;
  }

  async listDpes(page: number, limit: number) {
    return await dpeRepository.listDpes(page, limit);
  }

  async searchDpesByAddress(address: string) {
    return await dpeRepository.searchDpesByAddress(address);
  }

  async getDpesForMap(filters: {
    limit?: number;
    dateMin?: Date;
    dateMax?: Date;
  } = {}) {
    return await dpeRepository.getDpesForMap(filters);
  }
}

export const dpeService = new DpeService();
