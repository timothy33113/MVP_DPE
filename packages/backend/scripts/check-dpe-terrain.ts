import { prisma } from '../src/config/database';

async function main() {
  console.log('🔍 Vérification des surfaces terrain dans les DPE...\n');

  // Prendre quelques DPE au hasard
  const dpes = await prisma.dpeRecord.findMany({
    take: 100,
  });

  console.log(`📊 ${dpes.length} DPE analysés\n`);

  let withTerrain = 0;
  const examples: any[] = [];

  for (const dpe of dpes) {
    const rawData = dpe.rawData as any;
    if (rawData?.surface_terrain && rawData.surface_terrain > 0) {
      withTerrain++;
      if (examples.length < 10) {
        examples.push({
          adresse: dpe.adresseBan,
          surfaceHabitable: dpe.surfaceHabitable,
          surfaceTerrain: rawData.surface_terrain,
          typeBatiment: dpe.typeBatiment,
          codePostal: dpe.codePostalBan,
        });
      }
    }
  }

  console.log(`✅ DPE avec surface terrain: ${withTerrain}/${dpes.length} (${((withTerrain/dpes.length)*100).toFixed(1)}%)\n`);

  if (examples.length > 0) {
    console.log('📝 Exemples de DPE avec surface terrain:\n');
    examples.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.adresse}`);
      console.log(`   Type: ${ex.typeBatiment}`);
      console.log(`   Surface habitable: ${ex.surfaceHabitable}m²`);
      console.log(`   Surface terrain: ${ex.surfaceTerrain}m²`);
      console.log(`   Code postal: ${ex.codePostal}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
