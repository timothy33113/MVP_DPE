/**
 * Types pour les clusters de matching
 */

import { StatutValidation } from '@dpe-matching/shared';

export interface ClusterListFilters {
  statut?: StatutValidation;
  scoreMin?: number;
  scoreMax?: number;
  codePostal?: string;
  limit?: number;
  offset?: number;
}

export interface ClusterWithDetails {
  id: string;
  annonceId: string;
  nombreCandidats: number;
  meilleurScore: number;
  statut: StatutValidation;
  createdAt: Date;
  updatedAt: Date;
  annonce: {
    id: string;
    listId: bigint;
    url: string;
    codePostal: string;
    typeBien: string;
    surface: number | null;
    pieces: number | null;
    etiquetteDpe: string | null;
    etiquetteGes: string | null;
  };
  candidats: Array<{
    id: string;
    dpeId: string;
    scoreTotal: number;
    scoreNormalized: number;
    rang: number;
    confiance: string;
    distanceGps: number | null;
    scoreDetails: any;
    dpe: {
      id: string;
      adresseBan: string;
      codePostalBan: string;
      typeBatiment: string;
      surfaceHabitable: number;
      etiquetteDpe: string | null;
      etiquetteGes: string | null;
      anneConstruction: number | null;
    };
  }>;
}

export interface UpdateClusterStatusDTO {
  statut: StatutValidation;
}

export interface ClusterStats {
  total: number;
  parStatut: Record<StatutValidation, number>;
  scoreMoyen: number;
  meilleurScore: number;
}
