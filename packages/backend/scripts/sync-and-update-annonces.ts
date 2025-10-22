/**
 * Script pour synchroniser les annonces Leboncoin et mettre à jour leur statut
 *
 * Récupère les annonces actives via l'API RapidAPI et marque comme désactivées
 * celles qui n'apparaissent plus dans les résultats.
 *
 * Usage: npx ts-node scripts/sync-and-update-annonces.ts
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
const API_URL = `https://${RAPIDAPI_HOST}/v2/leboncoin/search_api`;

const DELAY_BETWEEN_REQUESTS = 1000; // Délai entre chaque requête (ms)
const ITEMS_PER_PAGE = 100; // Nombre max d'annonces par page
const MAX_PAGES = 50; // Limiter le nombre de pages à récupérer

// ============================================================================
// Types
// ============================================================================

interface LeboncoinSearchBody {
  filters: {
    category: { id: string };
    enums: { ad_type: string[] };
    location?: {
      locations: Array<{
        locationType: string;
        label: string;
        city: string;
        zipcode: string;
      }>;
    };
  };
  owner_type: string;
  limit: number;
  sort_by: string;
  sort_order: string;
  offset: number;
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Recherche des annonces via RapidAPI
 */
async function searchLeboncoinAnnonces(offset: number): Promise<any> {
  const searchBody: LeboncoinSearchBody = {
    filters: {
      category: {
        id: '9', // 9 = Ventes immobilières
      },
      enums: {
        ad_type: ['offer'],
      },
      location: {
        locations: [
          {
            locationType: 'city',
            label: 'Pau',
            city: 'Pau',
            zipcode: '64000',
          },
        ],
      },
    },
    owner_type: 'all',
    limit: ITEMS_PER_PAGE,
    sort_by: 'time',
    sort_order: 'desc',
    offset,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY!,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
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

async function syncAndUpdateAnnonces(): Promise<void> {
  console.log('\n🔄 Synchronisation et mise à jour des annonces Leboncoin\n');

  // Vérifier la clé API
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    console.error('❌ Erreur: RAPIDAPI_KEY non définie dans le fichier .env');
    process.exit(1);
  }

  try {
    console.log('📊 Récupération des annonces actives via l\'API...\n');

    const activeListIds = new Set<string>();
    let page = 0;
    let totalFetched = 0;
    let hasMore = true;

    // 1. Récupérer toutes les annonces actives via l'API
    while (hasMore && page < MAX_PAGES) {
      const offset = page * ITEMS_PER_PAGE;

      console.log(`⏳ Récupération de la page ${page + 1} (offset: ${offset})...`);

      try {
        const data = await searchLeboncoinAnnonces(offset);

        if (!data.ads || data.ads.length === 0) {
          console.log('   ℹ️  Aucune annonce supplémentaire trouvée');
          hasMore = false;
          break;
        }

        // Ajouter les list_id à notre Set
        for (const ad of data.ads) {
          if (ad.list_id) {
            activeListIds.add(ad.list_id.toString());
          }
        }

        totalFetched += data.ads.length;
        console.log(`   ✅ ${data.ads.length} annonces récupérées (total: ${totalFetched})`);

        // Vérifier s'il y a d'autres pages
        if (data.total && totalFetched >= data.total) {
          hasMore = false;
        } else if (data.ads.length < ITEMS_PER_PAGE) {
          hasMore = false;
        }

        page++;

        // Délai entre les requêtes pour éviter le rate limiting
        if (hasMore) {
          console.log(`   ⏸️  Pause de ${DELAY_BETWEEN_REQUESTS}ms...\n`);
          await sleep(DELAY_BETWEEN_REQUESTS);
        }

      } catch (error) {
        console.error(`   ❌ Erreur lors de la récupération: ${error}`);
        hasMore = false;
      }
    }

    console.log(`\n✅ ${activeListIds.size} annonces actives trouvées sur Leboncoin\n`);

    // 2. Récupérer toutes les annonces de notre base de données
    console.log('📊 Récupération des annonces en base de données...');

    const dbAnnonces = await prisma.leboncoinAnnonce.findMany({
      select: {
        id: true,
        listId: true,
        statutAnnonce: true,
      },
    });

    console.log(`   ✅ ${dbAnnonces.length} annonces en base de données\n`);

    // 3. Comparer et mettre à jour les statuts
    console.log('🔍 Comparaison et mise à jour des statuts...\n');

    let countDesactivees = 0;
    let countReactivees = 0;
    let countDejaNouvel = 0;
    let countDejaActive = 0;

    for (const dbAnnonce of dbAnnonces) {
      const listIdStr = dbAnnonce.listId.toString();
      const isActiveOnLeboncoin = activeListIds.has(listIdStr);

      if (isActiveOnLeboncoin) {
        // L'annonce est active sur Leboncoin
        if (dbAnnonce.statutAnnonce === 'DESACTIVEE') {
          // Réactiver l'annonce
          await prisma.leboncoinAnnonce.update({
            where: { id: dbAnnonce.id },
            data: { statutAnnonce: 'ACTIVE' },
          });
          console.log(`   🔄 ${listIdStr}: RÉACTIVÉE`);
          countReactivees++;
        } else if (dbAnnonce.statutAnnonce === 'NOUVELLE') {
          countDejaNouvel++;
        } else {
          countDejaActive++;
        }
      } else {
        // L'annonce n'est plus active sur Leboncoin
        if (dbAnnonce.statutAnnonce !== 'DESACTIVEE') {
          await prisma.leboncoinAnnonce.update({
            where: { id: dbAnnonce.id },
            data: { statutAnnonce: 'DESACTIVEE' },
          });
          console.log(`   ❌ ${listIdStr}: DÉSACTIVÉE`);
          countDesactivees++;
        }
      }
    }

    // 4. Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`   Annonces sur Leboncoin: ${activeListIds.size}`);
    console.log(`   Annonces en base: ${dbAnnonces.length}`);
    console.log('');
    console.log(`   ✅ Déjà actives: ${countDejaActive}`);
    console.log(`   🆕 Nouvelles (en attente): ${countDejaNouvel}`);
    console.log(`   🔄 Réactivées: ${countReactivees}`);
    console.log(`   ❌ Désactivées: ${countDesactivees}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Synchronisation terminée avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la synchronisation:\n');
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
  await syncAndUpdateAnnonces();
}

main();
