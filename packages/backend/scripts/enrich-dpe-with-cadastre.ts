/**
 * Script pour enrichir les DPE avec les surfaces terrain depuis le cadastre
 *
 * Pour chaque DPE:
 * 1. Utilise l'adresse du DPE pour interroger le cadastre
 * 2. Récupère la surface totale des parcelles
 * 3. Met à jour le champ surfaceTerrain du DPE
 */

import { prisma } from '../src/config/database';
import { cadastreService } from '../src/services/cadastre.service';

async function enrichDpeWithCadastre(limit?: number) {
  console.log('🚀 Enrichissement des DPE avec les surfaces cadastrales\n');

  // Récupérer les DPE sans surface terrain
  const dpes = await prisma.dpeRecord.findMany({
    where: {
      surfaceTerrain: null,
      typeBatiment: 'MAISON', // Commençons par les maisons
    },
    take: limit,
  });

  console.log(`📊 ${dpes.length} DPE à enrichir\n`);

  let enriched = 0;
  let errors = 0;
  let noData = 0;

  for (let i = 0; i < dpes.length; i++) {
    const dpe = dpes[i];

    console.log(`[${i + 1}/${dpes.length}] ${dpe.adresseBan}`);

    try {
      // Interroger le cadastre avec l'adresse DPE
      // On ne passe PAS de surface attendue car on cherche la surface TERRAIN
      // (pas la surface habitable)
      const parcelles = await cadastreService.getParcellsByAddress(
        dpe.adresseBan
      );

      if (parcelles && parcelles.length > 0) {
        // Calculer la surface totale
        const surfaceTotale = parcelles.reduce((sum, p) => sum + p.contenance, 0);

        // Mettre à jour le DPE
        await prisma.dpeRecord.update({
          where: { id: dpe.id },
          data: { surfaceTerrain: surfaceTotale },
        });

        console.log(`   ✅ Surface terrain: ${surfaceTotale}m² (${parcelles.length} parcelle(s))`);
        enriched++;
      } else {
        console.log(`   ⚠️  Aucune parcelle trouvée`);
        noData++;
      }

      // Pause pour ne pas surcharger l'API
      if (i < dpes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.log(`   ❌ Erreur: ${error.message}`);
      errors++;
    }

    console.log('');
  }

  console.log('✅ Enrichissement terminé!\n');
  console.log('📊 Statistiques:');
  console.log(`   Total DPE traités: ${dpes.length}`);
  console.log(`   Enrichis avec succès: ${enriched}`);
  console.log(`   Sans données cadastrales: ${noData}`);
  console.log(`   Erreurs: ${errors}`);
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 20; // Par défaut 20 DPE

  try {
    await enrichDpeWithCadastre(limit);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
