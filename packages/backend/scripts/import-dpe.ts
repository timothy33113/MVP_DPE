/**
 * Script d'import massif de données DPE depuis un CSV ADEME
 *
 * Usage: pnpm import:dpe <chemin-vers-fichier.csv>
 *
 * Fonctionnalités:
 * - Parse CSV avec papaparse
 * - Validation Zod stricte
 * - Import par batch de 1000 lignes
 * - Barre de progression
 * - Logging des erreurs
 * - Gestion des doublons
 * - Statistiques finales
 */

import fs from 'fs';
import path from 'path';
import papa from 'papaparse';
import cliProgress from 'cli-progress';
import { z } from 'zod';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 1000;
const ERROR_LOG_FILE = path.join(__dirname, '../logs/import-errors.log');

// Codes postaux pour la zone Pau et alentours (Pyrénées-Atlantiques)
const PAU_AREA_POSTAL_CODES = [
  '64000', // Pau
  '64110', // Jurançon
  '64140', // Billère, Lons
  '64230', // Lescar
  '64320', // Idron, Bizanos
  '64121', // Serres-Castet
  '64150', // Mourenx, Noguères
  '64160', // Morlaàs
  '64290', // Gan, Lasseube
  '64510', // Bordes, Assat
  '64800', // Nay
  '64300', // Orthez
];

// Filtrage géographique activé par défaut
const ENABLE_GEOGRAPHIC_FILTER = true;

// ============================================================================
// Schémas de validation
// ============================================================================

/**
 * Mapping des valeurs CSV vers les enums Prisma
 */
