import { prisma } from '../src/config/database';

async function main() {
  const annonce = await prisma.leboncoinAnnonce.findFirst({
    where: {
      matchCluster: {
        isNot: null
      }
    },
    select: { rawData: true, url: true, listId: true }
  });

  if (annonce && annonce.rawData) {
    const raw = annonce.rawData as any;
    console.log('Annonce:', annonce.listId);
    console.log('URL:', annonce.url);
    console.log('\nStructure images:');
    console.log('- hasImages:', !!raw.images);
    console.log('- hasUrls:', !!raw.images?.urls);
    console.log('- urlsLength:', raw.images?.urls?.length || 0);

    if (raw.images) {
      console.log('- imageKeys:', Object.keys(raw.images));
      console.log('\nPremière URL:', raw.images.urls?.[0] || raw.images.thumb_url || 'none');
      console.log('\nStructure complète images:', JSON.stringify(raw.images, null, 2));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
