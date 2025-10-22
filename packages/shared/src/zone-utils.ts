/**
 * Utilitaires pour vérifier si un point est dans une zone de recherche
 */

import { QUARTIERS_COORDINATES } from './quartiers-coordinates';

/**
 * Vérifie si un point est dans un cercle
 */
function isPointInCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((centerLat - pointLat) * Math.PI) / 180;
  const dLng = ((centerLng - pointLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pointLat * Math.PI) / 180) *
      Math.cos((centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusKm;
}

/**
 * Vérifie si un point est dans un polygone (ray casting algorithm)
 */
function isPointInPolygon(
  pointLat: number,
  pointLng: number,
  polygonCoords: number[][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][1]; // lat
    const yi = polygonCoords[i][0]; // lng
    const xj = polygonCoords[j][1]; // lat
    const yj = polygonCoords[j][0]; // lng

    const intersect =
      yi > pointLng !== yj > pointLng &&
      pointLat < ((xj - xi) * (pointLng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Vérifie si une annonce est dans une zone de recherche
 */
export function isAnnonceInZone(
  annonceLat: number,
  annonceLng: number,
  zone: any
): boolean {
  const { type, geometry } = zone;

  switch (type) {
    case 'CIRCLE':
      if (geometry.center && geometry.radius) {
        const [centerLng, centerLat] = geometry.center;
        return isPointInCircle(
          annonceLat,
          annonceLng,
          centerLat,
          centerLng,
          geometry.radius
        );
      }
      return false;

    case 'POLYGON':
      if (geometry.coordinates && geometry.coordinates[0]) {
        return isPointInPolygon(annonceLat, annonceLng, geometry.coordinates[0]);
      }
      return false;

    case 'QUARTIER':
      if (geometry.city && geometry.district) {
        const quartierCoords = QUARTIERS_COORDINATES[geometry.city]?.[geometry.district];
        if (quartierCoords) {
          return isPointInCircle(
            annonceLat,
            annonceLng,
            quartierCoords.lat,
            quartierCoords.lng,
            quartierCoords.radius || 1
          );
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Vérifie si une annonce correspond à au moins une des zones actives
 */
export function matchesAnyZone(
  annonceLat: number | undefined,
  annonceLng: number | undefined,
  activeZones: any[]
): boolean {
  // Si pas de zones actives, tout passe
  if (activeZones.length === 0) return true;

  // Si pas de coordonnées, ne passe pas
  if (!annonceLat || !annonceLng) return false;

  // Vérifier si dans au moins une zone
  return activeZones.some(zone => isAnnonceInZone(annonceLat, annonceLng, zone));
}
