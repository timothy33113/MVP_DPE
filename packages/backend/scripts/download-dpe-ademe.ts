/**
 * Script de téléchargement des DPE récents depuis l'API ADEME
 *
 * Usage: pnpm tsx scripts/download-dpe-ademe.ts [departement]
 * Exemple: pnpm tsx scripts/download-dpe-ademe.ts 64
 *
 * Stratégie: Télécharge via wget les données filtrées depuis l'API ADEME
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DownloadOptions {
  departement: string;
  limit: number;
}

async function downloadDpeDataWithWget(options: DownloadOptions): Promise<string> {
  const { departement, limit } = options;

  console.log('🔍 Téléchargement des DPE ADEME via wget...');
  console.log(`   Département: ${departement}`);
  console.log(`   Limite: ${limit} DPE`);
  console.log('');

  // Créer le dossier data s'il n'existe pas
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `dpe-${departement}-${timestamp}.csv`;
  const filepath = path.join(dataDir, filename);

  // Construire l'URL avec les bons paramètres
  // On utilise l'API data.ademe.fr qui est plus stable
  const baseUrl = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

  const params = [
    `size=${limit}`,
    'format=csv',
    `q=Code_postal_%28BAN%29:${departement}*`,
    'sort=Date_établissement_DPE:-1',
    [
      'N°_DPE',
      'Adresse_(BAN)',
      'Code_postal_(BAN)',
      'Type_bâtiment',
      'Etiquette_DPE',
      'Etiquette_GES',
      'Surface_habitable_logement',
      'Année_construction',
      'Date_établissement_DPE',
      'Coordonnée_cartésienne_X_(BAN)',
      'Coordonnée_cartésienne_Y_(BAN)',
    ].map(field => `select=${encodeURIComponent(field)}`).join('&'),
  ];

  const url = `${baseUrl}?${params.join('&')}`;

  console.log('📡 Téléchargement en cours...');

  try {
    // Utiliser curl au lieu de wget (plus standard sur macOS)
    const curlCommand = `curl -L -o "${filepath}" "${url}"`;

    console.log('🔧 Commande: curl -L ...');

    const { stdout, stderr } = await execAsync(curlCommand, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    if (stderr && stderr.includes('error')) {
      throw new Error(`Curl error: ${stderr}`);
    }

    // Vérifier que le fichier existe et n'est pas vide
    if (!fs.existsSync(filepath)) {
      throw new Error('Le fichier téléchargé n\'existe pas');
    }

    const stats = fs.statSync(filepath);
    if (stats.size === 0) {
      throw new Error('Le fichier téléchargé est vide');
    }

    console.log(`✅ Fichier téléchargé: ${(stats.size / 1024).toFixed(2)} KB`);

    return filepath;

  } catch (error: any) {
    console.error('❌ Erreur curl:', error.message);

    // Essayer une approche alternative: télécharger depuis une URL plus simple
    console.log('');
    console.log('🔄 Tentative alternative avec une requête simplifiée...');

    const simpleUrl = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?size=${limit}&format=csv&q=${departement}`;
    const simpleCurlCommand = `curl -L -o "${filepath}" "${simpleUrl}"`;

    try {
      await execAsync(simpleCurlCommand, {
        maxBuffer: 50 * 1024 * 1024,
      });

      const stats = fs.statSync(filepath);
      if (stats.size === 0) {
        throw new Error('Le fichier téléchargé est vide');
      }

      console.log(`✅ Fichier téléchargé (méthode alternative): ${(stats.size / 1024).toFixed(2)} KB`);
      return filepath;

    } catch (altError: any) {
      throw new Error(`Échec des deux méthodes de téléchargement: ${altError.message}`);
    }
  }
}

async function filterByDateIfNeeded(filepath: string, dateMin: string): Promise<void> {
  console.log('');
  console.log('📅 Filtrage par date si nécessaire...');

  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  if (lines.length === 0) {
    throw new Error('Fichier CSV vide');
  }

  // Compter les lignes
  const dataLines = lines.length - 1; // -1 pour l'en-tête
  console.log(`   Lignes totales: ${dataLines}`);

  // On pourrait filtrer par date ici si nécessaire
  // Pour l'instant on garde tout
}

async function main() {
  try {
    // Récupérer le département depuis les arguments
    const departement = process.argv[2] || '64';
    const limit = parseInt(process.argv[3] || '50000');

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('   📥 Téléchargement DPE ADEME');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    // Télécharger les données
    const filepath = await downloadDpeDataWithWget({
      departement,
      limit,
    });

    // Filtrer par date si besoin
    await filterByDateIfNeeded(filepath, '2025-09-01');

    // Lire le fichier pour vérifier les données
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const dataLines = lines.length - 1;

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('   ✅ Téléchargement réussi!');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(`📊 Statistiques:`);
    console.log(`   Fichier: ${filepath}`);
    console.log(`   Lignes de données: ${dataLines}`);
    console.log('');
    console.log('📝 Pour importer ces données dans la base:');
    console.log(`   cd /Users/timothy/MVP_DPE/packages/backend`);
    console.log(`   pnpm import:dpe ${filepath}`);
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════');
    console.error('   ❌ ERREUR');
    console.error('═══════════════════════════════════════════════');
    console.error('');
    console.error(error.message);
    console.error('');
    console.error('💡 Solutions possibles:');
    console.error('   1. Vérifier la connexion internet');
    console.error('   2. Vérifier que curl est installé');
    console.error('   3. Essayer avec un limit plus petit (ex: 10000)');
    console.error('');
    process.exit(1);
  }
}

main();
