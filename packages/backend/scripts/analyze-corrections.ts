/**
 * Script d'analyse des corrections manuelles
 * Permet d'identifier les patterns d'erreur et suggérer des ajustements de poids
 */

import { prisma } from '../src/config/database';

interface CorrectionAnalysis {
  total: number;
  validations: number;
  corrections: number;
  accuracy: number;
  avgScoreProposed: number | null;
  avgScoreCorrect: number | null;
  scoreDiff: number | null;
  errorsByRank: Map<number, number>;
  noMatchErrors: number;
}

async function analyzeCorrections(): Promise<CorrectionAnalysis> {
  const allCorrections = await prisma.matchCorrection.findMany({
    include: {
      annonce: true,
      dpeProposed: true,
      dpeCorrect: true,
    },
  });

  const validations = allCorrections.filter((c) => c.isValidation);
  const corrections = allCorrections.filter((c) => !c.isValidation);

  // Calcul des scores moyens
  const correctionsWithScores = corrections.filter(
    (c) => c.scoreProposed !== null && c.scoreCorrect !== null
  );

  const avgScoreProposed =
    correctionsWithScores.length > 0
      ? correctionsWithScores.reduce((sum, c) => sum + (c.scoreProposed || 0), 0) /
        correctionsWithScores.length
      : null;

  const avgScoreCorrect =
    correctionsWithScores.length > 0
      ? correctionsWithScores.reduce((sum, c) => sum + (c.scoreCorrect || 0), 0) /
        correctionsWithScores.length
      : null;

  const scoreDiff =
    avgScoreProposed !== null && avgScoreCorrect !== null
      ? avgScoreCorrect - avgScoreProposed
      : null;

  // Distribution des erreurs par rang
  const errorsByRank = new Map<number, number>();
  corrections.forEach((c) => {
    if (c.rangCorrect !== null) {
      const count = errorsByRank.get(c.rangCorrect) || 0;
      errorsByRank.set(c.rangCorrect, count + 1);
    }
  });

  // Erreurs où le bon DPE n'était pas dans les candidats
  const noMatchErrors = corrections.filter((c) => c.rangCorrect === null).length;

  return {
    total: allCorrections.length,
    validations: validations.length,
    corrections: corrections.length,
    accuracy: allCorrections.length > 0 ? (validations.length / allCorrections.length) * 100 : 0,
    avgScoreProposed,
    avgScoreCorrect,
    scoreDiff,
    errorsByRank,
    noMatchErrors,
  };
}

async function analyzeCriteriaPatterns() {
  // Récupérer toutes les corrections avec les détails des DPE
  const corrections = await prisma.matchCorrection.findMany({
    where: { isValidation: false },
    include: {
      annonce: true,
      dpeProposed: true,
      dpeCorrect: true,
    },
  });

  const patterns = {
    surfaceBetter: 0,
    timingBetter: 0,
    energyBetter: 0,
    typeMatches: 0,
    total: corrections.filter((c) => c.dpeProposed && c.dpeCorrect).length,
  };

  corrections.forEach((correction) => {
    if (!correction.dpeProposed || !correction.dpeCorrect || !correction.annonce) return;

    const proposed = correction.dpeProposed;
    const correct = correction.dpeCorrect;
    const annonce = correction.annonce;

    // Analyser les différences de critères
    if (annonce.surface) {
      const diffProposed = Math.abs((proposed.surfaceHabitable || 0) - annonce.surface);
      const diffCorrect = Math.abs((correct.surfaceHabitable || 0) - annonce.surface);
      if (diffCorrect < diffProposed) {
        patterns.surfaceBetter++;
      }
    }

    // Timing (date établissement)
    if (annonce.createdAt && proposed.dateEtablissement && correct.dateEtablissement) {
      const diffProposed = Math.abs(
        new Date(annonce.createdAt).getTime() - new Date(proposed.dateEtablissement).getTime()
      );
      const diffCorrect = Math.abs(
        new Date(annonce.createdAt).getTime() - new Date(correct.dateEtablissement).getTime()
      );
      if (diffCorrect < diffProposed) {
        patterns.timingBetter++;
      }
    }

    // Énergie (DPE)
    if (proposed.etiquetteDpe !== correct.etiquetteDpe) {
      patterns.energyBetter++;
    }

    // Type de bien
    if (proposed.typeBatiment === annonce.typeBien) {
      patterns.typeMatches++;
    }
  });

  return patterns;
}

