/**
 * Script pour marquer les annonces "terrains" dans la base de données
 * Détecte les terrains via l'attribut real_estate_type: 3 ou land_plot_surface === square
 */

import { prisma } from '../src/config/database';
import { TypeBatiment } from '@dpe-matching/shared';

async function main() {
  console.log('\n🔍 Recherche des terrains mal catégorisés...\n');

  // Récupérer toutes les annonces
  const annonces = await prisma.leboncoinAnnonce.findMany();

  let terrainCount = 0;
  const updates: string[] = [];

  for (const annonce of annonces) {
    const rawData: any = annonce.rawData;

    if (!rawData || !rawData.attributes) continue;

    // Chercher l'attribut real_estate_type
    const realEstateTypeAttr = rawData.attributes.find(
      (attr: any) => attr.key === 'real_estate_type'
    );

    // Chercher land_plot_surface
    const landPlotSurfaceAttr = rawData.attributes.find(
      (attr: any) => attr.key === 'land_plot_surface'
    );

    let isTerrain = false;

    // Critère 1: real_estate_type === "3" (type terrain chez Leboncoin)
    if (realEstateTypeAttr && String(realEstateTypeAttr.value) === '3') {
      isTerrain = true;
    }

    // Critère 2: land_plot_surface === square (terrain sans construction)
    if (
      landPlotSurfaceAttr &&
      annonce.surface &&
      Math.abs(Number(landPlotSurfaceAttr.value) - annonce.surface) < 1
    ) {
      isTerrain = true;
    }

    // Critère 3: Titre contient "Terrain"
    if (rawData.subject && rawData.subject.toLowerCase().includes('terrain')) {
      isTerrain = true;
    }

    if (isTerrain && annonce.typeBien !== TypeBatiment.TERRAIN) {
      terrainCount++;
      updates.push(annonce.id);

      if (terrainCount <= 10) {
        console.log(`✓ Terrain détecté: ${annonce.url}`);
        console.log(`  Type actuel: ${annonce.typeBien} → TERRAIN`);
        console.log(`  Surface: ${annonce.surface} m²\n`);
      }
    }
  }

  if (terrainCount === 0) {
    console.log('✅ Aucun terrain mal catégorisé trouvé.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📊 Total de terrains trouvés: ${terrainCount}`);
  console.log(`\n⚠️  Mise à jour des ${updates.length} annonces...\n`);

  // Mettre à jour en base
  const result = await prisma.leboncoinAnnonce.updateMany({
    where: { id: { in: updates } },
    data: { typeBien: TypeBatiment.TERRAIN },
  });

  console.log(`✅ ${result.count} annonces mises à jour avec succès!\n`);

  // Statistiques finales
  const stats = await prisma.leboncoinAnnonce.groupBy({
    by: ['typeBien'],
    _count: { id: true },
  });

  console.log('📊 Répartition après mise à jour:');
  stats.forEach((s) => {
    console.log(`   ${s.typeBien}: ${s._count.id}`);
  });

  await prisma.$disconnect();
}

main();
