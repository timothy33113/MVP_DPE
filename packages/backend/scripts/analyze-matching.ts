/**
 * Script d'analyse des matchs manquants
 */

import { prisma } from '../src/config/database';

async function main() {
  // Prendre une annonce sans match
  const annonceSansMatch = await prisma.leboncoinAnnonce.findFirst({
    where: { matchCluster: null },
  });

  if (!annonceSansMatch) {
    console.log("Pas d'annonce sans match trouvée");
    return;
  }

  console.log('=== ANNONCE SANS MATCH ===');
  console.log('CP:', annonceSansMatch.codePostal);
  console.log('Type:', annonceSansMatch.typeBien);
  console.log('Surface:', annonceSansMatch.surface, 'm²');
  console.log('DPE annoncé:', annonceSansMatch.etiquetteDpe || 'N/A');
  console.log('GES annoncé:', annonceSansMatch.etiquetteGes || 'N/A');

  // Chercher des DPE potentiels avec critères stricts (±1m²)
  const surfaceMinStrict = annonceSansMatch.surface ? annonceSansMatch.surface - 1 : 0;
  const surfaceMaxStrict = annonceSansMatch.surface ? annonceSansMatch.surface + 1 : 999999;

  const dpeStrict = await prisma.dpeRecord.count({
    where: {
      codePostalBan: annonceSansMatch.codePostal,
      typeBatiment: annonceSansMatch.typeBien,
      surfaceHabitable: { gte: surfaceMinStrict, lte: surfaceMaxStrict },
      etiquetteDpe: annonceSansMatch.etiquetteDpe!,
      etiquetteGes: annonceSansMatch.etiquetteGes!,
    },
  });

  console.log('\n=== CRITÈRES STRICTS (±1m², DPE+GES identiques) ===');
  console.log('Nombre de DPE trouvés:', dpeStrict);

  // Chercher avec critères souples (±20m²)
  const surfaceMin = annonceSansMatch.surface ? annonceSansMatch.surface - 20 : 0;
  const surfaceMax = annonceSansMatch.surface ? annonceSansMatch.surface + 20 : 999999;

  const dpeSouples = await prisma.dpeRecord.findMany({
    where: {
      codePostalBan: annonceSansMatch.codePostal,
      typeBatiment: annonceSansMatch.typeBien,
      surfaceHabitable: { gte: surfaceMin, lte: surfaceMax },
    },
    take: 5,
  });

  console.log('\n=== CRITÈRES SOUPLES (±20m², sans DPE/GES) ===');
  console.log('Nombre de DPE trouvés:', dpeSouples.length);

  if (dpeSouples.length > 0) {
    dpeSouples.forEach((dpe, i) => {
      const diffSurface = annonceSansMatch.surface
        ? Math.abs(annonceSansMatch.surface - dpe.surfaceHabitable).toFixed(1)
        : 'N/A';
      const matchDpe = annonceSansMatch.etiquetteDpe === dpe.etiquetteDpe ? '✅' : '❌';
      const matchGes = annonceSansMatch.etiquetteGes === dpe.etiquetteGes ? '✅' : '❌';

      console.log(`\n  DPE ${i + 1}:`);
      console.log(`    Surface: ${dpe.surfaceHabitable} (diff: ${diffSurface} m²)`);
      console.log(`    DPE: ${dpe.etiquetteDpe} ${matchDpe}`);
      console.log(`    GES: ${dpe.etiquetteGes} ${matchGes}`);
    });
  }

  console.log('\n=== CONCLUSION ===');
  console.log(
    '❌ Algorithme trop strict: exige DPE ET GES identiques ET surface ±1m²'
  );
  console.log('✅ Solution: Collecter plus de DPE pour combler les trous');

  await prisma.$disconnect();
}

main();
