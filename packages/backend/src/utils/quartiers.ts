/**
 * Système de délimitation géographique par quartiers
 * Utilise des polygones pour définir les zones de chaque quartier
 */

import { QUARTIERS_PAU_LEBONCOIN } from './quartiers-pau-leboncoin';

export interface QuartierPolygon {
  name: string;
  ville: string;
  codePostal: string[];
  // Polygone défini par une liste de points [lng, lat]
  coordinates: [number, number][];
  // Point central du quartier
  center: [number, number];
}

/**
 * Base de données des quartiers
 * Basée sur les quartiers réellement utilisés par Leboncoin
 */
export const QUARTIERS_DATABASE: QuartierPolygon[] = [
  // PAU (64000) - 5 quartiers alignés avec l'API Leboncoin
  ...QUARTIERS_PAU_LEBONCOIN,

  // PARIS - Exemples de quartiers
  {
    name: 'Marais',
    ville: 'Paris',
    codePostal: ['75003', '75004'],
    coordinates: [
      [2.3522, 48.8566],
      [2.3622, 48.8566],
      [2.3622, 48.8616],
      [2.3522, 48.8616],
      [2.3522, 48.8566],
    ],
    center: [2.3572, 48.8591],
  },
  {
    name: 'Montmartre',
    ville: 'Paris',
    codePostal: ['75018'],
    coordinates: [
      [2.3388, 48.8847],
      [2.3488, 48.8847],
      [2.3488, 48.8897],
      [2.3388, 48.8897],
      [2.3388, 48.8847],
    ],
    center: [2.3438, 48.8872],
  },
  {
    name: 'Quartier Latin',
    ville: 'Paris',
    codePostal: ['75005'],
    coordinates: [
      [2.3444, 48.8449],
      [2.3544, 48.8449],
      [2.3544, 48.8499],
      [2.3444, 48.8499],
      [2.3444, 48.8449],
    ],
    center: [2.3494, 48.8474],
  },
];

/**
 * Vérifie si un point est à l'intérieur d'un polygone (algorithme ray-casting)
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Trouve le quartier correspondant à des coordonnées GPS
 */
export function findQuartier(
  lng: number,
  lat: number,
  codePostal?: string
): QuartierPolygon | null {
  const point: [number, number] = [lng, lat];

  // Filtrer par code postal si fourni
  let candidates = QUARTIERS_DATABASE;
  if (codePostal) {
    candidates = candidates.filter((q) => q.codePostal.includes(codePostal));
  }

  // Trouver le premier quartier qui contient le point
  for (const quartier of candidates) {
    if (isPointInPolygon(point, quartier.coordinates)) {
      return quartier;
    }
  }

  return null;
}

/**
 * Trouve tous les quartiers à proximité d'un point
 * @param maxDistance Distance maximale en mètres
 */
export function findQuartiersNearby(
  lng: number,
  lat: number,
  maxDistance: number = 2000,
  codePostal?: string
): Array<QuartierPolygon & { distance: number }> {
  // Filtrer par code postal si fourni
  let candidates = QUARTIERS_DATABASE;
  if (codePostal) {
    candidates = candidates.filter((q) => q.codePostal.includes(codePostal));
  }

  const results: Array<QuartierPolygon & { distance: number }> = [];

  for (const quartier of candidates) {
    // Calculer la distance au centre du quartier
    const distance = calculateDistance(lat, lng, quartier.center[1], quartier.center[0]);

    if (distance <= maxDistance) {
      results.push({
        ...quartier,
        distance: Math.round(distance),
      });
    }
  }

  // Trier par distance
  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Normalise le nom d'un quartier pour la comparaison
 */
export function normalizeQuartierName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9]/g, '') // Enlever la ponctuation
    .trim();
}

/**
 * Recherche un quartier par son nom
 */
export function searchQuartierByName(
  name: string,
  ville?: string
): QuartierPolygon | null {
  const normalized = normalizeQuartierName(name);

  let candidates = QUARTIERS_DATABASE;
  if (ville) {
    const normalizedVille = normalizeQuartierName(ville);
    candidates = candidates.filter((q) => normalizeQuartierName(q.ville) === normalizedVille);
  }

  for (const quartier of candidates) {
    const quartierNormalized = normalizeQuartierName(quartier.name);
    if (quartierNormalized === normalized || quartierNormalized.includes(normalized)) {
      return quartier;
    }
  }

  return null;
}

/**
 * Récupère tous les quartiers d'une ville
 */
export function getQuartiersByVille(ville: string): QuartierPolygon[] {
  const normalizedVille = normalizeQuartierName(ville);
  return QUARTIERS_DATABASE.filter((q) => normalizeQuartierName(q.ville) === normalizedVille);
}
