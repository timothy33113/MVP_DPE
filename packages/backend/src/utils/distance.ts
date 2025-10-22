/**
 * Utilitaires pour le calcul de distances géographiques
 */

/**
 * Calcule la distance entre deux points GPS en utilisant la formule de Haversine
 * @param lat1 Latitude du point 1
 * @param lon1 Longitude du point 1
 * @param lat2 Latitude du point 2
 * @param lon2 Longitude du point 2
 * @returns Distance en mètres
 */
export const calculateGPSDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
};

/**
 * Calcule le pourcentage de différence entre deux valeurs
 * @param value1 Valeur 1
 * @param value2 Valeur 2
 * @returns Pourcentage de différence (0-100)
 */
export const calculatePercentageDifference = (value1: number, value2: number): number => {
  if (value1 === 0 && value2 === 0) return 0;
  if (value1 === 0 || value2 === 0) return 100;

  const avg = (value1 + value2) / 2;
  return (Math.abs(value1 - value2) / avg) * 100;
};

/**
 * Calcule la différence absolue entre deux dates en jours
 * @param date1 Date 1
 * @param date2 Date 2
 * @returns Différence en jours
 */
export const calculateDaysDifference = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Parse une période de construction DPE (ex: "1991-2000", "avant 1948", "2006-2012")
 * @param periode Période de construction (string)
 * @returns Objet avec annéeMin et annéeMax, ou null si non parsable
 */
export const parsePeriodeConstruction = (periode: string | null | undefined): { anneeMin: number; anneeMax: number } | null => {
  if (!periode || typeof periode !== 'string') return null;

  // Nettoyer la chaîne
  const cleaned = periode.trim().toLowerCase();

  // Cas: "avant XXXX"
  if (cleaned.startsWith('avant')) {
    const match = cleaned.match(/(\d{4})/);
    if (match) {
      const annee = parseInt(match[1], 10);
      return { anneeMin: 1800, anneeMax: annee - 1 };
    }
  }

  // Cas: "après XXXX"
  if (cleaned.startsWith('après') || cleaned.startsWith('apres')) {
    const match = cleaned.match(/(\d{4})/);
    if (match) {
      const annee = parseInt(match[1], 10);
      return { anneeMin: annee + 1, anneeMax: new Date().getFullYear() };
    }
  }

  // Cas: "XXXX-YYYY" ou "XXXX à YYYY"
  const rangeMatch = cleaned.match(/(\d{4})\s*[-àa]\s*(\d{4})/);
  if (rangeMatch) {
    return {
      anneeMin: parseInt(rangeMatch[1], 10),
      anneeMax: parseInt(rangeMatch[2], 10),
    };
  }

  // Cas: année simple "XXXX"
  const singleMatch = cleaned.match(/^(\d{4})$/);
  if (singleMatch) {
    const annee = parseInt(singleMatch[1], 10);
    return { anneeMin: annee, anneeMax: annee };
  }

  return null;
};

/**
 * Compare deux périodes/années de construction et retourne un score
 * @param annonceAnnee Année de l'annonce (nombre) ou null
 * @param dpePeriode Période du DPE (string) ou null
 * @param dpeAnnee Année exacte du DPE (nombre) ou null
 * @returns Score de 0 à 10
 */
export const compareConstructionPeriods = (
  annonceAnnee: number | null | undefined,
  dpePeriode: string | null | undefined,
  dpeAnnee: number | null | undefined
): number => {
  // Priorité 1: Comparaison année exacte vs année exacte (si les deux existent)
  if (annonceAnnee && dpeAnnee) {
    const diff = Math.abs(annonceAnnee - dpeAnnee);
    if (diff === 0) return 10; // Année identique
    if (diff <= 2) return 8;   // ±2 ans
    if (diff <= 5) return 10;  // ±5 ans (critère actuel)
    return 0; // Au-delà de 5 ans = 0 point
  }

  // Priorité 2: Année annonce vs période DPE (uniquement si pas d'année exacte DPE)
  if (annonceAnnee && !dpeAnnee && dpePeriode) {
    const parsed = parsePeriodeConstruction(dpePeriode);
    if (parsed) {
      // Vérifier si l'année de l'annonce tombe dans la période DPE
      if (annonceAnnee >= parsed.anneeMin && annonceAnnee <= parsed.anneeMax) {
        return 10; // Dans la période = match parfait
      }
      // Si hors période = 0 point (pas de scoring dégressif)
      return 0;
    }
  }

  return 0; // Aucune comparaison possible ou hors période
};
