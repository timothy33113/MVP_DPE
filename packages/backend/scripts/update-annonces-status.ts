/**
 * Script pour mettre à jour le statut des annonces Leboncoin
 *
 * Vérifie si les annonces sont toujours actives sur Leboncoin
 * et met à jour leur statut dans la base de données.
 *
 * Usage: npx ts-node scripts/update-annonces-status.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 50; // Nombre d'annonces à traiter en parallèle
const DELAY_BETWEEN_BATCHES = 2000; // Délai entre chaque batch (ms)
const REQUEST_TIMEOUT = 10000; // Timeout pour chaque requête (ms)

// ============================================================================
// Types
// ============================================================================

interface CheckResult {
  id: string;
  listId: string;
  url: string;
  isActive: boolean;
  statusCode?: number;
  error?: string;
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Vérifie si une annonce Leboncoin est toujours active
 */
async function checkAnnonceStatus(url: string): Promise<{ isActive: boolean; statusCode?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method: 'HEAD', // Utiliser HEAD pour ne récupérer que les headers (plus rapide)
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeoutId);

    // Une annonce est active si elle retourne 200
    // Une annonce désactivée retourne généralement 404
    const isActive = response.status === 200;

    return {
      isActive,
      statusCode: response.status,
    };
  } catch (error) {
    // En cas d'erreur (timeout, network error, etc), on considère l'annonce comme potentiellement active
    // pour éviter de marquer comme désactivée à cause d'un problème réseau temporaire
    return {
      isActive: true, // Par défaut, on considère active en cas d'erreur
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Traite un batch d'annonces
 */
async function processBatch(annonces: any[]): Promise<CheckResult[]> {
  const checks = annonces.map(async (annonce) => {
    const { isActive, statusCode, error } = await checkAnnonceStatus(annonce.url);

    return {
      id: annonce.id,
      listId: annonce.listId.toString(),
      url: annonce.url,
      isActive,
      statusCode,
      error,
    };
  });

  return Promise.all(checks);
}

/**
 * Délai
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Fonction principale
// ============================================================================

async function updateAnnoncesStatus(): Promise<void> {
  console.log('\n🔄 Mise à jour du statut des annonces Leboncoin\n');

  try {
    // 1. Récupérer toutes les annonces actuellement actives
    console.log('📊 Récupération des annonces...');

    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        statutAnnonce: {
          in: ['ACTIVE', 'NOUVELLE'],
        },
      },
      select: {
        id: true,
        listId: true,
        url: true,
        statutAnnonce: true,
        datePublication: true,
      },
      orderBy: {
        datePublication: 'desc',
      },
    });

    console.log(`   ✅ ${annonces.length} annonces à vérifier\n`);

    if (annonces.length === 0) {
      console.log('✅ Aucune annonce à vérifier');
      return;
    }

    // 2. Traiter les annonces par batch
    const batches = [];
    for (let i = 0; i < annonces.length; i += BATCH_SIZE) {
      batches.push(annonces.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 ${batches.length} batches de ${BATCH_SIZE} annonces max\n`);

    let totalProcessed = 0;
    let totalDesactivees = 0;
    let totalActives = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      console.log(`⏳ Traitement du batch ${i + 1}/${batches.length} (${batch.length} annonces)...`);

      const results = await processBatch(batch);

      // 3. Mettre à jour la base de données
      for (const result of results) {
        if (result.error) {
          console.log(`   ⚠️  Erreur pour ${result.listId}: ${result.error}`);
          totalErrors++;
          continue;
        }

        if (!result.isActive) {
          // Marquer comme désactivée
          await prisma.leboncoinAnnonce.update({
            where: { id: result.id },
            data: { statutAnnonce: 'DESACTIVEE' },
          });
          console.log(`   ❌ ${result.listId}: DÉSACTIVÉE (${result.statusCode})`);
          totalDesactivees++;
        } else {
          console.log(`   ✅ ${result.listId}: ACTIVE`);
          totalActives++;
        }

        totalProcessed++;
      }

      // Délai entre les batches pour éviter de surcharger Leboncoin
      if (i < batches.length - 1) {
        console.log(`   ⏸️  Pause de ${DELAY_BETWEEN_BATCHES}ms...\n`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // 4. Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`   Total traité: ${totalProcessed}/${annonces.length}`);
    console.log(`   ✅ Actives: ${totalActives}`);
    console.log(`   ❌ Désactivées: ${totalDesactivees}`);
    console.log(`   ⚠️  Erreurs: ${totalErrors}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Mise à jour terminée avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la mise à jour:\n');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  await updateAnnoncesStatus();
}

main();
