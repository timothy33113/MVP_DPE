/**
 * Service pour interroger l'API Cadastre
 * Source: cadastre.data.gouv.fr
 */

import { logger } from '@utils/logger';

export interface ParcelleCadastreInfo {
  id: string;
  commune: string;
  nomCommune?: string;
  section: string;
  numero: string;
  contenance: number; // Surface en m²
  codePostal?: string;
  adresse?: string;
  distance?: number; // Distance en mètres du point recherché
  geometry?: {
    type: string;
    coordinates: any;
  };
  bbox?: number[]; // [lon_min, lat_min, lon_max, lat_max]
}

export class CadastreService {
  private readonly API_BASE = 'https://apicarto.ign.fr/api/cadastre';

  /**
   * Crée un buffer circulaire autour d'un point
   * @param lon Longitude
   * @param lat Latitude
   * @param radiusMeters Rayon en mètres
   * @returns Polygon GeoJSON
   */
  private createBuffer(lon: number, lat: number, radiusMeters: number): any {
    // Approximation : 1 degré ≈ 111 km à l'équateur
    // Pour la latitude, c'est assez constant
    // Pour la longitude, ça dépend de la latitude : deltaLon = deltaLat / cos(lat)
    const deltaLat = radiusMeters / 111000; // en degrés
    const deltaLon = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180)); // en degrés

    // Créer un polygone circulaire approximatif avec 16 points
    const numPoints = 16;
    const coordinates: number[][] = [];

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const x = lon + deltaLon * Math.cos(angle);
      const y = lat + deltaLat * Math.sin(angle);
      coordinates.push([x, y]);
    }

    return {
      type: 'Polygon',
      coordinates: [coordinates]
    };
  }

  /**
   * Recherche les parcelles cadastrales autour d'un point GPS avec un rayon donné
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Rayon de recherche en mètres
   * @returns Liste brute des parcelles trouvées
   */
  private async fetchParcelles(
    lat: number,
    lon: number,
    radius: number
  ): Promise<ParcelleCadastreInfo[]> {
    const buffer = this.createBuffer(lon, lat, radius);
    const geomJson = JSON.stringify(buffer);
    const url = `${this.API_BASE}/parcelle?geom=${encodeURIComponent(geomJson)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Transformer les résultats
    return data.features.map((feature: any) => {
      const props = feature.properties;
      return {
        id: props.idu || props.id || `${props.code_insee}${props.section}${props.numero}`,
        commune: props.code_com || props.commune,
        nomCommune: props.nom_com,
        section: props.section,
        numero: props.numero,
        contenance: props.contenance || props.surf_parc || 0,
        codePostal: props.code_postal,
        adresse: props.adresse,
        geometry: feature.geometry, // Inclure la géométrie complète
        bbox: feature.bbox, // Inclure le bounding box
      };
    });
  }

  /**
   * Recherche les parcelles cadastrales autour d'un point GPS
   * Utilise une approche multi-rayons pour maximiser la précision
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Rayon initial de recherche en mètres (défaut: 15m)
   * @param expectedSurface Surface attendue en m² (optionnel, pour filtrage intelligent)
   * @returns Liste des parcelles trouvées
   */
  async getParcellsByLocation(
    lat: number,
    lon: number,
    radius: number = 15,
    expectedSurface?: number
  ): Promise<ParcelleCadastreInfo[]> {
    try {
      logger.info(`🔍 Recherche cadastre autour de (lat: ${lat}, lon: ${lon})`);

      if (expectedSurface) {
        // Mode précision maximale : tester plusieurs rayons
        logger.info(`🎯 Surface cible: ${expectedSurface}m²`);

        const radii = [10, 15, 20, 25, 30];
        let bestMatch: { parcelles: ParcelleCadastreInfo[], score: number, diff: number } | null = null;

        for (const testRadius of radii) {
          const parcelles = await this.fetchParcelles(lat, lon, testRadius);

          if (parcelles.length === 0) continue;

          // Grouper par section
          const bySection = new Map<string, ParcelleCadastreInfo[]>();
          parcelles.forEach(p => {
            const key = `${p.nomCommune}-${p.section}`;
            if (!bySection.has(key)) bySection.set(key, []);
            bySection.get(key)!.push(p);
          });

          // Tester chaque section
          for (const [sectionKey, sectionParcelles] of bySection.entries()) {
            const totalSurface = sectionParcelles.reduce((sum, p) => sum + p.contenance, 0);
            const diff = Math.abs(totalSurface - expectedSurface);
            const diffPercent = diff / expectedSurface;

            // Score : 100 - (écart en %)
            // Plus le score est élevé, meilleure est la correspondance
            const score = Math.max(0, 100 - (diffPercent * 100));

            // Conserver si c'est le meilleur match et dans la tolérance de 50%
            if (diffPercent < 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { parcelles: sectionParcelles, score, diff };
              logger.info(`  ✨ Rayon ${testRadius}m, Section ${sectionKey}: ${Math.round(totalSurface)}m² (score: ${Math.round(score)})`);
            }
          }
        }

        if (bestMatch) {
          const totalSurface = bestMatch.parcelles.reduce((sum, p) => sum + p.contenance, 0);
          logger.info(`🏆 Meilleur match: ${bestMatch.parcelles.length} parcelle(s) - ${Math.round(totalSurface)}m² (écart: ${Math.round(bestMatch.diff)}m², score: ${Math.round(bestMatch.score)})`);
          bestMatch.parcelles.forEach(p => {
            logger.info(`  📍 ${p.nomCommune} - Section ${p.section} N°${p.numero} - ${p.contenance}m²`);
          });
          return bestMatch.parcelles;
        }

        logger.warn('⚠️ Aucune correspondance trouvée avec la surface attendue');
        // Fallback : utiliser le rayon par défaut sans filtre
        radius = 15;
      }

      // Mode sans surface attendue : recherche simple
      const parcelles = await this.fetchParcelles(lat, lon, radius);

      if (parcelles.length === 0) {
        logger.info('⚠️ Aucune parcelle trouvée');
        return [];
      }

      // Grouper par section et prendre la plus représentée
      const parcellesBySection = new Map<string, ParcelleCadastreInfo[]>();

      parcelles.forEach(p => {
        const key = `${p.nomCommune}-${p.section}`;
        if (!parcellesBySection.has(key)) {
          parcellesBySection.set(key, []);
        }
        parcellesBySection.get(key)!.push(p);
      });

      let mainSection: ParcelleCadastreInfo[] = [];
      let maxCount = 0;
      for (const [key, group] of parcellesBySection.entries()) {
        if (group.length > maxCount) {
          maxCount = group.length;
          mainSection = group;
        }
      }

      // Si plusieurs groupes de même taille, prendre celui avec la plus grande surface
      const equalGroups: ParcelleCadastreInfo[][] = [];
      for (const group of parcellesBySection.values()) {
        if (group.length === maxCount) {
          equalGroups.push(group);
        }
      }

      if (equalGroups.length > 1) {
        mainSection = equalGroups.reduce((max, current) => {
          const maxSurface = max.reduce((sum, p) => sum + p.contenance, 0);
          const currentSurface = current.reduce((sum, p) => sum + p.contenance, 0);
          return currentSurface > maxSurface ? current : max;
        });
      }

      const totalSurface = mainSection.reduce((sum, p) => sum + p.contenance, 0);
      logger.info(`✅ Trouvé ${parcelles.length} parcelle(s) au total, ${mainSection.length} dans la sélection finale`);
      logger.info(`📊 Surface totale: ${Math.round(totalSurface)}m²`);
      mainSection.forEach(p => {
        logger.info(`  📍 ${p.nomCommune} - Section ${p.section} N°${p.numero} - ${p.contenance}m²`);
      });

      return mainSection;

    } catch (error) {
      logger.error('❌ Erreur lors de la requête cadastre:', error);
      return [];
    }
  }

  /**
   * Recherche par adresse
   * @param adresse Adresse complète
   * @param expectedSurface Surface attendue en m² (optionnel)
   * @returns Liste des parcelles
   */
  async getParcellsByAddress(adresse: string, expectedSurface?: number): Promise<ParcelleCadastreInfo[]> {
    try {
      // D'abord géocoder l'adresse avec l'API Adresse de data.gouv.fr
      const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;

      const geocodeResponse = await fetch(geocodeUrl);
      if (!geocodeResponse.ok) {
        return [];
      }

      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.features || geocodeData.features.length === 0) {
        return [];
      }

      const [lon, lat] = geocodeData.features[0].geometry.coordinates;

      // Puis rechercher les parcelles à cette position avec la surface attendue
      return this.getParcellsByLocation(lat, lon, 15, expectedSurface);

    } catch (error) {
      logger.error('Erreur lors du géocodage:', error);
      return [];
    }
  }

  /**
   * Récupère les informations détaillées d'une parcelle spécifique
   * @param codeCommune Code INSEE de la commune
   * @param section Section cadastrale
   * @param numero Numéro de parcelle
   */
  async getParcelleDetails(
    codeCommune: string,
    section: string,
    numero: string
  ): Promise<ParcelleCadastreInfo | null> {
    try {
      const url = `${this.API_BASE}/commune/${codeCommune}/parcelle/${section}/${numero}`;

      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        id: `${codeCommune}${section}${numero}`,
        commune: codeCommune,
        section: section,
        numero: numero,
        contenance: data.contenance || data.surface,
      };

    } catch (error) {
      logger.error('Erreur lors de la récupération des détails parcelle:', error);
      return null;
    }
  }
}

export const cadastreService = new CadastreService();
