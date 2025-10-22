import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../src/modules/matching/matching.service';

const prisma = new PrismaClient();
const matchingService = new MatchingService();

async function main() {
  // Tester le match spécifique entre l'annonce 3033146143 et le DPE 2564E0860753N (14 rue Alphonse Daudet)
  const listId = 3033146143;
  const numeroDpe = '2564E0860753N';

  console.log(`\n🔍 Test de matching spécifique\n`);
  console.log(`Annonce: ${listId}`);
  console.log(`DPE: ${numeroDpe} (14 rue Alphonse Daudet)\n`);

  const annonce = await prisma.leboncoinAnnonce.findUnique({
    where: { listId: BigInt(listId) },
  });

  const dpe = await prisma.dpeRecord.findUnique({
    where: { numeroDpe },
  });

  if (!annonce || !dpe) {
    console.error('❌ Annonce ou DPE non trouvé');
    return;
  }

  console.log(`📋 Annonce:`);
  console.log(`   - Surface: ${annonce.surface}m²`);
  console.log(`   - DPE/GES: ${annonce.etiquetteDpe}/${annonce.etiquetteGes}`);
  console.log(`   - Année: ${annonce.anneConstruction}`);
  console.log(`   - Date DPE extraite: ${annonce.dateDpe?.toLocaleDateString('fr-FR')}`);
  console.log(`   - Chauffage: ${(annonce.rawData as any)?.attributes?.find((a: any) => a.key === 'heating_mode')?.value_label}`);

  const bodyText = (annonce.rawData as any)?.body || '';
  const coutMatch = bodyText.match(/entre\s+([\d\s]+)\s*€\s*et\s+([\d\s]+)\s*€/i);
  if (coutMatch) {
    const coutMin = parseInt(coutMatch[1].replace(/\s/g, ''));
    const coutMax = parseInt(coutMatch[2].replace(/\s/g, ''));
    console.log(`   - Coût énergie annoncé: ${coutMin}-${coutMax}€`);
  }
  console.log(`   - Traversant: ${bodyText.toLowerCase().includes('traversant') ? 'Oui' : 'Non'}`);

  console.log(`\n📊 DPE:`);
  console.log(`   - Surface: ${dpe.surfaceHabitable}m²`);
  console.log(`   - DPE/GES: ${dpe.etiquetteDpe}/${dpe.etiquetteGes}`);
  console.log(`   - Période: ${(dpe.rawData as any)?.periode_construction}`);
  console.log(`   - Date visite: ${(dpe.rawData as any)?.date_visite_diagnostiqueur}`);
  console.log(`   - Chauffage: ${(dpe.rawData as any)?.type_energie_n1}`);
  console.log(`   - Coût énergie DPE: ${(dpe.rawData as any)?.cout_total_5_usages}€`);
  console.log(`   - Traversant: ${(dpe.rawData as any)?.logement_traversant === '1' ? 'Oui' : 'Non'}`);

  console.log(`\n🔄 Calcul du score de matching...\n`);

  // Effectuer le matching
  const result = await matchingService.matchAnnonceToDpes(annonce as any, [dpe as any], {
    maxCandidats: 10,
    seuilScoreMinimum: 0,
    includeScoreDetails: true,
  });

  if (result.candidats.length === 0) {
    console.log('❌ Aucun match trouvé (rejeté par les filtres)\n');

    // Calculer manuellement le score pour voir pourquoi
    console.log('📋 Analyse des filtres:');
    console.log(`   - Code postal: ${annonce.codePostal === dpe.codePostalBan ? '✅' : '❌'}`);
    console.log(`   - Type de bien: ${annonce.typeBien === dpe.typeBatiment ? '✅' : '❌'}`);
    console.log(`   - DPE: ${annonce.etiquetteDpe === dpe.etiquetteDpe ? '✅' : '❌'}`);
    console.log(`   - GES: ${annonce.etiquetteGes === dpe.etiquetteGes ? '✅' : '❌'}`);

    const diffSurface = Math.abs((annonce.surface || 0) - dpe.surfaceHabitable);
    console.log(`   - Différence surface: ${diffSurface.toFixed(1)}m² (limite: 5m² ou 15m² avec critères forts)`);

  } else {
    const candidat = result.candidats[0];

    console.log(`✅ Match trouvé !`);
    console.log(`   Score total: ${candidat.scoreTotal}/120`);
    console.log(`   Score normalisé: ${candidat.scoreNormalized.toFixed(1)}%`);
    console.log(`   Confiance: ${candidat.confiance}`);

    if (candidat.scoreDetails) {
      console.log(`\n📊 Détails du score:`);
      console.log(`   Score de base: ${candidat.scoreBase}/120`);
      console.log(`      - DPE: ${candidat.scoreDetails.scoreBase.dpe}/25`);
      console.log(`      - GES: ${candidat.scoreDetails.scoreBase.ges}/25`);
      console.log(`      - Surface: ${candidat.scoreDetails.scoreBase.surface}/15`);
      console.log(`      - Année: ${candidat.scoreDetails.scoreBase.annee}/10`);
      console.log(`      - Chauffage: ${candidat.scoreDetails.scoreBase.chauffage}/5`);
      console.log(`      - Timing: ${candidat.scoreDetails.scoreBase.timing}/5`);
      console.log(`      - Coût énergie: ${candidat.scoreDetails.scoreBase.coutEnergie}/10 🔥`);

      console.log(`\n   Bonus: ${candidat.scoreBonus}/35`);
      console.log(`      - Distance GPS: ${candidat.scoreDetails.bonus.distanceGPS}/10`);
      console.log(`      - Traversant: ${candidat.scoreDetails.bonus.traversant}/3 🔥`);
      console.log(`      - Quartier: ${candidat.scoreDetails.bonus.quartier}/5`);
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
