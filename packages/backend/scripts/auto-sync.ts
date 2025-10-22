/**
 * Script d'automatisation de synchronisation périodique
 *
 * Usage: pnpm auto:sync [--once] [--codes-postaux=64000,75001]
 *
 * Fonctionnalités:
 * - Synchronisation automatique des annonces Leboncoin
 * - Matching automatique avec les DPE
 * - Création de clusters de matching
 * - Mode continu ou exécution unique
 * - Support de multiple codes postaux
 */

import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { matchingService } from '../src/modules/matching/matching.service';
import { TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================================================
// Configuration
// ============================================================================

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'leboncoin1.p.rapidapi.com';
const API_URL = `https://${RAPIDAPI_HOST}/v2/leboncoin/search_api`;

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CODES_POSTAUX = ['64000', '64100', '64110'];
const ANNONCES_PER_ZIPCODE = 50;

// ============================================================================
// Types
// ============================================================================

interface SyncStats {
  timestamp: Date;
  codesPostaux: string[];
  annoncesRecuperees: number;
  annoncesCreees: number;
  annoncesMisesAJour: number;
  clustersCreees: number;
  erreurs: number;
}

// ============================================================================
// Fonctions de synchronisation
// ============================================================================

async function fetchAnnoncesForZipcode(zipcode: string, limit: number) {
  if (!RAPIDAPI_KEY) throw new Error('RAPIDAPI_KEY not defined');

  const searchBody = {
    filters: {
      category: { id: '9' },
      enums: { ad_type: ['offer'] },
      location: {
        locations: [{ locationType: 'city', zipcode }],
      },
    },
    owner_type: 'all',
    limit,
    sort_by: 'time',
    sort_order: 'desc',
    offset: 0,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.ads || [];
}

function findAttribute(attributes: any[] | undefined, key: string): string | null {
  if (!attributes) return null;
  const attr = attributes.find((a: any) => a.key === key);
  return attr?.value_label || attr?.value || null;
}

function parseTypeBatiment(value: string | null): TypeBatiment {
  if (!value) return TypeBatiment.APPARTEMENT;
  const normalized = value.toLowerCase();
  if (normalized.includes('maison') || normalized.includes('villa')) {
    return TypeBatiment.MAISON;
  }
  return TypeBatiment.APPARTEMENT;
}

function parseEtiquette(value: string | null): EtiquetteDpe | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  const map: Record<string, EtiquetteDpe> = {
    'A': EtiquetteDpe.A,
    'B': EtiquetteDpe.B,
    'C': EtiquetteDpe.C,
    'D': EtiquetteDpe.D,
    'E': EtiquetteDpe.E,
    'F': EtiquetteDpe.F,
    'G': EtiquetteDpe.G,
  };
  return map[normalized] || null;
}

function parseSurface(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseRooms(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

async function importAnnonce(annonce: any): Promise<{ created: boolean; updated: boolean; error: boolean }> {
  try {
    const typeBienStr = findAttribute(annonce.attributes, 'real_estate_type');
    const surfaceStr = findAttribute(annonce.attributes, 'square');
    const piecesStr = findAttribute(annonce.attributes, 'rooms');
    const dpeStr = findAttribute(annonce.attributes, 'energy_rate');
    const gesStr = findAttribute(annonce.attributes, 'ges');

    const listId = BigInt(String(annonce.list_id));

    const annonceData = {
      listId,
      url: annonce.url,
      codePostal: annonce.location?.zipcode || '',
      typeBien: parseTypeBatiment(typeBienStr),
      surface: parseSurface(surfaceStr),
      pieces: parseRooms(piecesStr),
      etiquetteDpe: parseEtiquette(dpeStr),
      etiquetteGes: parseEtiquette(gesStr),
      datePublication: annonce.first_publication_date ? new Date(annonce.first_publication_date) : new Date(),
      rawData: annonce as any,
    };

    const existing = await prisma.leboncoinAnnonce.findUnique({
      where: { listId },
    });

    await prisma.leboncoinAnnonce.upsert({
      where: { listId },
      update: annonceData,
      create: annonceData,
    });

    return {
      created: !existing,
      updated: !!existing,
      error: false,
    };
  } catch (error) {
    logger.error(`Error importing annonce ${annonce.list_id}:`, error);
    return { created: false, updated: false, error: true };
  }
}

async function createMatchCluster(annonceId: string): Promise<boolean> {
  try {
    // Récupérer l'annonce
    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { id: annonceId },
    });

    if (!annonce) return false;

    // Vérifier si un cluster existe déjà
    const existingCluster = await prisma.matchCluster.findUnique({
      where: { annonceId },
    });

    if (existingCluster) {
      logger.info(`Cluster already exists for annonce ${annonceId}`);
      return false;
    }

    // Récupérer les DPE du même code postal
    const dpes = await prisma.dpeRecord.findMany({
      where: { codePostalBan: annonce.codePostal },
      take: 100,
    });

    if (dpes.length === 0) {
      logger.info(`No DPE found for zipcode ${annonce.codePostal}`);
      return false;
    }

    // Lancer le matching
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, {
      maxCandidats: 10,
      seuilScoreMinimum: 30,
      includeScoreDetails: true,
    });

    if (result.candidats.length === 0) {
      logger.info(`No valid candidates found for annonce ${annonceId}`);
      return false;
    }

    // Créer le cluster
    const cluster = await prisma.matchCluster.create({
      data: {
        annonceId,
        nombreCandidats: result.candidats.length,
        meilleurScore: Math.max(...result.candidats.map(c => c.scoreNormalized)),
        statut: 'NON_VERIFIE',
        candidats: {
          create: result.candidats.map((candidat) => ({
            dpeId: candidat.dpeId,
            scoreTotal: candidat.scoreTotal,
            scoreBase: candidat.scoreBase,
            scoreBonus: candidat.scoreBonus,
            scoreNormalized: candidat.scoreNormalized,
            confiance: candidat.confiance,
            rang: candidat.rang,
            distanceGps: candidat.distanceGps,
            scoreDetails: candidat.scoreDetails as any,
          })),
        },
      },
    });

    logger.info(`Created match cluster ${cluster.id} with ${result.candidats.length} candidates`);
    return true;
  } catch (error) {
    logger.error(`Error creating match cluster for annonce ${annonceId}:`, error);
    return false;
  }
}

