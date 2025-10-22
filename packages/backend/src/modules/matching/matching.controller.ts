/**
 * Controller pour les routes de matching
 */

import { Request, Response } from 'express';
import { matchingService } from './matching.service';
import { matchingRepository } from './matching.repository';
import { dpeRepository } from '@modules/dpe/dpe.repository';
import { annoncesRepository } from '@modules/annonces/annonces.repository';
import { asyncHandler } from '@utils/async-handler';
import { NotFoundError } from '@utils/errors';
import { ApiResponse, PaginatedResponse } from '@dpe-matching/shared';
import { matchingAcquereurService } from '@services/matching-acquereur.service';

export class MatchingController {
  /**
   * POST /api/matching/annonces/:annonceId
   * Lance le matching pour une annonce
   */
  runMatching = asyncHandler(async (req: Request, res: Response) => {
    const { annonceId } = req.params;
    const options = req.body;

    // Récupérer l'annonce
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      throw new NotFoundError('Annonce not found');
    }

    // Récupérer les DPE candidats (même code postal et type de bien)
    const dpes = await dpeRepository.findDpesByFilters({
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien,
    });

    // Exécuter le matching
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, options);

    // Sauvegarder le cluster
    const cluster = await matchingRepository.createMatchCluster(
      annonceId,
      result.candidats,
      result.meilleurScore
    );

    res.status(201).json({
      success: true,
      data: {
        ...result,
        clusterId: cluster.id,
      },
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/clusters/:clusterId
   * Récupère un cluster de match
   */
  getCluster = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;

    const cluster = await matchingRepository.getMatchClusterById(clusterId);
    if (!cluster) {
      throw new NotFoundError('Match cluster not found');
    }

    // Ajouter le trackingStatut aux candidats (matches)
    const clusterWithTracking = {
      ...cluster,
      candidats: cluster.candidats?.map((candidat: any) => ({
        ...candidat,
        trackingStatut: (cluster as any).annonce?.tracking?.statut || null,
      })),
    };

    res.json({
      success: true,
      data: clusterWithTracking,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/clusters
   * Liste les clusters de match
   */
  listClusters = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, statut } = req.query;

    const { clusters, total } = await matchingRepository.listMatchClusters(
      Number(page),
      Number(limit),
      statut as any
    );

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: clusters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<PaginatedResponse<any>>);
  });

