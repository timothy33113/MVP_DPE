import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../src/modules/matching/matching.service';

const prisma = new PrismaClient();
const matchingService = new MatchingService();

async function main() {
  const listId = 3033146143; // Annonce 120m² (l'autre annonce mentionne Hameau mais a 210m²)

  console.log(`\n🔍 Test de tous les DPE candidats pour l'annonce ${listId}\n`);

  const annonce = await prisma.leboncoinAnnonce.findUnique({ where: { listId: BigInt(listId) } });
  if (!annonce) {
    console.error('❌ Annonce non trouvée');
    return;
  }

  // Chercher tous les DPE E/E, Maison, Pau, 100-135m²
  const dpes = await prisma.dpeRecord.findMany({
    where: {
      codePostalBan: '64000',
      typeBatiment: 'MAISON',
      etiquetteDpe: 'E',
      etiquetteGes: 'E',
      surfaceHabitable: { gte: 100, lte: 135 }
    }
  });

  console.log(`📋 Annonce: 120m², E/E, Date DPE: 25/02/2025, Coût: 2680-3670€`);
  console.log(`📊 ${dpes.length} DPE candidats trouvés\n`);

  const result = await matchingService.matchAnnonceToDpes(annonce as any, dpes as any, {
    maxCandidats: 20,
    seuilScoreMinimum: 0,
    includeScoreDetails: true,
  });

  console.log(`✅ ${result.candidats.length} DPE ont passé les filtres\n`);

  result.candidats.slice(0, 10).forEach((candidat, i) => {
    const dpe = dpes.find(d => d.id === candidat.dpeId);
    if (!dpe) return;

    console.log(`${i + 1}. ${dpe.numeroDpe}`);
    console.log(`   📍 ${dpe.adresseBan}`);
    console.log(`   📏 ${dpe.surfaceHabitable}m² (diff: ${Math.abs(120 - dpe.surfaceHabitable).toFixed(1)}m²)`);
    console.log(`   💰 Coût: ${(dpe.rawData as any)?.cout_total_5_usages}€`);
    console.log(`   📅 Date visite: ${(dpe.rawData as any)?.date_visite_diagnostiqueur}`);
    console.log(`   🏠 Traversant: ${(dpe.rawData as any)?.logement_traversant === '1' ? 'Oui' : 'Non'}`);
    console.log(`   📊 Score: ${candidat.scoreTotal}/120 (${candidat.scoreNormalized.toFixed(1)}%)`);
    if (candidat.scoreDetails) {
      console.log(`      Coût énergie: ${candidat.scoreDetails.scoreBase.coutEnergie}/10`);
      console.log(`      Timing: ${candidat.scoreDetails.scoreBase.timing}/5`);
      console.log(`      Surface: ${candidat.scoreDetails.scoreBase.surface}/15`);
      console.log(`      Traversant: ${candidat.scoreDetails.bonus.traversant}/3`);
    }
    console.log('');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
