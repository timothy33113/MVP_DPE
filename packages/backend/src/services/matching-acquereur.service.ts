/**
 * Service de matching entre biens et acquéreurs
 * Algorithme de scoring pour proposer les biens les plus pertinents
 */

import { PrismaClient, TypeBatiment, EtiquetteDpe, NiveauTravaux } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

interface Bien {
  id: string;
  typeBien: TypeBatiment;
  surface: number;
  pieces: number;
  codePostal: string;
  prix?: number;
  etiquetteDpe?: EtiquetteDpe;
  etiquetteGes?: EtiquetteDpe;
  anneConstruction?: number;

  // Champs spécifiques selon le type
  surfaceTerrain?: number;      // Maison
  etage?: number;               // Appartement
  ascenseur?: boolean;          // Appartement
  balcon?: boolean;
  terrasse?: boolean;
  parking?: boolean;
  garage?: boolean;

  // Source
  source: 'leboncoin' | 'dpe';  // D'où vient le bien
  annonceId?: string;
  dpeId?: string;
}

interface CriteresAcquereur {
  budgetMin?: number;
  budgetMax: number;
  typeBienRecherche: TypeBatiment[];
  surfaceMin?: number;
  surfaceMax?: number;
  piecesMin?: number;
  piecesMax?: number;
  chambresMin?: number;
  localisations: Array<{
    type: string;
    valeur: string;
  }>;
  dpeMax?: EtiquetteDpe;
  niveauTravauxAccepte: NiveauTravaux;

  // Maison
  terrainMin?: number;
  avecJardin?: boolean;
  avecGarage?: boolean;

  // Appartement
  etageMin?: number;
  etageMax?: number;
  avecAscenseur?: boolean;
  avecBalcon?: boolean;
  avecTerrasse?: boolean;
  avecParking?: boolean;
}

interface ResultatMatch {
  bien: Bien;
  scoreTotal: number;
  scoreDetails: {
    budget: number;
    typeBien: number;
    localisation: number;
    surface: number;
    pieces: number;
    dpe: number;
    travaux: number;
    specifiques: number;
  };
  pointsForts: string[];
  pointsFaibles: string[];
}

// ============================================================================
// Algorithme de matching
// ============================================================================

export class MatchingAcquereurService {

  /**
   * Trouve les acquéreurs intéressés par un bien (fonction inverse)
   */
  async findAcquereursForBien(
    bien: Bien,
    options: {
      limit?: number;
      scoreMin?: number;
    } = {}
  ): Promise<Array<{ acquereur: any; scoreTotal: number; pointsForts: string[]; pointsFaibles: string[] }>> {
    const { limit = 10, scoreMin = 50 } = options;

    // 1. Récupérer tous les acquéreurs actifs
    const acquereurs = await prisma.acquereur.findMany({
      where: {
        statutActif: true,
      },
      include: {
        localisationsRecherche: true,
      },
    });

    // 2. Calculer le score pour chaque acquéreur
    const resultats: Array<{ acquereur: any; scoreTotal: number; pointsForts: string[]; pointsFaibles: string[] }> = [];

    for (const acquereur of acquereurs) {
      const resultat = this.calculateMatch(bien, acquereur);

      // Ne garder que les matchs au-dessus du seuil
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push({
          acquereur,
          scoreTotal: resultat.scoreTotal,
          pointsForts: resultat.pointsForts,
          pointsFaibles: resultat.pointsFaibles,
        });
      }
    }

