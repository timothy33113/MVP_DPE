/**
 * Service de matching DPE-Leboncoin
 * Implémente l'algorithme de scoring et de sélection des candidats
 */

import {
  MatchingCriteria,
  MatchCandidat,
  MatchingOptions,
  MatchingResult,
  NiveauConfiance,
  ScoreDetails,
  DpeRecord,
  LeboncoinAnnonce,
  DEFAULT_MAX_CANDIDATS,
  DEFAULT_SEUIL_SCORE_MINIMUM,
  DEFAULT_DISTANCE_MAX_GPS,
  GPS_DISTANCE_THRESHOLDS,
  SURFACE_DIFF_THRESHOLDS,
  ANNEE_DIFF_THRESHOLDS,
  TIMING_THRESHOLDS,
  MAX_SCORES,
  MAX_BONUS,
  SCORE_TOTAL_MAX,
  CONFIANCE_THRESHOLDS,
} from '@dpe-matching/shared';
import {
  calculateGPSDistance,
  calculatePercentageDifference,
  calculateDaysDifference,
  compareConstructionPeriods,
} from '@utils/distance';
import { logger } from '@utils/logger';
import { findQuartier, normalizeQuartierName } from '@utils/quartiers';
import { lambert93ToWGS84 } from '@utils/coordinates';

/**
 * Service de matching
 */
export class MatchingService {
  /**
   * Calcule le matching entre une annonce et des DPE candidats
   * @param annonce Annonce Leboncoin
   * @param dpes Liste des DPE candidats
   * @param options Options de matching
   * @returns Résultat du matching avec les candidats scorés
   */
  public async matchAnnonceToDpes(
    annonce: LeboncoinAnnonce,
    dpes: DpeRecord[],
    options: MatchingOptions = {}
  ): Promise<MatchingResult> {
    const startTime = Date.now();

    const {
      maxCandidats = DEFAULT_MAX_CANDIDATS,
      seuilScoreMinimum = DEFAULT_SEUIL_SCORE_MINIMUM,
      distanceMaxGPS = DEFAULT_DISTANCE_MAX_GPS,
      includeScoreDetails = true,
    } = options;

    logger.info(`Starting matching for annonce ${annonce.id} with ${dpes.length} DPE candidates`);

    // Calculer le score pour chaque DPE
    const candidatsWithDpe = dpes.map((dpe) => ({
      dpe,
      score: this.calculateMatchScore(annonce, dpe, includeScoreDetails),
    }));

    const candidatsScores = candidatsWithDpe
      .filter(({ dpe, score: candidat }) => {
        // Filtrer les candidats qui ne passent pas les critères éliminatoires
        if (
          !candidat.scoreDetails.eliminatoires.codePostal ||
          !candidat.scoreDetails.eliminatoires.typeBien
        ) {
          return false;
        }

        // NOUVEAU: Filtrer si DPE ou GES ne correspondent pas
        const details = candidat.scoreDetails;
        if (details.scoreBase.dpe === 0 || details.scoreBase.ges === 0) {
          return false;
        }

        // Filtrer par surface avec tolérance adaptative
        if (annonce.surface && dpe.surfaceHabitable) {
          const diffSurface = Math.abs(annonce.surface - dpe.surfaceHabitable);

          // Tolérance stricte de ±5m² par défaut
          if (diffSurface > 5) {
            // Tolérance élargie à ±15m² si critères forts correspondent
            if (diffSurface > 15) {
              return false;
            }

            // Accepter jusqu'à ±15m² si au moins 2 critères discriminants correspondent
            const criteresFortsOK =
              (details.scoreBase.coutEnergie >= 15 ? 1 : 0) + // Coût énergie OK (seuil ajusté pour 30pts max)
              (details.scoreBase.timing >= 3 ? 1 : 0) + // Date proche
              (details.scoreBase.annee >= 5 ? 1 : 0) + // Année/période OK
              (details.scoreBase.chauffage >= 3 ? 1 : 0); // Chauffage OK

            if (criteresFortsOK < 2) {
              return false; // Rejeter si moins de 2 critères forts
            }
          }
        }

        // Filtrer par score minimum
        if (candidat.scoreNormalized < seuilScoreMinimum) {
          return false;
        }

        // Filtrer par distance GPS si disponible
        if (candidat.distanceGps !== null && candidat.distanceGps > distanceMaxGPS) {
          return false;
        }

        // Note: Le quartier est géré comme bonus, pas comme filtre strict
        // Cela permet de ne pas rejeter les DPE "proches" du quartier mentionné
        return true;
      })
      .map(({ score }) => score)
      // Trier par score décroissant
      .sort((a, b) => b.scoreNormalized - a.scoreNormalized)
      // Limiter le nombre de candidats
      .slice(0, maxCandidats)
      // Ajouter le rang
      .map((candidat, index) => ({
        ...candidat,
        rang: index + 1,
      }));

    const executionTimeMs = Date.now() - startTime;

    logger.info(
      `Matching completed in ${executionTimeMs}ms. Found ${candidatsScores.length} valid candidates`
    );

    return {
      clusterId: '', // À définir lors de la sauvegarde
      annonceId: annonce.id,
      candidats: candidatsScores as MatchCandidat[],
      nombreCandidats: candidatsScores.length,
      meilleurScore: candidatsScores.length > 0 ? candidatsScores[0].scoreNormalized : 0,
      executionTimeMs,
    };
  }

