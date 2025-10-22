/**
 * Script de test de l'algorithme de matching DPE ↔ Leboncoin
 *
 * Usage: pnpm test:matching [annonce_id]
 *
 * Fonctionnalités:
 * - Teste l'algorithme de matching avec des données réelles
 * - Affiche les scores détaillés pour chaque candidat
 * - Vérifie la pertinence des matches
 * - Statistiques globales
 */

import { prisma } from '../src/config/database';
import { matchingService } from '../src/modules/matching/matching.service';

// ============================================================================
// Fonctions utilitaires
// ============================================================================

function formatScore(score: number): string {
  if (score >= 80) return `🟢 ${score}/100`;
  if (score >= 60) return `🟡 ${score}/100`;
  if (score >= 40) return `🟠 ${score}/100`;
  return `🔴 ${score}/100`;
}

function formatEtiquette(etiquette: string | null): string {
  if (!etiquette) return 'N/A';
  const colors: Record<string, string> = {
    'A': '\x1b[32m', // Vert
    'B': '\x1b[32m',
    'C': '\x1b[33m', // Jaune
    'D': '\x1b[33m',
    'E': '\x1b[31m', // Rouge
    'F': '\x1b[31m',
    'G': '\x1b[31m',
  };
  const color = colors[etiquette] || '\x1b[0m';
  return `${color}${etiquette}\x1b[0m`;
}

// ============================================================================
// Test du matching pour une annonce
// ============================================================================

async function testMatchingForAnnonce(annonceId: string): Promise<void> {
  console.log(`\n🔍 Test du matching pour l'annonce ${annonceId}\n`);

  // Récupérer l'annonce
  const annonce = await prisma.leboncoinAnnonce.findUnique({
    where: { id: annonceId },
  });

  if (!annonce) {
    console.error(`❌ Annonce ${annonceId} introuvable`);
    process.exit(1);
  }

  console.log('📋 Annonce testée:');
  console.log(`   URL: ${annonce.url}`);
  console.log(`   Code postal: ${annonce.codePostal}`);
  console.log(`   Type: ${annonce.typeBien}`);
  console.log(`   Surface: ${annonce.surface ? `${annonce.surface} m²` : 'N/A'}`);
  console.log(`   Pièces: ${annonce.pieces || 'N/A'}`);
  console.log(`   DPE: ${formatEtiquette(annonce.etiquetteDpe)}`);
  console.log(`   GES: ${formatEtiquette(annonce.etiquetteGes)}`);
  console.log('');

  // Rechercher les DPE dans le même code postal
  const dpes = await prisma.dpeRecord.findMany({
    where: {
      codePostalBan: annonce.codePostal,
    },
    take: 100, // Limiter pour la performance
  });

  if (dpes.length === 0) {
    console.log(`⚠️  Aucun DPE trouvé pour le code postal ${annonce.codePostal}`);
    return;
  }

  console.log(`📊 ${dpes.length} DPE trouvés dans le code postal ${annonce.codePostal}\n`);

  // Lancer le matching
  console.log('⏳ Calcul des scores de matching...\n');

  const startTime = Date.now();

  const result = await matchingService.matchAnnonceToDpes(annonce, dpes, {
    maxCandidats: 10,
    seuilScoreMinimum: 30,
    includeScoreDetails: true,
  });

  const duration = Date.now() - startTime;

  // Afficher les résultats
  console.log(`✅ Matching terminé en ${duration}ms\n`);
  console.log(`📈 Résultats: ${result.candidats.length} candidats trouvés\n`);

  if (result.candidats.length === 0) {
    console.log('⚠️  Aucun candidat ne correspond aux critères minimums');
    return;
  }

  // Tableau des candidats
  console.log('🏆 Top candidats:\n');

  result.candidats.forEach((candidat, index) => {
    const details = candidat.scoreDetails!;

    console.log(`${index + 1}. ${formatScore(candidat.scoreNormalized)}`);
    console.log(`   Adresse: ${candidat.adresse}`);
    console.log(`   Type: ${candidat.typeBatiment}`);
    console.log(`   Surface: ${candidat.surface} m²`);
    console.log(`   DPE: ${formatEtiquette(candidat.etiquetteDpe)} | GES: ${formatEtiquette(candidat.etiquetteGes)}`);
    console.log(`   Année: ${candidat.anneConstruction || 'N/A'}`);
    console.log('');
    console.log('   Détail du score:');
    console.log(`     ✅ Éliminatoires:`);
    console.log(`        Code postal: ${details.eliminatoires.codePostal ? '✓' : '✗'}`);
    console.log(`        Type bien: ${details.eliminatoires.typeBien ? '✓' : '✗'}`);
    console.log('');
    console.log(`     📊 Score de base: ${details.scoreBase.total}/85`);
    console.log(`        DPE: ${details.scoreBase.dpe}/25`);
    console.log(`        GES: ${details.scoreBase.ges}/25`);
    console.log(`        Surface: ${details.scoreBase.surface}/15`);
    console.log(`        Pièces: ${details.scoreBase.pieces}/10`);
    console.log(`        Année: ${details.scoreBase.anneConstruction}/10`);
    console.log('');
    console.log(`     ⭐ Bonus: ${details.bonus.total}/27`);
    console.log(`        Distance GPS: ${details.bonus.distanceGPS}/10`);
    console.log(`        Quartier: ${details.bonus.quartier}/5`);
    console.log(`        Étage: ${details.bonus.etage}/4`);
    console.log(`        Exposition: ${details.bonus.exposition}/3`);
    console.log(`        Parking: ${details.bonus.parking}/3`);
    console.log(`        Ascenseur: ${details.bonus.ascenseur}/2`);
    console.log('');
    console.log(`     🎯 Score normalisé: ${candidat.scoreNormalized}/100`);
    console.log(`     🥇 Rang: #${candidat.rang}`);
    console.log('');
    console.log('   ─────────────────────────────────────────────────────');
    console.log('');
  });

  // Statistiques
  const avgScore = result.candidats.reduce((sum, c) => sum + c.scoreNormalized, 0) / result.candidats.length;
  const maxScore = Math.max(...result.candidats.map(c => c.scoreNormalized));
  const minScore = Math.min(...result.candidats.map(c => c.scoreNormalized));

  console.log('\n📊 Statistiques des scores:\n');
  console.log(`   Score moyen: ${avgScore.toFixed(2)}/100`);
  console.log(`   Score maximum: ${maxScore}/100`);
  console.log(`   Score minimum: ${minScore}/100`);
  console.log('');
}

