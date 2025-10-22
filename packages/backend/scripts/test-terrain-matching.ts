/**
 * Script pour tester l'impact du scoring surface terrain sur le matching
 */

import { prisma } from '../src/config/database';
import { matchingService } from '../src/modules/matching/matching.service';

async function main() {
  console.log('🧪 Test du matching avec surfaces terrain enrichies\n');

  // Trouver des annonces avec surface terrain
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'MAISON',
    },
    take: 10,
  });

  console.log(`📊 ${annonces.length} annonces à tester\n`);

  let withTerrainScore = 0;
  let totalMatches = 0;

  for (const annonce of annonces) {
    // Extraire la surface terrain de l'annonce
    let surfaceTerrainAnnonce: number | undefined;
    const rawData = annonce.rawData as any;
    if (rawData?.attributes) {
      const landPlot = rawData.attributes.find((attr: any) => attr.key === 'land_plot_surface');
      if (landPlot?.value) {
        surfaceTerrainAnnonce = parseInt(landPlot.value);
      }
    }

    if (!surfaceTerrainAnnonce) {
      console.log(`⏭️  Annonce ${annonce.listId} - Pas de surface terrain`);
      continue;
    }

    console.log(`\n🏠 Annonce ${annonce.listId}`);
    console.log(`   Surface habitable: ${annonce.surface}m²`);
    console.log(`   Surface terrain: ${surfaceTerrainAnnonce}m²`);
    console.log(`   Code postal: ${annonce.codePostal}`);

    // Récupérer les DPE enrichis avec surface terrain
    const dpes = await prisma.dpeRecord.findMany({
      where: {
        codePostalBan: annonce.codePostal,
        typeBatiment: 'MAISON',
        surfaceTerrain: { not: null },
      },
      take: 20,
    });

    if (dpes.length === 0) {
      console.log(`   ⚠️  Aucun DPE enrichi trouvé`);
      continue;
    }

    console.log(`   📊 ${dpes.length} DPE enrichis trouvés`);

    // Lancer le matching avec seuil minimal
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, {
      maxCandidats: 3,
      seuilScoreMinimum: 0, // Pas de seuil pour voir tous les résultats
      includeScoreDetails: true,
    });

    if (result.candidats.length === 0) {
      console.log(`   ❌ Aucun match`);
      continue;
    }

    totalMatches++;

    // Afficher les meilleurs candidats avec leur score terrain
    console.log(`   ✅ ${result.candidats.length} match(s):\n`);

    result.candidats.forEach((candidat, i) => {
      const details = candidat.scoreDetails!;
      const scoreTerrain = details.scoreBase.surfaceTerrain;

      console.log(`      ${i + 1}. Score: ${candidat.scoreNormalized}/110`);
      console.log(`         Adresse: ${candidat.adresse}`);
      console.log(`         Surface terrain DPE: ${candidat.surfaceTerrain}m²`);
      console.log(`         Score terrain: ${scoreTerrain}/10`);

      if (scoreTerrain > 0) {
        withTerrainScore++;
        const diff = Math.abs(surfaceTerrainAnnonce - (candidat.surfaceTerrain || 0));
        const diffPercent = ((diff / surfaceTerrainAnnonce) * 100).toFixed(1);
        console.log(`         Écart: ${diff}m² (${diffPercent}%)`);
      }
      console.log('');
    });
  }

  console.log('\n📊 Résultats:\n');
  console.log(`   Annonces testées: ${annonces.length}`);
  console.log(`   Annonces avec matches: ${totalMatches}`);
  console.log(`   Matches avec score terrain: ${withTerrainScore}`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
