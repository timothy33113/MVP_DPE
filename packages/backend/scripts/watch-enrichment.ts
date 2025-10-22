import { prisma } from '../src/config/database';

async function watch() {
  console.clear();
  console.log('🔄 Surveillance de l\'enrichissement cadastral\n');

  const enriched = await prisma.dpeRecord.count({
    where: {
      typeBatiment: 'MAISON',
      surfaceTerrain: { not: null },
    }
  });

  const total = await prisma.dpeRecord.count({
    where: {
      typeBatiment: 'MAISON',
    }
  });

  const toEnrich = total - enriched;
  const progress = (enriched / total) * 100;

  console.log(`📊 Progression:\n`);
  console.log(`   DPE enrichis: ${enriched} / ${total}`);
  console.log(`   Restant: ${toEnrich}`);
  console.log(`   Progression: ${progress.toFixed(2)}%`);
  console.log(`\n   [${'█'.repeat(Math.floor(progress / 2))}${' '.repeat(50 - Math.floor(progress / 2))}] ${progress.toFixed(1)}%`);
  console.log('');

  await prisma.$disconnect();
}

watch();
