import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

const OPENROUTER_API_KEY = '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';

class IAAnalysisService {
  async analyzeAnnonce(annonceId: string) {
    // Vérifier si une analyse existe déjà
    const existingAnalysis = await prisma.iAAnalysis.findUnique({
      where: { annonceId },
    });

    if (existingAnalysis) {
      logger.info(`✅ Analyse IA existante trouvée pour annonce ${annonceId}`);
      return {
        etatGeneral: existingAnalysis.etatGeneral,
        travauxEstimes: JSON.parse(existingAnalysis.travauxEstimes),
        coutEstime: existingAnalysis.coutEstime,
        pointsForts: JSON.parse(existingAnalysis.pointsForts),
        pointsFaibles: JSON.parse(existingAnalysis.pointsFaibles),
      };
    }

    // Récupérer l'annonce
    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { id: annonceId },
    });

    if (!annonce) {
      throw new Error(`Annonce ${annonceId} introuvable`);
    }

    const rawData = annonce.rawData as any;
    const description = rawData?.body || '';
    const images = rawData?.images?.urls || [];

    // Préparer le contenu pour Claude
    const content: any[] = [];

    // Ajouter les images (max 5 pour ne pas dépasser les limites)
    const imagesToAnalyze = images.slice(0, 5);
    for (const imageUrl of imagesToAnalyze) {
      try {
        // Télécharger l'image et la convertir en base64
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64}`,
          },
        });
      } catch (error) {
        logger.warn(`Erreur chargement image ${imageUrl}: ${error}`);
      }
    }

    // Ajouter le texte du prompt
    content.push({
      type: 'text',
      text: `Analyse ce bien immobilier en te basant sur les photos${description ? ' et la description' : ''}.

${description ? `Description de l'annonce : ${description}` : ''}

Fournis une analyse détaillée au format JSON avec les champs suivants :
- etatGeneral: Une phrase décrivant l'état général du bien
- travauxEstimes: Liste détaillée des travaux nécessaires
- coutEstime: Estimation du coût total des travaux (format: "XX XXX € - YY YYY €")
- pointsForts: Array de 3-5 points forts du bien
- pointsFaibles: Array de 3-5 points faibles ou travaux nécessaires

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.`,
    });

    logger.info(`🤖 Envoi de ${imagesToAnalyze.length} images à Claude pour analyse`);

    // Appeler Claude via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'DPE Matching Analysis',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Extraire la réponse
    const responseText = data.choices?.[0]?.message?.content || '';

    // Parser le JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      logger.error(`Erreur parsing JSON: ${responseText}`);
      // Retourner un résultat par défaut en cas d'erreur
      result = {
        etatGeneral: responseText,
        travauxEstimes: ['Analyse non disponible'],
        coutEstime: 'Non estimé',
        pointsForts: [],
        pointsFaibles: [],
      };
    }

    // Sauvegarder l'analyse en base de données
    try {
      await prisma.iAAnalysis.create({
        data: {
          annonceId,
          etatGeneral: result.etatGeneral || '',
          travauxEstimes: JSON.stringify(result.travauxEstimes || []),
          coutEstime: result.coutEstime || 'Non estimé',
          pointsForts: JSON.stringify(result.pointsForts || []),
          pointsFaibles: JSON.stringify(result.pointsFaibles || []),
          nombrePhotosAnalysees: imagesToAnalyze.length,
        },
      });
      logger.info(`💾 Analyse IA sauvegardée pour annonce ${annonceId}`);
    } catch (saveError) {
      logger.error(`Erreur sauvegarde analyse IA: ${saveError}`);
      // On continue même si la sauvegarde échoue
    }

    return result;
  }
}

export const iaAnalysisService = new IAAnalysisService();
