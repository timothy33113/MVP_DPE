import { prisma } from '../src/config/database';

async function main() {
  const annonce = await prisma.leboncoinAnnonce.findFirst({
    where: { listId: BigInt('3060434384') }
  });

  console.log('Annonce:', annonce!.listId.toString());
  console.log('Code postal:', annonce!.codePostal);
  console.log('Type:', annonce!.typeBien);
  console.log('Surface:', annonce!.surface);
  console.log('DPE:', annonce!.etiquetteDpe, 'GES:', annonce!.etiquetteGes);
  console.log('');

  const dpes = await prisma.dpeRecord.findMany({
    where: {
      codePostalBan: annonce!.codePostal,
      typeBatiment: annonce!.typeBien,
      surfaceTerrain: { not: null },
    },
    take: 5,
  });

  console.log('DPE enrichis trouvés:', dpes.length);
  dpes.forEach((d, i) => {
    console.log('');
    console.log(`${i + 1}. ${d.adresseBan}`);
    console.log('   Code postal:', d.codePostalBan);
    console.log('   Type:', d.typeBatiment);
    console.log('   Surface hab:', d.surfaceHabitable, 'm²');
    console.log('   Surface terrain:', d.surfaceTerrain, 'm²');
    console.log('   DPE:', d.etiquetteDpe, 'GES:', d.etiquetteGes);
  });

  await prisma.$disconnect();
}

main();