  /**
   * Calcule le score de matching entre une annonce et un DPE
   * @param annonce Annonce Leboncoin
   * @param dpe DPE record
   * @param includeDetails Inclure les détails du score
   * @returns Candidat avec score
   */
  private calculateMatchScore(
    annonce: LeboncoinAnnonce,
    dpe: DpeRecord,
    includeDetails: boolean
  ): Omit<MatchCandidat, 'id' | 'clusterId' | 'rang' | 'createdAt'> {
    // Calcul des critères éliminatoires
    const eliminatoires = {
      codePostal: annonce.codePostal === dpe.codePostalBan,
      typeBien: annonce.typeBien === dpe.typeBatiment,
    };

    // Initialiser les scores
    const scoreBase: MatchingCriteria['scoreBase'] = {
      dpe: 0,
      ges: 0,
      surface: 0,
      surfaceTerrain: 0,
      annee: 0,
      pieces: 0,
      niveauxEtage: 0,
      chauffage: 0,
      timing: 0,
      coutEnergie: 0,
    };

    const bonus: MatchingCriteria['bonus'] = {
      distanceGPS: 0,
      ville: 0,
      quartier: 0,
      rue: 0,
      chambres: 0,
      orientation: 0,
      exterieur: 0,
      traversant: 0,
    };

    // Si critères éliminatoires non respectés, retourner score 0
    if (!eliminatoires.codePostal || !eliminatoires.typeBien) {
      return {
        dpeId: dpe.id,
        scoreTotal: 0,
        scoreBase: 0,
        scoreBonus: 0,
        scoreNormalized: 0,
        confiance: NiveauConfiance.DOUTEUX,
        scoreDetails: { eliminatoires, scoreBase, bonus },
        distanceGps: null,
        estSelectionne: false,
      };
    }

    // ========== SCORE DE BASE ==========

    // DPE (25 points)
    if (annonce.etiquetteDpe && annonce.etiquetteDpe === dpe.etiquetteDpe) {
      scoreBase.dpe = MAX_SCORES.DPE as 25;
    }

    // GES (25 points)
    if (annonce.etiquetteGes && annonce.etiquetteGes === dpe.etiquetteGes) {
      scoreBase.ges = MAX_SCORES.GES as 25;
    }

    // Surface (15 points)
    if (annonce.surface && dpe.surfaceHabitable) {
      const surfaceDiffAbsolute = Math.abs(annonce.surface - dpe.surfaceHabitable);

      // Score basé sur la différence absolue en m²
      if (surfaceDiffAbsolute <= 2) {
        scoreBase.surface = 5; // ±2m² ou moins : score maximal
      } else if (surfaceDiffAbsolute <= 5) {
        scoreBase.surface = 3; // ±3-5m² : score acceptable
      }
      // Si > 5m², sera filtré avant (score = 0)
    }

    // Surface Terrain (10 points) - NOUVEAU
    // Extraire la surface terrain de l'annonce si disponible
    let surfaceTerrainAnnonce: number | undefined;
    if (annonce.rawData && typeof annonce.rawData === 'object') {
      const rawData = annonce.rawData as any;
      if (rawData.attributes && Array.isArray(rawData.attributes)) {
        const landPlotAttr = rawData.attributes.find(
          (attr: any) => attr.key === 'land_plot_surface'
        );
        if (landPlotAttr && landPlotAttr.value) {
          surfaceTerrainAnnonce = parseInt(landPlotAttr.value);
        }
      }
    }

    // Utiliser le champ surfaceTerrain enrichi depuis le cadastre
    const surfaceTerrainDpe = dpe.surfaceTerrain;

    if (surfaceTerrainAnnonce && surfaceTerrainDpe) {
      const diffAbsolue = Math.abs(surfaceTerrainAnnonce - surfaceTerrainDpe);
      const diffPourcent = (diffAbsolue / surfaceTerrainAnnonce) * 100;

      // Score basé sur l'écart en pourcentage
      if (diffPourcent <= 10) {
        scoreBase.surfaceTerrain = 10; // ±10% ou moins : score maximal
      } else if (diffPourcent <= 20) {
        scoreBase.surfaceTerrain = 6; // ±20% : bon score
      } else if (diffPourcent <= 30) {
        scoreBase.surfaceTerrain = 3; // ±30% : score acceptable
      }
      // > 30% = 0 points (tolérance large car surfaces cadastrales variables)
    }

    // Année de construction (10 points)
    // Utilise la nouvelle fonction qui gère à la fois les années exactes et les périodes
    const dpePeriode = (dpe.rawData as any)?.periode_construction;
    scoreBase.annee = compareConstructionPeriods(
      annonce.anneConstruction,
      dpePeriode,
      dpe.anneConstruction
    );

    // Timing entre publication/date DPE annonce et date DPE ADEME (5 points)
    // Prioriser la date DPE extraite de l'annonce si disponible (plus précise)
    const referenceDate = annonce.dateDpe || annonce.datePublication;

    // Extraire la date de visite du diagnostiqueur si disponible (plus précise que dateEtablissement)
    const dateVisiteDiagnostiqueur = (dpe.rawData as any)?.date_visite_diagnostiqueur;
    let dpeReferenceDate = dpe.dateEtablissement;
    if (dateVisiteDiagnostiqueur) {
      try {
        dpeReferenceDate = new Date(dateVisiteDiagnostiqueur);
      } catch (e) {
        // Garder dateEtablissement si parsing échoue
      }
    }

    const daysDiff = calculateDaysDifference(referenceDate, dpeReferenceDate);
    if (daysDiff <= TIMING_THRESHOLDS.PERFECT) {
      scoreBase.timing = 15; // < 16 jours : parfait
    } else if (daysDiff <= TIMING_THRESHOLDS.EXCELLENT) {
      scoreBase.timing = 12; // < 25 jours : excellent
    } else if (daysDiff <= TIMING_THRESHOLDS.GOOD) {
      scoreBase.timing = 8; // < 90 jours : bon
    } else if (daysDiff <= TIMING_THRESHOLDS.ACCEPTABLE) {
      scoreBase.timing = 3; // < 180 jours : acceptable
    }

    // Coût énergie annuel (30 points) - TRÈS discriminant (poids triplé)
    const coutEnergieDpe = parseFloat((dpe.rawData as any)?.cout_total_5_usages || '0');
    if (coutEnergieDpe > 0 && annonce.rawData) {
      // Extraire le coût énergie de l'annonce (format: "entre X € et Y €")
      const bodyText = (annonce.rawData as any)?.body || '';
      const coutMatch = bodyText.match(/entre\s+([\d\s]+)\s*€\s*et\s+([\d\s]+)\s*€/i);

      if (coutMatch) {
        const coutMin = parseInt(coutMatch[1].replace(/\s/g, ''));
        const coutMax = parseInt(coutMatch[2].replace(/\s/g, ''));

        // Vérifier si le coût DPE est dans la fourchette de l'annonce
        if (coutEnergieDpe >= coutMin && coutEnergieDpe <= coutMax) {
          scoreBase.coutEnergie = 30; // Match parfait (triplé)
        } else {
          // Calculer l'écart en %
          const coutMoyen = (coutMin + coutMax) / 2;
          const ecartPourcent = Math.abs((coutEnergieDpe - coutMoyen) / coutMoyen) * 100;

          if (ecartPourcent <= 5) {
            scoreBase.coutEnergie = 25; // Écart ≤ 5% - Très proche
          } else if (ecartPourcent <= 10) {
            scoreBase.coutEnergie = 20; // Écart ≤ 10% - Proche
          } else if (ecartPourcent <= 15) {
            scoreBase.coutEnergie = 15; // Écart ≤ 15% - Bon
          } else if (ecartPourcent <= 20) {
            scoreBase.coutEnergie = 10; // Écart ≤ 20% - Acceptable
          } else if (ecartPourcent <= 30) {
            scoreBase.coutEnergie = 5; // Écart ≤ 30% - Faible
          }
        }
      }
    }

    // ========== BONUS ==========

    let distanceGps: number | null = null;

    // Distance GPS (10 points)
    if (annonce.lat && annonce.lng && dpe.coordonneeX && dpe.coordonneeY) {
      distanceGps = calculateGPSDistance(
        annonce.lat,
        annonce.lng,
        dpe.coordonneeY,
        dpe.coordonneeX
      );

      if (distanceGps < GPS_DISTANCE_THRESHOLDS.EXCELLENT) {
        bonus.distanceGPS = MAX_BONUS.DISTANCE_GPS as 10;
      } else if (distanceGps < GPS_DISTANCE_THRESHOLDS.GOOD) {
        bonus.distanceGPS = 7;
      } else if (distanceGps < GPS_DISTANCE_THRESHOLDS.ACCEPTABLE) {
        bonus.distanceGPS = 4;
      }
    }

    // Ville (5 points) - Bonus si même ville/commune
    const annonceVille = this.getVilleFromAnnonce(annonce);
    const dpeVille = dpe.nomCommune;

    if (annonceVille && dpeVille) {
      // Normaliser les noms pour comparaison (minuscules, sans accents, sans espaces)
      const annonceNorm = this.normalizeVilleName(annonceVille);
      const dpeNorm = this.normalizeVilleName(dpeVille);

      if (annonceNorm === dpeNorm) {
        bonus.ville = MAX_BONUS.VILLE as 5;
        logger.debug(`Ville match: ${annonceVille} = ${dpeVille}`);
      }
    }

    // Quartier (5 points) - Bonus si même quartier
    const annonceQuartier = this.getQuartierFromAnnonce(annonce);
    const dpeQuartier = this.getQuartierFromDpe(dpe);

    if (annonceQuartier && dpeQuartier) {
      // Normaliser les noms pour comparaison
      const annonceNorm = normalizeQuartierName(annonceQuartier);
      const dpeNorm = normalizeQuartierName(dpeQuartier);

      if (annonceNorm === dpeNorm) {
        bonus.quartier = MAX_BONUS.QUARTIER as 5;
        logger.debug(`Quartier match: ${annonceQuartier} = ${dpeQuartier}`);
      }
    }

    // Rue - À implémenter si adresses complètes disponibles

    // Logement traversant (3 points)
    const dpeTraversant = (dpe.rawData as any)?.logement_traversant === '1';
    if (dpeTraversant && annonce.rawData) {
      const bodyText = ((annonce.rawData as any)?.body || '').toLowerCase();
      const subjectText = ((annonce.rawData as any)?.subject || '').toLowerCase();

      // Chercher des mots-clés indiquant que c'est traversant
      if (
        bodyText.includes('traversant') ||
        subjectText.includes('traversant') ||
        bodyText.includes('double exposition')
      ) {
        bonus.traversant = MAX_BONUS.TRAVERSANT as 3;
      }
    }

    // ========== CALCULS FINAUX ==========

    const totalScoreBase = Object.values(scoreBase).reduce(
      (sum, score) => sum + score,
      0 as number
    );
    const totalBonus = Object.values(bonus).reduce((sum, score) => sum + score, 0 as number);
    const scoreTotal = totalScoreBase + totalBonus;

    // Score normalisé sur 100
    const scoreNormalized = (scoreTotal / SCORE_TOTAL_MAX) * 100;

    // Niveau de confiance
    const confiance = this.calculateConfiance(scoreNormalized);

    const scoreDetails: ScoreDetails = {
      eliminatoires,
      scoreBase,
      bonus,
    };

    return {
      dpeId: dpe.id,
      scoreTotal,
      scoreBase: totalScoreBase,
      scoreBonus: totalBonus,
      scoreNormalized,
      confiance,
      scoreDetails: includeDetails ? scoreDetails : ({} as ScoreDetails),
      distanceGps,
      estSelectionne: false,
    };
  }

