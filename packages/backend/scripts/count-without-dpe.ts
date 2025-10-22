import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Total annonces
  const total = await prisma.leboncoinAnnonce.count();

  // Annonces avec au moins un match DPE
  const withMatch = await prisma.leboncoinAnnonce.count({
    where: {
      matchCluster: {
        candidats: {
          some: {}
        }
      }
    }
  });

  // Annonces sans match DPE
  const withoutMatch = total - withMatch;

  // Par type de bien
  const maisonTotal = await prisma.leboncoinAnnonce.count({
    where: { typeBien: 'MAISON' }
  });

  const maisonWithMatch = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'MAISON',
      matchCluster: {
        candidats: {
          some: {}
        }
      }
    }
  });

  const appartTotal = await prisma.leboncoinAnnonce.count({
    where: { typeBien: 'APPARTEMENT' }
  });

  const appartWithMatch = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'APPARTEMENT',
      matchCluster: {
        candidats: {
          some: {}
        }
      }
    }
  });

  const terrainTotal = await prisma.leboncoinAnnonce.count({
    where: { typeBien: 'TERRAIN' }
  });

  const terrainWithMatch = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'TERRAIN',
      matchCluster: {
        candidats: {
          some: {}
        }
      }
    }
  });

  console.log('=== STATISTIQUES DPE ===\n');
  console.log('TOTAL:');
  console.log(`  Annonces totales: ${total}`);
  console.log(`  Avec DPE: ${withMatch} (${(withMatch/total*100).toFixed(1)}%)`);
  console.log(`  Sans DPE: ${withoutMatch} (${(withoutMatch/total*100).toFixed(1)}%)`);

  console.log('\nMAISONS:');
  console.log(`  Total: ${maisonTotal}`);
  console.log(`  Avec DPE: ${maisonWithMatch} (${(maisonWithMatch/maisonTotal*100).toFixed(1)}%)`);
  console.log(`  Sans DPE: ${maisonTotal - maisonWithMatch} (${((maisonTotal-maisonWithMatch)/maisonTotal*100).toFixed(1)}%)`);

  console.log('\nAPPARTEMENTS:');
  console.log(`  Total: ${appartTotal}`);
  console.log(`  Avec DPE: ${appartWithMatch} (${(appartWithMatch/appartTotal*100).toFixed(1)}%)`);
  console.log(`  Sans DPE: ${appartTotal - appartWithMatch} (${((appartTotal-appartWithMatch)/appartTotal*100).toFixed(1)}%)`);

  console.log('\nTERRAINS:');
  console.log(`  Total: ${terrainTotal}`);
  console.log(`  Avec DPE: ${terrainWithMatch} (${(terrainWithMatch/terrainTotal*100).toFixed(1)}%)`);
  console.log(`  Sans DPE: ${terrainTotal - terrainWithMatch} (${((terrainTotal-terrainWithMatch)/terrainTotal*100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

main().catch(console.error);
