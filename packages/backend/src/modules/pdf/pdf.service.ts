import puppeteer from 'puppeteer';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/database.js';
import { renderProfessionalTemplate } from './pdf-template-new.js';
import fs from 'fs';
import path from 'path';

interface PdfGenerationOptions {
  annonceId: string;
}

export class PdfService {
  private browser: puppeteer.Browser | null = null;

  /**
   * Initialise le navigateur Puppeteer (réutilisable pour de meilleures performances)
   */
  private async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Ferme le navigateur Puppeteer
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Génère un PDF pour une fiche bien (annonce + DPE)
   */
  async generateFicheBien(options: PdfGenerationOptions): Promise<Buffer> {
    logger.info(`📄 Génération PDF pour annonce ${options.annonceId}`);

    try {
      // 1. Récupérer les données complètes (annonce + DPE)
      const match = await this.fetchMatchData(options.annonceId);

      if (!match) {
        throw new Error(`Annonce ${options.annonceId} introuvable`);
      }

      // 2. Récupérer les images
      const images = this.extractImages(match.annonce);

      // 3. Logo en base64
      const logoPathFile = path.join(process.cwd(), 'public/assets/logo-levelup.png');
      let logoBase64 = '';
      try {
        const logoBuffer = fs.readFileSync(logoPathFile);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch (error) {
        logger.warn('Logo not found, PDF will be generated without logo');
      }

      // 4. Générer le HTML avec le nouveau template professionnel
      const html = renderProfessionalTemplate({
        annonce: match.annonce,
        bestDpe: match.bestDpe,
        score: match.score,
        images,
        logoPath: logoBase64,
      });

      // 3. Convertir en PDF avec Puppeteer
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '10mm',
          right: '10mm',
        },
      });

      await page.close();

