import { prisma } from '../src/config/database';

async function main() {
  // Récupérer un match
  const match = await prisma.matchCluster.findFirst({
    include: {
      candidats: {
        include: {
          dpe: true
        },
        orderBy: {
          scoreTotal: 'desc'
        },
        take: 1
      }
    }
  });

  if (!match || !match.candidats[0]) {
    console.log('Aucun match trouvé');
    return;
  }

  // Récupérer l'annonce séparément
  const annonce = await prisma.leboncoinAnnonce.findUnique({
    where: {
      id: match.annonceId
    }
  });

  if (!annonce) {
    console.log('Annonce non trouvée');
    return;
  }

  const candidat = match.candidats[0];
  const rawData = annonce.rawData as any;

  console.log('Match ID:', match.id);
  console.log('Annonce ID:', annonce.listId);
  console.log('\n=== STRUCTURE IMAGES DANS rawData ===\n');

  console.log('rawData.images existe?', !!rawData.images);
  console.log('rawData.images.urls existe?', !!rawData.images?.urls);
  console.log('Nombre d\'images:', rawData.images?.urls?.length || 0);

  if (rawData.images?.urls?.length > 0) {
    console.log('\nPremière URL:', rawData.images.urls[0]);
    console.log('\nTEST: Vérification de l\'accessibilité de l\'image...');

    try {
      const response = await fetch(rawData.images.urls[0]);
      console.log('Status HTTP:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('✅ Image accessible');
    } catch (error) {
      console.log('❌ Erreur lors de l\'accès à l\'image:', error);
    }
  }

  console.log('\n=== STRUCTURE RETOURNÉE PAR L\'API ===\n');

  // Simuler ce que l'API retourne
  const apiResponse = {
    id: candidat.id,
    score: candidat.scoreTotal,
    annonce: {
      listId: annonce.listId,
      url: annonce.url,
      rawData: annonce.rawData
    },
    bestDpe: {
      numeroDpe: candidat.dpe.numeroDpe,
      adresseBan: candidat.dpe.adresseBan
    }
  };

  console.log('Images dans la réponse API:');
  console.log('- rawData.images.urls[0]:', apiResponse.annonce.rawData?.images?.urls?.[0]);

  await prisma.$disconnect();
}

main().catch(console.error);
