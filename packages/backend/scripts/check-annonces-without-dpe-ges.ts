import { prisma } from '../src/config/database';

async function main() {
  // Annonces sans etiquetteDpe ET sans etiquetteGes dans leurs propres champs
  const annoncesSansDpeGes = await prisma.leboncoinAnnonce.count({
    where: {
      etiquetteDpe: null,
      etiquetteGes: null
    }
  });

  // Par type
  const maisonsSansDpeGes = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'MAISON',
      etiquetteDpe: null,
      etiquetteGes: null
    }
  });

  const appartsSansDpeGes = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'APPARTEMENT',
      etiquetteDpe: null,
      etiquetteGes: null
    }
  });

  const terrainsSansDpeGes = await prisma.leboncoinAnnonce.count({
    where: {
      typeBien: 'TERRAIN',
      etiquetteDpe: null,
      etiquetteGes: null
    }
  });

  // Total annonces
  const total = await prisma.leboncoinAnnonce.count();
  const totalMaisons = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'MAISON' }});
  const totalApparts = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'APPARTEMENT' }});
  const totalTerrains = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'TERRAIN' }});

  console.log('=== ANNONCES SANS DPE ET GES (dans les champs Leboncoin) ===\n');

  console.log('TOTAL:');
  console.log(`  Annonces totales: ${total}`);
  console.log(`  Sans DPE et GES: ${annoncesSansDpeGes} (${(annoncesSansDpeGes/total*100).toFixed(1)}%)`);

  console.log('\nMAISONS:');
  console.log(`  Total: ${totalMaisons}`);
  console.log(`  Sans DPE et GES: ${maisonsSansDpeGes} (${(maisonsSansDpeGes/totalMaisons*100).toFixed(1)}%)`);

  console.log('\nAPPARTEMENTS:');
  console.log(`  Total: ${totalApparts}`);
  console.log(`  Sans DPE et GES: ${appartsSansDpeGes} (${(appartsSansDpeGes/totalApparts*100).toFixed(1)}%)`);

  console.log('\nTERRAINS:');
  console.log(`  Total: ${totalTerrains}`);
  console.log(`  Sans DPE et GES: ${terrainsSansDpeGes} (${(terrainsSansDpeGes/totalTerrains*100).toFixed(1)}%)`);

  // Exemples d'annonces sans DPE/GES (hors terrains)
  console.log('\n=== EXEMPLES D\'ANNONCES SANS DPE/GES (hors terrains) ===\n');

  const exemples = await prisma.leboncoinAnnonce.findMany({
    where: {
      etiquetteDpe: null,
      etiquetteGes: null,
      typeBien: {
        not: 'TERRAIN'
      }
    },
    take: 10,
    select: {
      url: true,
      typeBien: true,
      surface: true,
      codePostal: true
    }
  });

  exemples.forEach((annonce, i) => {
    console.log(`${i + 1}. ${annonce.typeBien} - ${annonce.surface}m² - ${annonce.codePostal}`);
    console.log(`   ${annonce.url}\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
