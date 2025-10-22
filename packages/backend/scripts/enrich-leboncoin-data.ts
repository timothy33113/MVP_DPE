/**
 * Script d'enrichissement des annonces Leboncoin
 * Extrait le prix, chambres, équipements et état depuis rawData
 */

import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';

interface Attribute {
  key: string;
  value: string;
  value_label?: string;
}

interface RawData {
  price?: number[];
  body?: string;
  attributes?: Attribute[];
}

/**
 * Extrait les attributs depuis le rawData
 */
function extractAttributes(rawData: RawData) {
  const result: any = {
    prix: null,
    chambres: null,
    surfaceTerrain: null,
    avecBalcon: false,
    avecTerrasse: false,
    avecGarage: false,
    avecCave: false,
    avecParkingPrive: false,
    etatBien: null,
  };

  // 1. Extraire le prix
  if (rawData.price && rawData.price.length > 0) {
    result.prix = rawData.price[0];
  }

  // 2. Parcourir les attributes
  if (rawData.attributes && Array.isArray(rawData.attributes)) {
    for (const attr of rawData.attributes) {
      switch (attr.key) {
        case 'bedrooms':
          result.chambres = parseInt(attr.value) || null;
          break;

        case 'land_plot_area':
          result.surfaceTerrain = parseFloat(attr.value) || null;
          break;

        case 'balcony':
          result.avecBalcon = attr.value === '1' || attr.value === 'true';
          break;

        case 'terrace':
          result.avecTerrasse = attr.value === '1' || attr.value === 'true';
          break;

        case 'garage':
        case 'parking':
          result.avecGarage = attr.value === '1' || attr.value === 'true';
          break;

        case 'cellar':
          result.avecCave = attr.value === '1' || attr.value === 'true';
          break;

        case 'private_parking':
          result.avecParkingPrive = attr.value === '1' || attr.value === 'true';
          break;
      }
    }
  }

  // 3. Détecter l'état du bien depuis la description
  if (rawData.body) {
    const body = rawData.body.toLowerCase();

    if (body.includes('neuf') || body.includes('construction neuve')) {
      result.etatBien = 'neuf';
    } else if (
      body.includes('entièrement rénové') ||
      body.includes('entierement renove') ||
      body.includes('refait à neuf') ||
      body.includes('rénovation complète')
    ) {
      result.etatBien = 'renove';
    } else if (
      body.includes('travaux à prévoir') ||
      body.includes('gros travaux') ||
      body.includes('à rénover') ||
      body.includes('à restaurer')
    ) {
      result.etatBien = 'travaux';
    } else if (
      body.includes('à rafraîchir') ||
      body.includes('à rafraichir') ||
      body.includes('petits travaux') ||
      body.includes('quelques travaux')
    ) {
      result.etatBien = 'a_rafraichir';
    } else if (
      body.includes('bon état') ||
      body.includes('très bon état') ||
      body.includes('bien entretenu')
    ) {
      result.etatBien = 'bon_etat';
    }
  }

  // 4. Détections alternatives pour équipements dans le body
  if (rawData.body && !result.avecBalcon) {
    const body = rawData.body.toLowerCase();
    if (body.includes('balcon')) result.avecBalcon = true;
    if (body.includes('terrasse')) result.avecTerrasse = true;
    if (body.includes('garage') || body.includes('box')) result.avecGarage = true;
    if (body.includes('cave')) result.avecCave = true;
    if (body.includes('parking privé') || body.includes('place de parking')) {
      result.avecParkingPrive = true;
    }
  }

  return result;
}

/**
 * Enrichit toutes les annonces Leboncoin
 */
async function enrichLeboncoinData() {
  try {
    logger.info('🚀 Début de l\'enrichissement des annonces Leboncoin...');

    // Récupérer toutes les annonces avec rawData
    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        rawData: {
          not: { equals: null },
        },
      },
    });

    logger.info(`📊 ${annonces.length} annonces à traiter`);

    let enrichedCount = 0;
    let errorCount = 0;

    for (const annonce of annonces) {
      try {
        const rawData = annonce.rawData as RawData;
        const enrichedData = extractAttributes(rawData);

        // Mettre à jour l'annonce
        await prisma.leboncoinAnnonce.update({
          where: { id: annonce.id },
          data: enrichedData,
        });

        enrichedCount++;

        // Log tous les 10 enrichissements
        if (enrichedCount % 10 === 0) {
          logger.info(`✅ ${enrichedCount}/${annonces.length} annonces enrichies`);
        }

        // Afficher un exemple du premier enrichissement
        if (enrichedCount === 1) {
          logger.info('📝 Exemple d\'enrichissement:', {
            listId: annonce.listId,
            avant: {
              surface: annonce.surface,
              pieces: annonce.pieces,
            },
            apres: enrichedData,
          });
        }
      } catch (error: any) {
        errorCount++;
        logger.error(`❌ Erreur pour l'annonce ${annonce.listId}:`, error.message);
      }
    }

    logger.info('✅ Enrichissement terminé!');
    logger.info(`   - ${enrichedCount} annonces enrichies avec succès`);
    logger.info(`   - ${errorCount} erreurs`);

    // Statistiques finales
    const stats = await prisma.leboncoinAnnonce.aggregate({
      _count: {
        prix: true,
        chambres: true,
        surfaceTerrain: true,
        avecBalcon: true,
        avecGarage: true,
      },
      where: {
        prix: { not: null },
      },
    });

    logger.info('📊 Statistiques post-enrichissement:');
    logger.info(`   - Annonces avec prix: ${stats._count.prix}`);
    logger.info(`   - Annonces avec chambres: ${stats._count.chambres}`);
    logger.info(`   - Annonces avec terrain: ${stats._count.surfaceTerrain}`);

    // Exemples d'annonces enrichies
    const exemples = await prisma.leboncoinAnnonce.findMany({
      where: { prix: { not: null } },
      take: 5,
      select: {
        listId: true,
        prix: true,
        chambres: true,
        avecGarage: true,
        avecBalcon: true,
        etatBien: true,
        typeBien: true,
        codePostal: true,
      },
    });

    logger.info('📋 Exemples d\'annonces enrichies:');
    exemples.forEach((ex) => {
      logger.info(
        `   - ${ex.typeBien} ${ex.codePostal}: ${ex.prix}€, ${ex.chambres} ch, ` +
          `garage=${ex.avecGarage}, balcon=${ex.avecBalcon}, état=${ex.etatBien}`
      );
    });
  } catch (error: any) {
    logger.error('❌ Erreur fatale:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  enrichLeboncoinData()
    .then(() => {
      logger.info('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script terminé avec erreur:', error);
      process.exit(1);
    });
}

export { enrichLeboncoinData, extractAttributes };
