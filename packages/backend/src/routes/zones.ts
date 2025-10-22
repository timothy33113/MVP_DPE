import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/zones
 * Récupérer toutes les zones de recherche
 */
router.get('/', async (req, res) => {
  try {
    const zones = await prisma.searchZone.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(zones);
  } catch (error) {
    console.error('Erreur lors de la récupération des zones:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/zones/active
 * Récupérer uniquement les zones actives
 */
router.get('/active', async (req, res) => {
  try {
    const zones = await prisma.searchZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(zones);
  } catch (error) {
    console.error('Erreur lors de la récupération des zones actives:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/zones
 * Créer une nouvelle zone de recherche
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, type, geometry, color } = req.body;

    if (!name || !type || !geometry) {
      return res.status(400).json({ error: 'Champs manquants: name, type, geometry requis' });
    }

    const zone = await prisma.searchZone.create({
      data: {
        name,
        description,
        type,
        geometry,
        color: color || '#3b82f6',
        isActive: true
      }
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error('Erreur lors de la création de la zone:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/zones/:id
 * Mettre à jour une zone (nom, description, actif/inactif, couleur)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, color } = req.body;

    const zone = await prisma.searchZone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(color !== undefined && { color })
      }
    });

    res.json(zone);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la zone:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/zones/:id
 * Supprimer une zone de recherche
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.searchZone.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de la zone:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
