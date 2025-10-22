/**
 * Script de test pour analyser les photos d'une annonce avec Claude Vision
 * Usage: ANTHROPIC_API_KEY=sk-xxx npx tsx scripts/test-photo-analysis.ts <annonce-id>
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../src/config/database';

const PROMPT_ANALYSE = `
Tu es un expert en rénovation immobilière. Analyse cette photo de bien immobilier.

🚨 RÈGLES STRICTES - À RESPECTER ABSOLUMENT :

1. ✅ FACTUEL UNIQUEMENT
   - Ne décris QUE ce qui est CLAIREMENT et VISIBLEMENT présent sur la photo
   - Si un élément n'est pas visible → "non visible sur la photo, à vérifier"

2. ❌ INTERDICTION DE SUPPOSER (sauf indices visuels clairs)
   - Vitrage : Analyse visuelle des menuiseries
     * Petits carreaux multiples (6-8 carreaux) → "probablement simple vitrage ancien, à confirmer"
     * PVC moderne → "probablement double vitrage, à confirmer"
     * Bois ancien → "possiblement simple vitrage, à vérifier"
   - VMC : Si pas visible → "présence à vérifier avec le vendeur"
   - Humidité : SEULEMENT si traces noires/moisissures/taches clairement visibles
   - Isolation : TOUJOURS "à vérifier", jamais présumer
   - Électricité : Ne pas affirmer "non conforme" sans diagnostic visible

3. 📊 NUANCE IMPORTANTE - Distingue FONCTIONNEL vs ESTHÉTIQUE
   - Cuisine/SDB propres, récentes → "bon état, modernisation optionnelle"
   - Cuisine/SDB datées MAIS fonctionnelles → "état correct, travaux déco à prévoir selon goût"
   - Intérieur VÉTUSTE (papier peint 70s, couleurs criardes, mobilier délabré) → "vétuste, rénovation déco lourde nécessaire"
   - Sois HONNÊTE sur l'ampleur réelle des travaux déco
   - Distingue :
     * URGENT = défaut structurel/sécurité
     * RECOMMANDÉ = confort/modernisation
     * NÉCESSAIRE = rénovation esthétique lourde (murs roses à repeindre, sols années 80, etc.)
     * OPTIONNEL = rafraîchissement léger

4. 💰 COÛTS RÉALISTES (3 scénarios)
   - MINIMAL : ne rien faire OU rafraîchissement cosmétique (peinture, joints)
   - MOYEN : travaux de confort sans tout casser
   - OPTIMAL : rénovation complète haut de gamme

5. ❓ QUESTIONS AU VENDEUR
   - Pour TOUT élément non visible, pose une question
   - Exemples : "VMC installée ?", "Type de vitrage ?", "Année électricité ?"

**TYPE DE PIÈCE**
Identifie la pièce (cuisine, salle de bain, salon, chambre, extérieur, autre)

**ÉTAT GÉNÉRAL** (Note /10)
10 = neuf/impeccable | 7 = bon état, fonctionnel | 5 = daté mais propre | 3 = vétuste | 1 = très dégradé
⚠️ "Daté" ne signifie pas forcément mauvais état !
Justifie ta note avec des éléments VISIBLES.

**ÉLÉMENTS VISIBLES**
Pour chaque élément CLAIREMENT visible :
- Sol : type et état OBSERVÉ (pas supposé)
- Murs : état, propreté, défauts visibles ?
- Plafond : état visible
- Menuiseries : type visible, état - Vitrage → "à vérifier" sauf preuve
- Équipements : état, époque estimée, fonctionnalité apparente
- Électricité : style prises (ancien/moderne) - PAS conformité
- Plomberie : état apparent robinetterie

**DÉFAUTS OBSERVÉS**
⚠️ UNIQUEMENT les défauts CLAIREMENT et INDUBITABLEMENT visibles :
- Fissures, moisissures noires, dégâts d'eau, casse, usure grave
- Déco vétuste (murs couleurs années 70-80, papier peint défraîchi, sols usés)
- Si "ça semble" ou "peut-être" → NE PAS LISTER, mettre en question vendeur
- N'INVENTE PAS de fissures si tu n'en vois pas clairement

**TRAVAUX POTENTIELS**
- URGENT : Seulement si défaut grave/sécurité VISIBLE
- NÉCESSAIRE : Rénovation déco lourde si intérieur vraiment vétuste
- RECOMMANDÉ : Modernisation, confort (sans obligation)
- OPTIONNEL : Rafraîchissement léger

**ESTIMATION COÛT TRAVAUX** (pour cette pièce uniquement)
- minimal : X€ (rien faire ou cosmétique)
- moyen : Y€ (confort)
- optimal : Z€ (rénovation complète)

**QUESTIONS À POSER AU VENDEUR**
3-5 questions précises sur éléments NON VISIBLES.

Format ta réponse en JSON :
{
  "piece": "type",
  "etat": 1-10,
  "justification": "...",
  "elements": {
    "sol": {"type": "...", "etat": "...", "commentaire": "..."},
    "murs": {"etat": "...", "commentaire": "..."},
    "menuiseries": {"type": "...", "etat": "...", "vitrage": "inconnu/à vérifier"},
    ...
  },
  "defauts": ["défaut1", "défaut2"],
  "travaux": {
    "urgent": ["..."],
    "recommande": ["..."],
    "optionnel": ["..."]
  },
  "coutEstime": {
    "minimal": 0,
    "moyen": 0,
    "optimal": 0
  },
  "questionsVendeur": ["question1", "question2", ...]
}
`;

async function analyzePhoto(
  imageUrl: string,
  anthropic: Anthropic,
  context?: { description?: string; dpe?: any }
) {
  console.log(`\n📸 Analyse de : ${imageUrl.substring(0, 80)}...`);

  // Enrichir le prompt avec le contexte
  let enrichedPrompt = PROMPT_ANALYSE;

  if (context?.description || context?.dpe) {
    enrichedPrompt += `\n\n📋 CONTEXTE ADDITIONNEL (à utiliser pour affiner ton analyse) :\n`;

    if (context.description) {
      enrichedPrompt += `\n**Description du bien :**\n${context.description}\n`;
    }

    if (context.dpe) {
      const dpeData = context.dpe.rawData as any;
      enrichedPrompt += `\n**Informations DPE ADEME disponibles :**\n`;
      enrichedPrompt += `- Étiquette énergie: ${context.dpe.etiquetteDpe}/${context.dpe.etiquetteGes}\n`;
      enrichedPrompt += `- Période construction: ${dpeData?.periode_construction || dpeData?.annee_construction || 'Non renseigné'}\n`;
      enrichedPrompt += `- Type énergie chauffage: ${dpeData?.type_energie_n1 || 'Non renseigné'}\n`;
      enrichedPrompt += `- Qualité isolation murs: ${dpeData?.qualite_isolation_murs || 'Non renseigné'}\n`;
      enrichedPrompt += `- Isolation toiture: ${dpeData?.isolation_toiture === '1' ? 'Oui' : dpeData?.isolation_toiture === '0' ? 'Non' : 'Non renseigné'}\n`;
      enrichedPrompt += `- Confort été: ${dpeData?.indicateur_confort_ete || 'Non renseigné'}\n`;
      enrichedPrompt += `- Type installation ECS: ${dpeData?.type_installation_ecs || 'Non renseigné'}\n`;
      enrichedPrompt += `\n⚠️ Utilise ces infos DPE ADEME pour CONFIRMER ou COMPLÉTER tes observations visuelles.\n`;
      enrichedPrompt += `Exemple: Si isolation murs "insuffisante" + période construction 1978, c'est cohérent avec fenêtres anciennes probablement simple vitrage.\n`;
    }
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: enrichedPrompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extraire le JSON de la réponse
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { raw: responseText };
  } catch (error) {
    console.error('❌ Erreur analyse photo:', error);
    return { error: error.message };
  }
}

async function analyzeAnnonce(annonceId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ Variable ANTHROPIC_API_KEY non définie');
    console.log('💡 Usage: ANTHROPIC_API_KEY=sk-xxx npx tsx scripts/test-photo-analysis.ts <annonce-id>');
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });

  // Récupérer l'annonce avec le DPE associé
  const annonce = await prisma.leboncoinAnnonce.findUnique({
    where: { id: annonceId },
    include: {
      matchCluster: {
        include: {
          candidats: {
            orderBy: { scoreTotal: 'desc' },
            take: 1,
            include: {
              dpe: true,
            },
          },
        },
      },
    },
  });

  if (!annonce) {
    console.error(`❌ Annonce ${annonceId} non trouvée`);
    process.exit(1);
  }

  const rawData = annonce.rawData as any;
  const description = rawData?.body || '';
  const bestDpe = annonce.matchCluster?.candidats?.[0]?.dpe;

  console.log('\n🏠 ANALYSE COMPLÈTE - BIEN IMMOBILIER');
  console.log('='.repeat(60));
  console.log(`URL: ${annonce.url}`);
  console.log(`Type: ${annonce.typeBien}`);
  console.log(`Surface: ${annonce.surface}m²`);
  console.log(`Prix: ${annonce.prix?.toLocaleString()}€`);
  if (bestDpe) {
    console.log(`DPE: ${bestDpe.etiquetteDpe}/${bestDpe.etiquetteGes}`);
    console.log(`Adresse DPE: ${bestDpe.adresseBan}`);
  }
  console.log('='.repeat(60));

  // Extraire les URLs des photos
  const photoUrls: string[] = rawData?.images?.urls_large || [];

  if (photoUrls.length === 0) {
    console.error('❌ Aucune photo trouvée');
    process.exit(1);
  }

  // Afficher les informations contextuelles
  if (description) {
    console.log(`\n📝 DESCRIPTION DE L'ANNONCE:`);
    console.log('-'.repeat(60));
    console.log(description.substring(0, 500) + (description.length > 500 ? '...' : ''));
    console.log('-'.repeat(60));
  }

  if (bestDpe) {
    console.log(`\n📊 INFORMATIONS DPE:`);
    console.log('-'.repeat(60));
    console.log(`Étiquette énergie: ${bestDpe.etiquetteDpe} (${bestDpe.consommationEnergie} kWh/m²/an)`);
    console.log(`Étiquette GES: ${bestDpe.etiquetteGes}`);
    console.log(`Type isolation mur: ${bestDpe.typeIsolationMur || 'Non renseigné'}`);
    console.log(`Type isolation plancher bas: ${bestDpe.typeIsolationPlancherBas || 'Non renseigné'}`);
    console.log(`Type vitrage: ${bestDpe.typeVitrage || 'Non renseigné'}`);
    console.log(`Type chauffage: ${bestDpe.typeChauffage || 'Non renseigné'}`);
    console.log(`Année construction: ${bestDpe.anneeConstruction || 'Non renseigné'}`);
    console.log('-'.repeat(60));
  }

  console.log(`\n📷 ${photoUrls.length} photos à analyser\n`);

  const analyses = [];

  for (let i = 0; i < photoUrls.length; i++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📸 PHOTO ${i + 1}/${photoUrls.length}`);
    console.log('='.repeat(60));

    const analysis = await analyzePhoto(photoUrls[i], anthropic, {
      description,
      dpe: bestDpe,
    });
    analyses.push(analysis);

    if (analysis.error) {
      console.log(`❌ Erreur: ${analysis.error}`);
      continue;
    }

    // Afficher le résultat
    console.log(`\n🏷️  Pièce: ${analysis.piece || 'N/A'}`);
    console.log(`📊 État: ${analysis.etat || 'N/A'}/10`);
    console.log(`💬 ${analysis.justification || ''}`);

    if (analysis.defauts && analysis.defauts.length > 0) {
      console.log(`\n⚠️  Défauts observés:`);
      analysis.defauts.forEach((d: string) => console.log(`   - ${d}`));
    }

    if (analysis.travaux) {
      if (analysis.travaux.urgent?.length > 0) {
        console.log(`\n🔴 Travaux URGENTS:`);
        analysis.travaux.urgent.forEach((t: string) => console.log(`   - ${t}`));
      }
      if (analysis.travaux.recommande?.length > 0) {
        console.log(`\n🟡 Travaux RECOMMANDÉS:`);
        analysis.travaux.recommande.forEach((t: string) => console.log(`   - ${t}`));
      }
    }

    if (analysis.coutEstime) {
      console.log(`\n💰 Coût estimé:`);
      console.log(`   Minimal: ${analysis.coutEstime.minimal || 0}€ (cosmétique/rien)`);
      console.log(`   Moyen: ${analysis.coutEstime.moyen || 0}€ (confort)`);
      console.log(`   Optimal: ${analysis.coutEstime.optimal || 0}€ (rénovation complète)`);
    }

    if (analysis.questionsVendeur && analysis.questionsVendeur.length > 0) {
      console.log(`\n❓ Questions à poser:`);
      analysis.questionsVendeur.forEach((q: string) => console.log(`   - ${q}`));
    }

    // Pause pour éviter rate limiting
    if (i < photoUrls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Synthèse globale
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 SYNTHÈSE GLOBALE');
  console.log('='.repeat(60));

  const scores = analyses.filter((a) => a.etat).map((a) => a.etat);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  console.log(`\n📈 Score moyen état: ${avgScore.toFixed(1)}/10`);

  const allTravaux = analyses.flatMap((a) => [
    ...(a.travaux?.urgent || []),
    ...(a.travaux?.recommande || []),
  ]);

  if (allTravaux.length > 0) {
    console.log(`\n🔨 Travaux identifiés (${allTravaux.length}):`);
    [...new Set(allTravaux)].forEach((t) => console.log(`   - ${t}`));
  }

  const couts = analyses.filter((a) => a.coutEstime);
  const totalMinimal = couts.reduce((sum, a) => sum + (a.coutEstime?.minimal || 0), 0);
  const totalMoyen = couts.reduce((sum, a) => sum + (a.coutEstime?.moyen || 0), 0);
  const totalOptimal = couts.reduce((sum, a) => sum + (a.coutEstime?.optimal || 0), 0);

  // Calcul détaillé avec barèmes réels
  const surface = annonce.surface || 0;
  const nbPieces = annonce.pieces || 2;

  // Estimation menuiseries : 1 par chambre + 1 salon + 1 cuisine + 1 SDB
  const nbChambres = nbPieces >= 2 ? nbPieces - 1 : 1; // Nb pièces - séjour
  const nbMenuiseries = nbChambres + 1 + 1 + 1; // chambres + salon + cuisine + SDB

  const coutPeinture = Math.round(surface * 80); // 80€/m² (murs + plafond)
  const coutSol = Math.round(surface * 60); // 60€/m²
  const coutMenuiseries = nbMenuiseries * 1200; // 1200€/fenêtre
  const coutCuisine = 6000; // 6000€ forfait cuisine
  const coutSDB = 6000; // 6000€ forfait salle de bain

  console.log(`\n💰 Estimation totale travaux (IA):`);
  console.log(`   Minimal: ${totalMinimal.toLocaleString()}€ (cosmétique/rien faire)`);
  console.log(`   Moyen: ${totalMoyen.toLocaleString()}€ (confort)`);
  console.log(`   Optimal: ${totalOptimal.toLocaleString()}€ (rénovation complète)`);

  // Déterminer si le bien nécessite une rénovation complète
  const bienDejRenove = avgScore >= 7.5 || totalMinimal === 0;

  if (bienDejRenove) {
    console.log(`\n✅ Bien déjà rénové (score moyen: ${avgScore.toFixed(1)}/10) - Pas de travaux majeurs à prévoir`);
    console.log(`💵 Prix achat: ${annonce.prix?.toLocaleString()}€`);
    console.log(`📊 Prix total estimé: ${(annonce.prix! + totalMinimal).toLocaleString()}€ (${totalMinimal.toLocaleString()}€ travaux mineurs)`);
  } else {
    console.log(`\n💵 CALCUL DÉTAILLÉ avec barèmes réels (${surface}m², ${nbPieces} pièces) :`);
    console.log(`   Peinture complète: ${coutPeinture.toLocaleString()}€ (${surface}m² × 80€/m²)`);
    console.log(`   Sol complet: ${coutSol.toLocaleString()}€ (${surface}m² × 60€/m²)`);
    console.log(`   Menuiseries: ${coutMenuiseries.toLocaleString()}€ (${nbMenuiseries} fenêtres × 1200€)`);
    console.log(`   Cuisine neuve: ${coutCuisine.toLocaleString()}€`);
    console.log(`   Salle de bain neuve: ${coutSDB.toLocaleString()}€`);

    const totalRenoComplete = coutPeinture + coutSol + coutMenuiseries + coutCuisine + coutSDB;
    console.log(`   → TOTAL rénovation complète: ${totalRenoComplete.toLocaleString()}€`);

    console.log(`\n💵 Prix achat: ${annonce.prix?.toLocaleString()}€`);
    console.log(`📊 Prix total estimé (avec barèmes réels):`);
    console.log(`   Scénario minimal: ${(annonce.prix! + totalMinimal).toLocaleString()}€ (IA)`);
    console.log(`   Scénario moyen: ${(annonce.prix! + totalMoyen).toLocaleString()}€ (IA)`);
    console.log(`   Scénario réno complète: ${(annonce.prix! + totalRenoComplete).toLocaleString()}€ (${totalRenoComplete.toLocaleString()}€ travaux)`);
  }

  // Sauvegarder le résultat
  console.log(`\n💾 Sauvegarde des résultats...`);

  await prisma.leboncoinAnnonce.update({
    where: { id: annonceId },
    data: {
      rawData: {
        ...(annonce.rawData as any),
        photoAnalysis: {
          analyzedAt: new Date().toISOString(),
          avgScore,
          analyses,
          totalCoutMinimal: totalMinimal,
          totalCoutMoyen: totalMoyen,
          totalCoutOptimal: totalOptimal,
        },
      },
    },
  });

  console.log(`✅ Résultats sauvegardés dans l'annonce`);
}

const annonceId = process.argv[2];

if (!annonceId) {
  console.error('❌ Usage: ANTHROPIC_API_KEY=sk-xxx npx tsx scripts/test-photo-analysis.ts <annonce-id>');
  process.exit(1);
}

analyzeAnnonce(annonceId)
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
