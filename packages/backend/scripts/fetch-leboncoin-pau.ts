/**
 * Script de collecte des annonces Leboncoin pour Pau et 30km autour
 *
 * Usage: pnpm fetch:leboncoin:pau
 *
 * Fonctionnalités:
 * - Récupère les annonces depuis l'API Leboncoin (via RapidAPI)
 * - Multi codes postaux: Pau et communes environnantes (30km)
 * - Pagination automatique
 * - Import en base avec gestion des doublons
 * - Statistiques détaillées
 */

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================================================
// Configuration
// ============================================================================

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'leboncoin1.p.rapidapi.com';
const API_URL = `https://${RAPIDAPI_HOST}/v2/leboncoin/search_api`;

// Codes postaux de Pau et environs dans un rayon étendu (~50km)
const ZIPCODES_PAU_AREA = [
  // Pau et communes limitrophes (0-5km)
  '64000', // Pau centre
  '64140', // Lons, Billère
  '64110', // Jurançon, Gelos, Mazères-Lezons, Laroin
  '64320', // Bizanos, Ousse, Idron, Aressy

  // Ouest de Pau (5-20km)
  '64230', // Lescar, Denguin, Artiguelouve, Sauvagnon
  '64121', // Serres-Castet, Montardon
  '64160', // Morlaàs, Buros, Saint-Jammes, Carrère
  '64350', // Lembeye, Moncaup
  '64300', // Orthez (ouest, ~35km)

  // Nord de Pau (10-40km)
  '64800', // Nay, Coarraze, Igon, Saint-Vincent, Bruges
  '64410', // Arzacq-Arraziguet
  '64530', // Pontacq (~20km nord)
  '64390', // Sauveterre-de-Béarn (~35km ouest)

  // Sud de Pau (15-50km)
  '64400', // Oloron-Sainte-Marie
  '64490', // Bedous, Accous (vallée d'Aspe)
  '64570', // Arette, Aramits (~40km sud)
  '64260', // Arudy, Louvie-Juzon (~30km sud)

  // Est de Pau (10-30km)
  '64420', // Soumoulou, Nousty
  '64170', // Artix, Lacq, Labastide-Monréjeau
  '64150', // Mourenx, Lagor, Os-Marsillon
  '64190', // Navarrenx (~40km est)
  '64270', // Salies-de-Béarn (~40km nord-ouest)

  // Zones supplémentaires périphériques
  '64510', // Bordes, Assat (~15km nord)
  '64330', // Garlin (~40km nord-est)
  '64360', // Monein (~20km sud-ouest)
  '64450', // Thèze (~25km nord)
];

const LIMIT_PER_ZIPCODE = 2000; // Nombre d'annonces par code postal (maximum absolu)
const DELAY_BETWEEN_REQUESTS = 200; // ms entre chaque requête (respect rate limit)

// ============================================================================
// Types API Leboncoin
// ============================================================================

interface LeboncoinAttribute {
  key: string;
  value: string;
  value_label?: string;
}

interface LeboncoinLocation {
  city?: string;
  zipcode?: string;
  department?: string;
  region?: string;
}

interface LeboncoinAnnonce {
  list_id: string;
  url: string;
  subject: string;
  price: number[];
  location?: LeboncoinLocation;
  attributes?: LeboncoinAttribute[];
  first_publication_date?: string;
  images?: {
    thumb_url?: string;
    small_url?: string;
  };
}

interface LeboncoinResponse {
  ads?: LeboncoinAnnonce[];
  total?: number;
}

// ============================================================================
// Validation & Transformation
// ============================================================================

const typeBatimentMap: Record<string, TypeBatiment> = {
  'appartement': TypeBatiment.APPARTEMENT,
  'maison': TypeBatiment.MAISON,
  'villa': TypeBatiment.MAISON,
  'autre': TypeBatiment.APPARTEMENT,
};

const etiquetteDpeMap: Record<string, EtiquetteDpe> = {
  'A': EtiquetteDpe.A,
  'B': EtiquetteDpe.B,
  'C': EtiquetteDpe.C,
  'D': EtiquetteDpe.D,
  'E': EtiquetteDpe.E,
  'F': EtiquetteDpe.F,
  'G': EtiquetteDpe.G,
};

function findAttribute(attributes: LeboncoinAttribute[] | undefined, key: string): string | null {
  if (!attributes) return null;
  const attr = attributes.find(a => a.key === key);
  return attr?.value_label || attr?.value || null;
}

function parseTypeBatiment(value: string | null): TypeBatiment {
  if (!value) return TypeBatiment.APPARTEMENT;
  const normalized = value.toLowerCase();
  return typeBatimentMap[normalized] || TypeBatiment.APPARTEMENT;
}

function parseEtiquette(value: string | null): EtiquetteDpe | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return etiquetteDpeMap[normalized] || null;
}

function parseSurface(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  if (!match) return null;
  const surface = parseInt(match[1], 10);
  return surface > 0 ? surface : null;
}

