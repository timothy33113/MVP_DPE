/**
 * Routes de déclenchement du matching acquéreur ↔ bien Amanda
 *
 * POST /api/matching/trigger         — Lance le matching complet
 * POST /api/matching/trigger/bien    — Match un bien spécifique
 * GET  /api/matching/trigger/results — Derniers résultats
 */

import { Router, Request, Response } from 'express';
import { matchingAcquereurService } from '@services/matching-acquereur.service';
import { slackNotificationService } from '@services/slack-notification.service';
import { asyncHandler } from '@utils/async-handler';

const router = Router();

/**
 * POST /api/matching/trigger
 * Lance le matching complet biens Amanda × acquéreurs
 * Appelé par n8n après la sync des biens
 *
 * Body (optionnel):
 *   scoreMin?: number (défaut: 40)
 *   slackScoreMin?: number (défaut: 70, seuil pour Slack)
 *   dryRun?: boolean (défaut: false)
 *   bienIds?: string[] (si fourni, ne matcher que ces biens)
 *   acquereurIds?: string[] (si fourni, ne matcher que ces acquéreurs)
 *   apiKey?: string (authentification simple pour n8n)
 */
router.post('/trigger', asyncHandler(async (req: Request, res: Response) => {
  // Auth simple par API key (pour n8n)
  const apiKey = req.body.apiKey || req.headers['x-api-key'];
  const expectedKey = process.env.MATCHING_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    res.status(401).json({ success: false, error: 'API key invalide' });
    return;
  }

  const {
    scoreMin = 40,
    slackScoreMin = 70,
    dryRun = false,
    bienIds,
    acquereurIds,
  } = req.body;

  console.log(`[Matching] 🚀 Déclenchement matching (scoreMin=${scoreMin}, dryRun=${dryRun})`);
  const start = Date.now();

  // 1. Lancer le matching
  let stats;
  try {
    stats = await matchingAcquereurService.runFullMatching({
      scoreMin,
      bienIds,
      acquereurIds,
      dryRun,
    });
  } catch (error: any) {
    console.error(`[Matching] ❌ Erreur matching:`, error.message, error.stack);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split('\n').slice(0, 5) });
    return;
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Matching] ✅ Terminé en ${duration}s — ${stats.nouveauxMatchs} nouveaux, ${stats.matchsMisAJour} mis à jour`);

  // 2. Notifications Slack pour les matchs > slackScoreMin
  let slackNotified = 0;
  if (!dryRun && stats.nouveauxMatchs > 0) {
    const matchsANotifier = await matchingAcquereurService.getMatchsANotifier(slackScoreMin);
    if (matchsANotifier.length > 0) {
      const notifiedIds = await slackNotificationService.notifyMatchs(matchsANotifier);
      if (notifiedIds.length > 0) {
        await matchingAcquereurService.markAsSlackNotified(notifiedIds);
        slackNotified = notifiedIds.length;
      }
    }

    // Résumé global Slack
    await slackNotificationService.notifySummary(stats);
  }

  res.json({
    success: true,
    data: {
      ...stats,
      slackNotified,
      durationSeconds: parseFloat(duration),
      dryRun,
    },
  });
}));

/**
 * POST /api/matching/trigger/bien
 * Trouve les acquéreurs pour un bien spécifique
 *
 * Body:
 *   bienId: string (ID du bien Amanda)
 *   scoreMin?: number (défaut: 40)
 *   notify?: boolean (défaut: false, envoyer Slack)
 */
router.post('/trigger/bien', asyncHandler(async (req: Request, res: Response) => {
  const { bienId, scoreMin = 40, notify = false } = req.body;

  if (!bienId) {
    res.status(400).json({ success: false, error: 'bienId requis' });
    return;
  }

  const resultats = await matchingAcquereurService.findAcquereursForBien(bienId, { scoreMin });

  // Notifier si demandé et score suffisant
  if (notify && resultats.length > 0) {
    const matchsANotifier = await matchingAcquereurService.getMatchsANotifier(70);
    if (matchsANotifier.length > 0) {
      const notifiedIds = await slackNotificationService.notifyMatchs(matchsANotifier);
      if (notifiedIds.length > 0) {
        await matchingAcquereurService.markAsSlackNotified(notifiedIds);
      }
    }
  }

  res.json({
    success: true,
    data: {
      bienId,
      totalAcquereurs: resultats.length,
      acquereurs: resultats.map(r => ({
        id: r.acquereur.id,
        nom: `${r.acquereur.prenom} ${r.acquereur.nom}`,
        scoreTotal: r.scoreTotal,
        scoreDetails: r.scoreDetails,
        pointsForts: r.pointsForts,
        pointsFaibles: r.pointsFaibles,
      })),
    },
  });
}));

/**
 * GET /api/matching/trigger/results
 * Derniers matchs avec scores et statuts
 */
router.get('/trigger/results', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 50, scoreMin = 0, statut } = req.query;

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const matchs = await prisma.matchAcquereurAmanda.findMany({
    where: {
      scoreTotal: { gte: Number(scoreMin) },
      ...(statut ? { statut: statut as any } : {}),
    },
    include: {
      acquereur: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
      bien: { select: { id: true, mandateRef: true, ville: true, prix: true, typeBien: true, surfaceHabitable: true } },
    },
    orderBy: { scoreTotal: 'desc' },
    take: Number(limit),
  });

  await prisma.$disconnect();

  res.json({
    success: true,
    data: {
      total: matchs.length,
      matchs: matchs.map(m => ({
        id: m.id,
        acquereur: `${m.acquereur.prenom} ${m.acquereur.nom}`,
        acquereurEmail: m.acquereur.email,
        bienRef: m.bien.mandateRef,
        bienVille: m.bien.ville,
        bienPrix: m.bien.prix,
        scoreTotal: m.scoreTotal,
        statut: m.statut,
        slackNotifie: m.slackNotifie,
        createdAt: m.createdAt,
      })),
    },
  });
}));

export default router;
