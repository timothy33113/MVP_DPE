import { prisma } from '../src/config/database';

async function testFiltreBalcon() {
  console.log('🧪 Test du filtre balcon\n');

  // Récupérer tous les clusters avec leurs annonces
  const clusters = await prisma.matchCluster.findMany({
    take: 1000,
    include: {
      annonce: {
        select: {
          id: true,
          listId: true,
          typeBien: true,
          prix: true,
          chambres: true,
          avecBalcon: true,
          avecTerrasse: true,
          avecGarage: true,
          etatBien: true,
        }
      }
    }
  });

  console.log(`📊 Total clusters: ${clusters.length}`);

  // Compter les biens avec balcon
  const avecBalcon = clusters.filter(c => c.annonce?.avecBalcon === true);
  const avecTerrasse = clusters.filter(c => c.annonce?.avecTerrasse === true);
  const avecGarage = clusters.filter(c => c.annonce?.avecGarage === true);

  console.log(`✅ Avec balcon: ${avecBalcon.length}`);
  console.log(`✅ Avec terrasse: ${avecTerrasse.length}`);
  console.log(`✅ Avec garage: ${avecGarage.length}`);

  // Afficher quelques exemples avec balcon
  console.log(`\n📋 Exemples de biens avec balcon (5 premiers):`);
  avecBalcon.slice(0, 5).forEach(c => {
    console.log(`   - ${c.annonce?.listId}: ${c.annonce?.typeBien}, ${c.annonce?.prix}€, balcon=${c.annonce?.avecBalcon}`);
  });

  // Test de filtrage strict
  console.log(`\n🔍 Test filtrage strict (avecBalcon !== true):`);
  const filtered = clusters.filter(c => {
    const annonce = c.annonce;
    if (!annonce) return false;

    // Filtre balcon strict
    if (annonce.avecBalcon !== true) return false;

    return true;
  });

  console.log(`   Résultat: ${filtered.length} biens (devrait être ${avecBalcon.length})`);

  if (filtered.length === avecBalcon.length) {
    console.log(`   ✅ Le filtrage fonctionne correctement!`);
  } else {
    console.log(`   ❌ Problème de filtrage!`);
  }
}

testFiltreBalcon()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
