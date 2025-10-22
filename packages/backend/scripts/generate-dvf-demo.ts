/**
 * Script de génération de données DVF de démonstration
 * Génère des transactions réalistes basées sur les annonces existantes
 *
 * Usage: pnpm generate:dvf:demo
 */

import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function main() {
  logger.info('🏢 Génération de données DVF de démonstration');

  // Récupérer toutes les annonces
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      surface: { not: null },
      lat: { not: null },
      lng: { not: null },
    },
  });

  logger.info(`✓ ${annonces.length} annonces trouvées`);

  let created = 0;
  const now = new Date();

  // Pour chaque annonce, générer 2-4 transactions "comparables" dans les 12 derniers mois
  for (const annonce of annonces) {
    const nbTransactions = Math.floor(Math.random() * 3) + 2; // 2 à 4 transactions

    for (let i = 0; i < nbTransactions; i++) {
      // Date aléatoire dans les 12 derniers mois
      const daysAgo = Math.floor(Math.random() * 365);
      const dateMutation = new Date(now);
      dateMutation.setDate(dateMutation.getDate() - daysAgo);

      // Variation de prix: -20% à +20%
      const prixBase = annonce.prix || 200000;
      const variation = (Math.random() * 0.4) - 0.2; // -0.2 à +0.2
      const prixTransaction = Math.round(prixBase * (1 + variation));

      // Variation de surface: -15% à +15%
      const surfaceBase = annonce.surface || 100;
      const variationSurface = (Math.random() * 0.3) - 0.15;
      const surfaceTransaction = Math.round(surfaceBase * (1 + variationSurface));

      // Variation de position GPS: ~100-500m
      const latVariation = (Math.random() * 0.01) - 0.005;
      const lngVariation = (Math.random() * 0.01) - 0.005;

      try {
        await prisma.dvfTransaction.create({
          data: {
            idMutation: `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            dateMutation,
            natureMutation: 'Vente',
            valeurFonciere: prixTransaction,
            adresseNumero: String(Math.floor(Math.random() * 100) + 1),
            adresseNomVoie: `Rue Example ${i + 1}`,
            codePostal: annonce.codePostal,
            codeCommune: annonce.codePostal.substring(0, 5), // Approximation
            nomCommune: annonce.rawData?.location?.city || 'Pau',
            typeLocal: annonce.typeBien === 'MAISON' ? 'Maison' :
                      annonce.typeBien === 'APPARTEMENT' ? 'Appartement' : 'Maison',
            surfaceReelleBati: surfaceTransaction,
            nombrePiecesPrincipales: annonce.pieces || Math.floor(Math.random() * 4) + 2,
            surfaceTerrain: annonce.typeBien === 'MAISON' ? Math.floor(Math.random() * 500) + 200 : null,
            nombreLots: annonce.typeBien === 'APPARTEMENT' ? Math.floor(Math.random() * 20) + 5 : null,
            latitude: annonce.lat! + latVariation,
            longitude: annonce.lng! + lngVariation,
          },
        });

        created++;
      } catch (error) {
        // Ignorer les erreurs (probablement des doublons d'idMutation)
      }
    }
  }

  logger.info(`✅ ${created} transactions DVF de démonstration créées`);

  // Statistiques
  const stats = await prisma.dvfTransaction.groupBy({
    by: ['typeLocal'],
    _count: true,
    _avg: {
      valeurFonciere: true,
      surfaceReelleBati: true,
    },
  });

  logger.info('\n📊 Statistiques des transactions:');
  for (const stat of stats) {
    const prixMoyen = stat._avg.valeurFonciere || 0;
    const surfaceMoyenne = stat._avg.surfaceReelleBati || 0;
    const prixM2 = surfaceMoyenne > 0 ? Math.round(prixMoyen / surfaceMoyenne) : 0;

    logger.info(`  ${stat.typeLocal}:`);
    logger.info(`    - ${stat._count} transactions`);
    logger.info(`    - Prix moyen: ${Math.round(prixMoyen).toLocaleString('fr-FR')}€`);
    logger.info(`    - Surface moyenne: ${Math.round(surfaceMoyenne)}m²`);
    logger.info(`    - Prix/m² moyen: ${prixM2.toLocaleString('fr-FR')}€/m²`);
  }

  logger.info('\n💡 Données DVF de démonstration prêtes!');
  logger.info('   Les popups de la carte afficheront maintenant les comparaisons de marché');

  await prisma.$disconnect();
}

main().catch((error) => {
  logger.error('Erreur:', error);
  process.exit(1);
});
