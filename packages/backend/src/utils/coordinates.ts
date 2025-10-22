import proj4 from 'proj4';

/**
 * Définition Lambert 93 (EPSG:2154)
 * Système de projection utilisé en France métropolitaine
 */
const lambert93 = '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

/**
 * Définition WGS84 (EPSG:4326)
 * Système GPS standard (latitude, longitude)
 */
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

/**
 * Convertit des coordonnées Lambert 93 (X, Y) en WGS84 (longitude, latitude)
 *
 * @param x - Coordonnée X en Lambert 93 (mètres)
 * @param y - Coordonnée Y en Lambert 93 (mètres)
 * @returns [longitude, latitude] en degrés décimaux
 *
 * @example
 * // Convertir les coordonnées d'un DPE
 * const [lng, lat] = lambert93ToWGS84(429492.62, 6251968.11);
 * console.log(`GPS: ${lat}, ${lng}`); // GPS: 43.3156, -0.3802
 */
export function lambert93ToWGS84(x: number, y: number): [number, number] {
  try {
    const [lng, lat] = proj4(lambert93, wgs84, [x, y]);
    return [lng, lat];
  } catch (error) {
    console.error(`Erreur conversion Lambert93 → WGS84: ${error}`);
    // Retourner des coordonnées invalides
    return [0, 0];
  }
}

/**
 * Convertit des coordonnées WGS84 (longitude, latitude) en Lambert 93 (X, Y)
 *
 * @param lng - Longitude en degrés décimaux
 * @param lat - Latitude en degrés décimaux
 * @returns [X, Y] en mètres
 */
export function wgs84ToLambert93(lng: number, lat: number): [number, number] {
  try {
    const [x, y] = proj4(wgs84, lambert93, [lng, lat]);
    return [x, y];
  } catch (error) {
    console.error(`Erreur conversion WGS84 → Lambert93: ${error}`);
    return [0, 0];
  }
}

/**
 * Vérifie si des coordonnées sont valides
 */
export function areCoordinatesValid(x: number, y: number): boolean {
  return x !== 0 && y !== 0 && !isNaN(x) && !isNaN(y);
}
