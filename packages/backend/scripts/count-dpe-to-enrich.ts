import { prisma } from '../src/config/database';

async function main() {
  const total = await prisma.dpeRecord.count({
    where: {
      typeBatiment: 'MAISON',
      surfaceTerrain: null,
    }
  });

  const enriched = await prisma.dpeRecord.count({
    where: {
      typeBatiment: 'MAISON',
      surfaceTerrain: { not: null },
    }
  });

  console.log('\n📊 État de l\'enrichissement cadastral:\n');
  console.log(`   DPE Maisons à enrichir: ${total}`);
  console.log(`   DPE Maisons déjà enrichis: ${enriched}`);
  console.log(`   Total DPE Maisons: ${total + enriched}`);
  console.log(`   Progression: ${((enriched / (total + enriched)) * 100).toFixed(1)}%`);
  console.log('');

  await prisma.$disconnect();
}

main();
