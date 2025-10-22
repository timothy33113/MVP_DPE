import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Regex patterns pour extraire les dates de DPE
const DATE_PATTERNS = [
  // Format: Date de réalisation du diagnostic énergétique : 13/03/2025
  /date\s+de\s+réalisation\s+du\s+diagnostic\s+énergétique\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
  // Format: Date de réalisation du diagnostic : 25/02/2025
  /date\s+de\s+réalisation\s+du\s+diagnostic\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
  // Format: Date du diagnostic : 25/02/2025
  /date\s+du\s+diagnostic\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
  // Format: Diagnostic réalisé le 25/02/2025
  /diagnostic\s+réalisé\s+le\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
  // Format: DPE du 25/02/2025
  /dpe\s+du\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
  // Format: Date d'établissement du DPE : 25/02/2025
  /date\s+d['']établissement\s+du\s+dpe\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i,
];

function extractDateFromBody(body: string): Date | null {
  if (!body) return null;

  for (const pattern of DATE_PATTERNS) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1];
      // Parse date in DD/MM/YYYY format
      const parts = dateStr.split(/[\/\.\-]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // Validation basique
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2030) {
          return new Date(year, month - 1, day);
        }
      }
    }
  }

  return null;
}

async function main() {
  console.log('🔍 Extraction des dates de DPE depuis les descriptions...\n');

  // Récupérer toutes les annonces
  const annonces = await prisma.leboncoinAnnonce.findMany({
    select: {
      id: true,
      listId: true,
      rawData: true,
    },
  });

  console.log(`📊 ${annonces.length} annonces à traiter\n`);

  let countWithDate = 0;
  let countUpdated = 0;

  for (const annonce of annonces) {
    const body = (annonce.rawData as any)?.body;
    if (!body) continue;

    const dateDpe = extractDateFromBody(body);
    if (dateDpe) {
      countWithDate++;
      console.log(`✅ Annonce ${annonce.listId}: Date DPE trouvée = ${dateDpe.toLocaleDateString('fr-FR')}`);

      // Mise à jour de l'annonce avec la date extraite
      await prisma.leboncoinAnnonce.update({
        where: { id: annonce.id },
        data: { dateDpe },
      });

      countUpdated++;
    }
  }

  console.log(`\n✨ Extraction terminée :`);
  console.log(`   - ${countWithDate} annonces avec date de DPE trouvée`);
  console.log(`   - ${countUpdated} annonces mises à jour`);
  console.log(`   - ${((countWithDate / annonces.length) * 100).toFixed(1)}% des annonces`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
