import { prisma } from '../src/config/database';

async function main() {
  console.log('=== MAISONS SANS DPE/GES ===\n');

  const maisonsSansDpe = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'MAISON',
      etiquetteDpe: null,
      etiquetteGes: null
    },
    take: 15,
    select: {
      url: true,
      surface: true,
      pieces: true,
      codePostal: true,
      rawData: true
    }
  });

  maisonsSansDpe.forEach((annonce, i) => {
    const rawData = annonce.rawData as any;
    const title = rawData?.subject || 'N/A';
    console.log(`${i + 1}. ${title}`);
    console.log(`   Surface: ${annonce.surface}m² - Pièces: ${annonce.pieces || 'N/A'} - CP: ${annonce.codePostal}`);
    console.log(`   ${annonce.url}\n`);
  });

  console.log('\n=== APPARTEMENTS SANS DPE/GES ===\n');

  const appartsSansDpe = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'APPARTEMENT',
      etiquetteDpe: null,
      etiquetteGes: null
    },
    take: 15,
    select: {
      url: true,
      surface: true,
      pieces: true,
      codePostal: true,
      rawData: true
    }
  });

  appartsSansDpe.forEach((annonce, i) => {
    const rawData = annonce.rawData as any;
    const title = rawData?.subject || 'N/A';
    console.log(`${i + 1}. ${title}`);
    console.log(`   Surface: ${annonce.surface}m² - Pièces: ${annonce.pieces || 'N/A'} - CP: ${annonce.codePostal}`);
    console.log(`   ${annonce.url}\n`);
  });

  console.log('\n=== TERRAINS AVEC DPE/GES (ANORMAL!) ===\n');

  const terrainsAvecDpe = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'TERRAIN',
      OR: [
        { etiquetteDpe: { not: null } },
        { etiquetteGes: { not: null } }
      ]
    },
    select: {
      url: true,
      surface: true,
      etiquetteDpe: true,
      etiquetteGes: true,
      codePostal: true,
      rawData: true
    }
  });

  console.log(`Trouvé ${terrainsAvecDpe.length} terrains avec DPE/GES\n`);

  terrainsAvecDpe.forEach((annonce, i) => {
    const rawData = annonce.rawData as any;
    const title = rawData?.subject || 'N/A';
    console.log(`${i + 1}. ${title}`);
    console.log(`   Surface: ${annonce.surface}m² - CP: ${annonce.codePostal}`);
    console.log(`   DPE: ${annonce.etiquetteDpe || 'null'} - GES: ${annonce.etiquetteGes || 'null'}`);
    console.log(`   ${annonce.url}\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
