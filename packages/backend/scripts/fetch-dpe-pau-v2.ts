/**
 * Script de collecte DPE depuis l'API ADEME pour Pau et 30km autour (VERSION SIMPLIFIÉE)
 *
 * Usage: pnpm fetch:dpe:pau
 */

import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

// Configuration
const PAU_LAT = 43.2951;
const PAU_LNG = -0.3708;
const RADIUS_KM = 30;
const API_BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france';
const PAGE_SIZE = 1000;
const MAX_TOTAL = 50000; // Limite de sécurité

// Types
interface DpeApiRecord {
  numero_dpe?: string;
  geo_adresse?: string;
  latitude?: number;
  longitude?: number;
  tr002_type_batiment_description?: string;
  surface_thermique_lot?: number;
  annee_construction?: number;
  classe_consommation_energie?: string;
  classe_estimation_ges?: string;
  date_etablissement_dpe?: string;
  tv016_departement_code?: string;
  code_insee_commune_actualise?: string;
  [key: string]: any;
}

// Mapping
const typeBatimentMap: Record<string, TypeBatiment> = {
  'maison': TypeBatiment.MAISON,
  'maison individuelle': TypeBatiment.MAISON,
  'appartement': TypeBatiment.APPARTEMENT,
  'logement': TypeBatiment.APPARTEMENT,
  'immeuble': TypeBatiment.APPARTEMENT,
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

// Calcul de distance GPS
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parsing functions
function parseTypeBatiment(value: string | undefined): TypeBatiment | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return typeBatimentMap[normalized] || TypeBatiment.APPARTEMENT;
}

function parseEtiquette(value: string | undefined): EtiquetteDpe | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return etiquetteDpeMap[normalized] || null;
}

// Fetch API
async function fetchDpePage(after?: string): Promise<{ total: number; results: DpeApiRecord[]; next?: string }> {
  const params = new URLSearchParams({
    size: String(PAGE_SIZE),
    q: 'tv016_departement_code:"64"',
  });

  if (after) {
    params.set('after', after);
  }

  const url = `${API_BASE_URL}/lines?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API ADEME: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return {
    total: data.total || 0,
    results: data.results || [],
    next: data.next,
  };
}

// Import
async function importDpe(record: DpeApiRecord): Promise<'created' | 'updated' | 'skipped'> {
  try {
    const numeroDpe = record.numero_dpe;
    if (!numeroDpe) return 'skipped';

    // Filtrage géographique
    if (record.latitude && record.longitude) {
      const distance = calculateDistance(PAU_LAT, PAU_LNG, record.latitude, record.longitude);
      if (distance > RADIUS_KM) {
        return 'skipped';
      }
    }

    const typeBatiment = parseTypeBatiment(record.tr002_type_batiment_description);
    if (!typeBatiment) return 'skipped';

    const etiquetteDpe = parseEtiquette(record.classe_consommation_energie);
    const etiquetteGes = parseEtiquette(record.classe_estimation_ges);
    if (!etiquetteDpe || !etiquetteGes) return 'skipped';

    const surface = record.surface_thermique_lot;
    if (!surface || surface <= 0) return 'skipped';

    const dateEtablissement = record.date_etablissement_dpe ? new Date(record.date_etablissement_dpe) : null;
    if (!dateEtablissement || isNaN(dateEtablissement.getTime())) return 'skipped';

    // Extraire code postal de l'adresse ou utiliser département par défaut
    let codePostal = '64000';
    if (record.geo_adresse) {
      const match = record.geo_adresse.match(/\b(64\d{3})\b/);
      if (match) codePostal = match[1];
    }

    const dpeData = {
      numeroDpe,
      adresseBan: record.geo_adresse || '',
      codePostalBan: codePostal,
      typeBatiment,
      surfaceHabitable: surface,
      anneConstruction: record.annee_construction || null,
      etiquetteDpe,
      etiquetteGes,
      coordonneeX: record.longitude || null,
      coordonneeY: record.latitude || null,
      dateEtablissement,
      rawData: record as any,
    };

    const existing = await prisma.dpeRecord.findUnique({
      where: { numeroDpe },
    });

    await prisma.dpeRecord.upsert({
      where: { numeroDpe },
      update: dpeData,
      create: dpeData,
    });

    return existing ? 'updated' : 'created';
  } catch (error) {
    logger.error(`Erreur import DPE:`, error);
    return 'skipped';
  }
}

// Main
async function main(): Promise<void> {
  console.log('\n🚀 Collecte des DPE - Pau et 30km autour\n');
  console.log(`   📍 Centre: Pau (${PAU_LAT}, ${PAU_LNG})`);
  console.log(`   📏 Rayon: ${RADIUS_KM} km`);
  console.log(`   🗺️  Département: 64 (Pyrénées-Atlantiques)`);
  console.log('');

  const startTime = Date.now();
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let afterToken: string | undefined;

  try {
    // Première requête
    console.log('📊 Récupération du nombre total de DPE...\n');
    let response = await fetchDpePage();
    console.log(`✅ Total disponible: ${response.total} DPE dans le département 64\n`);
    console.log('💾 Import des DPE...\n');

    // Traiter les résultats
    while (response.results.length > 0 && totalFetched < MAX_TOTAL) {
      for (const record of response.results) {
        const result = await importDpe(record);
        totalFetched++;
        if (result === 'created') totalCreated++;
        else if (result === 'updated') totalUpdated++;
        else totalSkipped++;

        if (totalFetched % 100 === 0) {
          console.log(`   Traité: ${totalFetched} | Créés: ${totalCreated} | Màj: ${totalUpdated} | Ignorés: ${totalSkipped}`);
        }
      }

      // Page suivante
      if (response.next && totalFetched < MAX_TOTAL) {
        const match = response.next.match(/after=([^&]+)/);
        if (match) {
          afterToken = decodeURIComponent(match[1]);
          await new Promise(resolve => setTimeout(resolve, 150)); // Rate limiting
          response = await fetchDpePage(afterToken);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n\n✅ Collecte terminée!\n');
    console.log('📊 Statistiques:');
    console.log(`   Total récupéré: ${totalFetched}`);
    console.log(`   📝 Créés: ${totalCreated}`);
    console.log(`   🔄 Mis à jour: ${totalUpdated}`);
    console.log(`   ⏭️  Ignorés (hors rayon ou invalides): ${totalSkipped}`);
    console.log(`   ⏱️  Durée: ${duration.toFixed(2)}s`);
    console.log(`   🚀 Vitesse: ${Math.round(totalFetched / duration)} DPE/s`);
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
