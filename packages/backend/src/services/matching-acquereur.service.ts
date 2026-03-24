/**
 * Service de matching entre biens Amanda et acquéreurs
 * Algorithme de scoring sur 100 points
 *
 * Sources: AmandaBien (sync Amanda → Monday → Supabase)
 * Cibles: Acquereur (sync Monday Prospects → Supabase)
 * Résultats: MatchAcquereurAmanda
 */

import { PrismaClient, TypeBatiment } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

interface BienNormalise {
  id: string;
  typeBien: TypeBatiment | null;
  surface: number;
  pieces: number;
  chambres: number;
  codePostal: string;
  ville: string | null;
  prix: number | null;
  etiquetteDpe: string | null;   // A-G depuis amanda_biens.dpe_classe
  etiquetteGes: string | null;

  // Spécifiques
  surfaceTerrain: number | null;
  etage: number | null;
  anneConstruction: number | null;
  etatGeneral: string | null;

  // Équipements booléens
  avecAscenseur: boolean;
  avecBalcon: boolean;
  avecTerrasse: boolean;
  avecParking: boolean;
  avecGarage: boolean;
  avecJardin: boolean;
  avecPiscine: boolean;
  avecCave: boolean;

  // Copropriété
  estCopropriete: boolean;
  nbLotsCopro: number | null;

  // Référence Amanda
  mandateRef: string;
  mondayItemId: string | null;
}

interface ScoreDetails {
  budget: number;
  typeBien: number;
  localisation: number;
  surface: number;
  pieces: number;
  dpe: number;
  equipements: number;
}

interface ResultatMatch {
  bien: BienNormalise;
  scoreTotal: number;
  scoreDetails: ScoreDetails;
  pointsForts: string[];
  pointsFaibles: string[];
}

// ============================================================================
// Service
// ============================================================================

export class MatchingAcquereurService {

  /**
   * Lance le matching complet : tous les biens Amanda disponibles × tous les acquéreurs actifs
   * Persiste les résultats dans match_acquereur_amanda
   * Retourne les nouveaux matchs créés
   */
  async runFullMatching(options: {
    scoreMin?: number;
    bienIds?: string[];        // Si fourni, ne matcher que ces biens
    acquereurIds?: string[];   // Si fourni, ne matcher que ces acquéreurs
    dryRun?: boolean;          // Si true, ne persiste pas
  } = {}): Promise<{
    totalBiens: number;
    totalAcquereurs: number;
    nouveauxMatchs: number;
    matchsMisAJour: number;
    topMatchs: Array<{ acquereurNom: string; bienRef: string; score: number }>;
  }> {
    const { scoreMin = 40, bienIds, acquereurIds, dryRun = false } = options;

    // 1. Récupérer les biens Amanda disponibles
    const biens = await prisma.amandaBien.findMany({
      where: {
        ...(bienIds ? { id: { in: bienIds } } : {}),
        statut: { in: ['DISPONIBLE', 'OFFRE_EN_COURS'] },
        typeBien: { not: null },
        codePostal: { not: null },
      },
    });

    // 2. Récupérer les acquéreurs actifs avec leurs localisations
    const acquereurs = await prisma.acquereur.findMany({
      where: {
        statutActif: true,
        ...(acquereurIds ? { id: { in: acquereurIds } } : {}),
      },
      include: {
        localisationsRecherche: true,
      },
    });

    let nouveauxMatchs = 0;
    let matchsMisAJour = 0;
    const topMatchs: Array<{ acquereurNom: string; bienRef: string; score: number }> = [];

    // 3. Pour chaque bien, calculer le score avec chaque acquéreur
    for (const amandaBien of biens) {
      const bien = this.amandaBienToNormalise(amandaBien);

      for (const acquereur of acquereurs) {
        const resultat = this.calculateMatch(bien, acquereur);

        if (resultat.scoreTotal < scoreMin) continue;

        // Persister le résultat
        if (!dryRun) {
          const { isNew } = await this.upsertMatch(acquereur.id, bien, resultat);
          if (isNew) nouveauxMatchs++;
          else matchsMisAJour++;
        } else {
          nouveauxMatchs++;
        }

        topMatchs.push({
          acquereurNom: `${acquereur.prenom} ${acquereur.nom}`,
          bienRef: bien.mandateRef,
          score: resultat.scoreTotal,
        });
      }
    }

    // Trier les top matchs par score décroissant
    topMatchs.sort((a, b) => b.score - a.score);

    return {
      totalBiens: biens.length,
      totalAcquereurs: acquereurs.length,
      nouveauxMatchs,
      matchsMisAJour,
      topMatchs: topMatchs.slice(0, 50),
    };
  }

