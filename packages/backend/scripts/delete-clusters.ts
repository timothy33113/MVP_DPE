/**
 * Script pour supprimer tous les clusters existants
 * Utilise Prisma pour éviter les problèmes de connexion PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteClusters() {
  console.log('🗑️  Suppression des anciens clusters...');

  try {
    // Supprimer d'abord les candidats (relation)
    const deletedCandidats = await prisma.matchCandidat.deleteMany({});
    console.log(`✅ ${deletedCandidats.count} candidats supprimés`);

    // Puis supprimer les clusters
    const deletedClusters = await prisma.matchCluster.deleteMany({});
    console.log(`✅ ${deletedClusters.count} clusters supprimés`);

    console.log('✨ Suppression terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteClusters();
