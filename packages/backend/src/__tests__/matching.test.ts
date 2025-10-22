/**
 * Tests pour l'algorithme de matching
 */

import { matchingService } from '../modules/matching/matching.service';
import { matchingRepository } from '../modules/matching/matching.repository';
import { prisma } from '@config/database';

describe('Matching Algorithm', () => {
  let testDpe: any;
  let testAnnonce: any;

  beforeAll(async () => {
    // Créer un DPE de test
    testDpe = await prisma.dpeRecord.create({
      data: {
        numeroDpe: `TEST_MATCH_${Date.now()}_DPE`,
        adresseBan: '10 Rue Test',
        codePostalBan: '75001',
        typeBatiment: 'APPARTEMENT',
        surfaceHabitable: 50,
        anneConstruction: 2000,
        etiquetteDpe: 'C',
        etiquetteGes: 'D',
        coordonneeX: 2.3522,
        coordonneeY: 48.8566,
        dateEtablissement: new Date(),
      },
    });

    // Créer une annonce correspondante
    testAnnonce = await prisma.leboncoinAnnonce.create({
      data: {
        listId: BigInt(Date.now()),
        url: 'https://www.leboncoin.fr/test/matching',
        codePostal: '75001',
        typeBien: 'APPARTEMENT',
        surface: 50,
        pieces: 2,
        anneConstruction: 2000,
        etiquetteDpe: 'C',
        etiquetteGes: 'D',
        lat: 48.8566,
        lng: 2.3522,
        datePublication: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await prisma.matchCluster.deleteMany({
      where: { annonceId: testAnnonce.id },
    });
    await prisma.dpeRecord.delete({ where: { id: testDpe.id } });
    await prisma.leboncoinAnnonce.delete({ where: { id: testAnnonce.id } });
  });

  describe('matchAnnonceToDpes', () => {
    it('should match an annonce to DPE with high score for perfect match', async () => {
      const result = await matchingService.matchAnnonceToDpes(testAnnonce, [testDpe], {
        seuilScoreMinimum: 50,
        maxCandidats: 10,
        distanceMaxGPS: 1000,
      });

      expect(result.candidats.length).toBeGreaterThan(0);
      expect((result.candidats[0] as any).scoreTotal).toBeGreaterThanOrEqual(50);
      expect(result.meilleurScore).toBe((result.candidats[0] as any).scoreTotal);
    });

    it('should filter out candidates below minimum score threshold', async () => {
      const result = await matchingService.matchAnnonceToDpes(testAnnonce, [testDpe], {
        seuilScoreMinimum: 200, // Score impossible à atteindre
        maxCandidats: 10,
        distanceMaxGPS: 1000,
      });

      expect(result.candidats.length).toBe(0);
      expect(result.meilleurScore).toBe(0);
    });

    it('should respect maximum number of candidates', async () => {
      // Créer plusieurs DPE similaires
      const dpes = [testDpe];
      for (let i = 0; i < 5; i++) {
        const dpe = await prisma.dpeRecord.create({
          data: {
            numeroDpe: `TEST_LIMIT_${Date.now()}_${i}`,
            adresseBan: `${10 + i} Rue Test`,
            codePostalBan: '75001',
            typeBatiment: 'APPARTEMENT',
            surfaceHabitable: 50 + i,
            anneConstruction: 2000,
            etiquetteDpe: 'C',
            etiquetteGes: 'D',
            coordonneeX: 2.3522 + i * 0.001,
            coordonneeY: 48.8566 + i * 0.001,
            dateEtablissement: new Date(),
          },
        });
        dpes.push(dpe);
      }

      const result = await matchingService.matchAnnonceToDpes(testAnnonce, dpes, {
        seuilScoreMinimum: 30,
        maxCandidats: 3,
        distanceMaxGPS: 1000,
      });

      expect(result.candidats.length).toBeLessThanOrEqual(3);

      // Nettoyer
      for (const dpe of dpes.slice(1)) {
        await prisma.dpeRecord.delete({ where: { id: dpe.id } });
      }
    });
  });

  describe('createMatchCluster', () => {
    it('should create a match cluster with candidates', async () => {
      const result = await matchingService.matchAnnonceToDpes(testAnnonce, [testDpe], {
        seuilScoreMinimum: 30,
        maxCandidats: 10,
        distanceMaxGPS: 1000,
      });

      const cluster = await matchingRepository.createMatchCluster(
        testAnnonce.id,
        result.candidats,
        result.meilleurScore
      );

      expect(cluster).toHaveProperty('id');
      expect(cluster.annonceId).toBe(testAnnonce.id);
      expect((cluster as any).candidats?.length || 0).toBeGreaterThan(0);

      // Nettoyer
      await prisma.matchCluster.delete({ where: { id: cluster.id } });
    });
  });

  describe('Score calculation edge cases', () => {
    it('should handle missing optional fields', async () => {
      // Créer une annonce avec des champs manquants
      const incompleteAnnonce = await prisma.leboncoinAnnonce.create({
        data: {
          listId: BigInt(Date.now() + 1),
          url: 'https://www.leboncoin.fr/test/incomplete',
          codePostal: '75001',
          typeBien: 'APPARTEMENT',
          surface: 50,
          lat: 48.8566,
          lng: 2.3522,
          datePublication: new Date(),
          // Champs manquants: pieces, anneConstruction, etiquetteDpe, etiquetteGes
        },
      });

      const result = await matchingService.matchAnnonceToDpes(incompleteAnnonce as any, [testDpe], {
        seuilScoreMinimum: 0,
        maxCandidats: 10,
        distanceMaxGPS: 1000,
      });

      expect(typeof result.candidats).toBe('object');
      expect(Array.isArray(result.candidats)).toBe(true);

      // Nettoyer
      await prisma.leboncoinAnnonce.delete({ where: { id: incompleteAnnonce.id } });
    });

    it('should handle extreme distance differences', async () => {
      // Créer un DPE très éloigné
      const distantDpe = await prisma.dpeRecord.create({
        data: {
          numeroDpe: `DISTANT_${Date.now()}`,
          adresseBan: '10 Rue Marseille',
          codePostalBan: '13001',
          typeBatiment: 'APPARTEMENT',
          surfaceHabitable: 50,
          anneConstruction: 2000,
          etiquetteDpe: 'C',
          etiquetteGes: 'D',
          coordonneeX: 5.3698, // Marseille
          coordonneeY: 43.2965,
          dateEtablissement: new Date(),
        },
      });

      const result = await matchingService.matchAnnonceToDpes(
        testAnnonce,
        [testDpe, distantDpe],
        {
          seuilScoreMinimum: 30,
          maxCandidats: 10,
          distanceMaxGPS: 100, // 100m max - le DPE distant ne devrait pas matcher
        }
      );

      // Le DPE distant ne devrait pas être dans les candidats
      const distantCandidat = result.candidats.find((c: any) => c.dpeId === distantDpe.id);
      expect(distantCandidat).toBeUndefined();

      // Nettoyer
      await prisma.dpeRecord.delete({ where: { id: distantDpe.id } });
    });
  });
});
