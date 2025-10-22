/**
 * Script pour extraire et enregistrer les types de mandat depuis rawData
 *
 * Lit le mandate_type depuis rawData.attributes et le copie dans la colonne mandateType
 *
 * Usage: npx ts-node scripts/extract-mandate-types.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// ============================================================================
// Fonction principale
// ============================================================================

async function extractMandateTypes(): Promise<void> {
  console.log('\n📋 Extraction des types de mandat depuis rawData\n');

  try {
    // Récupérer toutes les annonces avec rawData
    console.log('📊 Récupération des annonces...');

    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        rawData: {
          not: null,
        },
      },
      select: {
        id: true,
        listId: true,
        rawData: true,
        mandateType: true,
        datePublication: true,
      },
    });

    console.log(`   ✅ ${annonces.length} annonces à traiter\n`);

    let countSimple = 0;
    let countExclusive = 0;
    let countParticulier = 0;
    let countUpdated = 0;

    // Traiter chaque annonce
    for (const annonce of annonces) {
      const rawData = annonce.rawData as any;

      // Chercher le mandate_type dans les attributes
      let mandateType: string | null = null;

      if (rawData?.attributes && Array.isArray(rawData.attributes)) {
        const mandateAttr = rawData.attributes.find((attr: any) => attr.key === 'mandate_type');
        if (mandateAttr?.value) {
          mandateType = mandateAttr.value;
        }
      }

      // Si pas de mandate_type, vérifier si c'est un particulier
      if (!mandateType) {
        const ownerType = rawData?.owner?.type;
        if (!ownerType || ownerType !== 'pro') {
          // C'est un particulier
          mandateType = null; // On garde NULL pour les particuliers
          countParticulier++;
        }
      } else if (mandateType === 'simple') {
        countSimple++;
      } else if (mandateType === 'exclusive') {
        countExclusive++;
      }

      // Mettre à jour si différent
      if (annonce.mandateType !== mandateType) {
        await prisma.leboncoinAnnonce.update({
          where: { id: annonce.id },
          data: { mandateType: mandateType as any },
        });
        countUpdated++;

        if (countUpdated % 100 === 0) {
          console.log(`   ⏳ ${countUpdated} annonces mises à jour...`);
        }
      }
    }

    // Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`   Total traité: ${annonces.length}`);
    console.log(`   Mises à jour: ${countUpdated}`);
    console.log('');
    console.log(`   🔵 Mandat simple: ${countSimple}`);
    console.log(`   🔴 Mandat exclusif: ${countExclusive}`);
    console.log(`   💎 Particuliers (pas de mandat): ${countParticulier}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Extraction terminée avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'extraction:\n');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  await extractMandateTypes();
}

main();