  /**
   * Détermine le niveau de confiance basé sur le score normalisé
   * @param scoreNormalized Score normalisé (0-100)
   * @returns Niveau de confiance
   */
  private calculateConfiance(scoreNormalized: number): NiveauConfiance {
    if (scoreNormalized >= CONFIANCE_THRESHOLDS.CERTAIN) {
      return NiveauConfiance.CERTAIN;
    } else if (scoreNormalized >= CONFIANCE_THRESHOLDS.TRES_FIABLE) {
      return NiveauConfiance.TRES_FIABLE;
    } else if (scoreNormalized >= CONFIANCE_THRESHOLDS.PROBABLE) {
      return NiveauConfiance.PROBABLE;
    } else if (scoreNormalized >= CONFIANCE_THRESHOLDS.POSSIBLE) {
      return NiveauConfiance.POSSIBLE;
    } else {
      return NiveauConfiance.DOUTEUX;
    }
  }

  /**
   * Extrait la ville d'une annonce Leboncoin
   * Cherche dans rawData.location.city_label ou city
   */
  private getVilleFromAnnonce(annonce: LeboncoinAnnonce): string | null {
    if (annonce.rawData && typeof annonce.rawData === 'object') {
      const rawData = annonce.rawData as any;
      if (rawData.location?.city_label) {
        return rawData.location.city_label;
      }
      if (rawData.location?.city) {
        return rawData.location.city;
      }
    }
    return null;
  }

