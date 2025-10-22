/**
 * Script d'import des annonces Leboncoin vers la base de données
 *
 * Usage: pnpm import:leboncoin [zipcode] [limit]
 *
 * Fonctionnalités:
 * - Récupère les annonces immobilières depuis l'API Leboncoin
 * - Valide et transforme les données
 * - Import en base de données avec gestion des doublons (upsert)
 * - Statistiques d'import
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
const DEFAULT_LIMIT = 50;
const DEFAULT_ZIPCODE = '64000';

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
// Schéma de validation
// ============================================================================

const typeBatimentMap: Record<string, TypeBatiment> = {
  'appartement': TypeBatiment.APPARTEMENT,
  'maison': TypeBatiment.MAISON,
  'villa': TypeBatiment.MAISON,
  'autre': TypeBatiment.APPARTEMENT, // Par défaut
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

const AnnonceSchema = z.object({
  list_id: z.union([z.string(), z.number()]).transform(val => String(val)),
  url: z.string().url(),
  subject: z.string(),
  price: z.array(z.number()).min(1),
  location: z.object({
    city: z.string().optional(),
    zipcode: z.string().optional(),
  }).optional(),
  attributes: z.array(z.object({
    key: z.string(),
    value: z.string(),
    value_label: z.string().optional(),
  })).optional(),
  first_publication_date: z.string().optional(),
});

// ============================================================================
// Fonctions utilitaires
// ============================================================================

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
// Fonction d'import
// ============================================================================

async function fetchLeboncoinAnnonces(zipcode: string, limit: number): Promise<LeboncoinAnnonce[]> {
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    throw new Error('RAPIDAPI_KEY non définie dans .env');
  }

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
    limit,
    sort_by: 'time',
    sort_order: 'desc',
    offset: 0,
  };

  console.log(`📡 Récupération des annonces pour le code postal ${zipcode}...`);

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
    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
  }

  const data: LeboncoinResponse = await response.json();

  if (!data.ads || data.ads.length === 0) {
    console.log('⚠️  Aucune annonce trouvée');
    return [];
  }

  console.log(`✅ ${data.ads.length} annonces récupérées (${data.total} disponibles)\n`);

  return data.ads;
}

async function importAnnonces(annonces: LeboncoinAnnonce[]): Promise<{
  created: number;
  updated: number;
  errors: number;
}> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  console.log('💾 Import des annonces en base de données...\n');

  for (const [index, annonce] of annonces.entries()) {
    try {
      // Validation
      const validated = AnnonceSchema.parse(annonce);

      // Extraction des attributs
      const typeBienStr = findAttribute(validated.attributes, 'real_estate_type');
      const surfaceStr = findAttribute(validated.attributes, 'square');
      const piecesStr = findAttribute(validated.attributes, 'rooms');
      const dpeStr = findAttribute(validated.attributes, 'energy_rate');
      const gesStr = findAttribute(validated.attributes, 'ges');

      // Transformation
      const listId = BigInt(validated.list_id);
      const annonceData = {
        listId,
        url: validated.url,
        codePostal: validated.location?.zipcode || '',
        typeBien: parseTypeBatiment(typeBienStr),
        surface: parseSurface(surfaceStr),
        pieces: parseRooms(piecesStr),
        etiquetteDpe: parseEtiquette(dpeStr),
        etiquetteGes: parseEtiquette(gesStr),
        datePublication: parseDate(validated.first_publication_date),
        rawData: annonce as any,
      };

      // Vérifier si l'annonce existe déjà
      const existing = await prisma.leboncoinAnnonce.findUnique({
        where: { listId },
      });

      // Upsert
      await prisma.leboncoinAnnonce.upsert({
        where: { listId },
        update: annonceData,
        create: annonceData,
      });

      if (existing) {
        updated++;
        console.log(`🔄 [${index + 1}/${annonces.length}] Mis à jour: ${validated.subject.substring(0, 50)}`);
      } else {
        created++;
        console.log(`📝 [${index + 1}/${annonces.length}] Créé: ${validated.subject.substring(0, 50)}`);
      }

    } catch (error) {
      errors++;
      logger.error(`Erreur import annonce ${annonce.list_id}:`, error);
      console.log(`❌ [${index + 1}/${annonces.length}] Erreur: ${annonce.subject}`);
    }
  }

  return { created, updated, errors };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const zipcode = args[0] || DEFAULT_ZIPCODE;
  const limit = parseInt(args[1] || String(DEFAULT_LIMIT), 10);

  console.log('\n🚀 Import des annonces Leboncoin\n');
  console.log(`   Code postal: ${zipcode}`);
  console.log(`   Limite: ${limit}`);
  console.log('');

  try {
    const startTime = Date.now();

    // Récupération des annonces
    const annonces = await fetchLeboncoinAnnonces(zipcode, limit);

    if (annonces.length === 0) {
      process.exit(0);
    }

    // Import en base
    const stats = await importAnnonces(annonces);

    const duration = (Date.now() - startTime) / 1000;

    // Statistiques finales
    console.log('\n\n✅ Import terminé!\n');
    console.log('📊 Statistiques:');
    console.log(`   Total traité: ${annonces.length}`);
    console.log(`   📝 Créées: ${stats.created}`);
    console.log(`   🔄 Mises à jour: ${stats.updated}`);
    console.log(`   ❌ Erreurs: ${stats.errors}`);
    console.log(`   ⏱️  Durée: ${duration.toFixed(2)}s`);
    console.log('');

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
