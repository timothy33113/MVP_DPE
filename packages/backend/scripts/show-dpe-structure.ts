import { prisma } from '../src/config/database';

async function main() {
  console.log('🔍 Structure des données DPE...\n');

  const dpe = await prisma.dpeRecord.findFirst();

  if (!dpe) {
    console.log('❌ Aucun DPE trouvé');
    return;
  }

  console.log(`📋 DPE: ${dpe.adresseBan}`);
  console.log(`   Surface: ${dpe.surfaceHabitable}m²`);
  console.log(`   Type: ${dpe.typeBatiment}`);
  console.log('');

  const rawData = dpe.rawData as any;
  console.log('📊 Clés disponibles dans rawData:');
  console.log('');

  const keys = Object.keys(rawData);
  const terrainKeys = keys.filter(k => k.toLowerCase().includes('terrain') || k.toLowerCase().includes('surface') || k.toLowerCase().includes('parcelle'));

  console.log(`Total clés: ${keys.length}\n`);

  if (terrainKeys.length > 0) {
    console.log('🌳 Clés liées au terrain/surface:');
    terrainKeys.forEach(key => {
      console.log(`   ${key}: ${rawData[key]}`);
    });
  } else {
    console.log('⚠️  Aucune clé liée au terrain trouvée');
    console.log('\n📝 Toutes les clés disponibles:');
    keys.slice(0, 50).forEach(key => {
      const value = rawData[key];
      const displayValue = typeof value === 'string' ? value.substring(0, 50) : value;
      console.log(`   ${key}: ${displayValue}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
