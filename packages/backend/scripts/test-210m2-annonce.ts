import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../src/modules/matching/matching.service';

const prisma = new PrismaClient();
const matchingService = new MatchingService();

async function main() {
  const listId = 3014198568;
  const numeroDpe = '2564E0860753N';

  console.log(`\n🔍 Test annonce ${listId} (210m²) vs DPE ${numeroDpe} (105.2m²)\n`);

  const annonce = await prisma.leboncoinAnnonce.findUnique({ where: { listId: BigInt(listId) } });
  const dpe = await prisma.dpeRecord.findUnique({ where: { numeroDpe } });

  if (!annonce || !dpe) {
    console.error('❌ Annonce ou DPE non trouvé');
    return;
  }

  console.log(`📋 Annonce: ${annonce.surface}m², DPE/GES: ${annonce.etiquetteDpe}/${annonce.etiquetteGes}`);
  console.log(`📊 DPE: ${dpe.surfaceHabitable}m², DPE/GES: ${dpe.etiquetteDpe}/${dpe.etiquetteGes}`);
  console.log(`   Différence: ${Math.abs((annonce.surface || 0) - dpe.surfaceHabitable).toFixed(1)}m²\n`);

  const result = await matchingService.matchAnnonceToDpes(annonce as any, [dpe as any], {
    maxCandidats: 10,
    seuilScoreMinimum: 0,
    includeScoreDetails: true,
  });

  if (result.candidats.length === 0) {
    console.log('❌ Aucun match trouvé (rejeté - différence > 15m²)');
  } else {
    const candidat = result.candidats[0];
    console.log(`✅ Match trouvé !`);
    console.log(`   Score: ${candidat.scoreTotal}/120 (${candidat.scoreNormalized.toFixed(1)}%)`);
    console.log(`   Confiance: ${candidat.confiance}`);
    if (candidat.scoreDetails) {
      console.log(`   Coût énergie: ${candidat.scoreDetails.scoreBase.coutEnergie}/10`);
      console.log(`   Timing: ${candidat.scoreDetails.scoreBase.timing}/5`);
      console.log(`   Traversant: ${candidat.scoreDetails.bonus.traversant}/3`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
