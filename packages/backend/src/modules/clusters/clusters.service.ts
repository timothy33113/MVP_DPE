/**
 * Service pour les clusters de matching
 */

import { StatutValidation } from '@dpe-matching/shared';
import { NotFoundError, BadRequestError } from '@utils/errors';
import { clustersRepository } from './clusters.repository';
import { ClusterListFilters, UpdateClusterStatusDTO } from './clusters.types';

export const clustersService = {
  /**
   * Récupérer tous les clusters
   */
  async getClusters(filters: ClusterListFilters) {
    return clustersRepository.findMany(filters);
  },

  /**
   * Récupérer un cluster par ID
   */
  async getClusterById(id: string) {
    const cluster = await clustersRepository.findById(id);

    if (!cluster) {
      throw new NotFoundError(`Cluster ${id} not found`);
    }

    return cluster;
  },

  /**
   * Mettre à jour le statut d'un cluster
   */
  async updateClusterStatus(id: string, data: UpdateClusterStatusDTO) {
    // Vérifier que le cluster existe
    const cluster = await clustersRepository.findById(id);

    if (!cluster) {
      throw new NotFoundError(`Cluster ${id} not found`);
    }

    // Valider le statut
    const validStatuts = Object.values(StatutValidation);
    if (!validStatuts.includes(data.statut)) {
      throw new BadRequestError(`Invalid status: ${data.statut}`);
    }

    // Mettre à jour
    return clustersRepository.updateStatus(id, data.statut);
  },

  /**
   * Obtenir les statistiques des clusters
   */
  async getStats() {
    return clustersRepository.getStats();
  },

  /**
   * Exporter les clusters validés en JSON
   */
  async exportValidated() {
    const clusters = await clustersRepository.findMany({
      statut: StatutValidation.ADRESSE_CONFIRMEE,
      limit: 1000,
    });

    return clusters.map((cluster) => ({
      clusterId: cluster.id,
      annonce: {
        url: cluster.annonce.url,
        codePostal: cluster.annonce.codePostal,
        typeBien: cluster.annonce.typeBien,
        surface: cluster.annonce.surface,
        pieces: cluster.annonce.pieces,
        etiquetteDpe: cluster.annonce.etiquetteDpe,
        etiquetteGes: cluster.annonce.etiquetteGes,
      },
      meilleurCandidat: cluster.candidats[0]
        ? {
            adresse: cluster.candidats[0].dpe.adresseBan,
            typeBatiment: cluster.candidats[0].dpe.typeBatiment,
            surface: cluster.candidats[0].dpe.surfaceHabitable,
            etiquetteDpe: cluster.candidats[0].dpe.etiquetteDpe,
            etiquetteGes: cluster.candidats[0].dpe.etiquetteGes,
            anneConstruction: cluster.candidats[0].dpe.anneConstruction,
            score: cluster.candidats[0].scoreNormalized,
            confiance: cluster.candidats[0].confiance,
          }
        : null,
      tousLesCandidats: cluster.candidats.map((c) => ({
        rang: c.rang,
        adresse: c.dpe.adresseBan,
        score: c.scoreNormalized,
        confiance: c.confiance,
      })),
    }));
  },
};
