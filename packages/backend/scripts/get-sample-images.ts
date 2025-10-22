import { prisma } from '../src/config/database';

async function main() {
  // Récupérer 3 annonces avec images
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      rawData: {
        path: ['images', 'urls'],
        not: null
      }
    },
    take: 3
  });

  console.log('=== EXEMPLES D\'IMAGES ===\n');

  for (const annonce of annonces) {
    const raw = annonce.rawData as any;
    const imageUrl = raw?.images?.urls?.[0];

    console.log(`Annonce: ${annonce.listId}`);
    console.log(`URL Leboncoin: ${annonce.url}`);
    console.log(`Ville: ${raw?.location?.city || 'N/A'}`);
    console.log(`Image URL: ${imageUrl}`);
    console.log(`\nTester cette image directement dans votre navigateur:`);
    console.log(`👉 ${imageUrl}`);
    console.log('\n---\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
