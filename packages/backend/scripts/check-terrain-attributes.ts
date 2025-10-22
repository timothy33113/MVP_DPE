/**
 * Script pour vérifier si les annonces avec surfaces aberrantes sont des terrains
 */

import { prisma } from '../src/config/database';

async function main() {
  // Prendre des annonces avec surface aberrante
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      surface: { gte: 500 }, // Surface > 500m² (suspect)
    },
    take: 5,
  });

  console.log('=== ANNONCES AVEC SURFACES ABERRANTES (> 500m²) ===\n');
  console.log(`Trouvé ${annonces.length} annonces\n`);

  for (const annonce of annonces) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('URL:', annonce.url);
    console.log('Surface:', annonce.surface, 'm²');
    console.log('Type:', annonce.typeBien);
    console.log('DPE:', annonce.etiquetteDpe || 'N/A');

    const rawData: any = annonce.rawData;
    if (rawData?.attributes && Array.isArray(rawData.attributes)) {
      console.log('\n📋 Attributs (' + rawData.attributes.length + ' total):');

      // Afficher tous les attributs
      rawData.attributes.forEach((attr: any) => {
        const value = attr.value || attr.values?.join(', ') || 'N/A';
        console.log(`  - ${attr.key}: ${value}`);
      });

      // Chercher des indices de terrain
      const terrainKeywords = ['terrain', 'land', 'plot', 'construction'];
      const found = rawData.attributes.filter((attr: any) =>
        terrainKeywords.some(
          (kw) =>
            attr.key?.toLowerCase().includes(kw) ||
            String(attr.value || '').toLowerCase().includes(kw)
        )
      );

      if (found.length > 0) {
        console.log('\n⚠️  INDICES DE TERRAIN:');
        found.forEach((attr: any) =>
          console.log(`    ${attr.key}: ${attr.value}`)
        );
      }
    }

    if (rawData?.subject) {
      console.log('\n📝 Titre:', rawData.subject);
    }

    console.log('');
  }

  // Compter combien d'annonces ont des surfaces aberrantes
  const countAberrantes = await prisma.leboncoinAnnonce.count({
    where: { surface: { gte: 500 } },
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 STATISTIQUES:');
  console.log(`Annonces avec surface ≥ 500m²: ${countAberrantes}`);

  const total = await prisma.leboncoinAnnonce.count();
  console.log(`Pourcentage: ${((countAberrantes / total) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

main();
