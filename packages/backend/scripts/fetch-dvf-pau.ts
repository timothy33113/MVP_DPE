/**
 * Script d'import DVF (Demandes de Valeurs Foncières) pour la région de Pau
 *
 * Source: https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/
 *
 * Usage: pnpm fetch:dvf:pau
 */

import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as zlib from 'zlib';
import { parse } from 'csv-parse/sync';

// Configuration
const DVF_URL = 'https://files.data.gouv.fr/geo-dvf/latest/csv/2024/full.csv.gz';
const TEMP_DIR = path.join(__dirname, '../../temp');
const TEMP_FILE = path.join(TEMP_DIR, 'dvf-2024.csv.gz');
const CSV_FILE = path.join(TEMP_DIR, 'dvf-2024.csv');

// Codes communes autour de Pau (64)
const CODES_COMMUNES_PAU = [
  '64445', // Pau
  '64230', // Lescar
  '64300', // Billère
  '64121', // Bizanos
  '64110', // Jurançon
  '64160', // Gelos
  '64320', // Idron
  '64230', // Lons
  '64800', // Nay
  '64530', // Ger
  '64410', // Bouillon
  '64390', // Sauvelade
];

interface DVFRecord {
  id_mutation: string;
  date_mutation: string;
  numero_disposition: string;
  nature_mutation: string;
  valeur_fonciere: string;
  adresse_numero: string;
  adresse_suffixe: string;
  adresse_nom_voie: string;
  adresse_code_voie: string;
  code_postal: string;
  code_commune: string;
  nom_commune: string;
  code_departement: string;
  ancien_code_commune: string;
  ancien_nom_commune: string;
  id_parcelle: string;
  ancien_id_parcelle: string;
  numero_volume: string;
  lot1_numero: string;
  lot1_surface_carrez: string;
  lot2_numero: string;
  lot2_surface_carrez: string;
  lot3_numero: string;
  lot3_surface_carrez: string;
  lot4_numero: string;
  lot4_surface_carrez: string;
  lot5_numero: string;
  lot5_surface_carrez: string;
  nombre_lots: string;
  code_type_local: string;
  type_local: string;
  surface_reelle_bati: string;
  nombre_pieces_principales: string;
  code_nature_culture: string;
  nature_culture: string;
  code_nature_culture_speciale: string;
  nature_culture_speciale: string;
  surface_terrain: string;
  longitude: string;
  latitude: string;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function decompressFile(source: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(dest);
    const gunzip = zlib.createGunzip();

    readStream.pipe(gunzip).pipe(writeStream);

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

async function main() {
  logger.info('🏢 Import DVF (Demandes de Valeurs Foncières) pour Pau');

  // Créer le dossier temp
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Télécharger le fichier DVF si nécessaire
  if (!fs.existsSync(CSV_FILE)) {
    logger.info('📥 Téléchargement du fichier DVF 2024...');
    logger.info('⚠️  Fichier volumineux (~2GB), cela peut prendre plusieurs minutes');

    if (!fs.existsSync(TEMP_FILE)) {
      await downloadFile(DVF_URL, TEMP_FILE);
      logger.info('✓ Téléchargement terminé');
    }

    logger.info('📦 Décompression du fichier...');
    await decompressFile(TEMP_FILE, CSV_FILE);
    logger.info('✓ Décompression terminée');
  } else {
    logger.info('✓ Fichier DVF déjà téléchargé');
  }

  // Lire et parser le CSV ligne par ligne pour éviter de charger tout en mémoire
  logger.info('📊 Lecture et filtrage des transactions pour Pau...');

  const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const records: DVFRecord[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
  });

  logger.info(`✓ ${records.length} transactions totales dans le fichier`);

  // Filtrer les transactions pour Pau et environs
  const pauTransactions = records.filter(record =>
    CODES_COMMUNES_PAU.includes(record.code_commune)
  );

  logger.info(`✓ ${pauTransactions.length} transactions trouvées pour Pau et environs`);

  // Statistiques par type de bien
  const stats = {
    maisons: 0,
    appartements: 0,
    terrains: 0,
    autres: 0,
  };

  pauTransactions.forEach(record => {
    if (record.type_local === 'Maison') stats.maisons++;
    else if (record.type_local === 'Appartement') stats.appartements++;
    else if (record.code_type_local === '4') stats.terrains++;
    else stats.autres++;
  });

  logger.info('📈 Statistiques:');
  logger.info(`  - Maisons: ${stats.maisons}`);
  logger.info(`  - Appartements: ${stats.appartements}`);
  logger.info(`  - Terrains: ${stats.terrains}`);
  logger.info(`  - Autres: ${stats.autres}`);

  // Afficher quelques exemples
  logger.info('\n📋 Exemples de transactions:');
  pauTransactions.slice(0, 5).forEach(record => {
    const prix = parseFloat(record.valeur_fonciere || '0');
    const surface = parseFloat(record.surface_reelle_bati || '0');
    const prixM2 = surface > 0 ? Math.round(prix / surface) : 0;

    logger.info(`  ${record.type_local || 'Terrain'} - ${record.nom_commune}`);
    logger.info(`    Prix: ${prix.toLocaleString('fr-FR')}€${surface > 0 ? ` (${prixM2}€/m²)` : ''}`);
    logger.info(`    Date: ${record.date_mutation}`);
    logger.info(`    Adresse: ${record.adresse_numero || ''} ${record.adresse_nom_voie || ''}`);
    if (surface > 0) logger.info(`    Surface: ${surface}m²`);
    logger.info('');
  });

  logger.info('✅ Import DVF terminé!');
  logger.info('\n💡 Prochaines étapes:');
  logger.info('  1. Créer une table DvfTransaction dans Prisma');
  logger.info('  2. Importer ces données en base');
  logger.info('  3. Créer un endpoint API pour interroger DVF');
  logger.info('  4. Afficher les comparables dans les popups de la carte');

  await prisma.$disconnect();
}

main().catch((error) => {
  logger.error('Erreur lors de l\'import DVF:', error);
  process.exit(1);
});
