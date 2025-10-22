import { Request, Response } from 'express';
import { pdfService } from './pdf.service.js';
import { logger } from '../../utils/logger.js';

export class PdfController {
  /**
   * GET /api/pdf/fiche/:annonceId
   * Génère et télécharge une fiche PDF pour une annonce
   */
  async generateFichePdf(req: Request, res: Response) {
    try {
      const { annonceId } = req.params;

      if (!annonceId) {
        return res.status(400).json({ error: 'annonceId est requis' });
      }

      logger.info(`📄 Requête génération PDF pour annonce ${annonceId}`);

      // Générer le PDF
      const pdfBuffer = await pdfService.generateFicheBien({ annonceId });

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="fiche-bien-${annonceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Envoyer le PDF en binaire
      res.end(pdfBuffer, 'binary');

      logger.info(`✅ PDF envoyé avec succès (${pdfBuffer.length} bytes)`);
    } catch (error: any) {
      logger.error('❌ Erreur génération PDF:', error);
      res.status(500).json({
        error: 'Erreur lors de la génération du PDF',
        message: error.message,
      });
    }
  }
}

export const pdfController = new PdfController();
