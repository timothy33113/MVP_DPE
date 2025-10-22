/**
 * Script pour mettre à jour le statut des annonces Leboncoin via RapidAPI
 *
 * Vérifie si les annonces sont toujours actives sur Leboncoin
 * en utilisant l'API RapidAPI et met à jour leur statut dans la base de données.
 *
 * Usage: npx ts-node scripts/update-annonces-status-rapidapi.ts
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

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'leboncoin1.p.rapidapi.com';
const API_URL = `https://${RAPIDAPI_HOST}/v2/leboncoin/get_ad_detail`;

const BATCH_SIZE = 10; // Nombre d'annonces à traiter en parallèle (réduit pour éviter de surcharger l'API)
const DELAY_BETWEEN_BATCHES = 3000; // Délai entre chaque batch (ms)

// ============================================================================
// Types
// ============================================================================

interface CheckResult {
  id: string;
  listId: string;
  isActive: boolean;
  error?: string;
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Vérifie si une annonce Leboncoin est toujours active via RapidAPI
 */
async function checkAnnonceStatusViaAPI(listId: string): Promise<{ isActive: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?ad_id=${listId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      // Si l'API retourne une erreur, on considère l'annonce comme désactivée
      if (response.status === 404) {
        return { isActive: false };
      }

      // Pour d'autres erreurs, on considère comme erreur (on ne change pas le statut)
      return {
        isActive: true, // Par défaut, on garde active en cas d'erreur API
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data: any = await response.json();

    // Vérifier si l'annonce existe et est active
    // Si l'API retourne des données, l'annonce est active
    if (data && (data.list_id || data.subject || data.url)) {
      return { isActive: true };
    }

    // Si pas de données pertinentes, considérer comme désactivée
    return { isActive: false };

  } catch (error) {
    // En cas d'erreur (timeout, network error, etc), on garde le statut actuel
    return {
      isActive: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Traite un batch d'annonces
 */
async function processBatch(annonces: any[]): Promise<CheckResult[]> {
  const checks = annonces.map(async (annonce) => {
    const { isActive, error } = await checkAnnonceStatusViaAPI(annonce.listId.toString());

    return {
      id: annonce.id,
      listId: annonce.listId.toString(),
      isActive,
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
  console.log('\n🔄 Mise à jour du statut des annonces Leboncoin via RapidAPI\n');

  // Vérifier la clé API
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    console.error('❌ Erreur: RAPIDAPI_KEY non définie dans le fichier .env');
    process.exit(1);
  }

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
          console.log(`   ❌ ${result.listId}: DÉSACTIVÉE`);
          totalDesactivees++;
        } else {
          console.log(`   ✅ ${result.listId}: ACTIVE`);
          totalActives++;
        }

        totalProcessed++;
      }

      // Délai entre les batches pour éviter de dépasser les limites de l'API
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
