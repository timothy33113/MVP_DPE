import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../src/modules/matching/matching.service';

const prisma = new PrismaClient();
const matchingService = new MatchingService();

async function main() {
  console.log('\n🎯 Test : Quel est le meilleur DPE pour chaque annonce ?\n');

  // Les deux annonces du même bien
  const annonces = [
    { listId: 3033146143, description: '120m² - Sans mention de quartier' },
    { listId: 3014198568, description: '210m² - Mentionne "stade du Hameau"' },
  ];

  for (const { listId, description } of annonces) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 Annonce ${listId} - ${description}`);
    console.log('='.repeat(70));

    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { listId: BigInt(listId) },
    });

    if (!annonce) continue;

    console.log(`   Surface: ${annonce.surface}m²`);
    console.log(`   DPE/GES: ${annonce.etiquetteDpe}/${annonce.etiquetteGes}`);
    console.log(`   Date DPE: ${annonce.dateDpe?.toLocaleDateString('fr-FR') || 'Non extraite'}`);

    // Chercher tous les DPE E/E, Maison, Pau
    const dpes = await prisma.dpeRecord.findMany({
      where: {
        codePostalBan: '64000',
        typeBatiment: 'MAISON',
        etiquetteDpe: 'E',
        etiquetteGes: 'E',
      },
      take: 50, // Top 50
    });

    console.log(`   Candidats: ${dpes.length} DPE\n`);

    // Matching avec seuil 0 pour voir tous les scores
    const result = await matchingService.matchAnnonceToDpes(annonce as any, dpes as any, {
      maxCandidats: 10,
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    });

    console.log(`✅ Top 5 DPE (sur ${result.candidats.length} acceptés):\n`);

    for (let i = 0; i < Math.min(5, result.candidats.length); i++) {
      const candidat = result.candidats[i];
      const dpe = dpes.find(d => d.id === candidat.dpeId);
      if (!dpe) continue;

      const isTarget = dpe.numeroDpe === '2564E0860753N';
      const marker = isTarget ? '⭐ BON DPE' : '';

      console.log(`${i + 1}. ${dpe.numeroDpe} ${marker}`);
      console.log(`   📍 ${dpe.adresseBan}`);
      console.log(`   📏 ${dpe.surfaceHabitable}m² (Δ ${Math.abs((annonce.surface || 0) - dpe.surfaceHabitable).toFixed(1)}m²)`);
      console.log(`   💰 ${(dpe.rawData as any)?.cout_total_5_usages || '?'}€`);
      console.log(`   📅 ${(dpe.rawData as any)?.date_visite_diagnostiqueur || dpe.dateEtablissement.toISOString().split('T')[0]}`);
      console.log(`   📊 Score: ${candidat.scoreTotal}/120 (${candidat.scoreNormalized.toFixed(1)}%) - ${candidat.confiance}`);

      if (candidat.scoreDetails) {
        const d = candidat.scoreDetails;
        console.log(`      Base: DPE=${d.scoreBase.dpe} GES=${d.scoreBase.ges} Surface=${d.scoreBase.surface} Timing=${d.scoreBase.timing}`);
        console.log(`      +Coût=${d.scoreBase.coutEnergie} Chauffage=${d.scoreBase.chauffage} Année=${d.scoreBase.annee}`);
        console.log(`      Bonus: Quartier=${d.bonus.quartier} Traversant=${d.bonus.traversant} GPS=${d.bonus.distanceGPS}`);
      }
      console.log('');
    }

    // Chercher où est le bon DPE s'il n'est pas dans le top 5
    if (!result.candidats.slice(0, 5).some(c => {
      const dpe = dpes.find(d => d.id === c.dpeId);
      return dpe?.numeroDpe === '2564E0860753N';
    })) {
      const targetIndex = result.candidats.findIndex(c => {
        const dpe = dpes.find(d => d.id === c.dpeId);
        return dpe?.numeroDpe === '2564E0860753N';
      });

      if (targetIndex >= 0) {
        console.log(`⚠️  Le bon DPE (2564E0860753N) est en position ${targetIndex + 1}/${result.candidats.length}`);
      } else {
        console.log(`❌ Le bon DPE (2564E0860753N) a été REJETÉ par les filtres`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