  /**
   * Normalise un nom de ville pour comparaison
   * Enlève les accents, met en minuscules, enlève espaces et tirets
   */
  private normalizeVilleName(ville: string): string {
    return ville
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[-\s]/g, ''); // Enlever espaces et tirets
  }

  /**
   * Extrait le quartier d'une annonce Leboncoin
   * Cherche d'abord dans rawData.location.district, puis géolocalise via GPS
   */
  private getQuartierFromAnnonce(annonce: LeboncoinAnnonce): string | null {
    // 1. Essayer d'extraire depuis rawData.location.district
    if (annonce.rawData && typeof annonce.rawData === 'object') {
      const rawData = annonce.rawData as any;
      if (rawData.location?.district) {
        return rawData.location.district;
      }
    }

    // 2. Chercher dans le texte de l'annonce (body et subject)
    if (annonce.rawData && typeof annonce.rawData === 'object') {
      const rawData = annonce.rawData as any;
      const body = (rawData.body || '').toLowerCase();
      const subject = (rawData.subject || '').toLowerCase();
      const fullText = body + ' ' + subject;

      // Liste des quartiers à rechercher (Pau)
      const quartiersToSearch = [
        'hameau', 'trespoey', 'saragosse', 'dufau', 'tourasse',
        'xiv juillet', '14 juillet', 'ousse des bois', 'université',
        'centre-ville', 'pau sud', 'pau nord'
      ];

      for (const q of quartiersToSearch) {
        if (fullText.includes(q)) {
          // Normaliser le nom du quartier
          if (q === 'hameau') return 'Le Hameau';
          if (q === 'trespoey') return 'Trespoey';
          if (q === 'saragosse') return 'Saragosse';
          if (q === 'dufau' || q === 'tourasse') return 'Dufau - Tourasse';
          if (q.includes('14 juillet') || q.includes('xiv juillet')) return 'XIV Juillet';
          if (q === 'ousse des bois') return 'Ousse des Bois';
          if (q === 'université') return 'Université';
          if (q === 'centre-ville') return 'Centre-ville';
        }
      }
    }

    // 3. Géolocaliser via coordonnées GPS
    if (annonce.lat && annonce.lng && annonce.codePostal) {
      const quartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);
      if (quartier) {
        return quartier.name;
      }
    }

    return null;
  }

  /**
   * Extrait le quartier d'un DPE
   * Utilise les coordonnées GPS pour déterminer le quartier
   */
  private getQuartierFromDpe(dpe: DpeRecord): string | null {
    if (dpe.coordonneeX && dpe.coordonneeY && dpe.codePostalBan) {
      // Convertir Lambert93 → WGS84
      const [lng, lat] = lambert93ToWGS84(dpe.coordonneeX, dpe.coordonneeY);

      // Trouver le quartier avec coordonnées GPS
      const quartier = findQuartier(lng, lat, dpe.codePostalBan);
      if (quartier) {
        return quartier.name;
      }
    }

    return null;
  }
}

export const matchingService = new MatchingService();
