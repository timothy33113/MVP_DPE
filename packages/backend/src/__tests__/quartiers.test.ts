/**
 * Tests pour le système de géolocalisation par quartiers
 */

import {
  findQuartier,
  findQuartiersNearby,
  searchQuartierByName,
  getQuartiersByVille,
  normalizeQuartierName,
  isPointInPolygon,
} from '../utils/quartiers';

describe('Quartiers Géographiques', () => {
  describe('isPointInPolygon', () => {
    it('should detect point inside square polygon', () => {
      const polygon: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ];

      expect(isPointInPolygon([0.5, 0.5], polygon)).toBe(true);
      expect(isPointInPolygon([2, 2], polygon)).toBe(false);
      expect(isPointInPolygon([-1, 0.5], polygon)).toBe(false);
    });
  });

  describe('findQuartier', () => {
    it('should find Centre-Ville Pau from coordinates', () => {
      // Point au centre du Centre-Ville de Pau
      const quartier = findQuartier(-0.3700, 43.2985, '64000');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Centre-ville');
      expect(quartier?.ville).toBe('Pau');
    });

    it('should find Dufau-Tourasse from coordinates', () => {
      // Point dans Dufau-Tourasse
      const quartier = findQuartier(-0.3525, 43.2925, '64000');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Dufau - Tourasse');
    });

    it('should return null for coordinates outside defined quartiers', () => {
      const quartier = findQuartier(-0.5, 43.2, '64000');
      expect(quartier).toBeNull();
    });

    it('should work without code postal filter', () => {
      const quartier = findQuartier(-0.3685, 43.2990);
      expect(quartier).not.toBeNull();
    });
  });

  describe('findQuartiersNearby', () => {
    it('should find quartiers within distance', () => {
      // Centre de Pau approximatif
      const nearby = findQuartiersNearby(-0.3685, 43.2990, 3000, '64000');

      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby[0]).toHaveProperty('distance');
      expect(nearby[0]).toHaveProperty('name');
    });

    it('should sort by distance', () => {
      const nearby = findQuartiersNearby(-0.3685, 43.2990, 5000, '64000');

      if (nearby.length > 1) {
        for (let i = 1; i < nearby.length; i++) {
          expect(nearby[i].distance).toBeGreaterThanOrEqual(nearby[i - 1].distance);
        }
      }
    });

    it('should respect max distance', () => {
      const nearby = findQuartiersNearby(-0.3685, 43.2990, 100);

      nearby.forEach((q) => {
        expect(q.distance).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('normalizeQuartierName', () => {
    it('should normalize accents', () => {
      expect(normalizeQuartierName('Centre-Ville')).toBe('centreville');
      expect(normalizeQuartierName('Dufau-Tourasse')).toBe('dufautourasse');
    });

    it('should remove special characters', () => {
      expect(normalizeQuartierName('Saint-Martin')).toBe('saintmartin');
      expect(normalizeQuartierName("L'Église")).toBe('leglise');
    });

    it('should handle spaces', () => {
      expect(normalizeQuartierName('Centre Ville')).toBe('centreville');
    });
  });

  describe('searchQuartierByName', () => {
    it('should find quartier by exact name', () => {
      const quartier = searchQuartierByName('Centre-ville', 'Pau');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Centre-ville');
      expect(quartier?.ville).toBe('Pau');
    });

    it('should find quartier with normalized name', () => {
      const quartier = searchQuartierByName('centre ville', 'pau');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Centre-ville');
    });

    it('should find quartier by partial name', () => {
      const quartier = searchQuartierByName('dufau', 'pau');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Dufau - Tourasse');
    });

    it('should work without ville filter', () => {
      const quartier = searchQuartierByName('marais');

      expect(quartier).not.toBeNull();
      expect(quartier?.name).toBe('Marais');
      expect(quartier?.ville).toBe('Paris');
    });

    it('should return null for non-existent quartier', () => {
      const quartier = searchQuartierByName('QuartierInexistant', 'Pau');
      expect(quartier).toBeNull();
    });
  });

  describe('getQuartiersByVille', () => {
    it('should return all quartiers for Pau', () => {
      const quartiers = getQuartiersByVille('Pau');

      expect(quartiers.length).toBeGreaterThan(0);
      quartiers.forEach((q) => {
        expect(q.ville).toBe('Pau');
      });
    });

    it('should return all quartiers for Paris', () => {
      const quartiers = getQuartiersByVille('Paris');

      expect(quartiers.length).toBeGreaterThan(0);
      quartiers.forEach((q) => {
        expect(q.ville).toBe('Paris');
      });
    });

    it('should handle case insensitive', () => {
      const quartiersLower = getQuartiersByVille('pau');
      const quartiersUpper = getQuartiersByVille('PAU');

      expect(quartiersLower.length).toBe(quartiersUpper.length);
    });

    it('should return empty array for unknown ville', () => {
      const quartiers = getQuartiersByVille('VilleInconnue');
      expect(quartiers).toEqual([]);
    });
  });
});
