/**
 * Démo du bonus quartier dans le matching
 */

import { matchingService } from './src/modules/matching/matching.service';
import { DpeRecord, LeboncoinAnnonce, TypeBatiment, EtiquetteDpe } from '@dpe-matching/shared';

async function demoQuartierBonus() {
  console.log('\n🎯 DÉMONSTRATION DU BONUS QUARTIER\n');
  console.log('='.repeat(70));

  // Annonce dans Centre-ville de Pau
  const annonce: LeboncoinAnnonce = {
    id: 'demo-annonce',
    listId: BigInt(999999),
    url: 'https://test.com',
    codePostal: '64000',
    typeBien: TypeBatiment.APPARTEMENT,
    surface: 65,
    pieces: 3,
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    datePublication: new Date('2025-01-20'),
    lat: null,
    lng: null,
    anneConstruction: 2010,
    rawData: {
      location: {
        district: 'Centre-ville',
        city: 'Pau',
        zipcode: '64000',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('\n📋 ANNONCE:');
  console.log(`   Quartier: Centre-ville`);
  console.log(`   Type: APPARTEMENT`);
  console.log(`   Surface: 65m²`);
  console.log(`   DPE: C / GES: C`);
  console.log(`   Année: 2010`);
  console.log(`   Date publication: 2025-01-20`);

  // DPE 1 : MÊME QUARTIER (Centre-ville)
  const dpe1: DpeRecord = {
    id: 'dpe-centre-ville',
    numeroDpe: 'DPE111',
    codePostalBan: '64000',
    typeBatiment: TypeBatiment.APPARTEMENT,
    surfaceHabitable: 65,
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    dateEtablissement: new Date('2025-01-15'),
    coordonneeX: -0.3700, // lng Centre-ville
    coordonneeY: 43.2985, // lat Centre-ville
    anneConstruction: 2010,
    rawData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // DPE 2 : AUTRE QUARTIER (Pau Sud)
  const dpe2: DpeRecord = {
    id: 'dpe-pau-sud',
    numeroDpe: 'DPE222',
    codePostalBan: '64000',
    typeBatiment: TypeBatiment.APPARTEMENT,
    surfaceHabitable: 65,
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    dateEtablissement: new Date('2025-01-15'),
    coordonneeX: -0.3550, // lng Pau Sud
    coordonneeY: 43.2785, // lat Pau Sud
    anneConstruction: 2010,
    rawData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // DPE 3 : MÊME QUARTIER mais surface différente
  const dpe3: DpeRecord = {
    id: 'dpe-centre-ville-autre-surface',
    numeroDpe: 'DPE333',
    codePostalBan: '64000',
    typeBatiment: TypeBatiment.APPARTEMENT,
    surfaceHabitable: 70, // Surface différente
    etiquetteDpe: EtiquetteDpe.C,
    etiquetteGes: EtiquetteDpe.C,
    dateEtablissement: new Date('2025-01-15'),
    coordonneeX: -0.3700, // lng Centre-ville
    coordonneeY: 43.2985, // lat Centre-ville
    anneConstruction: 2010,
    rawData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await matchingService.matchAnnonceToDpes(
    annonce,
    [dpe1, dpe2, dpe3],
    {
      seuilScoreMinimum: 0,
      includeScoreDetails: true,
    }
  );

  console.log('\n\n🏆 RÉSULTATS DU MATCHING\n');
  console.log('='.repeat(70));

  result.candidats.forEach((candidat, index) => {
    const dpe = [dpe1, dpe2, dpe3].find((d) => d.id === candidat.dpeId)!;
    const quartierDpe =
      dpe.id === 'dpe-centre-ville' || dpe.id === 'dpe-centre-ville-autre-surface'
        ? 'Centre-ville'
        : 'Pau Sud';

    console.log(`\n${index + 1}. DPE ${dpe.numeroDpe} (${quartierDpe})`);
    console.log('-'.repeat(70));

    console.log(`\n   📊 SCORES:`);
    console.log(`      Total: ${candidat.scoreTotal}/120 → ${candidat.scoreNormalized.toFixed(1)}%`);
    console.log(`      Confiance: ${candidat.confiance}`);

    console.log(`\n   🎯 DÉTAIL BASE (${candidat.scoreBase}/90):`);
    console.log(`      • DPE (C=C):        ${candidat.scoreDetails.scoreBase.dpe}/25`);
    console.log(`      • GES (C=C):        ${candidat.scoreDetails.scoreBase.ges}/25`);
    console.log(
      `      • Surface (${dpe.surfaceHabitable}m²):    ${candidat.scoreDetails.scoreBase.surface}/15`
    );
    console.log(
      `      • Année (${dpe.anneConstruction}):      ${candidat.scoreDetails.scoreBase.annee}/10`
    );
    console.log(`      • Timing:           ${candidat.scoreDetails.scoreBase.timing}/5`);

    console.log(`\n   ⭐ BONUS (${candidat.scoreBonus}/30):`);
    console.log(
      `      • Distance GPS:     ${candidat.scoreDetails.bonus.distanceGPS}/10 ${candidat.distanceGps ? `(${candidat.distanceGps}m)` : ''}`
    );
    console.log(
      `      • Quartier:         ${candidat.scoreDetails.bonus.quartier}/5 ${candidat.scoreDetails.bonus.quartier > 0 ? '✅ BONUS!' : '❌'}`
    );

    if (candidat.scoreDetails.bonus.quartier > 0) {
      console.log(
        `\n   💡 Le bonus quartier de +5 points aide à départager ce candidat !`
      );
    }
  });

  console.log('\n\n📈 ANALYSE\n');
  console.log('='.repeat(70));

  const dpe1Result = result.candidats.find((c) => c.dpeId === 'dpe-centre-ville');
  const dpe2Result = result.candidats.find((c) => c.dpeId === 'dpe-pau-sud');

  if (dpe1Result && dpe2Result) {
    const diff = dpe1Result.scoreTotal - dpe2Result.scoreTotal;
    console.log(`\nDifférence de score entre Centre-ville et Pau Sud: +${diff} points`);
    console.log(`Le bonus quartier (+5 pts) représente ${((5 / diff) * 100).toFixed(0)}% de cette différence.`);

    if (dpe1Result.confiance !== dpe2Result.confiance) {
      console.log(
        `\n✨ Le bonus quartier a changé le niveau de confiance:`
      );
      console.log(`   ${dpe2Result.confiance} → ${dpe1Result.confiance}`);
    }
  }

  console.log('\n\n✅ CONCLUSION\n');
  console.log('='.repeat(70));
  console.log(`
Le bonus quartier de 5 points permet de:
  • Favoriser les matchs géographiquement cohérents
  • Départager les candidats avec des scores similaires
  • Améliorer potentiellement le niveau de confiance
  • Utiliser les données Leboncoin (location.district) intelligemment
  `);

  console.log('\n');
}

demoQuartierBonus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  });
