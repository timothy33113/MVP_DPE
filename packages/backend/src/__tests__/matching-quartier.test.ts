/**
 * Tests pour le bonus quartier dans le matching
 */

import { matchingService } from '../modules/matching/matching.service';
import { DpeRecord, LeboncoinAnnonce, TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

describe('Matching - Bonus Quartier', () => {
  const baseAnnonce: LeboncoinAnnonce = {
    id: 'test-annonce-1',
    listId: BigInt(123456),
    url: 'https://test.com',
    codePostal: '64000',
    typeBien: TypeBatiment.APPARTEMENT,
    surface: 60,
    pieces: 3,
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    datePublication: new Date('2025-01-15'),
    lat: null,
    lng: null,
    anneConstruction: null,
    rawData: {
      location: {
        district: 'Centre-ville',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseDpe: DpeRecord = {
    id: 'test-dpe-1',
    numeroDpe: 'DPE123456',
    codePostalBan: '64000',
    typeBatiment: TypeBatiment.APPARTEMENT,
    surfaceHabitable: 60,
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    dateEtablissement: new Date('2025-01-10'),
    coordonneeX: -0.3700, // lng
    coordonneeY: 43.2985, // lat - Centre-ville Pau
    anneConstruction: null,
    rawData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should give quartier bonus when annonce and DPE are in same quartier', async () => {
    const result = await matchingService.matchAnnonceToDpes(baseAnnonce, [baseDpe], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    expect(result.candidats.length).toBe(1);
    const candidat = result.candidats[0];

    // Vérifier que le bonus quartier est attribué
    expect(candidat.scoreDetails.bonus.quartier).toBe(5);
    expect(candidat.scoreBonus).toBeGreaterThanOrEqual(5);
  });

  it('should NOT give quartier bonus when quartiers are different', async () => {
    const dpeAutreQuartier: DpeRecord = {
      ...baseDpe,
      id: 'test-dpe-2',
      coordonneeX: -0.3525, // lng
      coordonneeY: 43.2925, // lat - Dufau-Tourasse
    };

    const result = await matchingService.matchAnnonceToDpes(baseAnnonce, [dpeAutreQuartier], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    expect(result.candidats.length).toBe(1);
    const candidat = result.candidats[0];

    // Pas de bonus quartier
    expect(candidat.scoreDetails.bonus.quartier).toBe(0);
  });

  it('should handle case-insensitive quartier matching', async () => {
    const annonceUppercase: LeboncoinAnnonce = {
      ...baseAnnonce,
      rawData: {
        location: {
          district: 'CENTRE-VILLE', // Majuscules
        },
      },
    };

    const result = await matchingService.matchAnnonceToDpes(annonceUppercase, [baseDpe], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    const candidat = result.candidats[0];
    expect(candidat.scoreDetails.bonus.quartier).toBe(5);
  });

  it('should handle quartier name variations', async () => {
    const annonceVariation: LeboncoinAnnonce = {
      ...baseAnnonce,
      rawData: {
        location: {
          district: 'centre ville', // Variation sans tiret
        },
      },
    };

    const result = await matchingService.matchAnnonceToDpes(annonceVariation, [baseDpe], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    const candidat = result.candidats[0];
    expect(candidat.scoreDetails.bonus.quartier).toBe(5);
  });

  it('should work when annonce has no quartier info', async () => {
    const annonceNoQuartier: LeboncoinAnnonce = {
      ...baseAnnonce,
      rawData: {},
    };

    const result = await matchingService.matchAnnonceToDpes(annonceNoQuartier, [baseDpe], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    const candidat = result.candidats[0];
    // Pas de bonus mais pas d'erreur
    expect(candidat.scoreDetails.bonus.quartier).toBe(0);
  });

  it('should use GPS fallback when district not in rawData', async () => {
    const annonceWithGPS: LeboncoinAnnonce = {
      ...baseAnnonce,
      lat: 43.2985,
      lng: -0.3700,
      rawData: {}, // Pas de district
    };

    const result = await matchingService.matchAnnonceToDpes(annonceWithGPS, [baseDpe], {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    const candidat = result.candidats[0];
    // Devrait détecter Centre-ville via GPS et donner le bonus
    expect(candidat.scoreDetails.bonus.quartier).toBe(5);
  });
});