  /**
   * Trouve les acquéreurs intéressés par un bien Amanda
   */
  async findAcquereursForBien(
    bienId: string,
    options: { limit?: number; scoreMin?: number } = {}
  ): Promise<Array<{ acquereur: any; scoreTotal: number; scoreDetails: ScoreDetails; pointsForts: string[]; pointsFaibles: string[] }>> {
    const { limit = 20, scoreMin = 40 } = options;

    const amandaBien = await prisma.amandaBien.findUnique({ where: { id: bienId } });
    if (!amandaBien) throw new Error(`Bien Amanda ${bienId} non trouvé`);

    const bien = this.amandaBienToNormalise(amandaBien);

    const acquereurs = await prisma.acquereur.findMany({
      where: { statutActif: true },
      include: { localisationsRecherche: true },
    });

    const resultats: Array<{ acquereur: any; scoreTotal: number; scoreDetails: ScoreDetails; pointsForts: string[]; pointsFaibles: string[] }> = [];

    for (const acquereur of acquereurs) {
      const resultat = this.calculateMatch(bien, acquereur);
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push({
          acquereur,
          scoreTotal: resultat.scoreTotal,
          scoreDetails: resultat.scoreDetails,
          pointsForts: resultat.pointsForts,
          pointsFaibles: resultat.pointsFaibles,
        });
      }
    }

