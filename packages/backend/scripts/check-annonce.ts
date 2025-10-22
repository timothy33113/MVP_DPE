import { prisma } from '../src/config/database';

async function main() {
  const listId = '3070106415';

  console.log(`🔍 Recherche de l'annonce ${listId}...\n`);

  const annonce = await prisma.leboncoinAnnonce.findFirst({
    where: {
      listId: BigInt(listId)
    },
    include: {
      matchCluster: {
        include: {
          candidats: {
            take: 1,
            orderBy: {
              scoreNormalized: 'desc'
            },
            include: {
              dpe: true
            }
          }
        }
      }
    }
  });

  if (!annonce) {
    console.log(`❌ Annonce ${listId} NON TROUVÉE dans la base de données\n`);

    // Chercher des annonces similaires
    console.log('🔎 Recherche d\'annonces similaires récentes...\n');
    const similar = await prisma.leboncoinAnnonce.findMany({
      take: 5,
      orderBy: {
        datePublication: 'desc'
      },
      select: {
        listId: true,
        url: true,
        typeBien: true,
        surface: true,
        codePostal: true,
        datePublication: true
      }
    });

    similar.forEach(a => {
      console.log(`  ${a.listId} - ${a.typeBien} ${a.surface}m² - CP ${a.codePostal}`);
      console.log(`  ${a.url}\n`);
    });
  } else {
    console.log(`✅ Annonce ${listId} TROUVÉE\n`);

    const rawData = annonce.rawData as any;
    const title = rawData?.subject || 'Sans titre';

    console.log(`📋 DÉTAILS:`);
    console.log(`   Titre: ${title}`);
    console.log(`   Type: ${annonce.typeBien}`);
    console.log(`   Surface: ${annonce.surface}m²`);
    console.log(`   Pièces: ${annonce.pieces || 'N/A'}`);
    console.log(`   Code postal: ${annonce.codePostal}`);
    console.log(`   DPE: ${annonce.etiquetteDpe || 'Non renseigné'}`);
    console.log(`   GES: ${annonce.etiquetteGes || 'Non renseigné'}`);
    console.log(`   Date publication: ${new Date(annonce.datePublication).toLocaleDateString('fr-FR')}`);
    console.log(`   URL: ${annonce.url}\n`);

    if (annonce.matchCluster && annonce.matchCluster.candidats.length > 0) {
      const candidat = annonce.matchCluster.candidats[0];
      const dpe = candidat.dpe;

      console.log(`🎯 MATCH DPE:`);
      console.log(`   Score: ${candidat.scoreNormalized.toFixed(1)}/100`);
      console.log(`   DPE: ${dpe.etiquetteDpe} | GES: ${dpe.etiquetteGes}`);
      console.log(`   Surface DPE: ${dpe.surfaceHabitable}m²`);
      console.log(`   Différence: ±${Math.abs((annonce.surface || 0) - dpe.surfaceHabitable).toFixed(1)}m²`);
      console.log(`   Adresse: ${dpe.adresseBan}`);
      console.log(`   Code postal: ${dpe.codePostalBan}\n`);
    } else {
      console.log(`⚠️  AUCUN MATCH DPE pour cette annonce\n`);

      if (!annonce.etiquetteDpe && !annonce.etiquetteGes) {
        console.log(`   Raison probable: L'annonce n'a pas de DPE/GES renseigné\n`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