function generateSuggestions(analysis: CorrectionAnalysis, patterns: any) {
  const suggestions: string[] = [];

  // Si beaucoup d'erreurs avec bon DPE en position 2-5
  const nearMissErrors = Array.from(analysis.errorsByRank.entries())
    .filter(([rank, _]) => rank >= 2 && rank <= 5)
    .reduce((sum, [_, count]) => sum + count, 0);

  const nearMissRate =
    analysis.corrections > 0 ? (nearMissErrors / analysis.corrections) * 100 : 0;

  if (nearMissRate > 30) {
    suggestions.push(
      `⚠️ ${nearMissRate.toFixed(1)}% des erreurs ont le bon DPE en position 2-5`
    );
    suggestions.push(`   → Les poids actuels manquent les bons matches de peu`);
  }

  // Analyse des patterns
  if (patterns.total > 0) {
    const surfaceRate = (patterns.surfaceBetter / patterns.total) * 100;
    const timingRate = (patterns.timingBetter / patterns.total) * 100;

    if (surfaceRate > 50) {
      suggestions.push(
        `📏 ${surfaceRate.toFixed(1)}% des erreurs: le bon DPE avait une meilleure surface`
      );
      suggestions.push(`   → Suggéré: Augmenter poids surface de 5 à 10 points (+100%)`);
    }

    if (timingRate > 50) {
      suggestions.push(
        `⏱️  ${timingRate.toFixed(1)}% des erreurs: le bon DPE avait un meilleur timing`
      );
      suggestions.push(`   → Suggéré: Augmenter poids timing de 15 à 20 points (+33%)`);
    }
  }

  // Si beaucoup d'erreurs sans candidat
  const noMatchRate =
    analysis.corrections > 0 ? (analysis.noMatchErrors / analysis.corrections) * 100 : 0;

  if (noMatchRate > 20) {
    suggestions.push(
      `🔍 ${noMatchRate.toFixed(1)}% des erreurs: bon DPE pas dans les candidats`
    );
    suggestions.push(`   → Élargir les critères de filtrage géographique ou de surface`);
  }

  // Différence de score
  if (analysis.scoreDiff !== null && analysis.scoreDiff > 10) {
    suggestions.push(
      `📊 Le bon DPE a en moyenne ${analysis.scoreDiff.toFixed(1)} points de plus que le proposé`
    );
    suggestions.push(`   → Les poids actuels sous-évaluent certains critères importants`);
  }

  return suggestions;
}

async function main() {
  console.log('🔍 Analyse des corrections manuelles...\n');

  const analysis = await analyzeCorrections();
  const patterns = await analyzeCriteriaPatterns();

  console.log('📊 RÉSULTATS GLOBAUX');
  console.log('='.repeat(50));
  console.log(`Total de feedbacks: ${analysis.total}`);
  console.log(`  ✅ Validations: ${analysis.validations}`);
  console.log(`  ❌ Corrections: ${analysis.corrections}`);
  console.log(`  📈 Précision: ${analysis.accuracy.toFixed(1)}%\n`);

  if (analysis.corrections > 0) {
    console.log('📉 ANALYSE DES ERREURS');
    console.log('='.repeat(50));

    if (analysis.avgScoreProposed !== null && analysis.avgScoreCorrect !== null) {
      console.log(
        `Score moyen DPE proposé: ${analysis.avgScoreProposed.toFixed(1)}/120`
      );
      console.log(
        `Score moyen DPE correct: ${analysis.avgScoreCorrect.toFixed(1)}/120`
      );
      console.log(
        `Différence moyenne: ${analysis.scoreDiff?.toFixed(1)} points\n`
      );
    }

    console.log('Distribution des erreurs par position du bon DPE:');
    const sortedRanks = Array.from(analysis.errorsByRank.entries()).sort(
      ([a], [b]) => a - b
    );
    sortedRanks.forEach(([rank, count]) => {
      const percentage = ((count / analysis.corrections) * 100).toFixed(1);
      console.log(`  Position ${rank}: ${count} erreurs (${percentage}%)`);
    });

    if (analysis.noMatchErrors > 0) {
      const percentage = ((analysis.noMatchErrors / analysis.corrections) * 100).toFixed(1);
      console.log(
        `  Pas dans candidats: ${analysis.noMatchErrors} erreurs (${percentage}%)\n`
      );
    }

    console.log('\n🔬 PATTERNS DÉTECTÉS');
    console.log('='.repeat(50));
    if (patterns.total > 0) {
      console.log(
        `Analysés sur ${patterns.total} corrections avec DPE proposé:\n`
      );
      console.log(
        `  📏 Surface meilleure: ${patterns.surfaceBetter}/${patterns.total} (${((patterns.surfaceBetter / patterns.total) * 100).toFixed(1)}%)`
      );
      console.log(
        `  ⏱️  Timing meilleur: ${patterns.timingBetter}/${patterns.total} (${((patterns.timingBetter / patterns.total) * 100).toFixed(1)}%)`
      );
      console.log(
        `  ⚡ Énergie différente: ${patterns.energyBetter}/${patterns.total} (${((patterns.energyBetter / patterns.total) * 100).toFixed(1)}%)\n`
      );
    } else {
      console.log('  Pas assez de données pour analyse détaillée\n');
    }

    const suggestions = generateSuggestions(analysis, patterns);

    if (suggestions.length > 0) {
      console.log('\n💡 SUGGESTIONS D\'AMÉLIORATION');
      console.log('='.repeat(50));
      suggestions.forEach((s) => console.log(s));
    }
  } else {
    console.log('✨ Aucune erreur enregistrée pour le moment!\n');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Analyse terminée\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
