/**
 * Coordonnées approximatives des quartiers principaux de Pau et environs
 * Utilisé pour améliorer le positionnement des annonces Leboncoin quand source: "city"
 *
 * Source: OpenStreetMap + données locales
 */

interface QuartierCoordinates {
  lat: number;
  lng: number;
  radius?: number; // Rayon approximatif en km (optionnel)
}

type QuartiersMap = {
  [ville: string]: {
    [quartier: string]: QuartierCoordinates;
  };
};

export const QUARTIERS_COORDINATES: QuartiersMap = {
  'Pau': {
    'Centre-ville': { lat: 43.2961, lng: -0.3708, radius: 0.8 },
    'Pau Sud': { lat: 43.2850, lng: -0.3650, radius: 1.2 },
    'Pau Nord': { lat: 43.3100, lng: -0.3600, radius: 1.5 },
    'Dufau - Tourasse': { lat: 43.3020, lng: -0.3550, radius: 0.8 },
    'Le Hameau': { lat: 43.3150, lng: -0.3800, radius: 4.0 }, // Élargi pour inclure "proche du stade du Hameau"
    'XIV Juillet': { lat: 43.2920, lng: -0.3550, radius: 0.6 },
    'Trespoey': { lat: 43.3050, lng: -0.3900, radius: 0.8 },
    'Université': { lat: 43.3160, lng: -0.3650, radius: 1.0 },
    'Saragosse': { lat: 43.2880, lng: -0.3850, radius: 0.7 },
    'Ousse des Bois': { lat: 43.2750, lng: -0.4000, radius: 1.2 },
  },
  'Billère': {
    'Centre-ville': { lat: 43.3055, lng: -0.4020, radius: 0.6 },
    'Château d\'Est - Lalanne': { lat: 43.3100, lng: -0.4100, radius: 0.8 },
    'La Plaine': { lat: 43.3000, lng: -0.4050, radius: 0.7 },
    'Laffitte': { lat: 43.3120, lng: -0.4000, radius: 0.6 },
    'Californie - Lons': { lat: 43.3150, lng: -0.4150, radius: 0.8 },
  },
  'Lescar': {
    'Centre-ville': { lat: 43.3272, lng: -0.4308, radius: 0.8 },
    'Quartier Libre': { lat: 43.3350, lng: -0.4200, radius: 1.0 },
  },
  'Lons': {
    'Centre-ville': { lat: 43.3156, lng: -0.4081, radius: 0.8 },
  },
  'Jurançon': {
    'Centre-ville': { lat: 43.2894, lng: -0.3883, radius: 0.8 },
  },
  'Bizanos': {
    'Centre-ville': { lat: 43.2928, lng: -0.3225, radius: 0.6 },
  },
  'Gelos': {
    'Centre-ville': { lat: 43.2817, lng: -0.3833, radius: 0.6 },
  },
  'Idron': {
    'Centre-ville': { lat: 43.3206, lng: -0.3050, radius: 0.8 },
  },
  'Ousse': {
    'Centre-ville': { lat: 43.2803, lng: -0.4028, radius: 0.6 },
  },
  'Uzein': {
    'Centre-ville': { lat: 43.3928, lng: -0.4169, radius: 1.0 },
  },
  'Serres-Castet': {
    'Centre-ville': { lat: 43.3767, lng: -0.3739, radius: 1.2 },
  },
  'Morlaàs': {
    'Centre-ville': { lat: 43.3439, lng: -0.2614, radius: 1.0 },
  },
  'Gan': {
    'Centre-ville': { lat: 43.2344, lng: -0.3894, radius: 0.8 },
  },
  'Soumoulou': {
    'Centre-ville': { lat: 43.2656, lng: -0.2022, radius: 0.8 },
  },
  'Oloron-Sainte-Marie': {
    'Sainte-Marie': { lat: 43.1906, lng: -0.6039, radius: 0.8 },
    'Notre-Dame': { lat: 43.1950, lng: -0.6100, radius: 0.6 },
    'Sainte-Croix': { lat: 43.1856, lng: -0.6089, radius: 0.5 },
  },
  'Bayonne': {
    'Centre-ville - Hôtel de Ville': { lat: 43.4929, lng: -1.4748, radius: 0.8 },
    'Grand Bayonne': { lat: 43.4920, lng: -1.4750, radius: 0.8 },
    'Petit Bayonne': { lat: 43.4900, lng: -1.4720, radius: 0.6 },
  },
};

/**
 * Améliore le positionnement d'une annonce en utilisant le quartier si disponible
 *
 * @param location - Objet location de Leboncoin rawData
 * @returns Coordonnées améliorées [lat, lng] ou null si pas d'amélioration possible
 */
export function getImprovedCoordinates(location: any): [number, number] | null {
  if (!location) return null;

  const source = location.source;
  const city = location.city;
  const district = location.district;

  // Si source est "address", les coordonnées sont déjà précises
  if (source === 'address') {
    return null; // Garder les coordonnées originales
  }

  // Si source est "city" et qu'on a un quartier, chercher les coordonnées du quartier
  if (source === 'city' && district && city) {
    const cityQuartiers = QUARTIERS_COORDINATES[city];
    if (cityQuartiers && cityQuartiers[district]) {
      const quartierCoords = cityQuartiers[district];
      // Amélioration de position basée sur le quartier
      return [quartierCoords.lat, quartierCoords.lng];
    }
  }

  // Pas d'amélioration possible
  return null;
}

/**
 * Obtient les coordonnées finales pour affichage (améliorées ou originales)
 */
export function getFinalCoordinates(location: any): [number, number] | null {
  if (!location?.lat || !location?.lng) return null;

  const improved = getImprovedCoordinates(location);
  if (improved) {
    return improved;
  }

  // Retourner les coordonnées originales
  return [location.lat, location.lng];
}
