import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../src/modules/matching/matching.service';

const prisma = new PrismaClient();
const matchingService = new MatchingService();

async function main() {
  // Tester l'annonce 3033146143 qui a une date DPE extraite (25/02/2025)
  const listId = 3033146143;

  console.log(`\n🔍 Test de matching avec date DPE pour l'annonce ${listId}\n`);

  const annonce = await prisma.leboncoinAnnonce.findUnique({
    where: { listId: BigInt(listId) },
  });

  if (!annonce) {
    console.error(`❌ Annonce ${listId} non trouvée`);
    return;
  }

  console.log(`📋 Annonce ${listId}:`);
  console.log(`   - Surface: ${annonce.surface}m²`);
  console.log(`   - Pièces: ${annonce.pieces}`);
  console.log(`   - Code postal: ${annonce.codePostal}`);
  console.log(`   - Date publication: ${annonce.datePublication.toLocaleDateString('fr-FR')}`);
  console.log(`   - Date DPE extraite: ${annonce.dateDpe ? annonce.dateDpe.toLocaleDateString('fr-FR') : 'Non disponible'}`);

  // Chercher les DPE candidats dans la même zone
  const dpeCandidats = await prisma.dpeRecord.findMany({
    where: {
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien,
      surfaceHabitable: {
        gte: annonce.surface ? annonce.surface - 10 : undefined,
        lte: annonce.surface ? annonce.surface + 10 : undefined,
      },
    },
    take: 50,
  });

  console.log(`\n📊 ${dpeCandidats.length} DPE candidats trouvés\n`);

  if (dpeCandidats.length === 0) {
    console.log('❌ Aucun DPE candidat trouvé');
    return;
  }

  // Effectuer le matching
  const result = await matchingService.matchAnnonceToDpes(annonce as any, dpeCandidats as any, {
    maxCandidats: 10,
    seuilScoreMinimum: 0,
    includeScoreDetails: true,
  });

  console.log(`✅ Matching terminé - ${result.candidats.length} candidats`);
  console.log(`   Temps: ${result.timingMs}ms\n`);

  // Afficher les meilleurs candidats
  const topCandidats = result.candidats.slice(0, 5);

  for (let i = 0; i < topCandidats.length; i++) {
    const candidat = topCandidats[i];
    const dpe = dpeCandidats.find(d => d.id === candidat.dpeId);

    if (!dpe) continue;

    console.log(`\n${i + 1}. DPE ${dpe.numeroDpe}`);
    console.log(`   📍 ${dpe.adresseBan}`);
    console.log(`   📊 Score: ${candidat.scoreTotal}/${candidat.scoreNormalized * 100}%`);
    console.log(`   📏 Surface: ${dpe.surfaceHabitable}m² (${Math.abs(annonce.surface! - dpe.surfaceHabitable).toFixed(1)}m² de diff)`);
    console.log(`   🏷️  DPE: ${dpe.etiquetteDpe}`);
    console.log(`   📅 Date établissement: ${dpe.dateEtablissement.toLocaleDateString('fr-FR')}`);

    if (annonce.dateDpe) {
      const daysDiff = Math.abs(
        (dpe.dateEtablissement.getTime() - annonce.dateDpe.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   ⏱️  Écart avec date DPE annonce: ${daysDiff.toFixed(0)} jours`);
    }

    if (candidat.scoreDetails) {
      console.log(`   💯 Détails:`);
      console.log(`      - Timing: ${candidat.scoreDetails.scoreBase.timing}/5`);
      console.log(`      - Surface: ${candidat.scoreDetails.scoreBase.surface}/15`);
      console.log(`      - DPE: ${candidat.scoreDetails.scoreBase.dpe}/25`);
    }
  }

  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
