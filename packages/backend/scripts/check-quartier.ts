import { PrismaClient } from '@prisma/client';
import { lambert93ToWGS84 } from '../src/utils/coordinates';

const prisma = new PrismaClient();

// Quartiers de Pau
const QUARTIERS = {
  'Le Hameau': { lat: 43.3150, lng: -0.3800, radius: 1.0 },
  'Trespoey': { lat: 43.3050, lng: -0.3900, radius: 0.8 },
};

function calcDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
  const hameau = QUARTIERS['Le Hameau'];
  const radiusMeters = (hameau.radius || 1) * 1000;

  console.log(`\n🏘️  Quartier Le Hameau`);
  console.log(`   Centre: ${hameau.lat}, ${hameau.lng}`);
  console.log(`   Rayon: ${radiusMeters}m\n`);

  // Top DPE candidats
  const numeroDpes = [
    '2564E2285927X', // 8 rue coquelicots - score 79
    '2564E2234764C', // 16 rue Nérac - score 74
    '2564E2091203N', // 17 av fontaine Trespoey - score 71
    '2564E0860753N', // 14 rue Alphonse Daudet - score 68
    '2564E1010631B', // 6 rue Anie - score 68
  ];

  const dpes = await prisma.dpeRecord.findMany({
    where: { numeroDpe: { in: numeroDpes } },
  });

  console.log('Vérification DPE dans le quartier:\n');

  for (const dpe of dpes) {
    if (!dpe.coordonneeX || !dpe.coordonneeY) continue;

    const [lng, lat] = lambert93ToWGS84(dpe.coordonneeX, dpe.coordonneeY);
    const coords = { lat, lng };
    const distance = calcDistance(coords, hameau);
    const dansQuartier = distance <= radiusMeters;

    console.log(`${dpe.adresseBan}`);
    console.log(`   Numéro: ${dpe.numeroDpe}`);
    console.log(`   Lambert93: X=${dpe.coordonneeX}, Y=${dpe.coordonneeY}`);
    console.log(`   GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    console.log(`   Distance au Hameau: ${Math.round(distance)}m`);
    console.log(`   ${dansQuartier ? '✅ DANS le quartier' : '❌ HORS quartier'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
