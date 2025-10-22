import { prisma } from '../src/config/database';

async function main() {
  console.log('🔍 Recherche des annonces avec surface terrain...\n');

  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'MAISON',
    },
    take: 50,
  });

  console.log(`📊 ${annonces.length} maisons trouvées\n`);

  let withTerrain = 0;

  for (const annonce of annonces) {
    const rawData = annonce.rawData as any;
    if (rawData?.attributes) {
      const landPlot = rawData.attributes.find((attr: any) => attr.key === 'land_plot_surface');
      if (landPlot && landPlot.value) {
        withTerrain++;
        console.log(`📍 ${annonce.listId}`);
        console.log(`   URL: ${annonce.url.substring(0, 70)}`);
        console.log(`   Surface habitable: ${annonce.surface}m²`);
        console.log(`   Surface terrain: ${landPlot.value}m²`);
        console.log(`   DPE: ${annonce.etiquetteDpe || 'N/A'}`);
        console.log(`   Code postal: ${annonce.codePostal}`);
        console.log('');
      }
    }
  }

  console.log(`\n✅ Total avec surface terrain: ${withTerrain}/${annonces.length}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
