import { prisma } from '../src/config/database';

async function main() {
  console.log('📋 TOUS LES MATCHS DPE-LEBONCOIN\n');

  // Récupérer tous les clusters avec leurs candidats
  const clusters = await prisma.matchCluster.findMany({
    include: {
      annonce: {
        select: {
          listId: true,
          url: true,
          codePostal: true,
          typeBien: true,
          surface: true,
          pieces: true,
          etiquetteDpe: true,
          etiquetteGes: true,
          rawData: true
        }
      },
      candidats: {
        take: 1,
        orderBy: {
          scoreNormalized: 'desc'
        },
        include: {
          dpe: {
            select: {
              numeroDpe: true,
              codePostalBan: true,
              typeBatiment: true,
              surfaceHabitable: true,
              etiquetteDpe: true,
              etiquetteGes: true,
              adresseBan: true,
              dateEtablissement: true
            }
          }
        }
      }
    },
    orderBy: {
      meilleurScore: 'desc'
    }
  });

  console.log(`Total clusters: ${clusters.length}\n`);

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    if (cluster.candidats.length === 0) continue;

    const annonce = cluster.annonce;
    const candidat = cluster.candidats[0];
    const dpe = candidat.dpe;

    const rawData = annonce.rawData as any;
    const title = rawData?.subject || 'Sans titre';

    const surfaceDiff = annonce.surface && dpe.surfaceHabitable
      ? Math.abs(annonce.surface - dpe.surfaceHabitable)
      : null;

    console.log(`[${i + 1}/${clusters.length}] Score: ${candidat.scoreNormalized.toFixed(1)}/100`);
    console.log(`📍 ${title.substring(0, 80)}`);
    console.log(`   CP: ${annonce.codePostal} | Type: ${annonce.typeBien}`);
    console.log(`   Annonce: ${annonce.surface}m² | ${annonce.pieces || '?'} pièces | DPE: ${annonce.etiquetteDpe || '?'} | GES: ${annonce.etiquetteGes || '?'}`);
    console.log(`   DPE:     ${dpe.surfaceHabitable}m² | Diff: ±${surfaceDiff?.toFixed(1) || '?'}m² | DPE: ${dpe.etiquetteDpe} | GES: ${dpe.etiquetteGes}`);
    console.log(`   Adresse: ${dpe.adresseBan}`);
    console.log(`   Date DPE: ${new Date(dpe.dateEtablissement).toLocaleDateString('fr-FR')}`);
    console.log(`   ${annonce.url}\n`);
  }

  console.log(`\n📊 STATISTIQUES:`);

  // Stats par score
  const scoreRanges = {
    '90-100': clusters.filter(c => c.meilleurScore >= 90 && c.meilleurScore <= 100).length,
    '80-89': clusters.filter(c => c.meilleurScore >= 80 && c.meilleurScore < 90).length,
    '70-79': clusters.filter(c => c.meilleurScore >= 70 && c.meilleurScore < 80).length,
    '60-69': clusters.filter(c => c.meilleurScore >= 60 && c.meilleurScore < 70).length,
    '50-59': clusters.filter(c => c.meilleurScore >= 50 && c.meilleurScore < 60).length,
    '<50': clusters.filter(c => c.meilleurScore < 50).length,
  };

  console.log(`\nRépartition par score:`);
  Object.entries(scoreRanges).forEach(([range, count]) => {
    const percentage = ((count / clusters.length) * 100).toFixed(1);
    console.log(`  ${range}: ${count} (${percentage}%)`);
  });

  // Stats par type
  const parType = {
    MAISON: clusters.filter(c => c.annonce.typeBien === 'MAISON').length,
    APPARTEMENT: clusters.filter(c => c.annonce.typeBien === 'APPARTEMENT').length,
    TERRAIN: clusters.filter(c => c.annonce.typeBien === 'TERRAIN').length,
  };

  console.log(`\nRépartition par type:`);
  Object.entries(parType).forEach(([type, count]) => {
    const percentage = ((count / clusters.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percentage}%)`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
