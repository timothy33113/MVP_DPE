/**
 * Script de création des clusters de matching pour toutes les annonces
 *
 * Usage: pnpm create:clusters
 */

import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';
import { matchingService } from '../src/modules/matching/matching.service';

async function createClustersForAllAnnonces() {
  console.log('\n🎯 Création des clusters de matching\n');

  try {
    // Récupérer toutes les annonces
    const annonces = await prisma.leboncoinAnnonce.findMany();

    console.log(`📊 ${annonces.length} annonces à traiter\n`);

    let clustersCreated = 0;
    let clustersSkipped = 0;
    let errors = 0;

    for (const [index, annonce] of annonces.entries()) {
      console.log(`[${index + 1}/${annonces.length}] Traitement de l'annonce ${annonce.listId}...`);

      try {
        // Vérifier si un cluster existe déjà
        const existingCluster = await prisma.matchCluster.findUnique({
          where: { annonceId: annonce.id },
        });

        if (existingCluster) {
          console.log(`   ⏭️  Cluster déjà existant\n`);
          clustersSkipped++;
          continue;
        }

        // Récupérer les DPE du même code postal
        const dpes = await prisma.dpeRecord.findMany({
          where: { codePostalBan: annonce.codePostal },
          take: 100,
        });

        if (dpes.length === 0) {
          console.log(`   ⚠️  Aucun DPE pour le code postal ${annonce.codePostal}\n`);
          continue;
        }

        // Lancer le matching
        const result = await matchingService.matchAnnonceToDpes(annonce, dpes, {
          maxCandidats: 10,
          seuilScoreMinimum: 30,
          includeScoreDetails: true,
        });

        if (result.candidats.length === 0) {
          console.log(`   ⚠️  Aucun candidat valide trouvé\n`);
          continue;
        }

        // Créer le cluster
        const cluster = await prisma.matchCluster.create({
          data: {
            annonceId: annonce.id,
            nombreCandidats: result.candidats.length,
            meilleurScore: Math.max(...result.candidats.map(c => c.scoreNormalized)),
            statut: 'NON_VERIFIE',
            candidats: {
              create: result.candidats.map((candidat) => ({
                dpeId: candidat.dpeId,
                scoreTotal: candidat.scoreTotal,
                scoreBase: candidat.scoreBase,
                scoreBonus: candidat.scoreBonus,
                scoreNormalized: candidat.scoreNormalized,
                confiance: candidat.confiance,
                rang: candidat.rang,
                distanceGps: candidat.distanceGps,
                scoreDetails: candidat.scoreDetails as any,
              })),
            },
          },
        });

        console.log(`   ✅ Cluster créé avec ${result.candidats.length} candidats (meilleur score: ${cluster.meilleurScore}/100)\n`);
        clustersCreated++;

      } catch (error) {
        console.log(`   ❌ Erreur: ${error}\n`);
        logger.error(`Error creating cluster for annonce ${annonce.id}:`, error);
        errors++;
      }
    }

    // Statistiques finales
    console.log('\n✅ Création terminée!\n');
    console.log('📊 Résultats:');
    console.log(`   Annonces traitées: ${annonces.length}`);
    console.log(`   Clusters créés: ${clustersCreated}`);
    console.log(`   Clusters existants (ignorés): ${clustersSkipped}`);
    console.log(`   Erreurs: ${errors}`);
    console.log('');

    // Afficher quelques statistiques sur les clusters créés
    if (clustersCreated > 0) {
      const clusters = await prisma.matchCluster.findMany({
        include: {
          _count: {
            select: { candidats: true },
          },
        },
        orderBy: {
          meilleurScore: 'desc',
        },
        take: 5,
      });

      console.log('🏆 Top 5 des meilleurs clusters:\n');
      clusters.forEach((cluster, i) => {
        console.log(`   ${i + 1}. Cluster ${cluster.id.substring(0, 8)}... - Score: ${cluster.meilleurScore}/100 - ${cluster.nombreCandidats} candidats`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createClustersForAllAnnonces();
