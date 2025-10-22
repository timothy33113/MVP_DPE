import { prisma } from '../src/config/database';

async function main() {
  console.log('🔍 Vérification des codes postaux dans les matchs\n');

  // Récupérer 20 matchs avec leurs DPE
  const clusters = await prisma.matchCluster.findMany({
    take: 20,
    include: {
      annonce: {
        select: {
          url: true,
          codePostal: true,
          typeBien: true,
          surface: true,
          etiquetteDpe: true,
          etiquetteGes: true
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
              codePostalBan: true,
              typeBatiment: true,
              surfaceHabitable: true,
              etiquetteDpe: true,
              etiquetteGes: true,
              adresseBan: true
            }
          }
        }
      }
    }
  });

  let matchesValid = 0;
  let matchesInvalid = 0;

  for (const cluster of clusters) {
    if (cluster.candidats.length === 0) continue;

    const annonce = cluster.annonce;
    const candidat = cluster.candidats[0];
    const dpe = candidat.dpe;

    const codePostalMatch = annonce.codePostal === dpe.codePostalBan;
    const typeBienMatch = annonce.typeBien === dpe.typeBatiment;
    const dpeMatch = annonce.etiquetteDpe === dpe.etiquetteDpe;
    const gesMatch = annonce.etiquetteGes === dpe.etiquetteGes;
    const surfaceDiff = annonce.surface && dpe.surfaceHabitable
      ? Math.abs(annonce.surface - dpe.surfaceHabitable)
      : null;

    if (!codePostalMatch) {
      matchesInvalid++;
      console.log(`❌ CODES POSTAUX DIFFÉRENTS:`);
      console.log(`   Annonce: ${annonce.codePostal} | DPE: ${dpe.codePostalBan}`);
      console.log(`   Type: ${annonce.typeBien} vs ${dpe.typeBatiment}`);
      console.log(`   Surface: ${annonce.surface}m² vs ${dpe.surfaceHabitable}m² (diff: ${surfaceDiff}m²)`);
      console.log(`   DPE: ${annonce.etiquetteDpe} vs ${dpe.etiquetteDpe} | GES: ${annonce.etiquetteGes} vs ${dpe.etiquetteGes}`);
      console.log(`   Score: ${candidat.scoreNormalized.toFixed(1)}/100`);
      console.log(`   Adresse DPE: ${dpe.adresseBan}`);
      console.log(`   ${annonce.url}\n`);
    } else {
      matchesValid++;
      console.log(`✅ CP: ${annonce.codePostal} | Type: ${annonce.typeBien} | DPE: ${annonce.etiquetteDpe}/${dpe.etiquetteDpe} | Surface: ${annonce.surface}/${dpe.surfaceHabitable}m² (±${surfaceDiff}m²) | Score: ${candidat.scoreNormalized.toFixed(1)}/100`);
    }
  }

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Matchs valides (même CP): ${matchesValid}`);
  console.log(`   Matchs invalides (CP différent): ${matchesInvalid}`);
  console.log(`   Total analysé: ${clusters.length}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
