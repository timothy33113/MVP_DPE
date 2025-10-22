/**
 * Script pour synchroniser les annonces Leboncoin sur TOUS les codes postaux
 *
 * Récupère les annonces actives via l'API RapidAPI pour chaque code postal
 * et marque comme désactivées celles qui n'apparaissent plus dans les résultats.
 *
 * Usage: npx ts-node scripts/sync-all-postal-codes.ts
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

const DELAY_BETWEEN_REQUESTS = 1500; // Délai entre chaque requête (ms) - augmenté pour éviter rate limiting
const ITEMS_PER_PAGE = 100; // Nombre max d'annonces par page
const MAX_PAGES = 30; // Limiter le nombre de pages par code postal

// ============================================================================
// Types
// ============================================================================

interface LeboncoinSearchBody {
  filters: {
    category: { id: string };
    enums: { ad_type: string[] };
    location?: {
      locations: Array<{
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
 * Recherche des annonces via RapidAPI pour un code postal spécifique
 */
async function searchLeboncoinAnnoncesByPostalCode(offset: number, postalCode: string): Promise<any> {
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
            zipcode: postalCode,
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
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
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
  console.log('\n🔄 Synchronisation et mise à jour des annonces Leboncoin (tous codes postaux)\n');

  // Vérifier la clé API
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    console.error('❌ Erreur: RAPIDAPI_KEY non définie dans le fichier .env');
    process.exit(1);
  }

  try {
    // 0. Récupérer tous les codes postaux uniques de la base
    console.log('📊 Récupération des codes postaux...\n');

    const postalCodes = await prisma.$queryRaw<Array<{ codePostal: string }>>`
      SELECT DISTINCT "codePostal" FROM leboncoin_annonces ORDER BY "codePostal"
    `;

    console.log(`   ✅ ${postalCodes.length} codes postaux à scanner\n`);

    const activeListIds = new Set<string>();
    let totalFetched = 0;
    let totalPostalCodesScanned = 0;

    // 1. Récupérer toutes les annonces actives via l'API pour chaque code postal
    for (const { codePostal } of postalCodes) {
      console.log(`\n📍 Recherche pour le code postal ${codePostal}...`);

      let page = 0;
      let hasMore = true;
      let postalCodeFetched = 0;

      while (hasMore && page < MAX_PAGES) {
        const offset = page * ITEMS_PER_PAGE;

        console.log(`   ⏳ Page ${page + 1} (offset: ${offset})...`);

        try {
          const data = await searchLeboncoinAnnoncesByPostalCode(offset, codePostal);

          if (!data.ads || data.ads.length === 0) {
            console.log(`   ℹ️  Aucune annonce supplémentaire pour ${codePostal}`);
            hasMore = false;
            break;
          }

          // Ajouter les list_id à notre Set
          for (const ad of data.ads) {
            if (ad.list_id) {
              activeListIds.add(ad.list_id.toString());
            }
          }

          postalCodeFetched += data.ads.length;
          totalFetched += data.ads.length;
          console.log(`   ✅ ${data.ads.length} annonces récupérées (CP: ${postalCodeFetched}, Total: ${totalFetched})`);

          // Vérifier s'il y a d'autres pages
          if (data.total && postalCodeFetched >= data.total) {
            hasMore = false;
          } else if (data.ads.length < ITEMS_PER_PAGE) {
            hasMore = false;
          }

          page++;

          // Délai entre les requêtes pour éviter le rate limiting
          if (hasMore) {
            await sleep(DELAY_BETWEEN_REQUESTS);
          }

        } catch (error: any) {
          if (error.message === 'RATE_LIMIT') {
            console.log(`   ⚠️  Rate limit atteint, pause de 10 secondes...`);
            await sleep(10000);
            // Réessayer la même page
            continue;
          }
          console.error(`   ❌ Erreur lors de la récupération: ${error.message}`);
          hasMore = false;
        }
      }

      totalPostalCodesScanned++;
      console.log(`   ✅ ${codePostal} terminé (${postalCodeFetched} annonces)`);
    }

    console.log(`\n✅ ${activeListIds.size} annonces actives uniques trouvées sur Leboncoin\n`);
    console.log(`   📊 ${totalPostalCodesScanned}/${postalCodes.length} codes postaux scannés\n`);

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
    console.log(`   Codes postaux scannés: ${totalPostalCodesScanned}/${postalCodes.length}`);
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