    return resultats
      .sort((a, b) => b.scoreTotal - a.scoreTotal)
      .slice(0, limit);
  }

  /**
   * Trouve les meilleurs biens Amanda pour un acquéreur
   */
  async findBiensForAcquereur(
    acquereurId: string,
    options: { limit?: number; scoreMin?: number } = {}
  ): Promise<ResultatMatch[]> {
    const { limit = 50, scoreMin = 40 } = options;

    const acquereur = await prisma.acquereur.findUnique({
      where: { id: acquereurId },
      include: { localisationsRecherche: true },
    });

    if (!acquereur) throw new Error('Acquéreur non trouvé');

    // Pré-filtrage par code postal pour performance
    const codesPostaux = acquereur.localisationsRecherche
      .filter((loc) => loc.type === 'CODE_POSTAL')
      .map((loc) => loc.valeur);

    const villes = acquereur.localisationsRecherche
      .filter((loc) => loc.type === 'VILLE')
      .map((loc) => loc.valeur.toLowerCase());

    const amandaBiens = await prisma.amandaBien.findMany({
      where: {
        statut: { in: ['DISPONIBLE', 'OFFRE_EN_COURS'] },
        typeBien: { not: null },
        OR: [
          ...(codesPostaux.length > 0 ? [{ codePostal: { in: codesPostaux } }] : []),
          ...(villes.length > 0 ? [{ ville: { in: villes.map(v => v.charAt(0).toUpperCase() + v.slice(1)) } }] : []),
        ].length > 0 ? [
          ...(codesPostaux.length > 0 ? [{ codePostal: { in: codesPostaux } }] : []),
          ...(villes.length > 0 ? [{ ville: { in: villes.map(v => v.charAt(0).toUpperCase() + v.slice(1)) } }] : []),
        ] : [{}],
      },
      take: 1000,
    });

    const resultats: ResultatMatch[] = [];

    for (const amandaBien of amandaBiens) {
      const bien = this.amandaBienToNormalise(amandaBien);
      const resultat = this.calculateMatch(bien, acquereur);
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push(resultat);
      }
    }

    return resultats
      .sort((a, b) => b.scoreTotal - a.scoreTotal)
      .slice(0, limit);
  }

  // ============================================================================
  // Algorithme de scoring (100 points)
  // ============================================================================

  private calculateMatch(bien: BienNormalise, acquereur: any): ResultatMatch {
    const scores: ScoreDetails = {
      budget: 0,
      typeBien: 0,
      localisation: 0,
      surface: 0,
      pieces: 0,
      dpe: 0,
      equipements: 0,
    };

    const pointsForts: string[] = [];
    const pointsFaibles: string[] = [];

    // ======================================================================
    // 1. BUDGET (30 points) — ÉLIMINATOIRE si au-dessus du max
    // ======================================================================
    if (bien.prix && acquereur.budgetMax) {
      if (bien.prix > acquereur.budgetMax) {
        const depassement = Math.round(((bien.prix - acquereur.budgetMax) / acquereur.budgetMax) * 100);
        if (depassement > 15) {
          // Trop au-dessus = éliminatoire
          return this.eliminatoire(bien, scores, `Prix ${this.formatPrix(bien.prix)} dépasse le budget de ${depassement}%`);
        }
        // Légèrement au-dessus (≤15%) = pénalité
        scores.budget = 5;
        pointsFaibles.push(`Prix ${this.formatPrix(bien.prix)} > budget max ${this.formatPrix(acquereur.budgetMax)} (+${depassement}%)`);
      } else {
        const pourcentage = bien.prix / acquereur.budgetMax;
        if (acquereur.budgetMin && bien.prix < acquereur.budgetMin) {
          scores.budget = 10;
          pointsFaibles.push(`Prix ${this.formatPrix(bien.prix)} < budget min ${this.formatPrix(acquereur.budgetMin)}`);
        } else if (pourcentage <= 0.75) {
          scores.budget = 30;
          pointsForts.push(`Excellent prix : ${this.formatPrix(bien.prix)} (${Math.round(pourcentage * 100)}% du budget)`);
        } else if (pourcentage <= 0.90) {
          scores.budget = 25;
          pointsForts.push(`Bon prix : ${this.formatPrix(bien.prix)}`);
        } else {
          scores.budget = 20;
          pointsForts.push(`Prix dans le budget : ${this.formatPrix(bien.prix)}`);
        }
      }
    } else {
      scores.budget = 15; // Pas de prix connu
    }

    // ======================================================================
    // 2. TYPE DE BIEN (20 points) — ÉLIMINATOIRE
    // ======================================================================
    if (!bien.typeBien) {
      scores.typeBien = 5; // Type inconnu, pas éliminatoire
    } else if (acquereur.typeBienRecherche && acquereur.typeBienRecherche.length > 0) {
      if (acquereur.typeBienRecherche.includes(bien.typeBien)) {
        scores.typeBien = 20;
      } else {
        return this.eliminatoire(bien, scores, `Type ${bien.typeBien} non recherché (cherche: ${acquereur.typeBienRecherche.join(', ')})`);
      }
    } else {
      scores.typeBien = 10; // Pas de préférence de type
    }

    // ======================================================================
    // 3. LOCALISATION (20 points) — ÉLIMINATOIRE
    // ======================================================================
    const localisations = acquereur.localisationsRecherche || [];
    let matchLoc = false;

    // Match par code postal
    if (bien.codePostal) {
      const locCP = localisations.find(
        (loc: any) => loc.type === 'CODE_POSTAL' && loc.valeur === bien.codePostal
      );
      if (locCP) {
        scores.localisation = locCP.priorite === 1 ? 20 : 15;
        pointsForts.push(`Localisation ${bien.codePostal}${bien.ville ? ` (${bien.ville})` : ''}`);
        matchLoc = true;
      }
    }

    // Match par ville
    if (!matchLoc && bien.ville) {
      const locVille = localisations.find(
        (loc: any) => loc.type === 'VILLE' && loc.valeur.toLowerCase() === bien.ville!.toLowerCase()
      );
      if (locVille) {
        scores.localisation = locVille.priorite === 1 ? 20 : 15;
        pointsForts.push(`Ville ${bien.ville}`);
        matchLoc = true;
      }
    }

    // Match par département (2 premiers chiffres du CP)
    if (!matchLoc && bien.codePostal) {
      const dept = bien.codePostal.substring(0, 2);
      const locDept = localisations.find(
        (loc: any) => loc.valeur.startsWith(dept)
      );
      if (locDept) {
        scores.localisation = 8; // Match département = partiel
        pointsForts.push(`Même département ${dept}`);
        matchLoc = true;
      }
    }

    if (!matchLoc && localisations.length > 0) {
      return this.eliminatoire(bien, scores, `Localisation ${bien.codePostal || bien.ville} non recherchée`);
    } else if (!matchLoc) {
      scores.localisation = 10; // Pas de préférence de localisation
    }

    // ======================================================================
    // 4. SURFACE (10 points)
    // ======================================================================
    if (bien.surface > 0) {
      if (acquereur.surfaceMin && bien.surface < acquereur.surfaceMin) {
        const deficit = Math.round(((acquereur.surfaceMin - bien.surface) / acquereur.surfaceMin) * 100);
        if (deficit > 30) {
          pointsFaibles.push(`Surface ${bien.surface}m² très insuffisante (min ${acquereur.surfaceMin}m²)`);
        } else {
          scores.surface = 3;
          pointsFaibles.push(`Surface ${bien.surface}m² < min ${acquereur.surfaceMin}m²`);
        }
      } else if (acquereur.surfaceMax && bien.surface > acquereur.surfaceMax) {
        scores.surface = 5;
        pointsFaibles.push(`Surface ${bien.surface}m² > max ${acquereur.surfaceMax}m²`);
      } else {
        scores.surface = 10;
        pointsForts.push(`Surface ${bien.surface}m²`);
      }
    } else {
      scores.surface = 5; // Surface inconnue
    }

    // ======================================================================
    // 5. PIÈCES / CHAMBRES (10 points)
    // ======================================================================
    let scorePieces = 0;

    // Chambres (prioritaire sur pièces)
    if (bien.chambres > 0 && acquereur.chambresMin) {
      if (bien.chambres >= acquereur.chambresMin) {
        scorePieces = 7;
        pointsForts.push(`${bien.chambres} chambres`);
      } else {
        pointsFaibles.push(`${bien.chambres} ch. < min ${acquereur.chambresMin}`);
      }
    }

    // Pièces
    if (bien.pieces > 0) {
      if (acquereur.piecesMin && bien.pieces < acquereur.piecesMin) {
        pointsFaibles.push(`${bien.pieces} pièces < min ${acquereur.piecesMin}`);
      } else if (acquereur.piecesMax && bien.pieces > acquereur.piecesMax) {
        scores.pieces = Math.max(scorePieces, 5);
      } else if (acquereur.piecesMin && bien.pieces >= acquereur.piecesMin) {
        scores.pieces = Math.max(scorePieces, 10);
        if (scorePieces === 0) pointsForts.push(`${bien.pieces} pièces`);
      } else {
        scores.pieces = Math.max(scorePieces, 5);
      }
    } else {
      scores.pieces = Math.max(scorePieces, 5);
    }

    // ======================================================================
    // 6. DPE (5 points)
    // ======================================================================
    if (bien.etiquetteDpe && acquereur.dpeMax) {
      const dpeValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const indexBien = dpeValues.indexOf(bien.etiquetteDpe);
      const indexMax = dpeValues.indexOf(acquereur.dpeMax);

      if (indexBien >= 0 && indexMax >= 0) {
        if (indexBien <= indexMax) {
          scores.dpe = indexBien <= 2 ? 5 : 3;
          pointsForts.push(`DPE ${bien.etiquetteDpe}`);
        } else {
          pointsFaibles.push(`DPE ${bien.etiquetteDpe} > max accepté ${acquereur.dpeMax}`);
        }
      }
    } else if (bien.etiquetteDpe) {
      const idx = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].indexOf(bien.etiquetteDpe);
      scores.dpe = idx <= 2 ? 5 : idx <= 4 ? 3 : 1;
    }

    // ======================================================================
    // 7. ÉQUIPEMENTS SPÉCIFIQUES (5 points)
    // ======================================================================
    let scoreEquip = 0;
    const equipDemandes: string[] = [];
    const equipPresents: string[] = [];

    if (bien.typeBien === 'MAISON') {
      if (acquereur.terrainMin && bien.surfaceTerrain) {
        if (bien.surfaceTerrain >= acquereur.terrainMin) {
          scoreEquip += 1.5;
          pointsForts.push(`Terrain ${bien.surfaceTerrain}m²`);
        } else {
          pointsFaibles.push(`Terrain ${bien.surfaceTerrain}m² < min ${acquereur.terrainMin}m²`);
        }
      }
      if (acquereur.avecGarage) { equipDemandes.push('garage'); if (bien.avecGarage) { scoreEquip += 1; equipPresents.push('garage'); } }
      if (acquereur.avecJardin) { equipDemandes.push('jardin'); if (bien.avecJardin) { scoreEquip += 1; equipPresents.push('jardin'); } }
      if (acquereur.avecPiscine) { equipDemandes.push('piscine'); if (bien.avecPiscine) { scoreEquip += 1.5; equipPresents.push('piscine'); } }
    }

    if (bien.typeBien === 'APPARTEMENT') {
      if (acquereur.avecAscenseur) {
        equipDemandes.push('ascenseur');
        if (bien.avecAscenseur) { scoreEquip += 1.5; equipPresents.push('ascenseur'); }
        else if (bien.etage && bien.etage > 2) {
          pointsFaibles.push(`Étage ${bien.etage} sans ascenseur`);
        }
      }
      if (acquereur.avecBalcon) { equipDemandes.push('balcon'); if (bien.avecBalcon) { scoreEquip += 1; equipPresents.push('balcon'); } }
      if (acquereur.avecTerrasse) { equipDemandes.push('terrasse'); if (bien.avecTerrasse) { scoreEquip += 1.5; equipPresents.push('terrasse'); } }
      if (acquereur.avecParking) { equipDemandes.push('parking'); if (bien.avecParking) { scoreEquip += 1; equipPresents.push('parking'); } }

      // Copropriété trop grande
      if (acquereur.tailleCoproMax && bien.estCopropriete && bien.nbLotsCopro && bien.nbLotsCopro > acquereur.tailleCoproMax) {
        pointsFaibles.push(`Copro ${bien.nbLotsCopro} lots > max ${acquereur.tailleCoproMax}`);
      }
    }

    scores.equipements = Math.min(scoreEquip, 5);
    if (equipPresents.length > 0) pointsForts.push(`Équipements : ${equipPresents.join(', ')}`);
    const equipManquants = equipDemandes.filter(e => !equipPresents.includes(e));
    if (equipManquants.length > 0) pointsFaibles.push(`Manque : ${equipManquants.join(', ')}`);

    // ======================================================================
    // SCORE TOTAL
    // ======================================================================
    const scoreTotal = Math.round(
      scores.budget + scores.typeBien + scores.localisation +
      scores.surface + scores.pieces + scores.dpe + scores.equipements
    );

    return {
      bien,
      scoreTotal,
      scoreDetails: scores,
      pointsForts,
      pointsFaibles,
    };
  }

  // ============================================================================
  // Persistance
  // ============================================================================

  /**
   * Crée ou met à jour un match dans match_acquereur_amanda
   */
  private async upsertMatch(
    acquereurId: string,
    bien: BienNormalise,
    resultat: ResultatMatch
  ): Promise<{ isNew: boolean }> {
    const existing = await prisma.matchAcquereurAmanda.findUnique({
      where: { acquereurId_bienId: { acquereurId, bienId: bien.id } },
    });

    const data = {
      scoreTotal: resultat.scoreTotal,
      scoreBudget: resultat.scoreDetails.budget,
      scoreType: resultat.scoreDetails.typeBien,
      scoreLocalisation: resultat.scoreDetails.localisation,
      scoreSurface: resultat.scoreDetails.surface,
      scorePieces: resultat.scoreDetails.pieces,
      scoreDpe: resultat.scoreDetails.dpe,
      scoreEquipements: resultat.scoreDetails.equipements,
      scoreDetails: {
        pointsForts: resultat.pointsForts,
        pointsFaibles: resultat.pointsFaibles,
      },
    };

    if (existing) {
      await prisma.matchAcquereurAmanda.update({
        where: { id: existing.id },
        data,
      });
      return { isNew: false };
    }

    await prisma.matchAcquereurAmanda.create({
      data: {
        acquereurId,
        bienId: bien.id,
        ...data,
        statut: 'NOUVEAU',
      },
    });
    return { isNew: true };
  }

  /**
   * Récupère les matchs > seuil non encore notifiés sur Slack
   */
  async getMatchsANotifier(scoreMin: number = 70): Promise<Array<{
    id: string;
    acquereur: { nom: string; prenom: string; telephone: string; email: string };
    bien: { mandateRef: string; ville: string | null; prix: number | null; typeBien: string | null; surfaceHabitable: number | null };
    scoreTotal: number;
    scoreDetails: any;
  }>> {
    const matchs = await prisma.matchAcquereurAmanda.findMany({
      where: {
        scoreTotal: { gte: scoreMin },
        slackNotifie: false,
        statut: 'NOUVEAU',
      },
      include: {
        acquereur: true,
        bien: true,
      },
      orderBy: { scoreTotal: 'desc' },
      take: 100,
    });

    return matchs.map(m => ({
      id: m.id,
      acquereur: {
        nom: m.acquereur.nom,
        prenom: m.acquereur.prenom,
        telephone: m.acquereur.telephone || '',
        email: m.acquereur.email,
      },
      bien: {
        mandateRef: m.bien.mandateRef,
        ville: m.bien.ville,
        prix: m.bien.prix,
        typeBien: m.bien.typeBien,
        surfaceHabitable: m.bien.surfaceHabitable,
      },
      scoreTotal: m.scoreTotal,
      scoreDetails: m.scoreDetails,
    }));
  }

  /**
   * Marque des matchs comme notifiés sur Slack
   */
  async markAsSlackNotified(matchIds: string[]): Promise<void> {
    await prisma.matchAcquereurAmanda.updateMany({
      where: { id: { in: matchIds } },
      data: {
        slackNotifie: true,
        statut: 'NOTIFIE',
        dateNotification: new Date(),
      },
    });
  }

  // ============================================================================
  // Conversions
  // ============================================================================

  /**
   * Convertit un AmandaBien Prisma en format normalisé pour le scoring
   */
  private amandaBienToNormalise(ab: any): BienNormalise {
    return {
      id: ab.id,
      typeBien: ab.typeBien,
      surface: ab.surfaceHabitable || ab.surfaceCarrez || 0,
      pieces: ab.nbPieces || 0,
      chambres: ab.nbChambres || 0,
      codePostal: ab.codePostal || '',
      ville: ab.ville,
      prix: ab.prix,
      etiquetteDpe: ab.dpeClasse,
      etiquetteGes: ab.gesClasse,
      surfaceTerrain: ab.surfaceTerrain,
      etage: ab.etage,
      anneConstruction: ab.anneConstruction,
      etatGeneral: ab.etatGeneral,
      avecAscenseur: ab.avecAscenseur || false,
      avecBalcon: ab.avecBalcon || false,
      avecTerrasse: ab.avecTerrasse || false,
      avecParking: ab.avecParking || false,
      avecGarage: ab.avecGarage || false,
      avecJardin: ab.avecJardin || false,
      avecPiscine: ab.avecPiscine || false,
      avecCave: ab.avecCave || false,
      estCopropriete: ab.estCopropriete || false,
      nbLotsCopro: ab.nbLotsCopro,
      mandateRef: ab.mandateRef,
      mondayItemId: ab.mondayItemId,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private eliminatoire(bien: BienNormalise, scores: ScoreDetails, raison: string): ResultatMatch {
    return {
      bien,
      scoreTotal: 0,
      scoreDetails: scores,
      pointsForts: [],
      pointsFaibles: [raison],
    };
  }

  private formatPrix(prix: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix);
  }
}

export const matchingAcquereurService = new MatchingAcquereurService();
