import { prisma } from '../src/config/database';
import { TypeBatiment } from '@dpe-matching/shared';

async function main() {
  console.log('\n🔍 Recherche des terrains à requalifier...\n');

  // Trouver tous les terrains avec DPE ou GES
  const terrainsAvecDpe = await prisma.leboncoinAnnonce.findMany({
    where: {
      typeBien: 'TERRAIN',
      OR: [
        { etiquetteDpe: { not: null } },
        { etiquetteGes: { not: null } }
      ]
    },
    select: {
      id: true,
      listId: true,
      surface: true,
      pieces: true,
      etiquetteDpe: true,
      etiquetteGes: true,
      rawData: true,
      url: true
    }
  });

  console.log(`📊 Trouvé ${terrainsAvecDpe.length} terrains avec DPE/GES à analyser\n`);

  let requalifiedMaison = 0;
  let requalifiedAppartement = 0;
  let skipped = 0;

  for (const annonce of terrainsAvecDpe) {
    const rawData = annonce.rawData as any;
    const title = rawData?.subject?.toLowerCase() || '';
    const pieces = annonce.pieces || 0;
    const surface = annonce.surface || 0;

    let newType: TypeBatiment | null = null;

    // Critères de requalification
    // 1. Si le titre contient "maison" ou "villa" → MAISON
    if (title.includes('maison') || title.includes('villa') || title.includes('propriété')) {
      newType = TypeBatiment.MAISON;
    }
    // 2. Si le titre contient "appartement" ou "duplex" ou "t2" "t3" etc → APPARTEMENT
    else if (title.includes('appartement') || title.includes('duplex') ||
             title.includes('studio') || /\bt[1-9]\b/.test(title)) {
      newType = TypeBatiment.APPARTEMENT;
    }
    // 3. Si a des pièces ET surface < 500m² → probablement MAISON
    else if (pieces > 0 && surface < 500) {
      newType = TypeBatiment.MAISON;
    }
    // 4. Si surface < 200m² ET a DPE/GES → probablement APPARTEMENT ou MAISON
    else if (surface < 200 && (annonce.etiquetteDpe || annonce.etiquetteGes)) {
      newType = TypeBatiment.MAISON; // Par défaut MAISON pour les petites surfaces avec DPE
    }

    if (newType) {
      await prisma.leboncoinAnnonce.update({
        where: { id: annonce.id },
        data: { typeBien: newType }
      });

      const typeStr = newType === TypeBatiment.MAISON ? 'MAISON' : 'APPARTEMENT';
      console.log(`✅ Requalifié en ${typeStr}: ${title.substring(0, 60)}`);
      console.log(`   Surface: ${surface}m² - Pièces: ${pieces} - DPE: ${annonce.etiquetteDpe || 'null'} - GES: ${annonce.etiquetteGes || 'null'}`);
      console.log(`   ${annonce.url}\n`);

      if (newType === TypeBatiment.MAISON) {
        requalifiedMaison++;
      } else {
        requalifiedAppartement++;
      }
    } else {
      console.log(`⏭️  Conservé comme TERRAIN: ${title.substring(0, 60)}`);
      console.log(`   Surface: ${surface}m² - Pas de critères clairs pour requalifier\n`);
      skipped++;
    }
  }

  console.log('\n📈 RÉSUMÉ:');
  console.log(`  Requalifiés en MAISON: ${requalifiedMaison}`);
  console.log(`  Requalifiés en APPARTEMENT: ${requalifiedAppartement}`);
  console.log(`  Conservés comme TERRAIN: ${skipped}`);
  console.log(`  Total traité: ${terrainsAvecDpe.length}\n`);

  // Afficher les nouvelles statistiques
  const totalMaisons = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'MAISON' }});
  const totalApparts = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'APPARTEMENT' }});
  const totalTerrains = await prisma.leboncoinAnnonce.count({ where: { typeBien: 'TERRAIN' }});
  const total = await prisma.leboncoinAnnonce.count();

  console.log('📊 NOUVELLES STATISTIQUES:');
  console.log(`  Maisons: ${totalMaisons} (${(totalMaisons/total*100).toFixed(1)}%)`);
  console.log(`  Appartements: ${totalApparts} (${(totalApparts/total*100).toFixed(1)}%)`);
  console.log(`  Terrains: ${totalTerrains} (${(totalTerrains/total*100).toFixed(1)}%)`);
  console.log(`  Total: ${total}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
