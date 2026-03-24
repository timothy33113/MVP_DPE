/**
 * Service de notifications Slack pour les matchs acquéreur ↔ bien Amanda
 * Canal cible : #leads-urgents
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface MatchNotification {
  id: string;
  acquereur: { nom: string; prenom: string; telephone: string; email: string };
  bien: { mandateRef: string; ville: string | null; prix: number | null; typeBien: string | null; surfaceHabitable: number | null };
  scoreTotal: number;
  scoreDetails: any;
}

export class SlackNotificationService {

  /**
   * Envoie les notifications Slack pour une liste de matchs
   * Retourne les IDs des matchs notifiés avec succès
   */
  async notifyMatchs(matchs: MatchNotification[]): Promise<string[]> {
    if (!SLACK_WEBHOOK_URL) {
      console.warn('[Slack] SLACK_WEBHOOK_URL non configuré — notifications désactivées');
      return [];
    }

    if (matchs.length === 0) return [];

    const notifiedIds: string[] = [];

    // Grouper par bien pour éviter le spam (1 message par bien avec tous les acquéreurs)
    const parBien = new Map<string, MatchNotification[]>();
    for (const match of matchs) {
      const key = match.bien.mandateRef;
      if (!parBien.has(key)) parBien.set(key, []);
      parBien.get(key)!.push(match);
    }

    for (const [bienRef, biensMatchs] of parBien) {
      const premier = biensMatchs[0];
      const prixFormate = premier.bien.prix
        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(premier.bien.prix)
        : 'Prix N/C';

      const acquereursLines = biensMatchs
        .sort((a, b) => b.scoreTotal - a.scoreTotal)
        .map(m => {
          const emoji = m.scoreTotal >= 80 ? '🔥' : m.scoreTotal >= 70 ? '⭐' : '✅';
          const details = m.scoreDetails as any;
          const forts = (details?.pointsForts || []).slice(0, 3).join(' · ');
          return `${emoji} *${m.acquereur.prenom} ${m.acquereur.nom}* — Score: *${m.scoreTotal}/100*\n    📞 ${m.acquereur.telephone || 'N/C'} · ✉️ ${m.acquereur.email}\n    ${forts}`;
        })
        .join('\n\n');

      const payload = {
        text: `🏠 Nouveaux matchs pour le bien ${bienRef}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🏠 Match${biensMatchs.length > 1 ? 's' : ''} — Bien ${bienRef}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${premier.bien.typeBien || 'Bien'}* à *${premier.bien.ville || 'N/C'}* · ${prixFormate}${premier.bien.surfaceHabitable ? ` · ${premier.bien.surfaceHabitable}m²` : ''}`,
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: acquereursLines,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${biensMatchs.length} acquéreur${biensMatchs.length > 1 ? 's' : ''} matché${biensMatchs.length > 1 ? 's' : ''} · ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
              },
            ],
          },
        ],
      };

      try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          notifiedIds.push(...biensMatchs.map(m => m.id));
          console.log(`[Slack] ✅ Notification envoyée pour bien ${bienRef} (${biensMatchs.length} acquéreurs)`);
        } else {
          const text = await response.text();
          console.error(`[Slack] ❌ Erreur ${response.status} pour bien ${bienRef}: ${text}`);
        }
      } catch (error) {
        console.error(`[Slack] ❌ Erreur réseau pour bien ${bienRef}:`, error);
      }
    }

    return notifiedIds;
  }

  /**
   * Envoie un résumé du matching global
   */
  async notifySummary(stats: {
    totalBiens: number;
    totalAcquereurs: number;
    nouveauxMatchs: number;
    matchsMisAJour: number;
    topMatchs: Array<{ acquereurNom: string; bienRef: string; score: number }>;
  }): Promise<void> {
    if (!SLACK_WEBHOOK_URL) return;

    const top5 = stats.topMatchs.slice(0, 5);
    const topLines = top5.map(m =>
      `• *${m.acquereurNom}* ↔ Bien ${m.bienRef} — Score: *${m.score}/100*`
    ).join('\n');

    const payload = {
      text: `📊 Matching terminé — ${stats.nouveauxMatchs} nouveaux matchs`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 Rapport de matching', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Biens analysés:*\n${stats.totalBiens}` },
            { type: 'mrkdwn', text: `*Acquéreurs:*\n${stats.totalAcquereurs}` },
            { type: 'mrkdwn', text: `*Nouveaux matchs:*\n${stats.nouveauxMatchs}` },
            { type: 'mrkdwn', text: `*Mis à jour:*\n${stats.matchsMisAJour}` },
          ],
        },
        ...(top5.length > 0 ? [
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Top 5 matchs:*\n${topLines}` },
          },
        ] : []),
      ],
    };

    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('[Slack] ✅ Résumé de matching envoyé');
    } catch (error) {
      console.error('[Slack] ❌ Erreur envoi résumé:', error);
    }
  }
}

export const slackNotificationService = new SlackNotificationService();
