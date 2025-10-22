import { Request, Response } from 'express';
import { iaAnalysisService } from './ia-analysis.service.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';

class IAAnalysisController {
  async getAnalysis(req: Request, res: Response) {
    try {
      const { annonceId } = req.params;

      logger.info(`📖 Requête récupération analyse IA pour annonce ${annonceId}`);

      const analysis = await prisma.iAAnalysis.findUnique({
        where: { annonceId },
      });

      if (!analysis) {
        return res.status(404).json({
          error: 'Analyse non trouvée',
          message: 'Aucune analyse IA n\'existe pour cette annonce'
        });
      }

      res.json({
        etatGeneral: analysis.etatGeneral,
        travauxEstimes: JSON.parse(analysis.travauxEstimes),
        coutEstime: analysis.coutEstime,
        pointsForts: JSON.parse(analysis.pointsForts),
        pointsFaibles: JSON.parse(analysis.pointsFaibles),
      });
    } catch (error: any) {
      logger.error(`❌ Erreur récupération analyse IA: ${error.message}`, error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'analyse IA',
        message: error.message
      });
    }
  }

  async analyzeAnnonce(req: Request, res: Response) {
    try {
      const { annonceId } = req.params;

      logger.info(`🤖 Requête analyse IA pour annonce ${annonceId}`);

      const result = await iaAnalysisService.analyzeAnnonce(annonceId);

      logger.info(`✅ Analyse IA terminée pour annonce ${annonceId}`);

      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Erreur analyse IA: ${error.message}`, error);
      res.status(500).json({
        error: 'Erreur lors de l\'analyse IA',
        message: error.message
      });
    }
  }
}

export const iaAnalysisController = new IAAnalysisController();
