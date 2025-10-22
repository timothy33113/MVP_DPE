/**
 * Quartiers de Pau basés sur les données réelles de l'API Leboncoin
 *
 * Ces quartiers correspondent exactement aux valeurs du champ
 * location.district retournées par l'API Leboncoin
 */

import { QuartierPolygon } from './quartiers';

/**
 * Liste des quartiers de Pau tels qu'utilisés par Leboncoin
 * Basée sur l'analyse des annonces réelles
 */
export const QUARTIERS_PAU_LEBONCOIN: QuartierPolygon[] = [
  // Centre-ville (zone historique et commerciale)
  {
    name: 'Centre-ville',
    ville: 'Pau',
    codePostal: ['64000'],
    coordinates: [
      [-0.3800, 43.2920], // SO
      [-0.3600, 43.2920], // SE
      [-0.3600, 43.3050], // NE
      [-0.3800, 43.3050], // NO
      [-0.3800, 43.2920],
    ],
    center: [-0.3700, 43.2985], // Boulevard des Pyrénées
  },

  // Dufau - Tourasse (quartier résidentiel est)
  {
    name: 'Dufau - Tourasse',
    ville: 'Pau',
    codePostal: ['64000'],
    coordinates: [
      [-0.3600, 43.2870], // SO
      [-0.3450, 43.2870], // SE
      [-0.3450, 43.2980], // NE
      [-0.3600, 43.2980], // NO
      [-0.3600, 43.2870],
    ],
    center: [-0.3525, 43.2925], // Rue Dufau
  },

  // Le Hameau (quartier ouest)
  {
    name: 'Le Hameau',
    ville: 'Pau',
    codePostal: ['64000'],
    coordinates: [
      [-0.3900, 43.2980], // SO
      [-0.3750, 43.2980], // SE
      [-0.3750, 43.3120], // NE
      [-0.3900, 43.3120], // NO
      [-0.3900, 43.2980],
    ],
    center: [-0.3825, 43.3050], // Quartier Hameau
  },

  // Pau Nord (secteur nord avec université et quartiers récents)
  {
    name: 'Pau Nord',
    ville: 'Pau',
    codePostal: ['64000'],
    coordinates: [
      [-0.3800, 43.3050], // SO
      [-0.3400, 43.3050], // SE
      [-0.3400, 43.3300], // NE
      [-0.3800, 43.3300], // NO
      [-0.3800, 43.3050],
    ],
    center: [-0.3600, 43.3175], // Zone Université / Ousse-des-Bois
  },

  // Pau Sud (secteur sud avec quartiers résidentiels)
  {
    name: 'Pau Sud',
    ville: 'Pau',
    codePostal: ['64000'],
    coordinates: [
      [-0.3800, 43.2700], // SO
      [-0.3300, 43.2700], // SE
      [-0.3300, 43.2870], // NE
      [-0.3800, 43.2870], // NO
      [-0.3800, 43.2700],
    ],
    center: [-0.3550, 43.2785], // Zone Trespoey / Buros
  },
];

/**
 * Map de normalisation des noms de quartiers Leboncoin
 * Permet de gérer les variations d'écriture
 */
export const LEBONCOIN_DISTRICT_MAP: Record<string, string> = {
  'centre-ville': 'Centre-ville',
  'centreville': 'Centre-ville',
  'centre ville': 'Centre-ville',
  'dufau - tourasse': 'Dufau - Tourasse',
  'dufau-tourasse': 'Dufau - Tourasse',
  'dufau tourasse': 'Dufau - Tourasse',
  'le hameau': 'Le Hameau',
  'hameau': 'Le Hameau',
  'pau nord': 'Pau Nord',
  'paunord': 'Pau Nord',
  'pau sud': 'Pau Sud',
  'pausud': 'Pau Sud',
};

/**
 * Normalise le nom d'un quartier Leboncoin vers notre format standard
 */
export function normalizeLeboncoinDistrict(district: string): string {
  const normalized = district.toLowerCase().trim();
  return LEBONCOIN_DISTRICT_MAP[normalized] || district;
}

/**
 * Statistiques des quartiers basées sur l'échantillon d'annonces
 */
export const STATS_PAU_LEBONCOIN = {
  totalQuartiers: 5,
  ville: 'Pau',
  codePostal: '64000',
  source: 'API Leboncoin',
  sampleSize: 24, // Nombre d'annonces analysées avec quartier
  distribution: {
    'Centre-ville': 13,
    'Pau Sud': 6,
    'Pau Nord': 3,
    'Le Hameau': 1,
    'Dufau - Tourasse': 1,
  },
};

export function getAllQuartiersPauLeboncoin(): QuartierPolygon[] {
  return QUARTIERS_PAU_LEBONCOIN;
}
