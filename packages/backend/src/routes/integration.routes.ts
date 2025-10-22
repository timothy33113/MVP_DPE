/**
 * Routes d'intégration pour synchronisation avec systèmes externes (n8n, Supabase)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { generalRateLimiter } from '../middleware/rate-limiter';
import { config } from '../config';

const router = Router();

/**
 * Middleware d'authentification pour n8n
 */
const n8nAuth = (req: Request, res: Response, next: NextFunction) => {
  // En développement, bypass l'auth si pas de clé configurée
  if (config.isDevelopment && !config.externalApis.n8nApiKey) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.externalApis.n8nApiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key invalide ou manquante',
    });
  }

  next();
};

/**
 * GET /api/integration/annonces/new
 * Récupère les nouvelles annonces depuis la dernière synchronisation
 */
router.get('/annonces/new', n8nAuth, generalRateLimiter, async (req, res) => {
  try {
    const { since, limit = 100 } = req.query;

    // Date depuis laquelle récupérer (par défaut: dernières 24h)
    const sinceDate = since
      ? new Date(since as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        createdAt: {
          gte: sinceDate,
        },
      },
      orderBy: {
        datePublication: 'desc',
      },
      take: Number(limit),
    });

    // Transformer au format compatible avec votre système Supabase
    const transformed = annonces.map(a => ({
      // Identifiants
      lbc_id: a.listId.toString(),
      source_id: a.id,
      url: a.url,

      // Informations de base
      titre: a.rawData?.subject || `${a.typeBien} ${a.surface}m² ${a.pieces}p`,
      description: a.rawData?.body || '',
      prix: a.rawData?.price?.[0] || null,

      // Localisation
      code_postal: a.codePostal,
      ville: a.rawData?.location?.city || '',
      quartier: a.rawData?.location?.district || null,
      lat: a.lat,
      lng: a.lng,

      // Caractéristiques
      type_bien: a.typeBien.toLowerCase(),
      surface: a.surface,
      nb_pieces: a.pieces,
      nb_chambres: extractAttribute(a.rawData, 'bedrooms'),

      // DPE/GES
      dpe: a.etiquetteDpe,
      ges: a.etiquetteGes,

      // Critères enrichis pour matching IA
      criteres_enrichis: {
        annee_construction: a.anneConstruction || extractAttribute(a.rawData, 'building_year'),
        etage: extractAttribute(a.rawData, 'floor_number'),
        ascenseur: extractAttribute(a.rawData, 'elevator') === '1',
        balcon: hasOutsideAccess(a.rawData, 'balcony'),
        terrasse: hasOutsideAccess(a.rawData, 'terrace'),
        parking: extractAttribute(a.rawData, 'nb_parkings') > 0,
        garage: hasSpecificity(a.rawData, 'with_garage_or_parking_spot'),
        cuisine_equipee: hasSpecificity(a.rawData, 'equipped_kitchen'),
        cave: hasSpecificity(a.rawData, 'cellar'),
        type_chauffage: extractAttribute(a.rawData, 'heating_type'),
        mode_chauffage: extractAttribute(a.rawData, 'heating_mode'),
        etat: extractAttribute(a.rawData, 'global_condition'),
        surface_terrain: extractAttribute(a.rawData, 'land_plot_area'),
        type_mandat: extractAttribute(a.rawData, 'mandate_type'),
      },

      // Images
      images: a.rawData?.images?.urls || [],
      image_principale: a.rawData?.images?.urls?.[0] || null,

      // Dates
      date_publication: a.datePublication,
      date_importation: a.createdAt,

      // Statut
      statut_disponibilite: 'disponible',
      source: 'leboncoin',
    }));

    res.json({
      success: true,
      data: {
        count: transformed.length,
        since: sinceDate.toISOString(),
        annonces: transformed,
      },
    });

  } catch (error) {
    console.error('Erreur récupération nouvelles annonces:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
});

/**
 * GET /api/integration/stats
 * Statistiques pour monitoring
 */
router.get('/stats', n8nAuth, generalRateLimiter, async (req, res) => {
  try {
    const [
      totalAnnonces,
      annoncesLast24h,
      annoncesByType,
    ] = await Promise.all([
      prisma.leboncoinAnnonce.count(),
      prisma.leboncoinAnnonce.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.leboncoinAnnonce.groupBy({
        by: ['typeBien'],
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total_annonces: totalAnnonces,
        nouvelles_24h: annoncesLast24h,
        par_type: annoncesByType,
        derniere_maj: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
});

/**
 * POST /api/integration/webhook/match-created
 * Webhook appelé par Supabase quand un match est créé
 */
router.post('/webhook/match-created', async (req, res) => {
  try {
    const { match_id, acquereur_id, bien_lbc_id, score } = req.body;

    console.log('📬 Webhook match créé:', {
      match_id,
      acquereur_id,
      bien_lbc_id,
      score,
    });

    // Optionnel: Stocker dans votre base pour analytics
    // ou déclencher une action spécifique

    res.json({
      success: true,
      message: 'Webhook reçu',
    });

  } catch (error) {
    console.error('Erreur webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
});

// Helper functions
function extractAttribute(rawData: any, key: string): any {
  if (!rawData?.attributes) return null;
  const attr = rawData.attributes.find((a: any) => a.key === key);
  return attr?.value || null;
}

function hasOutsideAccess(rawData: any, type: string): boolean {
  if (!rawData?.attributes) return false;
  const attr = rawData.attributes.find((a: any) => a.key === 'outside_access');
  return attr?.values?.includes(type) || false;
}

function hasSpecificity(rawData: any, type: string): boolean {
  if (!rawData?.attributes) return false;
  const attr = rawData.attributes.find((a: any) => a.key === 'specificities');
  return attr?.values?.includes(type) || false;
}

export default router;