async function syncCodesPostaux(codesPostaux: string[]): Promise<SyncStats> {
  const stats: SyncStats = {
    timestamp: new Date(),
    codesPostaux,
    annoncesRecuperees: 0,
    annoncesCreees: 0,
    annoncesMisesAJour: 0,
    clustersCreees: 0,
    erreurs: 0,
  };

  console.log(`\n🔄 Synchronisation pour ${codesPostaux.length} codes postaux`);
  console.log(`   ${codesPostaux.join(', ')}\n`);

  for (const zipcode of codesPostaux) {
    try {
      console.log(`📡 Récupération des annonces pour ${zipcode}...`);

      const annonces = await fetchAnnoncesForZipcode(zipcode, ANNONCES_PER_ZIPCODE);
      stats.annoncesRecuperees += annonces.length;

      console.log(`   ✅ ${annonces.length} annonces récupérées`);

      // Import des annonces
      for (const annonce of annonces) {
        const result = await importAnnonce(annonce);

        if (result.created) {
          stats.annoncesCreees++;

          // Créer un cluster de matching pour les nouvelles annonces
          const clusterCreated = await createMatchCluster(
            (await prisma.leboncoinAnnonce.findUnique({
              where: { listId: BigInt(String(annonce.list_id)) },
            }))!.id
          );

          if (clusterCreated) {
            stats.clustersCreees++;
          }
        } else if (result.updated) {
          stats.annoncesMisesAJour++;
        } else if (result.error) {
          stats.erreurs++;
        }
      }

      console.log(`   📝 ${stats.annoncesCreees} créées | 🔄 ${stats.annoncesMisesAJour} mises à jour | ❌ ${stats.erreurs} erreurs`);
      console.log(`   🎯 ${stats.clustersCreees} clusters créés\n`);

    } catch (error) {
      logger.error(`Error syncing zipcode ${zipcode}:`, error);
      console.log(`   ❌ Erreur lors de la synchronisation de ${zipcode}\n`);
      stats.erreurs++;
    }
  }

  return stats;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parser les arguments
  let runOnce = false;
  let codesPostaux = DEFAULT_CODES_POSTAUX;

  for (const arg of args) {
    if (arg === '--once') {
      runOnce = true;
    } else if (arg.startsWith('--codes-postaux=')) {
      codesPostaux = arg.split('=')[1].split(',');
    }
  }

  console.log('\n🚀 Script d\'automatisation de synchronisation\n');
  console.log(`   Mode: ${runOnce ? 'Exécution unique' : 'Continu'}`);
  console.log(`   Codes postaux: ${codesPostaux.join(', ')}`);
  console.log(`   Interval: ${SYNC_INTERVAL_MS / 1000}s`);
  console.log('');

  if (!RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY non définie');
    process.exit(1);
  }

  try {
    // Première synchronisation
    const stats = await syncCodesPostaux(codesPostaux);

    console.log('\n📊 Résumé de la synchronisation:\n');
    console.log(`   Annonces récupérées: ${stats.annoncesRecuperees}`);
    console.log(`   Annonces créées: ${stats.annoncesCreees}`);
    console.log(`   Annonces mises à jour: ${stats.annoncesMisesAJour}`);
    console.log(`   Clusters créés: ${stats.clustersCreees}`);
    console.log(`   Erreurs: ${stats.erreurs}`);
    console.log('');

    if (runOnce) {
      console.log('✅ Synchronisation terminée (mode once)\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Mode continu
    console.log(`⏰ Prochaine synchronisation dans ${SYNC_INTERVAL_MS / 1000}s\n`);
    console.log('Press Ctrl+C to stop\n');

    setInterval(async () => {
      console.log(`\n\n⏰ ${new Date().toLocaleTimeString()} - Nouvelle synchronisation\n`);

      try {
        const stats = await syncCodesPostaux(codesPostaux);

        console.log('\n📊 Résumé:\n');
        console.log(`   ${stats.annoncesCreees} créées | ${stats.annoncesMisesAJour} MAJ | ${stats.clustersCreees} clusters | ${stats.erreurs} erreurs`);
        console.log(`\n⏰ Prochaine synchronisation dans ${SYNC_INTERVAL_MS / 1000}s\n`);
      } catch (error) {
        logger.error('Error during sync:', error);
        console.log('\n❌ Erreur lors de la synchronisation\n');
      }
    }, SYNC_INTERVAL_MS);

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
