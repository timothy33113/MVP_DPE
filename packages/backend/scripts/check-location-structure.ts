import { prisma } from '../src/config/database';

async function main() {
  // Récupérer une annonce avec rawData
  const annonce = await prisma.leboncoinAnnonce.findFirst({
    where: {
      rawData: {
        not: null
      }
    },
    select: {
      url: true,
      listId: true,
      rawData: true
    }
  });

  if (!annonce) {
    console.log('Aucune annonce trouvée');
    return;
  }

  console.log('Annonce:', annonce.listId);
  console.log('URL:', annonce.url);
  console.log('\n=== STRUCTURE LOCATION ===\n');

  const raw = annonce.rawData as any;

  if (raw.location) {
    console.log('Champs disponibles dans location:');
    console.log(JSON.stringify(Object.keys(raw.location), null, 2));
    console.log('\nContenu complet de location:');
    console.log(JSON.stringify(raw.location, null, 2));
  } else {
    console.log('Pas de champ location dans rawData');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