    // 3. Trier par score décroissant et limiter
    return resultats
      .sort((a, b) => b.scoreTotal - a.scoreTotal)
      .slice(0, limit);
  }

  /**
   * Trouve les meilleurs biens pour un acquéreur
   */
  async findBiensForAcquereur(
    acquereurId: string,
    options: {
      limit?: number;
      scoreMin?: number;
      source?: 'leboncoin' | 'dpe' | 'both';
    } = {}
  ): Promise<ResultatMatch[]> {
    const { limit = 50, scoreMin = 50, source = 'both' } = options;

    // 1. Récupérer l'acquéreur et ses critères
    const acquereur = await prisma.acquereur.findUnique({
      where: { id: acquereurId },
      include: {
        localisationsRecherche: true,
      },
    });

    if (!acquereur) {
      throw new Error('Acquéreur non trouvé');
    }

    // 2. Récupérer les biens potentiels
    const biens = await this.getBiensPotentiels(acquereur, source);

    // 3. Calculer le score pour chaque bien
    const resultats: ResultatMatch[] = [];

    for (const bien of biens) {
      const resultat = this.calculateMatch(bien, acquereur);

      // Ne garder que les matchs au-dessus du seuil
      if (resultat.scoreTotal >= scoreMin) {
        resultats.push(resultat);
      }
    }

    // 4. Trier par score décroissant et limiter
    return resultats
      .sort((a, b) => b.scoreTotal - a.scoreTotal)
      .slice(0, limit);
  }

  /**
   * Récupère les biens potentiels selon la source
   */
  private async getBiensPotentiels(
    acquereur: any,
    source: 'leboncoin' | 'dpe' | 'both'
  ): Promise<Bien[]> {
    const biens: Bien[] = [];

    // Codes postaux recherchés
    const codesPostaux = acquereur.localisationsRecherche
      .filter((loc: any) => loc.type === 'CODE_POSTAL')
      .map((loc: any) => loc.valeur);

    // Récupérer depuis Le Bon Coin
    if (source === 'leboncoin' || source === 'both') {
      const annonces = await prisma.leboncoinAnnonce.findMany({
        where: {
          codePostal: { in: codesPostaux },
          typeBien: { in: acquereur.typeBienRecherche },
        },
        take: 500, // Limite pour performance
      });

      biens.push(...annonces.map(a => this.annonceToWell(a)));
    }

    // Récupérer depuis vos DPE (biens en portefeuille)
    if (source === 'dpe' || source === 'both') {
      const dpes = await prisma.dpeRecord.findMany({
        where: {
          codePostalBan: { in: codesPostaux },
          typeBatiment: { in: acquereur.typeBienRecherche },
        },
        take: 500,
      });

      biens.push(...dpes.map(d => this.dpeToWell(d)));
    }

    return biens;
  }

  /**
   * Calcule le score de match entre un bien et un acquéreur
   */
  private calculateMatch(bien: Bien, acquereur: any): ResultatMatch {
    const scores = {
      budget: 0,
      typeBien: 0,
      localisation: 0,
      surface: 0,
      pieces: 0,
      dpe: 0,
      travaux: 0,
      specifiques: 0,
    };

    const pointsForts: string[] = [];
    const pointsFaibles: string[] = [];

    // ========================================================================
    // 1. BUDGET (30 points max) - ÉLIMINATOIRE
    // ========================================================================
    if (bien.prix) {
      if (bien.prix > acquereur.budgetMax) {
        // Au-dessus du budget = 0 points
        pointsFaibles.push(`Prix ${bien.prix}€ > budget max ${acquereur.budgetMax}€`);
        scores.budget = 0;
      } else if (bien.prix < (acquereur.budgetMin || 0)) {
        // En-dessous du budget min = suspect
        scores.budget = 10;
        pointsFaibles.push(`Prix ${bien.prix}€ < budget min ${acquereur.budgetMin}€`);
      } else {
        // Dans le budget
        const pourcentageBudget = bien.prix / acquereur.budgetMax;
        if (pourcentageBudget <= 0.8) {
          scores.budget = 30; // Très bon prix
          pointsForts.push(`Prix excellent : ${bien.prix}€ (${Math.round(pourcentageBudget * 100)}% du budget)`);
        } else if (pourcentageBudget <= 0.95) {
          scores.budget = 25; // Bon prix
          pointsForts.push(`Bon prix : ${bien.prix}€`);
        } else {
          scores.budget = 20; // Prix limite
        }
      }
    } else {
      scores.budget = 15; // Pas de prix = moyen
    }

    // ========================================================================
    // 2. TYPE DE BIEN (20 points max) - ÉLIMINATOIRE
    // ========================================================================
    if (acquereur.typeBienRecherche.includes(bien.typeBien)) {
      scores.typeBien = 20;
      pointsForts.push(`Type de bien : ${bien.typeBien}`);
    } else {
      return {
        bien,
        scoreTotal: 0,
        scoreDetails: scores,
        pointsForts: [],
        pointsFaibles: ['Type de bien non recherché'],
      };
    }

    // ========================================================================
    // 3. LOCALISATION (20 points max) - ÉLIMINATOIRE
    // ========================================================================
    const matchLocalisation = acquereur.localisationsRecherche.find(
      (loc: any) => loc.valeur === bien.codePostal
    );

    if (matchLocalisation) {
      scores.localisation = matchLocalisation.priorite === 1 ? 20 : 15;
      pointsForts.push(`Localisation ${bien.codePostal}`);
    } else {
      return {
        bien,
        scoreTotal: 0,
        scoreDetails: scores,
        pointsForts: [],
        pointsFaibles: ['Localisation non recherchée'],
      };
    }

    // ========================================================================
    // 4. SURFACE (10 points max)
    // ========================================================================
    if (acquereur.surfaceMin && bien.surface < acquereur.surfaceMin) {
      pointsFaibles.push(`Surface ${bien.surface}m² < min ${acquereur.surfaceMin}m²`);
    } else if (acquereur.surfaceMax && bien.surface > acquereur.surfaceMax) {
      pointsFaibles.push(`Surface ${bien.surface}m² > max ${acquereur.surfaceMax}m²`);
    } else if (acquereur.surfaceMin && bien.surface >= acquereur.surfaceMin) {
      scores.surface = 10;
      pointsForts.push(`Surface ${bien.surface}m²`);
    } else {
      scores.surface = 5;
    }

    // ========================================================================
    // 5. NOMBRE DE PIÈCES (10 points max)
    // ========================================================================
    if (acquereur.piecesMin && bien.pieces < acquereur.piecesMin) {
      pointsFaibles.push(`${bien.pieces} pièces < min ${acquereur.piecesMin}`);
    } else if (acquereur.piecesMax && bien.pieces > acquereur.piecesMax) {
      pointsFaibles.push(`${bien.pieces} pièces > max ${acquereur.piecesMax}`);
    } else if (acquereur.piecesMin && bien.pieces >= acquereur.piecesMin) {
      scores.pieces = 10;
      pointsForts.push(`${bien.pieces} pièces`);
    } else {
      scores.pieces = 5;
    }

    // ========================================================================
    // 6. DPE/GES (5 points max)
    // ========================================================================
    if (bien.etiquetteDpe && acquereur.dpeMax) {
      const dpeValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const indexBien = dpeValues.indexOf(bien.etiquetteDpe);
      const indexMax = dpeValues.indexOf(acquereur.dpeMax);

      if (indexBien <= indexMax) {
        if (indexBien <= 2) {
          scores.dpe = 5; // A, B, C = excellent
          pointsForts.push(`DPE ${bien.etiquetteDpe} (excellent)`);
        } else {
          scores.dpe = 3;
          pointsForts.push(`DPE ${bien.etiquetteDpe}`);
        }
      } else {
        pointsFaibles.push(`DPE ${bien.etiquetteDpe} > max ${acquereur.dpeMax}`);
      }
    }

    // ========================================================================
    // 7. CRITÈRES SPÉCIFIQUES MAISON (5 points max)
    // ========================================================================
    if (bien.typeBien === 'MAISON') {
      if (acquereur.terrainMin && bien.surfaceTerrain) {
        if (bien.surfaceTerrain >= acquereur.terrainMin) {
          scores.specifiques += 3;
          pointsForts.push(`Terrain ${bien.surfaceTerrain}m²`);
        } else {
          pointsFaibles.push(`Terrain ${bien.surfaceTerrain}m² < min ${acquereur.terrainMin}m²`);
        }
      }

      if (acquereur.avecGarage && bien.garage) {
        scores.specifiques += 2;
        pointsForts.push('Avec garage');
      }
    }

    // ========================================================================
    // 8. CRITÈRES SPÉCIFIQUES APPARTEMENT (5 points max)
    // ========================================================================
    if (bien.typeBien === 'APPARTEMENT') {
      if (acquereur.avecAscenseur && bien.ascenseur) {
        scores.specifiques += 2;
        pointsForts.push('Avec ascenseur');
      } else if (acquereur.avecAscenseur && !bien.ascenseur && bien.etage && bien.etage > 2) {
        pointsFaibles.push(`Étage ${bien.etage} sans ascenseur`);
      }

      if (acquereur.avecBalcon && bien.balcon) {
        scores.specifiques += 1;
        pointsForts.push('Avec balcon');
      }

      if (acquereur.avecTerrasse && bien.terrasse) {
        scores.specifiques += 2;
        pointsForts.push('Avec terrasse');
      }
    }

    // ========================================================================
    // CALCUL SCORE TOTAL (sur 100)
    // ========================================================================
    const scoreTotal = Object.values(scores).reduce((sum, val) => sum + val, 0);

    return {
      bien,
      scoreTotal,
      scoreDetails: scores,
      pointsForts,
      pointsFaibles,
    };
  }

  /**
   * Convertit une annonce Le Bon Coin en format Bien
   */
  private annonceToWell(annonce: any): Bien {
    const rawData = annonce.rawData as any;

    return {
      id: annonce.id,
      typeBien: annonce.typeBien,
      surface: annonce.surface || 0,
      pieces: annonce.pieces || 0,
      codePostal: annonce.codePostal,
      prix: rawData?.price?.[0],
      etiquetteDpe: annonce.etiquetteDpe,
      etiquetteGes: annonce.etiquetteGes,
      anneConstruction: rawData?.attributes?.find((a: any) => a.key === 'building_year')?.value,

      // Extraction attributs spécifiques
      surfaceTerrain: this.extractTerrain(rawData),
      etage: this.extractEtage(rawData),
      ascenseur: this.extractAscenseur(rawData),
      balcon: this.extractBalcon(rawData),
      terrasse: this.extractTerrasse(rawData),
      parking: this.extractParking(rawData),
      garage: this.extractGarage(rawData),

      source: 'leboncoin',
      annonceId: annonce.id,
    };
  }

  /**
   * Convertit un DPE en format Bien
   */
  private dpeToWell(dpe: any): Bien {
    return {
      id: dpe.id,
      typeBien: dpe.typeBatiment,
      surface: dpe.surfaceHabitable,
      pieces: dpe.rawData?.nombre_niveau || 0,
      codePostal: dpe.codePostalBan,
      etiquetteDpe: dpe.etiquetteDpe,
      etiquetteGes: dpe.etiquetteGes,
      anneConstruction: dpe.anneConstruction,
      surfaceTerrain: dpe.surfaceTerrain,

      source: 'dpe',
      dpeId: dpe.id,
    };
  }

  // Méthodes d'extraction depuis rawData Le Bon Coin
  private extractTerrain(rawData: any): number | undefined {
    return rawData?.attributes?.find((a: any) => a.key === 'land_plot_area')?.value;
  }

  private extractEtage(rawData: any): number | undefined {
    return rawData?.attributes?.find((a: any) => a.key === 'floor_number')?.value;
  }

  private extractAscenseur(rawData: any): boolean {
    return rawData?.attributes?.find((a: any) => a.key === 'elevator')?.value === '1';
  }

  private extractBalcon(rawData: any): boolean {
    const outside = rawData?.attributes?.find((a: any) => a.key === 'outside_access')?.values || [];
    return outside.includes('balcony');
  }

  private extractTerrasse(rawData: any): boolean {
    const outside = rawData?.attributes?.find((a: any) => a.key === 'outside_access')?.values || [];
    return outside.includes('terrace');
  }

  private extractParking(rawData: any): boolean {
    const nbParking = rawData?.attributes?.find((a: any) => a.key === 'nb_parkings')?.value;
    return nbParking && parseInt(nbParking) > 0;
  }

  private extractGarage(rawData: any): boolean {
    const specs = rawData?.attributes?.find((a: any) => a.key === 'specificities')?.values || [];
    return specs.includes('with_garage_or_parking_spot');
  }
}

export const matchingAcquereurService = new MatchingAcquereurService();