// ============================================================================
// Test du matching pour toutes les annonces
// ============================================================================

async function testMatchingForAll(): Promise<void> {
  console.log('\n🔍 Test du matching pour toutes les annonces\n');

  // Récupérer toutes les annonces
  const annonces = await prisma.leboncoinAnnonce.findMany({
    take: 20, // Limiter pour ne pas surcharger
  });

  if (annonces.length === 0) {
    console.log('⚠️  Aucune annonce trouvée en base de données');
    console.log('💡 Lancez d\'abord: pnpm import:leboncoin');
    return;
  }

  console.log(`📊 ${annonces.length} annonces à tester\n`);

  let totalCandidats = 0;
  let annoncesAvecMatches = 0;
  let totalTime = 0;

  for (const [index, annonce] of annonces.entries()) {
    console.log(`\n[${index + 1}/${annonces.length}] Test de ${annonce.url.substring(0, 60)}...`);

    // Rechercher les DPE
    const dpes = await prisma.dpeRecord.findMany({
      where: { codePostalBan: annonce.codePostal },
      take: 100,
    });

    if (dpes.length === 0) {
      console.log(`   ⚠️  Aucun DPE pour ${annonce.codePostal}`);
      continue;
    }

    // Matching
    const startTime = Date.now();
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, {
      maxCandidats: 10,
      seuilScoreMinimum: 30,
      includeScoreDetails: true, // Nécessaire pour le filtrage
    });
    const duration = Date.now() - startTime;
    totalTime += duration;

    console.log(`   ✅ ${result.candidats.length} candidats trouvés (${duration}ms)`);

    if (result.candidats.length > 0) {
      annoncesAvecMatches++;
      totalCandidats += result.candidats.length;

      const topScore = result.candidats[0].scoreNormalized;
      console.log(`   🏆 Meilleur score: ${formatScore(topScore)}`);
    }
  }

  // Statistiques finales
  console.log('\n\n✅ Test terminé!\n');
  console.log('📊 Statistiques globales:\n');
  console.log(`   Total annonces testées: ${annonces.length}`);
  console.log(`   Annonces avec matches: ${annoncesAvecMatches} (${((annoncesAvecMatches / annonces.length) * 100).toFixed(1)}%)`);
  console.log(`   Total candidats trouvés: ${totalCandidats}`);
  console.log(`   Moyenne candidats/annonce: ${(totalCandidats / annoncesAvecMatches).toFixed(1)}`);
  console.log(`   Temps total: ${totalTime}ms`);
  console.log(`   Temps moyen/annonce: ${(totalTime / annonces.length).toFixed(0)}ms`);
  console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  try {
    if (args.length > 0) {
      // Test pour une annonce spécifique
      const annonceId = args[0];
      await testMatchingForAnnonce(annonceId);
    } else {
      // Test pour toutes les annonces
      await testMatchingForAll();
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