      logger.info(`✅ PDF généré avec succès (${pdf.length} bytes)`);
      return pdf;
    } catch (error) {
      logger.error(`❌ Erreur génération PDF:`, error);
      throw error;
    }
  }

  /**
   * Récupère les données complètes pour une annonce (avec son meilleur DPE si disponible)
   */
  private async fetchMatchData(annonceId: string) {
    // Essayer d'abord de récupérer depuis match_clusters
    const matchCluster = await prisma.matchCluster.findUnique({
      where: { annonceId },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            scoreNormalized: 'desc',
          },
          take: 1,
        },
      },
    });

    if (matchCluster && matchCluster.candidats.length > 0) {
      return {
        annonce: matchCluster.annonce,
        bestDpe: matchCluster.candidats[0].dpe,
        score: matchCluster.candidats[0].scoreNormalized,
      };
    }

    // Si pas de match, récupérer juste l'annonce sans DPE
    const annonce = await prisma.leboncoinAnnonce.findUnique({
      where: { id: annonceId },
    });

    if (!annonce) {
      return null;
    }

    return {
      annonce,
      bestDpe: null,
      score: 0,
    };
  }

  /**
   * Extrait les URLs des images depuis le rawData de l'annonce
   */
  private extractImages(annonce: any): string[] {
    const rawData = annonce.rawData as any;
    const imageUrls = rawData?.images?.urls || [];
    return imageUrls;
  }

  /**
   * Génère le template HTML de la fiche bien (format professionnel)
   */
  private renderFicheTemplate(match: any): string {
    const { annonce, bestDpe, score } = match;
    const rawData = annonce.rawData as any;

    // Extraire les données clés
    const prix = rawData?.price?.[0] || annonce.prix || 'Non renseigné';
    const imageUrl = rawData?.images?.urls?.[0] || '';
    const description = rawData?.body || 'Aucune description disponible';
    const location = rawData?.location;
    const ville = location?.city_label || location?.city || 'Ville inconnue';
    const codePostal = location?.zipcode || annonce.codePostal;
    const adresse = bestDpe?.adresseBan || `${ville}, ${codePostal}`;

    // DPE colors
    const dpeColor = this.getDpeColor(bestDpe?.etiquetteDpe || annonce.etiquetteDpe);
    const gesColor = this.getDpeColor(bestDpe?.etiquetteGes || annonce.etiquetteGes);

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiche Bien - ${ville}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header .price {
      font-size: 36px;
      font-weight: bold;
      margin: 15px 0;
    }

    .header .address {
      font-size: 14px;
      opacity: 0.9;
    }

    /* Photo principale */
    .main-photo {
      width: 100%;
      height: 400px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Caractéristiques */
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .feature-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 2px solid #e9ecef;
    }

    .feature-card .icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .feature-card .label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .feature-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #495057;
    }

    /* Section DPE */
    .dpe-section {
      background: #fff;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
      border: 2px solid #e9ecef;
    }

    .dpe-section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #495057;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .dpe-badges {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .dpe-badge {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
    }

    .dpe-badge .label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 5px;
    }

    .dpe-badge .value {
      font-size: 48px;
      font-weight: bold;
    }

    .dpe-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }

    .dpe-detail {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
    }

    .dpe-detail strong {
      color: #495057;
    }

    /* Description */
    .description {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
    }

    .description h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #495057;
    }

    .description p {
      font-size: 14px;
      color: #6c757d;
      line-height: 1.8;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 12px;
      border-top: 2px solid #e9ecef;
      margin-top: 30px;
    }

    .match-score {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🏠 Fiche Bien Immobilier</h1>
      <div class="price">${typeof prix === 'number' ? prix.toLocaleString('fr-FR') : prix} €</div>
      <div class="address">📍 ${adresse}</div>
      ${annonce.dpeCorrected ? '<div class="match-score">✓ DPE Vérifié</div>' : ''}
    </div>

    <!-- Photo principale -->
    ${imageUrl ? `<img src="${imageUrl}" alt="Photo du bien" class="main-photo" />` : ''}

    <!-- Caractéristiques -->
    <div class="features">
      <div class="feature-card">
        <div class="icon">📐</div>
        <div class="label">Surface</div>
        <div class="value">${annonce.surface || bestDpe?.surfaceHabitable || '-'} m²</div>
      </div>

      <div class="feature-card">
        <div class="icon">🚪</div>
        <div class="label">Pièces</div>
        <div class="value">${annonce.pieces || bestDpe?.nombrePieces || '-'}</div>
      </div>

      <div class="feature-card">
        <div class="icon">🏗️</div>
        <div class="label">Année</div>
        <div class="value">${annonce.anneConstruction || bestDpe?.anneConstruction || '-'}</div>
      </div>
    </div>

    <!-- DPE Section -->
    ${bestDpe ? `
    <div class="dpe-section">
      <h2>⚡ Performance Énergétique (DPE ADEME)</h2>

      <div class="dpe-badges">
        <div class="dpe-badge" style="background: ${dpeColor}">
          <div class="label">Consommation Énergétique</div>
          <div class="value">${bestDpe.etiquetteDpe || '-'}</div>
        </div>

        <div class="dpe-badge" style="background: ${gesColor}">
          <div class="label">Émissions GES</div>
          <div class="value">${bestDpe.etiquetteGes || '-'}</div>
        </div>
      </div>

      <div class="dpe-details">
        <div class="dpe-detail">
          <strong>Consommation:</strong> ${bestDpe.consommationEnergie || '-'} kWh/m²/an
        </div>
        <div class="dpe-detail">
          <strong>Émissions:</strong> ${bestDpe.estimationGes || '-'} kg CO2/m²/an
        </div>
        <div class="dpe-detail">
          <strong>Chauffage:</strong> ${bestDpe.typeChauffage || 'Non renseigné'}
        </div>
        <div class="dpe-detail">
          <strong>N° DPE:</strong> ${bestDpe.numeroDpe || '-'}
        </div>
      </div>

      ${score ? `<div style="text-align: center; margin-top: 20px;">
        <span class="match-score">✅ Match DPE: ${score}/100</span>
      </div>` : ''}
    </div>
    ` : ''}

    <!-- Description -->
    ${description ? `
    <div class="description">
      <h2>📝 Description</h2>
      <p>${description.substring(0, 800)}${description.length > 800 ? '...' : ''}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Fiche générée le ${new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}</p>
      <p style="margin-top: 10px;">
        <a href="${annonce.url}" style="color: #667eea; text-decoration: none;">
          🔗 Voir l'annonce complète sur Leboncoin
        </a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Retourne la couleur correspondant à une étiquette DPE
   */
  private getDpeColor(etiquette: string | null): string {
    const colors: Record<string, string> = {
      A: '#00a650',
      B: '#50b748',
      C: '#c2d545',
      D: '#fef200',
      E: '#fdb913',
      F: '#f36f21',
      G: '#ed1c24',
    };
    return colors[etiquette || ''] || '#6c757d';
  }
}

// Export singleton
export const pdfService = new PdfService();