function parseRooms(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function parseDate(value: string | null): Date {
  if (!value) return new Date();
  try {
    return new Date(value);
  } catch {
    return new Date();
  }
}

// ============================================================================
// API Leboncoin
// ============================================================================

async function fetchLeboncoinForZipcode(zipcode: string, maxResults: number): Promise<LeboncoinAnnonce[]> {
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    throw new Error('RAPIDAPI_KEY non définie dans .env');
  }

  const allAnnonces: LeboncoinAnnonce[] = [];
  const batchSize = 100; // Taille maximum par requête API
  let offset = 0;

  // Boucle de pagination pour récupérer toutes les annonces
  while (allAnnonces.length < maxResults) {
    const searchBody = {
      filters: {
        category: {
          id: '9', // Ventes immobilières
        },
        enums: {
          ad_type: ['offer'],
        },
        location: {
          locations: [
            {
              locationType: 'city',
              zipcode,
            },
          ],
        },
      },
      owner_type: 'all',
      limit: batchSize,
      sort_by: 'time',
      sort_order: 'desc',
      offset,
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
      logger.error(`Erreur API Leboncoin pour ${zipcode} (offset ${offset}): ${response.status}`);
      break;
    }

    const data: LeboncoinResponse = await response.json();

    if (!data.ads || data.ads.length === 0) {
      // Plus d'annonces disponibles
      break;
    }

    // Ajouter les annonces récupérées
    allAnnonces.push(...data.ads);

    // Incrémenter l'offset pour la prochaine page
    offset += batchSize;

    // Si on a récupéré moins que batchSize, c'est qu'on est à la dernière page
    if (data.ads.length < batchSize) {
      break;
    }

    // Délai entre les requêtes pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  }

  return allAnnonces;
}

// ============================================================================
// Import
// ============================================================================

async function importAnnonce(annonce: LeboncoinAnnonce): Promise<'created' | 'updated' | 'skipped'> {
  try {
    // Validation basique
    if (!annonce.list_id || !annonce.url) {
      return 'skipped';
    }

    // Extraction des attributs
    const typeBienStr = findAttribute(annonce.attributes, 'real_estate_type');
    const surfaceStr = findAttribute(annonce.attributes, 'square');
    const piecesStr = findAttribute(annonce.attributes, 'rooms');
    const dpeStr = findAttribute(annonce.attributes, 'energy_rate');
    const gesStr = findAttribute(annonce.attributes, 'ges');

    // Transformation
    const listId = BigInt(annonce.list_id);
    const annonceData = {
      listId,
      url: annonce.url,
      codePostal: annonce.location?.zipcode || '',
      typeBien: parseTypeBatiment(typeBienStr),
      surface: parseSurface(surfaceStr),
      pieces: parseRooms(piecesStr),
      etiquetteDpe: parseEtiquette(dpeStr),
      etiquetteGes: parseEtiquette(gesStr),
      datePublication: parseDate(annonce.first_publication_date),
      rawData: annonce as any,
    };

    // Vérifier si existe
    const existing = await prisma.leboncoinAnnonce.findUnique({
      where: { listId },
    });

    // Upsert
    await prisma.leboncoinAnnonce.upsert({
      where: { listId },
      update: annonceData,
      create: annonceData,
    });

    return existing ? 'updated' : 'created';

  } catch (error) {
    logger.error(`Erreur import annonce ${annonce.list_id}:`, error);
    return 'skipped';
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('\n🚀 Collecte des annonces Leboncoin - Pau et 30km autour\n');
  console.log(`   📍 Centre: Pau`);
  console.log(`   📏 Rayon: ~30 km`);
  console.log(`   🗺️  Codes postaux: ${ZIPCODES_PAU_AREA.length}`);
  console.log(`   📊 Limite par code: ${LIMIT_PER_ZIPCODE} annonces`);
  console.log('');

  if (!RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY non configurée dans .env');
    console.error('   Ajoutez: RAPIDAPI_KEY=your_key');
    process.exit(1);
  }

  const startTime = Date.now();
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    console.log('📡 Récupération des annonces par code postal...\n');

    for (const [index, zipcode] of ZIPCODES_PAU_AREA.entries()) {
      console.log(`[${index + 1}/${ZIPCODES_PAU_AREA.length}] Code postal: ${zipcode}`);

      try {
        // Fetch annonces pour ce code postal
        const annonces = await fetchLeboncoinForZipcode(zipcode, LIMIT_PER_ZIPCODE);
        console.log(`   ✅ ${annonces.length} annonces récupérées`);

        // Import des annonces
        for (const annonce of annonces) {
          const result = await importAnnonce(annonce);
          totalFetched++;
          if (result === 'created') totalCreated++;
          else if (result === 'updated') totalUpdated++;
          else totalSkipped++;
        }

        console.log(`   💾 Créées: ${totalCreated} | Màj: ${totalUpdated} | Ignorées: ${totalSkipped}\n`);

      } catch (error) {
        console.error(`   ❌ Erreur pour ${zipcode}:`, error);
      }

      // Pause pour respecter le rate limit
      if (index < ZIPCODES_PAU_AREA.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    // Statistiques finales
    console.log('\n✅ Collecte terminée!\n');
    console.log('📊 Statistiques:');
    console.log(`   Codes postaux traités: ${ZIPCODES_PAU_AREA.length}`);
    console.log(`   Total annonces récupérées: ${totalFetched}`);
    console.log(`   📝 Créées: ${totalCreated}`);
    console.log(`   🔄 Mises à jour: ${totalUpdated}`);
    console.log(`   ⏭️  Ignorées: ${totalSkipped}`);
    console.log(`   ⏱️  Durée: ${duration.toFixed(2)}s`);
    console.log('');

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors de la collecte:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