  /**
   * GET /api/matching/clusters-with-dpe
   * Liste les clusters de match avec les informations du meilleur DPE
   */
  listClustersWithDpe = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10000, statut } = req.query;

    const { clusters, total } = await matchingRepository.listMatchClusters(
      Number(page),
      Number(limit),
      statut as any
    );

    // Pour chaque cluster, récupérer le meilleur candidat DPE ET l'annonce
    const clustersWithDpe = await Promise.all(
      clusters.map(async (cluster: any) => {
        const candidates = await matchingRepository.getCandidatesByClusterId(cluster.id);

        // Trouver le meilleur candidat (score le plus élevé)
        const bestCandidate = candidates.sort((a: any, b: any) => b.score - a.score)[0];

        let bestDpe = null;
        if (bestCandidate) {
          bestDpe = await dpeRepository.getDpeById(bestCandidate.dpeId);
        }

        // Récupérer l'annonce complète avec rawData et tracking
        const annonce = await annoncesRepository.getAnnonceById(cluster.annonceId);

        // Extraire les détails du rawData
        const rawData = bestDpe?.rawData as any || {};

        return {
          ...cluster,
          annonce: annonce || null,
          score: bestCandidate?.scoreTotal || 0,
          trackingStatut: (annonce as any)?.tracking?.statut || null,
          bestDpe: bestDpe ? {
            id: bestDpe.id,
            numeroDpe: bestDpe.numeroDpe,
            adresseBan: bestDpe.adresseBan,
            codePostalBan: bestDpe.codePostalBan,
            coordonneeX: bestDpe.coordonneeX,
            coordonneeY: bestDpe.coordonneeY,
            etiquetteDpe: bestDpe.etiquetteDpe,
            etiquetteGes: bestDpe.etiquetteGes,
            surfaceHabitable: bestDpe.surfaceHabitable,
            typeBatiment: bestDpe.typeBatiment,
            anneConstruction: bestDpe.anneConstruction,
            dateEtablissement: bestDpe.dateEtablissement,
            // Détails d'isolation
            qualiteIsolationMurs: rawData.qualite_isolation_murs,
            qualiteIsolationMenuiseries: rawData.qualite_isolation_menuiseries,
            qualiteIsolationPlancherBas: rawData['qualite_isolation_plancher bas'],
            qualiteIsolationComblePerdu: rawData.qualite_isolation_plancher_haut_comble_perdu,
            qualiteIsolationCombleAmenage: rawData.qualite_isolation_plancher_haut_comble_amenage,
            qualiteIsolationToitTerrasse: rawData.qualite_isolation_plancher_haut_toit_terrasse,
            qualiteIsolationEnveloppe: rawData.qualite_isolation_enveloppe,
            // Chauffage
            typeEnergiePrincipaleChauffage: rawData.type_energie_principale_chauffage,
            typeInstallationChauffage: rawData.type_installation_chauffage,
            descriptionGenerateurChauffage: rawData.description_generateur_chauffage_n1_installation_n1,
            // ECS (Eau Chaude Sanitaire)
            typeEnergiePrincipaleEcs: rawData.type_energie_principale_ecs,
            typeGenerateurEcs: rawData.type_generateur_chauffage_principal_ecs,
            // Ventilation
            typeVentilation: rawData.type_ventilation,
            // Confort
            indicateurConfortEte: rawData.indicateur_confort_ete,
            // Consommations
            consoTotaleEf: rawData['conso_5 usages_ef'],
            consoParM2Ef: rawData['conso_5 usages_par_m2_ef'],
            consoChauffageEf: rawData.conso_chauffage_ef,
            consoEcsEf: rawData.conso_ecs_ef,
            // Coûts
            coutTotal5Usages: rawData.cout_total_5_usages,
            coutChauffage: rawData.cout_chauffage,
            coutEcs: rawData.cout_ecs,
            // GES
            emissionGes5Usages: rawData.emission_ges_5_usages,
            emissionGesParM2: rawData['emission_ges_5_usages par_m2'],
            // Structure du logement
            hauteurSousPlafond: rawData.hauteur_sous_plafond,
            nombreNiveauLogement: rawData.nombre_niveau_logement,
            numeroEtageAppartement: rawData.numero_etage_appartement,
            logementTraversant: rawData.logement_traversant,
            classeInertieBatiment: rawData.classe_inertie_batiment,
            periodeConstruction: rawData.periode_construction,
          } : null,
        };
      })
    );

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: clustersWithDpe,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<PaginatedResponse<any>>);
  });

  /**
   * PATCH /api/matching/clusters/:clusterId/validate
   * Valide un cluster de match
   */
  validateCluster = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;
    const { statut, dpeConfirmeId } = req.body;

    const cluster = await matchingRepository.updateClusterStatus(clusterId, statut, dpeConfirmeId);

    res.json({
      success: true,
      data: cluster,
    } as ApiResponse<any>);
  });

  /**
   * POST /api/matching/corrections/validate
   * Valide que le matching proposé est correct
   */
  validateMatch = asyncHandler(async (req: Request, res: Response) => {
    const { annonceId, dpeId, notes } = req.body;

    if (!annonceId || !dpeId) {
      return res.status(400).json({
        success: false,
        error: 'annonceId and dpeId are required',
      });
    }

    const correction = await matchingRepository.createMatchCorrection({
      annonceId,
      dpeCorrectId: dpeId,
      dpeProposedId: dpeId, // Même DPE = validation
      isValidation: true,
      notes,
      createdBy: 'manual',
    });

    res.status(201).json({
      success: true,
      data: correction,
    } as ApiResponse<any>);
  });

  /**
   * POST /api/matching/corrections/correct
   * Corrige un matching en indiquant le bon DPE
   */
  correctMatch = asyncHandler(async (req: Request, res: Response) => {
    const { annonceId, dpeProposedId, dpeCorrectId, notes } = req.body;

    if (!annonceId || !dpeCorrectId) {
      return res.status(400).json({
        success: false,
        error: 'annonceId and dpeCorrectId are required',
      });
    }

    // Récupérer les scores si les DPE étaient candidats
    const cluster = await matchingRepository.getMatchClusterByAnnonceId(annonceId);
    let scoreProposed = null;
    let scoreCorrect = null;
    let rangProposed = null;
    let rangCorrect = null;

    if (cluster) {
      const candidats = await matchingRepository.getCandidatesByClusterId(cluster.id);

      if (dpeProposedId) {
        const proposed = candidats.find((c: any) => c.dpeId === dpeProposedId);
        if (proposed) {
          scoreProposed = proposed.scoreTotal;
          rangProposed = proposed.rang;
        }
      }

      const correct = candidats.find((c: any) => c.dpeId === dpeCorrectId);
      if (correct) {
        scoreCorrect = correct.scoreTotal;
        rangCorrect = correct.rang;
      }
    }

    const correction = await matchingRepository.createMatchCorrection({
      annonceId,
      dpeProposedId,
      dpeCorrectId,
      scoreProposed,
      scoreCorrect,
      rangProposed,
      rangCorrect,
      isValidation: false,
      notes,
      createdBy: 'manual',
    });

    // Mettre à jour les coordonnées GPS de l'annonce avec celles du DPE corrigé
    await matchingRepository.updateAnnonceCoordinatesFromDpe(annonceId, dpeCorrectId);

    res.status(201).json({
      success: true,
      data: correction,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/corrections/stats
   * Statistiques sur les corrections pour améliorer l'algo
   */
  getCorrectionStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await matchingRepository.getMatchCorrectionStats();

    res.json({
      success: true,
      data: stats,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/candidates/:annonceId
   * Récupère tous les candidats DPE pour une annonce
   * Inclut les candidats du cluster de matching + des DPE additionnels du même code postal/type
   */
  getCandidatesByAnnonce = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { annonceId } = req.params;

    // Récupérer l'annonce
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      res.status(404).json({
        success: false,
        error: 'Annonce not found',
      });
      return;
    }

    // Récupérer le cluster de matching pour cette annonce
    const cluster = await matchingRepository.getClusterByAnnonceId(annonceId);

    let candidats: any[] = [];
    let clusterId: string | null = null;

    if (cluster) {
      // Si un cluster existe, récupérer ses candidats
      candidats = await matchingRepository.getCandidatesByClusterId(cluster.id);
      clusterId = cluster.id;
    }

    // Récupérer également des DPE additionnels du même code postal et type de bien
    // Limité à 20 DPE les plus récents pour éviter de surcharger
    const additionalDpes = await dpeRepository.findDpesByFilters({
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien,
      limit: 20,
    });

    // Ajouter les DPE additionnels qui ne sont pas déjà dans les candidats
    const existingDpeIds = new Set(candidats.map((c: any) => c.dpeId));
    const additionalCandidats = additionalDpes
      .filter(dpe => !existingDpeIds.has(dpe.id))
      .map((dpe, index) => ({
        id: `additional-${dpe.id}`,
        dpeId: dpe.id,
        scoreTotal: 0,
        scoreNormalized: 0,
        confiance: 'POTENTIEL',
        rang: candidats.length + index + 1,
        estSelectionne: false,
        dpe,
      }));

    res.json({
      success: true,
      data: {
        clusterId,
        candidats: [...candidats, ...additionalCandidats],
      },
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/acquereurs/:annonceId
   * Récupère les acquéreurs potentiellement intéressés par une annonce
   */
  getAcquereursForAnnonce = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { annonceId } = req.params;
    const { scoreMin = 50, limit = 10 } = req.query;

    // Récupérer l'annonce
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      res.status(404).json({
        success: false,
        error: 'Annonce not found',
      });
      return;
    }

    // Convertir l'annonce en format Bien pour le matching
    const rawData = (annonce as any).rawData || {};
    const bien = {
      id: annonce.id,
      typeBien: annonce.typeBien,
      surface: annonce.surface || 0,
      pieces: annonce.pieces || 0,
      codePostal: annonce.codePostal,
      prix: rawData?.price?.[0],
      etiquetteDpe: annonce.etiquetteDpe,
      etiquetteGes: annonce.etiquetteGes,
      anneConstruction: rawData?.attributes?.find((a: any) => a.key === 'building_year')?.value,
      surfaceTerrain: rawData?.attributes?.find((a: any) => a.key === 'land_plot_area')?.value,
      etage: rawData?.attributes?.find((a: any) => a.key === 'floor_number')?.value,
      ascenseur: rawData?.attributes?.find((a: any) => a.key === 'elevator')?.value === '1',
      balcon: rawData?.attributes?.find((a: any) => a.key === 'outside_access')?.values?.includes('balcony'),
      terrasse: rawData?.attributes?.find((a: any) => a.key === 'outside_access')?.values?.includes('terrace'),
      parking: rawData?.attributes?.find((a: any) => a.key === 'nb_parkings')?.value ? parseInt(rawData.attributes.find((a: any) => a.key === 'nb_parkings').value) > 0 : false,
      garage: rawData?.attributes?.find((a: any) => a.key === 'specificities')?.values?.includes('with_garage_or_parking_spot'),
      source: 'leboncoin' as const,
      annonceId: annonce.id,
    };

    // Trouver les acquéreurs intéressés
    const acquereurs = await matchingAcquereurService.findAcquereursForBien(bien, {
      scoreMin: Number(scoreMin),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: {
        acquereurs,
      },
    } as ApiResponse<any>);
  });
}

export const matchingController = new MatchingController();