const typeBatimentMap: Record<string, TypeBatiment> = {
  'maison': TypeBatiment.MAISON,
  'appartement': TypeBatiment.APPARTEMENT,
  'immeuble': TypeBatiment.APPARTEMENT, // Mapper immeuble vers appartement
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

/**
 * Schéma de validation pour une ligne CSV ADEME
 */
const CSVRowSchema = z.object({
  numero_dpe: z.string().min(1),
  adresse_ban: z.string().min(1),
  code_postal_ban: z.string().length(5),
  type_batiment: z.string().toLowerCase().transform((val) => {
    const mapped = typeBatimentMap[val];
    if (!mapped) {
      throw new Error(`Type de bâtiment invalide: ${val}`);
    }
    return mapped;
  }),
  surface_habitable_logement: z.string().transform((val) => {
    const parsed = parseFloat(val.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`Surface invalide: ${val}`);
    }
    return parsed;
  }),
  annee_construction: z.string().optional().transform((val) => {
    if (!val || val === '' || val === 'N/A') return null;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1800 || parsed > new Date().getFullYear()) {
      return null;
    }
    return parsed;
  }),
  etiquette_dpe: z.string().toUpperCase().transform((val) => {
    const mapped = etiquetteDpeMap[val];
    if (!mapped) {
      throw new Error(`Étiquette DPE invalide: ${val}`);
    }
    return mapped;
  }),
  etiquette_ges: z.string().toUpperCase().transform((val) => {
    const mapped = etiquetteDpeMap[val];
    if (!mapped) {
      throw new Error(`Étiquette GES invalide: ${val}`);
    }
    return mapped;
  }),
  coordonnee_cartographique_x_ban: z.string().optional().transform((val) => {
    if (!val || val === '' || val === 'N/A') return null;
    const parsed = parseFloat(val.replace(',', '.'));
    if (isNaN(parsed)) return null;
    return parsed;
  }),
  coordonnee_cartographique_y_ban: z.string().optional().transform((val) => {
    if (!val || val === '' || val === 'N/A') return null;
    const parsed = parseFloat(val.replace(',', '.'));
    if (isNaN(parsed)) return null;
    return parsed;
  }),
  date_etablissement_dpe: z.string().transform((val) => {
    // Support formats: YYYY-MM-DD, DD/MM/YYYY
    let date: Date;

    if (val.includes('-')) {
      date = new Date(val);
    } else if (val.includes('/')) {
      const [day, month, year] = val.split('/');
      date = new Date(`${year}-${month}-${day}`);
    } else {
      throw new Error(`Format de date invalide: ${val}`);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Date invalide: ${val}`);
    }

    return date;
  }),
});

type CSVRow = z.input<typeof CSVRowSchema>;
type ValidatedRow = z.output<typeof CSVRowSchema>;

/**
 * Transform validated CSV row to Prisma format
 */
interface PrismaDpeData {
  numeroDpe: string;
  adresseBan: string;
  codePostalBan: string;
  typeBatiment: TypeBatiment;
  surfaceHabitable: number;
  anneConstruction: number | null;
  etiquetteDpe: EtiquetteDpe;
  etiquetteGes: EtiquetteDpe;
  coordonneeX: number | null;
  coordonneeY: number | null;
  dateEtablissement: Date;
  rawData: Record<string, unknown>;
}

function transformToPrisma(validated: ValidatedRow, raw: CSVRow): PrismaDpeData {
  return {
    numeroDpe: validated.numero_dpe,
    adresseBan: validated.adresse_ban,
    codePostalBan: validated.code_postal_ban,
    typeBatiment: validated.type_batiment,
    surfaceHabitable: validated.surface_habitable_logement,
    anneConstruction: validated.annee_construction,
    etiquetteDpe: validated.etiquette_dpe,
    etiquetteGes: validated.etiquette_ges,
    coordonneeX: validated.coordonnee_cartographique_x_ban,
    coordonneeY: validated.coordonnee_cartographique_y_ban,
    dateEtablissement: validated.date_etablissement_dpe,
    rawData: raw as Record<string, unknown>,
  };
}

// ============================================================================
// Logging des erreurs
// ============================================================================

function ensureLogDirectory(): void {
  const logDir = path.dirname(ERROR_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function logError(lineNumber: number, error: Error, row: CSVRow): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    lineNumber,
    error: error.message,
    row,
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(ERROR_LOG_FILE, logLine);
}

// ============================================================================
// Import functions
// ============================================================================

/**
 * Insert batch of DPE records with ON CONFLICT handling
 */
async function insertBatch(batch: PrismaDpeData[]): Promise<{ created: number; updated: number; errors: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  // Use Prisma's upsert for handling duplicates
  const promises = batch.map(async (data) => {
    try {
      const result = await prisma.dpeRecord.upsert({
        where: { numeroDpe: data.numeroDpe },
        update: {
          adresseBan: data.adresseBan,
          codePostalBan: data.codePostalBan,
          typeBatiment: data.typeBatiment,
          surfaceHabitable: data.surfaceHabitable,
          anneConstruction: data.anneConstruction,
          etiquetteDpe: data.etiquetteDpe,
          etiquetteGes: data.etiquetteGes,
          coordonneeX: data.coordonneeX,
          coordonneeY: data.coordonneeY,
          dateEtablissement: data.dateEtablissement,
          rawData: data.rawData as any,
        },
        create: data as any,
      });

      // Check if it was an update or create (approximation)
      const existing = await prisma.dpeRecord.findUnique({
        where: { numeroDpe: data.numeroDpe },
        select: { createdAt: true, updatedAt: true },
      });

      if (existing && existing.createdAt.getTime() !== existing.updatedAt.getTime()) {
        updated++;
      } else {
        created++;
      }
    } catch (error) {
      errors++;
      logger.error(`Failed to upsert DPE ${data.numeroDpe}:`, error);
    }
  });

  await Promise.all(promises);

  return { created, updated, errors };
}

/**
 * Parse and import CSV file
 */
async function importCSV(filePath: string): Promise<void> {
  console.log(`\n🚀 Starting DPE import from: ${filePath}\n`);

  if (ENABLE_GEOGRAPHIC_FILTER) {
    console.log(`📍 Filtrage géographique activé pour la zone Pau:`);
    console.log(`   Codes postaux: ${PAU_AREA_POSTAL_CODES.join(', ')}\n`);
  }

  // Ensure log directory exists
  ensureLogDirectory();

  // Clear previous error log
  if (fs.existsSync(ERROR_LOG_FILE)) {
    fs.unlinkSync(ERROR_LOG_FILE);
  }

  // Statistics
  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  let filteredRows = 0; // Rows filtered out by geographic filter
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  // Read file size for progress estimation
  const fileStats = fs.statSync(filePath);
  const fileSizeInBytes = fileStats.size;

  console.log(`📁 File size: ${(fileSizeInBytes / 1024 / 1024).toFixed(2)} MB\n`);

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total} rows | Speed: {speed} rows/s | ETA: {eta_formatted}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  const startTime = Date.now();
  let batch: PrismaDpeData[] = [];
  let lastProgressUpdate = Date.now();
  let rowsProcessedSinceLastUpdate = 0;

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);

    papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      worker: false,

      complete: async () => {
        try {
          // Insert remaining batch
          if (batch.length > 0) {
            const result = await insertBatch(batch);
            totalCreated += result.created;
            totalUpdated += result.updated;
            totalErrors += result.errors;
          }

          progressBar.stop();

          // Calculate statistics
          const duration = (Date.now() - startTime) / 1000;
          const speed = Math.round(totalRows / duration);

          // Display final statistics
          console.log('\n\n✅ Import completed!\n');
          console.log('📊 Statistics:');
          console.log(`   Total rows processed: ${totalRows}`);
          if (ENABLE_GEOGRAPHIC_FILTER) {
            console.log(`   🗺️  Filtered by geography: ${filteredRows} (${((filteredRows / totalRows) * 100).toFixed(2)}%)`);
          }
          console.log(`   ✓ Valid rows: ${validRows} (${((validRows / totalRows) * 100).toFixed(2)}%)`);
          console.log(`   ✗ Invalid rows: ${invalidRows} (${((invalidRows / totalRows) * 100).toFixed(2)}%)`);
          console.log(`   📝 Created: ${totalCreated}`);
          console.log(`   🔄 Updated: ${totalUpdated}`);
          console.log(`   ❌ Errors: ${totalErrors}`);
          console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
          console.log(`   🚀 Speed: ${speed} rows/s`);

          if (invalidRows > 0) {
            console.log(`\n⚠️  Error log: ${ERROR_LOG_FILE}`);
          }

          await prisma.$disconnect();
          resolve();
        } catch (error) {
          progressBar.stop();
          console.error('\n❌ Error during final batch insert:', error);
          await prisma.$disconnect();
          reject(error);
        }
      },

      error: (error) => {
        progressBar.stop();
        console.error('\n❌ Error parsing CSV:', error);
        reject(error);
      },

      step: async (results, parser) => {
        const row = results.data as CSVRow;
        totalRows++;

        // Start progress bar on first row
        if (totalRows === 1) {
          progressBar.start(100, 0, { speed: 0 });
        }

        // Apply geographic filter if enabled
        if (ENABLE_GEOGRAPHIC_FILTER) {
          const postalCode = row.code_postal_ban;
          if (!PAU_AREA_POSTAL_CODES.includes(postalCode)) {
            filteredRows++;
            return; // Skip this row
          }
        }

        // Validate row
        try {
          const validated = CSVRowSchema.parse(row);
          const prismaData = transformToPrisma(validated, row);
          batch.push(prismaData);
          validRows++;
        } catch (error) {
          invalidRows++;
          if (error instanceof Error) {
            logError(totalRows, error, row);
          }
        }

        // Insert batch when full
        if (batch.length >= BATCH_SIZE) {
          parser.pause();

          try {
            const result = await insertBatch(batch);
            totalCreated += result.created;
            totalUpdated += result.updated;
            totalErrors += result.errors;
            batch = [];
          } catch (error) {
            console.error('\n❌ Error inserting batch:', error);
          }

          parser.resume();
        }

        // Update progress bar
        rowsProcessedSinceLastUpdate++;
        const now = Date.now();
        if (now - lastProgressUpdate > 500) { // Update every 500ms
          const elapsed = (now - startTime) / 1000;
          const speed = Math.round(totalRows / elapsed);
          progressBar.update(Math.min(99, Math.round((totalRows / 100000) * 100)), { speed });
          lastProgressUpdate = now;
          rowsProcessedSinceLastUpdate = 0;
        }
      },
    });
  });
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: pnpm import:dpe <path-to-csv-file>');
    console.error('\nExample:');
    console.error('  pnpm import:dpe ./data/dpe-data.csv');
    process.exit(1);
  }

  const csvFilePath = args[0];

  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  // Check if file is CSV
  if (!csvFilePath.endsWith('.csv')) {
    console.error('❌ File must be a CSV file (.csv extension)');
    process.exit(1);
  }

  try {
    await importCSV(csvFilePath);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
