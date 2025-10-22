import { prisma } from '../src/config/database';

/**
 * Script pour extraire les informations détaillées des annonces depuis rawData
 * et les stocker dans les colonnes dédiées pour améliorer les performances de filtrage
 */

interface RawDataAttribute {
  key: string;
  value: string;
  values?: string[];
  value_label?: string;
}

function getAttributeValue(attributes: RawDataAttribute[], key: string): string | null {
  const attr = attributes?.find((a: RawDataAttribute) => a.key === key);
  return attr?.value || null;
}

function getAttributeValues(attributes: RawDataAttribute[], key: string): string[] {
  const attr = attributes?.find((a: RawDataAttribute) => a.key === key);
  return attr?.values || [];
}

function hasAttributeValue(attributes: RawDataAttribute[], key: string, searchValue: string): boolean {
  const values = getAttributeValues(attributes, key);
  return values.some((v: string) => v.toLowerCase().includes(searchValue.toLowerCase()));
}

async function extractAnnonceDetails() {
  console.log('🔄 Début de l\'extraction des détails des annonces...\n');

  // Récupérer toutes les annonces avec rawData
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      rawData: {
        not: null
      }
    },
    select: {
      id: true,
      listId: true,
      rawData: true,
      prix: true,
      chambres: true,
      etatBien: true,
      avecBalcon: true,
      avecTerrasse: true,
      avecGarage: true,
      avecParkingPrive: true,
      surfaceTerrain: true
    }
  });

  console.log(`📊 ${annonces.length} annonces à traiter\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const annonce of annonces) {
    try {
      const rawData = annonce.rawData as any;

      if (!rawData) {
        skipped++;
        continue;
      }

      const attributes = rawData.attributes || [];
      const updates: any = {};

      // Prix
      if (!annonce.prix && rawData.price && Array.isArray(rawData.price) && rawData.price[0]) {
        updates.prix = parseInt(rawData.price[0]);
      }

      // Chambres
      if (!annonce.chambres) {
        const chambres = getAttributeValue(attributes, 'bedrooms');
        if (chambres) {
          updates.chambres = parseInt(chambres);
        }
      }

      // État du bien
      if (!annonce.etatBien) {
        const globalCondition = getAttributeValue(attributes, 'global_condition');
        const valueLabel = attributes.find((a: RawDataAttribute) => a.key === 'global_condition')?.value_label;

        if (valueLabel) {
          updates.etatBien = valueLabel; // "Neuf", "Bon état", "À rénover", etc.
        } else if (globalCondition) {
          // Mapping des valeurs numériques
          const conditionMap: Record<string, string> = {
            '1': 'Neuf',
            '2': 'Bon état',
            '3': 'À rénover',
            '4': 'À restaurer'
          };
          updates.etatBien = conditionMap[globalCondition] || null;
        }
      }

      // Balcon
      if (annonce.avecBalcon === null) {
        const hasBalcon = hasAttributeValue(attributes, 'outside_access', 'balcony') ||
                         hasAttributeValue(attributes, 'specificities', 'balcony');
        updates.avecBalcon = hasBalcon;
      }

      // Terrasse
      if (annonce.avecTerrasse === null) {
        const hasTerrasse = hasAttributeValue(attributes, 'outside_access', 'terrace') ||
                           hasAttributeValue(attributes, 'specificities', 'terrace');
        updates.avecTerrasse = hasTerrasse;
      }

      // Garage
      if (annonce.avecGarage === null) {
        const hasGarage = hasAttributeValue(attributes, 'parking', 'garage') ||
                         hasAttributeValue(attributes, 'specificities', 'garage');
        updates.avecGarage = hasGarage;
      }

      // Parking privé
      if (annonce.avecParkingPrive === null) {
        const hasParking = hasAttributeValue(attributes, 'parking', 'parking') ||
                          hasAttributeValue(attributes, 'parking', 'private') ||
                          hasAttributeValue(attributes, 'specificities', 'parking');
        updates.avecParkingPrive = hasParking;
      }

      // Surface terrain (pour les maisons)
      if (!annonce.surfaceTerrain) {
        const landPlotArea = getAttributeValue(attributes, 'land_plot_area');
        if (landPlotArea) {
          updates.surfaceTerrain = parseFloat(landPlotArea);
        }
      }

      // Si au moins un champ a été extrait, faire l'update
      if (Object.keys(updates).length > 0) {
        await prisma.leboncoinAnnonce.update({
          where: { id: annonce.id },
          data: updates
        });

        updated++;

        if (updated % 100 === 0) {
          console.log(`✓ ${updated} annonces mises à jour...`);
        }
      } else {
        skipped++;
      }

    } catch (error) {
      console.error(`❌ Erreur pour l'annonce ${annonce.listId}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Extraction terminée:`);
  console.log(`   - ${updated} annonces mises à jour`);
  console.log(`   - ${skipped} annonces ignorées (déjà renseignées ou sans données)`);
  console.log(`   - ${errors} erreurs`);
}

// Exécution
extractAnnonceDetails()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
