/**
 * Script de collecte DPE depuis l'API ADEME pour Pau et 30km autour
 *
 * Usage: pnpm fetch:dpe:pau
 *
 * Fonctionnalités:
 * - Récupère les DPE via l'API publique ADEME
 * - Filtre géographique: rayon de 30km autour de Pau
 * - Pagination automatique
 * - Import en base avec gestion des doublons
 * - Statistiques détaillées
 */

import { z } from 'zod';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

// ============================================================================
// Configuration
// ============================================================================

// Coordonnées GPS de Pau
const PAU_LAT = 43.2951;
const PAU_LNG = -0.3708;
const RADIUS_KM = 30;

// API ADEME
const API_BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france';
const PAGE_SIZE = 1000; // Max records per request
const MAX_PAGES = 100; // Limite de sécurité

// Codes postaux de Pau et environs (64xxx)
const TARGET_DEPARTMENTS = ['64']; // Pyrénées-Atlantiques

// ============================================================================
// Types API ADEME
// ============================================================================

interface DpeApiResponse {
  total: number;
  results: DpeApiRecord[];
}

interface DpeApiRecord {
  'N°_DPE': string;
  Adresse_brute: string;
  Code_postal__BAN_: string;
  Commune__BAN_: string;
  'Type_bâtiment': string;
  Surface_habitable_logement: string | number;
  'Année_construction': string | number;
  Etiquette_DPE: string;
  Etiquette_GES: string;
  'Coordonnée_cartographique_X__BAN_': string | number;
  'Coordonnée_cartographique_Y__BAN_': string | number;
  'Date_établissement_DPE': string;
  [key: string]: any; // Autres champs optionnels
}

// ============================================================================
// Validation
// ============================================================================

const typeBatimentMap: Record<string, TypeBatiment> = {
  'maison': TypeBatiment.MAISON,
  'appartement': TypeBatiment.APPARTEMENT,
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

function parseTypeBatiment(value: string): TypeBatiment | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return typeBatimentMap[normalized] || null;
}

function parseEtiquette(value: string): EtiquetteDpe | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return etiquetteDpeMap[normalized] || null;
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

function parseInt10(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.floor(value);
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

// ============================================================================
// Calcul de distance GPS
// ============================================================================

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// API ADEME
// ============================================================================

async function fetchDpePage(page: number): Promise<DpeApiResponse> {
  // Construction des paramètres de requête
  const params = new URLSearchParams({
    size: String(PAGE_SIZE),
    page: String(page),
    // Filtre sur le département 64
    q: `tv016_departement_code:"64"`,
    // Tri par date
    sort: 'date_etablissement_dpe:-1',
  });

  const url = `${API_BASE_URL}/lines?${params.toString()}`;

  console.log(`📡 Requête page ${page}: ${url.substring(0, 100)}...`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API ADEME: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  return {
    total: data.total || 0,
    results: data.results || [],
  };
}

// ============================================================================
// Import
// ============================================================================

async function importDpe(record: DpeApiRecord): Promise<'created' | 'updated' | 'skipped'> {
  try {
    // Validation des champs obligatoires
    const numeroDpe = record['N°_DPE'];
    if (!numeroDpe) {
      logger.warn('DPE sans numéro, ignoré');
      return 'skipped';
    }

    const typeBatiment = parseTypeBatiment(record['Type_bâtiment']);
    if (!typeBatiment) {
      logger.warn(`Type de bâtiment invalide pour DPE ${numeroDpe}`);
      return 'skipped';
    }

    const etiquetteDpe = parseEtiquette(record.Etiquette_DPE);
    const etiquetteGes = parseEtiquette(record.Etiquette_GES);
    if (!etiquetteDpe || !etiquetteGes) {
      logger.warn(`Étiquettes invalides pour DPE ${numeroDpe}`);
      return 'skipped';
    }

    // Coordonnées GPS
    const coordX = parseNumber(record['Coordonnée_cartographique_X__BAN_']);
    const coordY = parseNumber(record['Coordonnée_cartographique_Y__BAN_']);

    // Filtrage géographique: vérifier si dans le rayon de 30km
    if (coordX && coordY) {
      const distance = calculateDistance(PAU_LAT, PAU_LNG, coordY, coordX);
      if (distance > RADIUS_KM) {
        return 'skipped'; // Hors du rayon
      }
    }

    const surface = parseNumber(record.Surface_habitable_logement);
    if (!surface || surface <= 0) {
      logger.warn(`Surface invalide pour DPE ${numeroDpe}`);
      return 'skipped';
    }

    const dateEtablissement = parseDate(record['Date_établissement_DPE']);
    if (!dateEtablissement) {
      logger.warn(`Date invalide pour DPE ${numeroDpe}`);
      return 'skipped';
    }

    // Préparation des données
    const dpeData = {
      numeroDpe,
      adresseBan: record.Adresse_brute || '',
      codePostalBan: record.Code_postal__BAN_ || '',
      typeBatiment,
      surfaceHabitable: surface,
      anneConstruction: parseInt10(record['Année_construction']),
      etiquetteDpe,
      etiquetteGes,
      coordonneeX: coordX,
      coordonneeY: coordY,
      dateEtablissement,
      rawData: record as any,
    };

    // Vérifier si existe
    const existing = await prisma.dpeRecord.findUnique({
      where: { numeroDpe },
    });

    // Upsert
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

// ============================================================================
// Main
// ============================================================================

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
  let page = 1;

  try {
    // Première requête pour obtenir le total
    console.log('📊 Récupération du nombre total de DPE...\n');
    const firstPage = await fetchDpePage(1);
    console.log(`✅ Total disponible: ${firstPage.total} DPE dans le département 64\n`);

    // Traitement de la première page
    console.log('💾 Import des DPE...\n');
    for (const record of firstPage.results) {
      const result = await importDpe(record);
      totalFetched++;
      if (result === 'created') totalCreated++;
      else if (result === 'updated') totalUpdated++;
      else totalSkipped++;

      // Affichage progression
      if (totalFetched % 100 === 0) {
        console.log(`   Traité: ${totalFetched} | Créés: ${totalCreated} | Màj: ${totalUpdated} | Ignorés: ${totalSkipped}`);
      }
    }

    // Pages suivantes
    const totalPages = Math.min(Math.ceil(firstPage.total / PAGE_SIZE), MAX_PAGES);

    for (page = 2; page <= totalPages; page++) {
      const pageData = await fetchDpePage(page);

      for (const record of pageData.results) {
        const result = await importDpe(record);
        totalFetched++;
        if (result === 'created') totalCreated++;
        else if (result === 'updated') totalUpdated++;
        else totalSkipped++;

        // Affichage progression
        if (totalFetched % 100 === 0) {
          console.log(`   Traité: ${totalFetched} | Créés: ${totalCreated} | Màj: ${totalUpdated} | Ignorés: ${totalSkipped}`);
        }
      }

      // Pause pour respecter le rate limit (10 req/s)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const duration = (Date.now() - startTime) / 1000;

    // Statistiques finales
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
