import { prisma } from '../src/config/database';

async function main() {
  const dpeNumbers = ['2564E2788782M', '2564E2995914C'];

  for (const numeroDpe of dpeNumbers) {
    console.log(`\n🔍 Vérification du DPE: ${numeroDpe}\n`);

    const dpe = await prisma.dpeRecord.findFirst({
      where: { numeroDpe },
      select: {
        numeroDpe: true,
        adresseBan: true,
        codePostalBan: true,
        coordonneeX: true,
        coordonneeY: true,
        typeBatiment: true,
        surfaceHabitable: true,
        etiquetteDpe: true,
        etiquetteGes: true,
        matchCandidats: {
          take: 1,
          orderBy: { scoreNormalized: 'desc' },
          include: {
            cluster: {
              include: {
                annonce: {
                  select: {
                    listId: true,
                    url: true,
                    lat: true,
                    lng: true,
                    rawData: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!dpe) {
      console.log(`❌ DPE ${numeroDpe} non trouvé\n`);
      continue;
    }

    console.log(`📋 DPE TROUVÉ:`);
    console.log(`   Adresse: ${dpe.adresseBan}`);
    console.log(`   Code postal: ${dpe.codePostalBan}`);
    console.log(`   Coordonnées DPE (Lambert93):`);
    console.log(`     X: ${dpe.coordonneeX}`);
    console.log(`     Y: ${dpe.coordonneeY}`);

    if (dpe.matchCandidats.length > 0) {
      const candidat = dpe.matchCandidats[0];
      const annonce = candidat.cluster.annonce;

      console.log(`\n   🎯 ANNONCE MATCHÉE:`);
      console.log(`   URL: ${annonce.url}`);
      console.log(`   Coordonnées annonce (WGS84):`);
      console.log(`     Lat: ${annonce.lat}`);
      console.log(`     Lng: ${annonce.lng}`);

      const rawData = annonce.rawData as any;
      const locationLat = rawData?.location?.lat;
      const locationLng = rawData?.location?.lng;

      if (locationLat && locationLng) {
        console.log(`   Coordonnées annonce dans rawData:`);
        console.log(`     Lat: ${locationLat}`);
        console.log(`     Lng: ${locationLng}`);
      }

      console.log(`\n   ⚠️  PROBLÈME IDENTIFIÉ:`);
      console.log(`   La carte affiche les coordonnées de l'ANNONCE (${annonce.lat}, ${annonce.lng})`);
      console.log(`   Mais l'adresse affichée est celle du DPE: ${dpe.adresseBan}`);
      console.log(`   Ces deux adresses sont probablement différentes!`);
    } else {
      console.log(`\n   ❌ Aucune annonce matchée avec ce DPE`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
