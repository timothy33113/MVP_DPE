import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import proj4 from 'proj4';
import AnnonceDetailPanelNew from './components/AnnonceDetailPanelNew';
import { DpeDetailPanel } from './components/DpeDetailPanel';
import { Header } from '@/components/Header';
import { FilterPanel, FilterCriteria } from './components/FilterPanel';
import { ZoneManager } from './components/ZoneManager';
import { isAmepiExclusiveMandate } from '@dpe-matching/shared/src/agences-amepi';
import { getFinalCoordinates } from '@dpe-matching/shared/src/quartiers-coordinates';
import { matchesAnyZone } from '@dpe-matching/shared/src/zone-utils';
import { getPropertyIcon, getPropertyTypeName } from './utils/propertyTypeHelpers';

// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Types
interface ClusterMatch {
  id: string;
  score: number;
  trackingStatut?: string; // Statut de suivi : 'nouveau', 'vu', 'en_cours', 'envoye_monday'
  annonce: {
    id: string;
    url: string;
    codePostal: string;
    typeBien: string;
    surface?: number;
    pieces?: number;
    etiquetteDpe?: string;
    lat?: number;
    lng?: number;
    datePublication?: string;
    mandateType?: string;
    rawData?: any;
    // Nouveaux champs extraits
    prix?: number;
    chambres?: number;
    etatBien?: string;
    avecBalcon?: boolean;
    avecTerrasse?: boolean;
    avecGarage?: boolean;
    avecParkingPrive?: boolean;
    surfaceTerrain?: number;
  };
  bestDpe?: {
    id: string;
    numeroDpe: string;
    adresseBan: string;
    codePostalBan: string;
    coordonneeX?: number;
    coordonneeY?: number;
    etiquetteDpe: string;
    etiquetteGes: string;
    surfaceHabitable: number;
    typeBatiment: string;
    anneConstruction?: number;
    dateEtablissement?: string;
    // Isolation
    qualiteIsolationMurs?: string;
    qualiteIsolationMenuiseries?: string;
    qualiteIsolationPlancherBas?: string;
    qualiteIsolationComblePerdu?: string;
    qualiteIsolationCombleAmenage?: string;
    qualiteIsolationToitTerrasse?: string;
    qualiteIsolationEnveloppe?: string;
    // Chauffage
    typeEnergiePrincipaleChauffage?: string;
    typeInstallationChauffage?: string;
    descriptionGenerateurChauffage?: string;
    // ECS
    typeEnergiePrincipaleEcs?: string;
    typeGenerateurEcs?: string;
    // Ventilation
    typeVentilation?: string;
    // Confort
    indicateurConfortEte?: string;
    // Consommations
    consoTotaleEf?: number;
    consoParM2Ef?: number;
    consoChauffageEf?: number;
    consoEcsEf?: number;
    // Coûts
    coutTotal5Usages?: number;
    coutChauffage?: number;
    coutEcs?: number;
    // GES
    emissionGes5Usages?: number;
    emissionGesParM2?: number;
    // Structure
    hauteurSousPlafond?: number;
    nombreNiveauLogement?: number;
    numeroEtageAppartement?: number;
    logementTraversant?: number;
    classeInertieBatiment?: string;
    periodeConstruction?: string;
  };
}

interface MapStats {
  totalMatches: number;
  avgScore: number;
  withGPS: number;
}

// Couleur selon score
const getScoreColor = (score: number) => {
  if (score >= 80) return '#00a854'; // Vert
  if (score >= 70) return '#50b947'; // Vert clair
  if (score >= 60) return '#f4e932'; // Jaune
  if (score >= 50) return '#f39c12'; // Orange
  return '#e74c3c'; // Rouge
};

// Couleur selon étiquette DPE
const getDPEColor = (etiquette: string) => {
  const colors: Record<string, string> = {
    A: '#00a854',
    B: '#50b947',
    C: '#b6d230',
    D: '#f4e932',
    E: '#f39c12',
    F: '#e74c3c',
    G: '#c0392b',
  };
  return colors[etiquette] || '#95a5a6';
};

// Définir les systèmes de projection
// Lambert 93 (EPSG:2154) - système utilisé par ADEME
const lambert93 = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
// WGS84 (EPSG:4326) - système utilisé par Leaflet/GPS
const wgs84 = 'EPSG:4326';

// Conversion Lambert93 vers WGS84 avec proj4
function lambert93ToWGS84(x: number, y: number): [number, number] {
  const [lng, lat] = proj4(lambert93, wgs84, [x, y]);
  return [lat, lng];
}

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const cadastreLayerRef = useRef<L.GeoJSON | null>(null);

  const [matches, setMatches] = useState<ClusterMatch[]>([]);
  const [stats, setStats] = useState<MapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(50);

  // État pour le panneau latéral
  const [selectedMatch, setSelectedMatch] = useState<ClusterMatch | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [cadastreParcelles, setCadastreParcelles] = useState<any[]>([]);

  // État pour les filtres de critères acquéreur
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    typeBien: [],
    typeMandat: [],
    typeChauffage: [],
    isolation: [],
    etatBien: [],
  });

  // État pour les annonces sans DPE
  const [annoncesWithoutDpe, setAnnoncesWithoutDpe] = useState<any[]>([]);
  const [showAnnoncesWithoutDpe, setShowAnnoncesWithoutDpe] = useState(true);
  const yellowMarkersLayerRef = useRef<L.MarkerClusterGroup | null>(null);

  // État pour les DPE
  const [allDpes, setAllDpes] = useState<any[]>([]);
  const [showAllDpes, setShowAllDpes] = useState(false);
  const [dpeDateFilter, setDpeDateFilter] = useState<'all' | '2025' | '2024' | '2023' | '2022'>('all');
  const dpeMarkersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const [selectedDpe, setSelectedDpe] = useState<any | null>(null);
  const [isDpePanelOpen, setIsDpePanelOpen] = useState(false);
  // dpeFilters supprimé - on utilise maintenant filterCriteria pour tout

  // État pour les zones de recherche
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);
  const [activeZones, setActiveZones] = useState<any[]>([]);
  const [drawingMode, setDrawingMode] = useState<'polygon' | 'circle' | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  // Centre sur Pau
  const center: [number, number] = [43.2951, -0.3708];

  // Fonction helper pour vérifier si une annonce a une caractéristique
  const hasCaracteristique = (rawData: any, filterKey: string): boolean => {
    if (!rawData?.attributes) return false;

    // Cas spécial: ascenseur est un attribut séparé avec valeur "1" = Oui
    if (filterKey === 'ascenseur') {
      const attr = rawData.attributes.find((a: any) => a.key === 'elevator');
      return attr?.value === '1';
    }

    // Mapping des clés de filtre vers les valeurs dans rawData
    const caracteristiqueMapping: Record<string, { key: string; value: string }> = {
      jardin: { key: 'outside_access', value: 'garden' },
      terrasse: { key: 'outside_access', value: 'terrace' },
      balcon: { key: 'outside_access', value: 'balcony' },
      piscine: { key: 'outside_access', value: 'pool' },
      garage: { key: 'specificities', value: 'with_garage_or_parking_spot' },
      cave: { key: 'specificities', value: 'cellar' },
      cuisineEquipee: { key: 'specificities', value: 'equipped_kitchen' },
      interphone: { key: 'specificities', value: 'intercom' },
      sousSol: { key: 'specificities', value: 'basement' },
    };

    const mapping = caracteristiqueMapping[filterKey];
    if (!mapping) return false;

    // Trouver l'attribut correspondant
    const attr = rawData.attributes.find((a: any) => a.key === mapping.key);
    if (!attr || !attr.values) return false;

    // Vérifier si la valeur est présente
    return attr.values.includes(mapping.value);
  };

  // Filtrage des annonces sans DPE
  const filteredAnnoncesWithoutDpe = useMemo(() => {
    const filtered = annoncesWithoutDpe.filter((annonce: any) => {
      const rawData = annonce.rawData;

      // Type de bien - Utiliser le value_label du rawData pour plus de précision
      if (filterCriteria.typeBien.length > 0) {
        // Chercher l'attribut real_estate_type dans rawData
        const realEstateTypeAttr = rawData?.attributes?.find((attr: any) => attr.key === 'real_estate_type');
        const typeBienLabel = realEstateTypeAttr?.value_label || annonce.typeBien;
        const typeBienLower = typeBienLabel?.toLowerCase() || '';
        const agencyName = rawData?.owner?.name?.toUpperCase() || '';
        const body = rawData?.body?.toLowerCase() || '';

        // Déterminer la catégorie en tenant compte des programmes neufs
        let typeBienCategory = '';

        // Vérifier si c'est un programme (avec espace, point, virgule ou retour à la ligne après)
        const isProgramme = body.includes('programme ') || body.includes('programme.') || body.includes('programme,') || body.includes('programme\n') || body.includes('programme immobilier');
        const isTerrain = typeBienLower.includes('terrain');
        const subjectLower = rawData?.subject?.toLowerCase() || '';

        // Immeuble : vérifier le subject en priorité
        if (subjectLower.includes('immeuble')) {
          typeBienCategory = 'Immeuble';
        } else if (((typeBienLower.includes('maison') || typeBienLower.includes('villa')) && agencyName.includes('CONSTRUCTEURS')) ||
            (isProgramme && !isTerrain)) {
          // Programme Neuf : maisons du constructeur OU annonces (SAUF TERRAINS) contenant "programme" dans le body
          typeBienCategory = 'Programme Neuf';
        } else if (typeBienLower.includes('terrain')) {
          typeBienCategory = 'Terrain';
        } else if (typeBienLower.includes('maison') || typeBienLower.includes('villa')) {
          typeBienCategory = 'Maison';
        } else if (typeBienLower.includes('appartement')) {
          typeBienCategory = 'Appartement';
        } else if (typeBienLower.includes('parking') || typeBienLower.includes('garage')) {
          typeBienCategory = 'Parking';
        } else {
          typeBienCategory = 'Autre';
        }

        if (!filterCriteria.typeBien.includes(typeBienCategory)) {
          console.log(`❌ Annonce ${annonce.id} rejetée - Type de bien: ${typeBienCategory} (${typeBienLabel}), critères: ${filterCriteria.typeBien}`);
          return false;
        }
      }

      // Budget (prix)
      if (filterCriteria.budgetMin && annonce.prix && annonce.prix < filterCriteria.budgetMin) {
        console.log(`❌ Annonce ${annonce.id} rejetée - Prix ${annonce.prix} < ${filterCriteria.budgetMin}`);
        return false;
      }
      if (filterCriteria.budgetMax && annonce.prix && annonce.prix > filterCriteria.budgetMax) {
        console.log(`❌ Annonce ${annonce.id} rejetée - Prix ${annonce.prix} > ${filterCriteria.budgetMax}`);
        return false;
      }

      // Surface
      const surface = annonce.surface;
      if (filterCriteria.surfaceMin && surface && surface < filterCriteria.surfaceMin) return false;
      if (filterCriteria.surfaceMax && surface && surface > filterCriteria.surfaceMax) return false;

      // Pièces - Exclure automatiquement les terrains et parkings
      if (filterCriteria.piecesMin) {
        const typeBienUpper = annonce.typeBien?.toUpperCase() || '';
        // Exclure les terrains et parkings
        if (typeBienUpper.includes('TERRAIN') || typeBienUpper.includes('PARKING') ||
            typeBienUpper.includes('GARAGE') || typeBienUpper.includes('BOX')) {
          return false;
        }
        if (annonce.pieces && annonce.pieces < filterCriteria.piecesMin) return false;
      }

      // Chambres - Exclure automatiquement les terrains et parkings
      if (filterCriteria.chambresMin) {
        const typeBienUpper = annonce.typeBien?.toUpperCase() || '';
        // Exclure les terrains et parkings
        if (typeBienUpper.includes('TERRAIN') || typeBienUpper.includes('PARKING') ||
            typeBienUpper.includes('GARAGE') || typeBienUpper.includes('BOX')) {
          return false;
        }
        if (annonce.chambres && annonce.chambres < filterCriteria.chambresMin) return false;
      }

      // Terrain
      if (filterCriteria.terrainMin && annonce.surfaceTerrain && annonce.surfaceTerrain < filterCriteria.terrainMin) return false;

      // Balcon
      if (filterCriteria.balcon && annonce.avecBalcon !== true) {
        console.log(`❌ Annonce ${annonce.id} rejetée - Balcon: ${annonce.avecBalcon}, critère: ${filterCriteria.balcon}`);
        return false;
      }

      // Terrasse
      if (filterCriteria.terrasse && annonce.avecTerrasse !== true) return false;

      // Garage
      if (filterCriteria.garage && annonce.avecGarage !== true) return false;

      // Parking
      if (filterCriteria.parking && annonce.avecParkingPrive !== true) return false;

      // État du bien - utiliser le rawData en priorité, filtrage strict
      // IMPORTANT : Ne pas filtrer par état pour les TERRAINS (c'est absurde)
      if (filterCriteria.etatBien.length > 0) {
        // Vérifier d'abord si c'est un terrain
        const realEstateTypeAttr = rawData?.attributes?.find((attr: any) => attr.key === 'real_estate_type');
        const typeBienLabel = realEstateTypeAttr?.value_label;

        // Les terrains n'ont pas d'état du bien pertinent - les exclure du filtre état
        if (typeBienLabel && typeBienLabel.toLowerCase() === 'terrain') {
          // Pour les terrains, on les affiche seulement si "Non renseigné" est sélectionné
          if (!filterCriteria.etatBien.includes('Non renseigné')) {
            return false; // Filtrer les terrains si "Non renseigné" n'est pas sélectionné
          }
          // Sinon continuer (le terrain passe le filtre car considéré comme "Non renseigné")
        } else {
          // Pour les non-terrains, appliquer le filtre état normalement
          // Chercher l'attribut global_condition dans rawData (source de vérité)
          const globalConditionAttr = rawData?.attributes?.find((attr: any) => attr.key === 'global_condition');
          const etatFromRawData = globalConditionAttr?.value_label;

          // Utiliser rawData en priorité, sinon la colonne etatBien
          const etatBienValue = etatFromRawData || annonce.etatBien;

          // Gérer le cas "Non renseigné" séparément
          if (filterCriteria.etatBien.includes('Non renseigné')) {
            // Si "Non renseigné" est sélectionné ET qu'il n'y a pas d'état, on garde l'annonce
            if (!etatBienValue) {
              // Continuer - cette annonce correspond au filtre "Non renseigné"
            } else {
              // Il y a un état renseigné - vérifier si d'autres filtres correspondent
              const normalized = etatBienValue.toLowerCase();
              let matches = false;

              if (filterCriteria.etatBien.includes('Bon état') && (normalized.includes('bon') && normalized.includes('etat'))) matches = true;
              if (filterCriteria.etatBien.includes('Très bon état') && (normalized.includes('tres') || normalized.includes('très'))) matches = true;
              if (filterCriteria.etatBien.includes('Neuf') && normalized.includes('neuf')) matches = true;
              if (filterCriteria.etatBien.includes('Rénové') && normalized.includes('renov')) matches = true;
              if (filterCriteria.etatBien.includes('À rafraichir') && normalized.includes('rafraichir')) matches = true;
              if (filterCriteria.etatBien.includes('Travaux à prévoir') && normalized.includes('travaux')) matches = true;

              if (!matches) return false;
            }
          } else {
            // "Non renseigné" n'est PAS sélectionné
            if (!etatBienValue) {
              // L'annonce n'a pas d'état mais "Non renseigné" n'est pas sélectionné
              return false;
            }

            // Vérifier si l'état correspond à un des filtres sélectionnés
            const normalized = etatBienValue.toLowerCase();
            let matches = false;

            if (filterCriteria.etatBien.includes('Bon état') && (normalized.includes('bon') && normalized.includes('etat'))) matches = true;
            if (filterCriteria.etatBien.includes('Très bon état') && (normalized.includes('tres') || normalized.includes('très'))) matches = true;
            if (filterCriteria.etatBien.includes('Neuf') && normalized.includes('neuf')) matches = true;
            if (filterCriteria.etatBien.includes('Rénové') && normalized.includes('renov')) matches = true;
            if (filterCriteria.etatBien.includes('À rafraichir') && normalized.includes('rafraichir')) matches = true;
            if (filterCriteria.etatBien.includes('Travaux à prévoir') && normalized.includes('travaux')) matches = true;

            if (!matches) return false;
          }
        }
      }

      // Note DPE (choix multiple) - Utiliser les données du rawData (energy_rate)
      if (filterCriteria.dpe && filterCriteria.dpe.length > 0) {
        const energyRateAttr = rawData?.attributes?.find((attr: any) => attr.key === 'energy_rate');
        const dpeLabel = energyRateAttr?.value_label?.toUpperCase();

        if (!dpeLabel || !filterCriteria.dpe.includes(dpeLabel)) return false;
      }

      // Caractéristiques
      if (filterCriteria.jardin && !hasCaracteristique(rawData, 'jardin')) return false;
      if (filterCriteria.terrasse && !hasCaracteristique(rawData, 'terrasse')) return false;
      if (filterCriteria.balcon && !hasCaracteristique(rawData, 'balcon')) return false;
      if (filterCriteria.piscine && !hasCaracteristique(rawData, 'piscine')) return false;
      if (filterCriteria.garage && !hasCaracteristique(rawData, 'garage')) return false;
      if (filterCriteria.ascenseur && !hasCaracteristique(rawData, 'ascenseur')) return false;
      if (filterCriteria.cave && !hasCaracteristique(rawData, 'cave')) return false;
      if (filterCriteria.cuisineEquipee && !hasCaracteristique(rawData, 'cuisineEquipee')) return false;
      if (filterCriteria.interphone && !hasCaracteristique(rawData, 'interphone')) return false;
      if (filterCriteria.sousSol && !hasCaracteristique(rawData, 'sousSol')) return false;

      return true;
    });

    console.log(`🟡 Filtrage annonces sans DPE: ${filtered.length} / ${annoncesWithoutDpe.length}`, {
      filterCriteria,
      exempleAnnonce: annoncesWithoutDpe[0] ? {
        typeBien: annoncesWithoutDpe[0].typeBien,
        prix: annoncesWithoutDpe[0].prix,
        surface: annoncesWithoutDpe[0].surface,
        pieces: annoncesWithoutDpe[0].pieces,
        chambres: annoncesWithoutDpe[0].chambres,
        avecBalcon: annoncesWithoutDpe[0].avecBalcon
      } : null
    });

    return filtered;
  }, [annoncesWithoutDpe, filterCriteria]);

  // Filtrage complet avec critères acquéreur
  const filteredMatches = useMemo(() => {
    const filtered = matches.filter((match) => {
      // Filtre score minimum (existant)
      if (match.score < minScore) return false;

      const annonce = match.annonce;
      const dpe = match.bestDpe;
      const rawData = annonce.rawData;

      // Type de bien
      if (filterCriteria.typeBien.length > 0) {
        const typeBien = annonce.typeBien || rawData?.attributes?.real_estate_type;
        if (!typeBien || !filterCriteria.typeBien.some(t =>
          typeBien.toLowerCase().includes(t.toLowerCase())
        )) return false;
      }

      // Budget (prix) - Utiliser la colonne prix directement
      if (filterCriteria.budgetMin && annonce.prix && annonce.prix < filterCriteria.budgetMin) return false;
      if (filterCriteria.budgetMax && annonce.prix && annonce.prix > filterCriteria.budgetMax) return false;

      // Surface
      const surface = annonce.surface || dpe?.surfaceHabitable;
      if (filterCriteria.surfaceMin && surface && surface < filterCriteria.surfaceMin) return false;
      if (filterCriteria.surfaceMax && surface && surface > filterCriteria.surfaceMax) return false;

      // Pièces - Exclure automatiquement les terrains et parkings
      if (filterCriteria.piecesMin) {
        const typeBienUpper = annonce.typeBien?.toUpperCase() || '';
        // Exclure les terrains et parkings
        if (typeBienUpper.includes('TERRAIN') || typeBienUpper.includes('PARKING') ||
            typeBienUpper.includes('GARAGE') || typeBienUpper.includes('BOX')) {
          return false;
        }
        if (annonce.pieces && annonce.pieces < filterCriteria.piecesMin) return false;
      }

      // Chambres - Exclure automatiquement les terrains et parkings
      if (filterCriteria.chambresMin) {
        const typeBienUpper = annonce.typeBien?.toUpperCase() || '';
        // Exclure les terrains et parkings
        if (typeBienUpper.includes('TERRAIN') || typeBienUpper.includes('PARKING') ||
            typeBienUpper.includes('GARAGE') || typeBienUpper.includes('BOX')) {
          return false;
        }
        if (annonce.chambres && annonce.chambres < filterCriteria.chambresMin) return false;
      }

      // Balcon - Utiliser la colonne avecBalcon directement (strict true)
      if (filterCriteria.balcon && annonce.avecBalcon !== true) return false;

      // Terrasse - Utiliser la colonne avecTerrasse directement (strict true)
      if (filterCriteria.terrasse && annonce.avecTerrasse !== true) return false;

      // Parking - Utiliser la colonne avecParkingPrive directement (strict true)
      if (filterCriteria.parking && annonce.avecParkingPrive !== true) return false;

      // Garage - Utiliser la colonne avecGarage directement (strict true)
      if (filterCriteria.garage && annonce.avecGarage !== true) return false;

      // Terrain (pour maisons) - Utiliser la colonne surfaceTerrain directement
      if (filterCriteria.terrain && !annonce.surfaceTerrain) return false;

      // Note DPE (choix multiple)
      if (filterCriteria.dpe && filterCriteria.dpe.length > 0) {
        const dpeGrade = annonce.etiquetteDpe || dpe?.etiquetteDpe;
        if (!dpeGrade || !filterCriteria.dpe.includes(dpeGrade)) return false;
      }

      // Type de chauffage
      if (filterCriteria.typeChauffage.length > 0) {
        // Vérifier d'abord dans les données DPE
        const chauffageDpe = dpe?.typeEnergiePrincipaleChauffage || dpe?.descriptionGenerateurChauffage;

        // Vérifier dans les rawData de l'annonce Leboncoin
        const heatingModeAttr = rawData?.attributes?.find((attr: any) => attr.key === 'heating_mode');
        const heatingTypeAttr = rawData?.attributes?.find((attr: any) => attr.key === 'heating_type');
        const chauffageLeboncoin = heatingModeAttr?.value_label || '';
        const typeHeating = heatingTypeAttr?.value_label || '';

        // Combiner toutes les sources (DPE, heating_mode, heating_type)
        const chauffageCombine = `${chauffageDpe || ''} ${chauffageLeboncoin} ${typeHeating}`.toLowerCase();

        if (!chauffageCombine || !filterCriteria.typeChauffage.some(t =>
          chauffageCombine.includes(t.toLowerCase())
        )) return false;
      }

      // Isolation
      if (filterCriteria.isolation.length > 0) {
        const isolation = dpe?.qualiteIsolationEnveloppe || dpe?.qualiteIsolationMurs;
        if (!isolation) return false;

        const isolationMap: Record<string, string[]> = {
          'Bonne': ['bonne', 'excellente', 'tres bonne', 'très bonne'],
          'Moyenne': ['moyenne', 'correcte'],
          'À améliorer': ['insuffisante', 'mauvaise', 'faible', 'à améliorer']
        };

        const matchesIsolation = filterCriteria.isolation.some(niveau => {
          const keywords = isolationMap[niveau] || [];
          return keywords.some(keyword => isolation.toLowerCase().includes(keyword));
        });

        if (!matchesIsolation) return false;
      }

      // État du bien - Utiliser la colonne etatBien directement
      if (filterCriteria.etatBien.length > 0 && annonce.etatBien) {
        // Match exact ou partiel avec les valeurs sélectionnées
        const matchesEtat = filterCriteria.etatBien.some(niveau =>
          annonce.etatBien?.toLowerCase().includes(niveau.toLowerCase())
        );

        if (!matchesEtat) return false;
      }

      // Filtre AMEPI: masquer les mandats exclusifs des agences AMEPI (non interagence)
      if (filterCriteria.excludeAmepiExclusive) {
        const agencyName = rawData?.owner?.name;
        if (isAmepiExclusiveMandate(agencyName, annonce.mandateType)) {
          return false;
        }
      }

      // Caractéristiques
      if (filterCriteria.jardin && !hasCaracteristique(rawData, 'jardin')) return false;
      if (filterCriteria.terrasse && !hasCaracteristique(rawData, 'terrasse')) return false;
      if (filterCriteria.balcon && !hasCaracteristique(rawData, 'balcon')) return false;
      if (filterCriteria.piscine && !hasCaracteristique(rawData, 'piscine')) return false;
      if (filterCriteria.garage && !hasCaracteristique(rawData, 'garage')) return false;
      if (filterCriteria.ascenseur && !hasCaracteristique(rawData, 'ascenseur')) return false;
      if (filterCriteria.cave && !hasCaracteristique(rawData, 'cave')) return false;
      if (filterCriteria.cuisineEquipee && !hasCaracteristique(rawData, 'cuisineEquipee')) return false;
      if (filterCriteria.interphone && !hasCaracteristique(rawData, 'interphone')) return false;
      if (filterCriteria.sousSol && !hasCaracteristique(rawData, 'sousSol')) return false;

      return true;
    });

    // Debug: compter les biens avec balcon
    const avecBalconCount = filtered.filter(m => m.annonce?.avecBalcon === true).length;
    console.log(`🔍 Filtrage: ${filtered.length} matchs, dont ${avecBalconCount} avec balcon`, {
      filterCriteria,
      totalMatches: matches.length
    });

    return filtered;
  }, [matches, minScore, filterCriteria]);

  // Filtrer les DPE avec les mêmes critères que les annonces
  const filteredDpes = useMemo(() => {
    const filtered = allDpes.filter((dpe) => {
      // Type de bien - Mapper les types d'annonce aux types de bâtiment DPE
      if (filterCriteria.typeBien.length > 0) {
        const typeBatiment = dpe.typeBatiment?.toLowerCase() || '';
        const matchesType = filterCriteria.typeBien.some(type => {
          const typeLower = type.toLowerCase();
          // Mapper les types d'annonces aux types de bâtiments DPE
          if (typeLower.includes('appartement') && typeBatiment.includes('appartement')) return true;
          if (typeLower.includes('maison') && (typeBatiment.includes('maison') || typeBatiment.includes('individuel'))) return true;
          if (typeLower.includes('terrain') && typeBatiment.includes('terrain')) return true;
          return typeBatiment.includes(typeLower);
        });
        if (!matchesType) return false;
      }

      // Surface habitable
      if (filterCriteria.surfaceMin && dpe.surfaceHabitable < filterCriteria.surfaceMin) return false;
      if (filterCriteria.surfaceMax && dpe.surfaceHabitable > filterCriteria.surfaceMax) return false;

      // Etiquette DPE
      if (filterCriteria.dpe && filterCriteria.dpe.length > 0) {
        if (!filterCriteria.dpe.includes(dpe.etiquetteDpe)) return false;
      }

      // Type de chauffage
      if (filterCriteria.typeChauffage && filterCriteria.typeChauffage.length > 0) {
        const chauffageDpe = `${dpe.typeEnergiePrincipaleChauffage || ''} ${dpe.descriptionGenerateurChauffage || ''}`.toLowerCase();
        const matchesChauffage = filterCriteria.typeChauffage.some(type =>
          chauffageDpe.includes(type.toLowerCase())
        );
        if (!matchesChauffage) return false;
      }

      // Isolation
      if (filterCriteria.isolation && filterCriteria.isolation.length > 0) {
        const isolation = dpe.qualiteIsolationEnveloppe || dpe.qualiteIsolationMurs;
        if (!isolation) return false;

        const isolationMap: Record<string, string[]> = {
          'Bonne': ['bonne', 'excellente', 'tres bonne', 'très bonne'],
          'Moyenne': ['moyenne', 'correcte'],
          'À améliorer': ['insuffisante', 'mauvaise', 'faible', 'à améliorer']
        };

        const matchesIsolation = filterCriteria.isolation.some(niveau => {
          const keywords = isolationMap[niveau] || [];
          return keywords.some(keyword => isolation.toLowerCase().includes(keyword));
        });

        if (!matchesIsolation) return false;
      }

      return true;
    });

    console.log('🟢 DPE filtrage (useMemo):', {
      total: allDpes.length,
      filtered: filtered.length,
      filters: filterCriteria
    });

    return filtered;
  }, [allDpes, filterCriteria]);

  // Fonctions de gestion du dessin de zones
  const startDrawingMode = (type: 'polygon' | 'circle') => {
    setDrawingMode(type);
    setIsZoneManagerOpen(false);

    if (!mapInstanceRef.current) return;

    // Créer le layer pour les dessins si nécessaire
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup();
      mapInstanceRef.current.addLayer(drawnItemsRef.current);
    }

    // Activer le mode de dessin approprié
    if (type === 'polygon') {
      const drawPolygon = new (L.Draw as any).Polygon(mapInstanceRef.current);
      drawPolygon.enable();
    } else if (type === 'circle') {
      const drawCircle = new (L.Draw as any).Circle(mapInstanceRef.current);
      drawCircle.enable();
    }
  };

  const saveDrawnZone = async (layer: any, type: 'POLYGON' | 'CIRCLE') => {
    const zoneName = prompt('Nom de la zone :');
    if (!zoneName) return;

    let geometry: any;

    if (type === 'POLYGON') {
      const latLngs = layer.getLatLngs()[0];
      geometry = {
        type: 'Polygon',
        coordinates: [latLngs.map((ll: any) => [ll.lng, ll.lat])]
      };
    } else if (type === 'CIRCLE') {
      const center = layer.getLatLng();
      // Demander le rayon en km à l'utilisateur
      const radiusInput = prompt('Rayon du cercle en km :', '5');
      if (!radiusInput) return;
      const radius = parseFloat(radiusInput);
      if (isNaN(radius) || radius <= 0) {
        alert('Rayon invalide');
        return;
      }
      geometry = {
        type: 'Circle',
        center: [center.lng, center.lat],
        radius: radius
      };
    }

    try {
      await fetch('http://localhost:3001/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoneName,
          type,
          geometry,
          color: '#3b82f6'
        })
      });

      // Recharger les zones
      const response = await fetch('http://localhost:3001/api/zones/active');
      const zones = await response.json();
      setActiveZones(zones);

      // Nettoyer le dessin
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers();
      }

      setDrawingMode(null);
      alert(`Zone "${zoneName}" créée avec succès !`);
    } catch (error) {
      console.error('Erreur sauvegarde zone:', error);
      alert('Erreur lors de la sauvegarde de la zone');
    }
  };

  // Charger les données
  useEffect(() => {
    fetchMapData();
  }, []);

  // Charger les zones actives
  useEffect(() => {
    const loadActiveZones = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/zones/active');
        if (!response.ok) {
          console.error('Erreur HTTP zones:', response.status);
          setActiveZones([]);
          return;
        }
        const zones = await response.json();
        setActiveZones(Array.isArray(zones) ? zones : []);
        console.log(`🎯 ${zones?.length || 0} zones actives chargées`);
      } catch (error) {
        console.error('Erreur chargement zones:', error);
        setActiveZones([]);
      }
    };
    loadActiveZones();
  }, []);

  // Initialiser la carte APRÈS que les données soient chargées
  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ Initialisation de la carte des matchs...');

    try {
      const map = L.map(mapRef.current, {
        center: center,
        zoom: 11,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.circle(center, {
        radius: 30000,
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.05,
        weight: 2,
        dashArray: '10, 10',
      }).addTo(map);

      // Création des groupes de clustering pour les marqueurs
      markersLayerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50, // Rayon de clustering en pixels
        spiderfyOnMaxZoom: true, // Afficher en araignée au zoom max
        showCoverageOnHover: false, // Ne pas afficher la zone de couverture
        zoomToBoundsOnClick: true, // Zoomer au clic sur un cluster
        disableClusteringAtZoom: 17, // Désactiver le clustering au zoom 17+
      }).addTo(map);

      yellowMarkersLayerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 17,
        // Style différent pour les marqueurs jaunes
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${count}</div>`,
            className: 'marker-cluster marker-cluster-yellow',
            iconSize: L.point(40, 40)
          });
        }
      }).addTo(map);
      mapInstanceRef.current = map;

      // Event listeners pour Leaflet Draw
      map.on((L.Draw as any).Event.CREATED, (e: any) => {
        const layer = e.layer;
        const type = e.layerType;

        if (type === 'polygon') {
          saveDrawnZone(layer, 'POLYGON');
        } else if (type === 'circle') {
          saveDrawnZone(layer, 'CIRCLE');
        }
      });

      setTimeout(() => {
        map.invalidateSize();
        console.log('✓ Carte initialisée');
      }, 100);

    } catch (error) {
      console.error('❌ Erreur initialisation carte:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);

  // Mettre à jour les markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Utiliser filteredMatches (qui inclut déjà les filtres de critères acquéreur)
    // et ajouter les filtres supplémentaires (coordonnées GPS, type, mandat, tracking)
    const filtered = filteredMatches.filter((m) => {
      // Filtre par coordonnées GPS - priorité aux coordonnées DPE
      const hasDpeCoords = m.bestDpe?.coordonneeX && m.bestDpe?.coordonneeY;
      const hasAnnonceCoords = m.annonce.lat && m.annonce.lng;
      if (!hasDpeCoords && !hasAnnonceCoords) return false;

      // Obtenir les coordonnées pour le filtrage par zones
      let lat, lng;
      if (hasDpeCoords) {
        [lat, lng] = lambert93ToWGS84(m.bestDpe.coordonneeX, m.bestDpe.coordonneeY);
      } else {
        lat = m.annonce.lat!;
        lng = m.annonce.lng!;
      }

      // Filtre par zones de recherche
      if (!matchesAnyZone(lat, lng, activeZones)) {
        return false;
      }

      // Filtre par type de bien (via FilterPanel)
      if (filterCriteria.typeBien.length > 0) {
        const typeBien = m.annonce.typeBien || 'Autre';
        const agencyName = (m.annonce.rawData as any)?.owner?.name?.toUpperCase() || '';
        const body = (m.annonce.rawData as any)?.body?.toLowerCase() || '';

        // Vérifier aussi le real_estate_type dans rawData comme pour les annonces sans DPE
        const realEstateTypeAttr = (m.annonce.rawData as any)?.attributes?.find((attr: any) => attr.key === 'real_estate_type');
        const typeBienLabel = realEstateTypeAttr?.value_label || typeBien || '';
        const typeBienLower = typeBienLabel.toLowerCase();

        // Déterminer la catégorie en tenant compte des programmes neufs
        let typeBienCategory: string;

        // Vérifier si c'est un programme (avec espace, point, virgule ou retour à la ligne après)
        const isProgramme = body.includes('programme ') || body.includes('programme.') || body.includes('programme,') || body.includes('programme\n') || body.includes('programme immobilier');
        const isTerrain = typeBienLower.includes('terrain');
        const subjectLower = (m.annonce.rawData as any)?.subject?.toLowerCase() || '';

        // Immeuble : vérifier le subject en priorité
        if (subjectLower.includes('immeuble')) {
          typeBienCategory = 'Immeuble';
        } else if (((typeBienLower.includes('maison') || typeBienLower.includes('villa')) && agencyName.includes('CONSTRUCTEURS')) ||
            (isProgramme && !isTerrain)) {
          // Programme Neuf : maisons du constructeur OU annonces (SAUF TERRAINS) contenant "programme" dans le body
          typeBienCategory = 'Programme Neuf';
        } else if (typeBienLower.includes('terrain')) {
          typeBienCategory = 'Terrain';
        } else if (typeBienLower.includes('maison') || typeBienLower.includes('villa')) {
          typeBienCategory = 'Maison';
        } else if (typeBienLower.includes('appartement')) {
          typeBienCategory = 'Appartement';
        } else if (typeBienLower.includes('parking')) {
          typeBienCategory = 'Parking';
        } else {
          typeBienCategory = 'Autre';
        }

        if (!filterCriteria.typeBien.includes(typeBienCategory)) {
          return false;
        }
      }

      // Filtre par type de mandat (via FilterPanel)
      if (filterCriteria.typeMandat.length > 0) {
        let mandateCategory: string;

        if (!m.annonce.mandateType) {
          // Pas de mandateType = particulier
          mandateCategory = 'particulier';
        } else if (m.annonce.mandateType === 'exclusive') {
          // Vérifier l'âge pour différencier exclusif récent/ancien
          const datePublication = m.annonce.datePublication ? new Date(m.annonce.datePublication) : null;
          const ageInDays = datePublication ? Math.floor((new Date().getTime() - datePublication.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          mandateCategory = ageInDays > 90 ? 'old_exclusive' : 'exclusive';
        } else {
          // simple
          mandateCategory = m.annonce.mandateType;
        }

        if (!filterCriteria.typeMandat.includes(mandateCategory)) {
          return false;
        }
      }

      return true;
    });

    filtered.forEach((match) => {
      // PRIORITÉ ADEME: Utiliser les coordonnées DPE (Lambert93 -> WGS84) en priorité
      let lat: number, lng: number;
      let sourceCoords: 'leboncoin' | 'dpe' = 'dpe';

      if (match.bestDpe?.coordonneeX && match.bestDpe?.coordonneeY) {
        [lat, lng] = lambert93ToWGS84(match.bestDpe.coordonneeX, match.bestDpe.coordonneeY);
        sourceCoords = 'dpe';
      } else if (match.annonce.lat && match.annonce.lng) {
        lat = match.annonce.lat;
        lng = match.annonce.lng;
        sourceCoords = 'leboncoin';
      } else {
        return; // Pas de coordonnées disponibles
      }

      // Préparer les données d'image
      const hasImages = match.annonce.rawData?.images?.urls?.length > 0;
      const imageUrl = match.annonce.rawData?.images?.urls?.[0] || '';
      const imageCount = match.annonce.rawData?.images?.urls?.length || 0;

      // Calculer l'ancienneté de l'annonce
      const datePublication = match.annonce.datePublication ? new Date(match.annonce.datePublication) : null;
      const now = new Date();
      const ageInDays = datePublication ? Math.floor((now.getTime() - datePublication.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Déterminer le type de mandat (4 types)
      const mandateType = match.annonce.mandateType;
      const isParticulier = !mandateType; // Non renseigné = particulier
      const isOldExclusive = mandateType === 'exclusive' && ageInDays > 90; // >3 mois
      const isRecentExclusive = mandateType === 'exclusive' && ageInDays <= 90;
      const isSimple = mandateType === 'simple';

      // Vérifier si c'est un mandat exclusif AMEPI (non interagence)
      const rawData = match.annonce.rawData as any;

      // Déterminer le type de bien et son icône (passer rawData pour meilleure détection)
      const propertyIcon = getPropertyIcon(match.annonce.typeBien || '', rawData);
      const agencyName = rawData?.owner?.name;
      const isAmepiExclusive = isAmepiExclusiveMandate(agencyName, match.annonce.mandateType);

      // Déterminer si le DPE a été corrigé manuellement
      const isDpeCorrected = match.annonce.dpeCorrected === true;
      const correctionBadge = isDpeCorrected ? `
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          background: #10b981;
          color: white;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 20;
        ">✓</div>
      ` : '';

      // Déterminer le style du marqueur (5 types: particulier, simple, exclusif récent, exclusif ancien, AMEPI)
      let markerHTML, markerSize, markerAnchor;

      if (isAmepiExclusive) {
        // 🟣 AMEPI EXCLUSIF: Mandat exclusif non interagence - Octogone violet
        markerHTML = `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 38px;
              height: 38px;
              background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
              clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
              box-shadow: 0 0 15px rgba(168, 85, 247, 0.6), 0 4px 8px rgba(147, 51, 234, 0.4);
              border: 2px solid #e9d5ff;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 15px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
            ${correctionBadge}
          </div>
        `;
        markerSize = [38, 38];
        markerAnchor = [19, 19];
      } else if (isParticulier) {
        // 💎 PARTICULIER: Vente directe sans agence - Losange bleu
        markerHTML = `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              transform: rotate(45deg);
              border-radius: 4px;
              box-shadow: 0 0 12px rgba(59, 130, 246, 0.5), 0 3px 6px rgba(37, 99, 235, 0.3);
              border: 2px solid white;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 15px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
            ${correctionBadge}
          </div>
        `;
        markerSize = [36, 36];
        markerAnchor = [18, 18];
      } else if (isOldExclusive) {
        // ⭐ OPPORTUNITÉ: Mandat exclusif >3 mois - Étoile orange avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
              clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
              box-shadow: 0 0 15px rgba(251, 146, 60, 0.6), 0 4px 8px rgba(251, 146, 60, 0.4);
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 16px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
            ${correctionBadge}
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.1); filter: brightness(1.15); }
            }
          </style>
        `;
        markerSize = [40, 40];
        markerAnchor = [20, 20];
      } else if (isRecentExclusive) {
        // 🔴 Mandat exclusif récent - Hexagone rouge avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 35px;
            height: 35px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 35px;
              height: 35px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
              box-shadow: 0 0 10px rgba(239, 68, 68, 0.4), 0 3px 6px rgba(220, 38, 38, 0.3);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 14px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
            ${correctionBadge}
          </div>
        `;
        markerSize = [35, 35];
        markerAnchor = [17.5, 17.5];
      } else {
        // 🟢 Mandat simple - Cercle vert avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 30px;
            height: 30px;
          ">
            <div style="
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 13px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
            ${correctionBadge}
          </div>
        `;
        markerSize = [30, 30];
        markerAnchor = [15, 15];
      }

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: markerHTML,
          iconSize: markerSize,
          iconAnchor: markerAnchor,
        }),
      });

      // Ancienne popup commentée - toutes les données sont maintenant dans le panel latéral
      /*
      marker.bindPopup(`
        <div style="font-size: 13px; min-width: 280px; max-width: 350px;">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #1a1a1a;">
            ✅ Match trouvé (${match.score}/100)
          </div>

          ${isOldExclusive ? `
            <div style="
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              color: white;
              padding: 8px 10px;
              border-radius: 6px;
              margin-bottom: 12px;
              font-weight: bold;
              font-size: 12px;
              box-shadow: 0 3px 8px rgba(251, 191, 36, 0.3);
              text-align: center;
            ">
              💎 OPPORTUNITÉ EXCLUSIVE
              <div style="font-size: 10px; font-weight: normal; margin-top: 3px;">
                Mandat exclusif depuis ${Math.floor(ageInDays / 30)} mois - Forte marge de négociation
              </div>
            </div>
          ` : isRecentExclusive ? `
            <div style="
              background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
              color: white;
              padding: 6px 8px;
              border-radius: 4px;
              margin-bottom: 8px;
              font-weight: bold;
              font-size: 11px;
              box-shadow: 0 2px 6px rgba(251, 146, 60, 0.3);
              text-align: center;
            ">
              🔶 MANDAT EXCLUSIF
            </div>
          ` : ''}

          <div style="font-size: 10px; padding: 4px 6px; background: ${sourceCoords === 'dpe' ? '#e0f2fe' : '#fef3c7'}; border-radius: 4px; margin-bottom: 8px; color: ${sourceCoords === 'dpe' ? '#0369a1' : '#92400e'};">
            📍 Point GPS: ${sourceCoords === 'dpe' ? 'Coordonnées ADEME DPE' : 'Coordonnées Leboncoin'}
          </div>

          ${hasImages && imageUrl ? `
            <div style="margin-bottom: 12px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <img
                src="${imageUrl}"
                alt="Photo annonce"
                style="width: 100%; height: 180px; object-fit: cover; display: block;"
                onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;color:#666;\\'>Photo non disponible</div>'"
              />
              ${imageCount > 1 ? `
                <div style="font-size: 10px; color: #64748b; padding: 4px 8px; background: #f8fafc; text-align: center;">
                  📷 ${imageCount} photos disponibles
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div style="padding: 8px; background: ${getScoreColor(match.score)}20; border-radius: 4px; margin-bottom: 12px;">
            <div style="font-weight: bold; color: ${getScoreColor(match.score)}; font-size: 16px;">
              Score: ${match.score}/100
            </div>
          </div>

          ${match.bestDpe ? `
            <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #3b82f6;">
              <div style="font-weight: bold; margin-bottom: 6px; color: #1e40af; font-size: 13px;">
                🏠 Diagnostic DPE
              </div>

              <!-- Adresse de l'annonce (point sur la carte) -->
              ${match.annonce.rawData?.location ? `
                <div style="background: #dcfce7; padding: 6px 8px; border-radius: 4px; margin-bottom: 6px; border-left: 2px solid #22c55e;">
                  <div style="font-size: 10px; color: #15803d; font-weight: bold; margin-bottom: 2px;">
                    📌 Localisation Leboncoin (point sur carte):
                  </div>
                  <div style="font-size: 11px; color: #166534; font-weight: 500;">
                    ${match.annonce.rawData.location.city_label || match.annonce.rawData.location.city}${match.annonce.rawData.location.zipcode ? ', ' + match.annonce.rawData.location.zipcode : ''}
                  </div>
                  ${match.annonce.rawData.location.district ? `
                    <div style="font-size: 10px; color: #15803d; margin-top: 2px;">
                      Quartier: ${match.annonce.rawData.location.district}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Adresse du DPE (peut différer) -->
              <div style="background: #fef3c7; padding: 6px 8px; border-radius: 4px; margin-bottom: 6px; border-left: 2px solid #f59e0b;">
                <div style="font-size: 10px; color: #92400e; font-weight: bold; margin-bottom: 2px;">
                  📋 Adresse DPE ADEME:
                </div>
                <div style="font-size: 11px; color: #78350f;">
                  ${match.bestDpe.adresseBan || 'Non disponible'}
                </div>
                <div style="font-size: 10px; color: #92400e; margin-top: 2px;">
                  ${match.bestDpe.codePostalBan} • N° ${match.bestDpe.numeroDpe}
                </div>
              </div>

              ${match.bestDpe.anneConstruction ? `
                <div style="font-size: 11px; margin-bottom: 4px;">
                  <strong>🏗️ Année construction:</strong> ${match.bestDpe.anneConstruction}
                </div>
              ` : ''}

              ${match.bestDpe.surfaceHabitable ? `
                <div style="font-size: 11px; margin-bottom: 4px;">
                  <strong>📐 Surface:</strong> ${Math.round(match.bestDpe.surfaceHabitable)} m²
                </div>
              ` : ''}

              ${match.bestDpe.dateEtablissement ? `
                <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
                  📅 Diagnostic établi le ${new Date(match.bestDpe.dateEtablissement).toLocaleDateString('fr-FR')}
                </div>
              ` : ''}

              <!-- Étiquettes -->
              <div style="margin: 8px 0; display: flex; gap: 6px; flex-wrap: wrap;">
                <span style="background: ${getDPEColor(match.bestDpe.etiquetteDpe)}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">
                  DPE: ${match.bestDpe.etiquetteDpe}
                </span>
                <span style="background: ${getDPEColor(match.bestDpe.etiquetteGes)}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">
                  GES: ${match.bestDpe.etiquetteGes}
                </span>
              </div>

              <!-- Bouton déroulant pour détails -->
              <details style="margin-top: 8px;">
                <summary style="cursor: pointer; font-size: 11px; font-weight: bold; color: #1e40af; padding: 6px; background: #fff; border-radius: 4px; list-style: none; user-select: none;">
                  ▶ Voir les détails énergétiques
                </summary>

                <div style="margin-top: 6px;">
                  <!-- Consommations -->
                  ${match.bestDpe.consoParM2Ef || match.bestDpe.consoTotaleEf ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">⚡ CONSOMMATIONS ÉNERGÉTIQUES</div>

                      ${match.bestDpe.consoParM2Ef ? `
                        <div style="font-size: 11px; margin-bottom: 4px; padding: 4px; background: #eff6ff; border-radius: 3px;">
                          <strong>${Math.round(match.bestDpe.consoParM2Ef)} kWh/m²/an</strong>
                          <div style="font-size: 9px; color: #64748b;">Consommation totale au m²</div>
                        </div>
                      ` : ''}

                      ${match.bestDpe.consoChauffageEf && match.bestDpe.consoTotaleEf ? `
                        <div style="font-size: 9px; margin: 3px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span>🔥 Chauffage</span>
                            <span>${Math.round(match.bestDpe.consoChauffageEf)} kWh</span>
                          </div>
                          <div style="background: #e5e7eb; border-radius: 2px; height: 4px; overflow: hidden;">
                            <div style="background: #ef4444; height: 100%; width: ${Math.min(100, (match.bestDpe.consoChauffageEf / match.bestDpe.consoTotaleEf) * 100)}%;"></div>
                          </div>
                        </div>
                      ` : ''}

                      ${match.bestDpe.consoEcsEf && match.bestDpe.consoTotaleEf ? `
                        <div style="font-size: 9px; margin: 3px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span>💧 Eau chaude</span>
                            <span>${Math.round(match.bestDpe.consoEcsEf)} kWh</span>
                          </div>
                          <div style="background: #e5e7eb; border-radius: 2px; height: 4px; overflow: hidden;">
                            <div style="background: #3b82f6; height: 100%; width: ${Math.min(100, (match.bestDpe.consoEcsEf / match.bestDpe.consoTotaleEf) * 100)}%;"></div>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Coûts -->
                  ${match.bestDpe.coutTotal5Usages ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">💰 COÛTS ANNUELS</div>
                      <div style="font-size: 10px; margin-bottom: 2px;">
                        <strong>Total:</strong> ${Math.round(match.bestDpe.coutTotal5Usages)} €/an
                      </div>
                      ${match.bestDpe.coutChauffage ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Chauffage:</strong> ${Math.round(match.bestDpe.coutChauffage)} €/an
                        </div>
                      ` : ''}
                      ${match.bestDpe.coutEcs ? `
                        <div style="font-size: 10px;">
                          <strong>Eau chaude:</strong> ${Math.round(match.bestDpe.coutEcs)} €/an
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Émissions GES -->
                  ${match.bestDpe.emissionGes5Usages || match.bestDpe.emissionGesParM2 ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">🌍 ÉMISSIONS GES</div>

                      ${match.bestDpe.emissionGesParM2 ? `
                        <div style="font-size: 11px; margin-bottom: 4px; padding: 4px; background: #f0fdf4; border-radius: 3px;">
                          <strong>${Math.round(match.bestDpe.emissionGesParM2)} kg CO₂/m²/an</strong>
                          <div style="font-size: 9px; color: #64748b;">Émissions au m²</div>
                        </div>
                      ` : ''}

                      ${match.bestDpe.emissionGes5Usages ? `
                        <div style="font-size: 10px; margin-top: 3px;">
                          <strong>Total annuel:</strong> ${Math.round(match.bestDpe.emissionGes5Usages)} kg CO₂
                        </div>
                      ` : ''}

                      <div style="font-size: 8px; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb;">
                        💡 Équivalent à ${match.bestDpe.emissionGes5Usages ? Math.round(match.bestDpe.emissionGes5Usages / 120) : 'N/A'} km en voiture thermique
                      </div>
                    </div>
                  ` : ''}

                  <!-- Chauffage -->
                  ${match.bestDpe.typeEnergiePrincipaleChauffage ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">🔥 CHAUFFAGE</div>
                      <div style="font-size: 10px; margin-bottom: 2px;">
                        <strong>Énergie:</strong> ${match.bestDpe.typeEnergiePrincipaleChauffage}
                      </div>
                      ${match.bestDpe.typeInstallationChauffage ? `
                        <div style="font-size: 10px;">
                          <strong>Installation:</strong> ${match.bestDpe.typeInstallationChauffage}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- ECS -->
                  ${match.bestDpe.typeEnergiePrincipaleEcs ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">💧 EAU CHAUDE SANITAIRE</div>
                      <div style="font-size: 10px;">
                        <strong>Énergie:</strong> ${match.bestDpe.typeEnergiePrincipaleEcs}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Isolation -->
                  ${match.bestDpe.qualiteIsolationEnveloppe || match.bestDpe.qualiteIsolationMurs ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">🏗️ QUALITÉ D'ISOLATION</div>

                      ${match.bestDpe.qualiteIsolationEnveloppe ? `
                        <div style="font-size: 11px; margin-bottom: 4px; padding: 4px; background: ${
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase().includes('très bonne') || match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'excellente' ? '#dcfce7' :
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'bonne' ? '#dbeafe' :
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'moyenne' ? '#fef3c7' : '#fee2e2'
                        }; border-radius: 3px; border-left: 3px solid ${
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase().includes('très bonne') || match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'excellente' ? '#22c55e' :
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'bonne' ? '#3b82f6' :
                          match.bestDpe.qualiteIsolationEnveloppe.toLowerCase() === 'moyenne' ? '#f59e0b' : '#ef4444'
                        };">
                          <strong>Global:</strong> ${match.bestDpe.qualiteIsolationEnveloppe}
                        </div>
                      ` : ''}

                      ${match.bestDpe.qualiteIsolationMurs ? `
                        <div style="font-size: 9px; margin: 2px 0;">
                          🧱 Murs: <strong>${match.bestDpe.qualiteIsolationMurs}</strong>
                        </div>
                      ` : ''}
                      ${match.bestDpe.qualiteIsolationMenuiseries ? `
                        <div style="font-size: 9px; margin: 2px 0;">
                          🪟 Fenêtres: <strong>${match.bestDpe.qualiteIsolationMenuiseries}</strong>
                        </div>
                      ` : ''}
                      ${match.bestDpe.qualiteIsolationPlancherBas ? `
                        <div style="font-size: 9px; margin: 2px 0;">
                          ⬇️ Plancher bas: <strong>${match.bestDpe.qualiteIsolationPlancherBas}</strong>
                        </div>
                      ` : ''}
                      ${match.bestDpe.qualiteIsolationComblePerdu ? `
                        <div style="font-size: 9px; margin: 2px 0;">
                          ⬆️ Combles: <strong>${match.bestDpe.qualiteIsolationComblePerdu}</strong>
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Ventilation -->
                  ${match.bestDpe.typeVentilation ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">🌬️ VENTILATION</div>
                      <div style="font-size: 10px;">
                        ${match.bestDpe.typeVentilation}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Confort été -->
                  ${match.bestDpe.indicateurConfortEte ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">☀️ CONFORT ÉTÉ</div>
                      <div style="font-size: 10px;">
                        <span style="padding: 2px 6px; border-radius: 3px; background: ${
                          match.bestDpe.indicateurConfortEte.toLowerCase() === 'insuffisant' ? '#fee2e2' :
                          match.bestDpe.indicateurConfortEte.toLowerCase() === 'moyen' ? '#fef3c7' : '#dcfce7'
                        }; color: ${
                          match.bestDpe.indicateurConfortEte.toLowerCase() === 'insuffisant' ? '#991b1b' :
                          match.bestDpe.indicateurConfortEte.toLowerCase() === 'moyen' ? '#92400e' : '#166534'
                        };">
                          ${match.bestDpe.indicateurConfortEte}
                        </span>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Structure du logement -->
                  ${match.bestDpe.periodeConstruction || match.bestDpe.hauteurSousPlafond || match.bestDpe.nombreNiveauLogement !== undefined || match.bestDpe.numeroEtageAppartement !== undefined || match.bestDpe.logementTraversant !== undefined || match.bestDpe.classeInertieBatiment ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">🏛️ STRUCTURE DU LOGEMENT</div>
                      ${match.bestDpe.periodeConstruction ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Période construction:</strong> ${match.bestDpe.periodeConstruction}
                        </div>
                      ` : ''}
                      ${match.bestDpe.hauteurSousPlafond ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Hauteur sous plafond:</strong> ${match.bestDpe.hauteurSousPlafond} m
                        </div>
                      ` : ''}
                      ${match.bestDpe.nombreNiveauLogement !== undefined && match.bestDpe.nombreNiveauLogement !== null ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Nombre d'étages:</strong> ${match.bestDpe.nombreNiveauLogement}
                        </div>
                      ` : ''}
                      ${match.bestDpe.numeroEtageAppartement !== undefined && match.bestDpe.numeroEtageAppartement !== null ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Étage:</strong> ${match.bestDpe.numeroEtageAppartement === 0 ? 'Rez-de-chaussée' : match.bestDpe.numeroEtageAppartement}
                        </div>
                      ` : ''}
                      ${match.bestDpe.logementTraversant !== undefined && match.bestDpe.logementTraversant !== null ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <strong>Logement traversant:</strong> ${match.bestDpe.logementTraversant === 1 ? 'Oui' : 'Non'}
                        </div>
                      ` : ''}
                      ${match.bestDpe.classeInertieBatiment ? `
                        <div style="font-size: 10px;">
                          <strong>Inertie thermique:</strong> ${match.bestDpe.classeInertieBatiment}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Confort été -->
                  ${match.bestDpe.indicateurConfortEte ? `
                    <div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
                      <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 3px;">☀️ CONFORT ÉTÉ</div>
                      <div style="font-size: 10px;">
                        ${match.bestDpe.indicateurConfortEte}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </details>
            </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid #f59e0b;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #92400e; font-size: 12px;">
              📋 Annonce Leboncoin
            </div>
            <div style="font-size: 12px; margin-bottom: 3px;">
              <strong>Type:</strong> ${match.annonce.typeBien}
            </div>
            <div style="font-size: 12px; margin-bottom: 3px;">
              <strong>Code postal:</strong> ${match.annonce.codePostal}
            </div>
            ${match.annonce.surface ? `
              <div style="font-size: 12px; margin-bottom: 3px;">
                <strong>Surface:</strong> ${match.annonce.surface} m²
              </div>
            ` : ''}
            ${match.annonce.pieces ? `
              <div style="font-size: 12px; margin-bottom: 3px;">
                <strong>Pièces:</strong> ${match.annonce.pieces}
              </div>
            ` : ''}
            ${match.annonce.datePublication ? `
              <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">
                <strong>📅 Publié le:</strong> ${new Date(match.annonce.datePublication).toLocaleDateString('fr-FR')}
              </div>
            ` : ''}
            ${match.annonce.mandateType ? `
              <div style="font-size: 11px; margin-top: 6px;">
                <span style="background: ${match.annonce.mandateType === 'exclusive' ? '#10b981' : '#6b7280'}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold;">
                  ${match.annonce.mandateType === 'exclusive' ? '⭐ Mandat exclusif' : '📝 Mandat simple'}
                </span>
              </div>
            ` : ''}
          </div>

          <a
            href="${match.annonce.url}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: inline-block;
              padding: 10px 16px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 12px;
              text-align: center;
              width: 100%;
              box-sizing: border-box;
            "
            onmouseover="this.style.background='#1d4ed8'"
            onmouseout="this.style.background='#2563eb'"
          >
            🔗 Voir l'annonce sur Leboncoin
          </a>
        </div>
      `);
      */

      // Événement click : ouvrir le panneau latéral
      marker.on('click', () => {
        setSelectedMatch(match);
        setIsPanelOpen(true);
      });

      markersLayerRef.current!.addLayer(marker);
    });

    console.log(`✓ ${filtered.length} matchs affichés sur la carte`);
  }, [filteredMatches, filterCriteria, activeZones]);

  // Afficher les annonces sans DPE (marqueurs jaunes)
  useEffect(() => {
    if (!mapInstanceRef.current || !yellowMarkersLayerRef.current) return;
    if (!showAnnoncesWithoutDpe) {
      yellowMarkersLayerRef.current.clearLayers();
      return;
    }

    yellowMarkersLayerRef.current.clearLayers();

    let displayedCount = 0;
    filteredAnnoncesWithoutDpe.forEach((annonce: any) => {
      // Obtenir les coordonnées améliorées (utilise le quartier si disponible)
      const coords = getFinalCoordinates(annonce.rawData?.location);

      if (!coords) return;

      const [lat, lng] = coords;

      // Filtre par zones de recherche
      if (!matchesAnyZone(lat, lng, activeZones)) {
        return;
      }

      // Déterminer si c'est un particulier ou un pro via rawData.owner.type
      // Note: Le type de mandat (exclusif/simple) n'est PAS disponible dans les données Leboncoin
      const ownerType = annonce.rawData?.owner?.type;
      const isParticulier = !ownerType || ownerType !== 'pro'; // Pas de owner ou owner != pro = particulier

      // Déterminer le type de bien via rawData
      const realEstateTypeAttr = annonce.rawData?.attributes?.find((attr: any) => attr.key === 'real_estate_type');
      const typeBienLabel = realEstateTypeAttr?.value_label || annonce.typeBien || '';
      const typeBienLower = typeBienLabel.toLowerCase();

      // === FILTRES VIA FILTERPANEL ===

      // Filtre par type de bien (via FilterPanel)
      if (filterCriteria.typeBien.length > 0) {
        // Déterminer le type de bien à partir de rawData
        const agencyName = annonce.rawData?.owner?.name?.toUpperCase() || '';
        const body = annonce.rawData?.body?.toLowerCase() || '';
        let typeBienCategory = 'Autre';

        // Vérifier si c'est un programme (avec espace, point, virgule ou retour à la ligne après)
        const isProgramme = body.includes('programme ') || body.includes('programme.') || body.includes('programme,') || body.includes('programme\n') || body.includes('programme immobilier');
        const isTerrain = typeBienLower.includes('terrain');
        const subjectLower = annonce.rawData?.subject?.toLowerCase() || '';

        // Immeuble : vérifier le subject en priorité
        if (subjectLower.includes('immeuble')) {
          typeBienCategory = 'Immeuble';
        } else if (((typeBienLower.includes('maison') || typeBienLower.includes('villa')) && agencyName.includes('CONSTRUCTEURS')) ||
            (isProgramme && !isTerrain)) {
          // Programme Neuf : maisons du constructeur OU annonces (SAUF TERRAINS) contenant "programme" dans le body
          typeBienCategory = 'Programme Neuf';
        } else if (typeBienLower.includes('terrain')) {
          typeBienCategory = 'Terrain';
        } else if (typeBienLower.includes('maison') || typeBienLower.includes('villa')) {
          typeBienCategory = 'Maison';
        } else if (typeBienLower.includes('appartement')) {
          typeBienCategory = 'Appartement';
        } else if (typeBienLower.includes('parking')) {
          typeBienCategory = 'Parking';
        }

        if (!filterCriteria.typeBien.includes(typeBienCategory)) {
          return;
        }
      }

      // Filtre par type de mandat (via FilterPanel)
      if (filterCriteria.typeMandat.length > 0) {
        const mandateType = annonce.mandateType;

        // Calculer l'âge de l'annonce pour distinguer exclusif récent vs ancien
        const datePublication = annonce.datePublication ? new Date(annonce.datePublication) : null;
        const now = new Date();
        const ageInDays = datePublication ? Math.floor((now.getTime() - datePublication.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        let mandateCategory: string;
        if (!mandateType) {
          mandateCategory = 'particulier';
        } else if (mandateType === 'exclusive') {
          mandateCategory = ageInDays > 90 ? 'old_exclusive' : 'exclusive';
        } else {
          mandateCategory = 'simple';
        }

        if (!filterCriteria.typeMandat.includes(mandateCategory)) {
          return;
        }
      }

      // Filtre AMEPI: masquer les mandats exclusifs des agences AMEPI (non interagence)
      if (filterCriteria.excludeAmepiExclusive) {
        const agencyName = annonce.rawData?.owner?.name;
        if (isAmepiExclusiveMandate(agencyName, annonce.mandateType)) {
          return;
        }
      }

      // Calculer l'ancienneté de l'annonce
      const datePublication = annonce.datePublication ? new Date(annonce.datePublication) : null;
      const now = new Date();
      const ageInDays = datePublication ? Math.floor((now.getTime() - datePublication.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Déterminer le type de mandat (4 types)
      const mandateType = annonce.mandateType;
      const isParticulierYellow = !mandateType; // Non renseigné = particulier
      const isOldExclusiveYellow = mandateType === 'exclusive' && ageInDays > 90; // >3 mois
      const isRecentExclusiveYellow = mandateType === 'exclusive' && ageInDays <= 90;
      const isSimpleYellow = mandateType === 'simple';

      // Déterminer l'icône en fonction du type de bien (passer rawData pour meilleure détection)
      const propertyIcon = getPropertyIcon(annonce.typeBien || '', annonce.rawData);

      // Vérifier si c'est un mandat exclusif AMEPI (non interagence)
      const agencyNameYellow = annonce.rawData?.owner?.name;
      const isAmepiExclusiveYellow = isAmepiExclusiveMandate(agencyNameYellow, annonce.mandateType);

      // Déterminer le style du marqueur JAUNE (5 types: particulier, simple, exclusif récent, exclusif ancien, AMEPI)
      let markerHTML, markerSize, markerAnchor;

      if (isAmepiExclusiveYellow) {
        // 🟣 AMEPI EXCLUSIF: Mandat exclusif non interagence - Octogone violet (version jaune)
        markerHTML = `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 38px;
              height: 38px;
              background: linear-gradient(135deg, #c084fc 0%, #a855f7 100%);
              clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
              box-shadow: 0 0 15px rgba(192, 132, 252, 0.6), 0 4px 8px rgba(168, 85, 247, 0.4);
              border: 2px solid #f3e8ff;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 15px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
          </div>
        `;
        markerSize = [38, 38];
        markerAnchor = [19, 19];
      } else if (isParticulierYellow) {
        // 💎 PARTICULIER: Vente directe sans agence - Losange jaune
        markerHTML = `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              transform: rotate(45deg);
              border-radius: 4px;
              box-shadow: 0 0 12px rgba(251, 191, 36, 0.5), 0 3px 6px rgba(245, 158, 11, 0.3);
              border: 2px solid white;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 15px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
          </div>
        `;
        markerSize = [36, 36];
        markerAnchor = [18, 18];
      } else if (isOldExclusiveYellow) {
        // ⭐ OPPORTUNITÉ: Mandat exclusif >3 mois - Étoile jaune avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
              box-shadow: 0 0 15px rgba(251, 191, 36, 0.6), 0 4px 8px rgba(251, 191, 36, 0.4);
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 16px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.1); filter: brightness(1.15); }
            }
          </style>
        `;
        markerSize = [40, 40];
        markerAnchor = [20, 20];
      } else if (isRecentExclusiveYellow) {
        // 🔴 Mandat exclusif récent - Hexagone jaune avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 35px;
            height: 35px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 35px;
              height: 35px;
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
              box-shadow: 0 0 10px rgba(251, 191, 36, 0.4), 0 3px 6px rgba(245, 158, 11, 0.3);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 14px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
          </div>
        `;
        markerSize = [35, 35];
        markerAnchor = [17.5, 17.5];
      } else {
        // 🟢 Mandat simple - Cercle jaune avec icône centrée
        markerHTML = `
          <div style="
            position: relative;
            width: 30px;
            height: 30px;
          ">
            <div style="
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(251, 191, 36, 0.3);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 13px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">${propertyIcon}</div>
          </div>
        `;
        markerSize = [30, 30];
        markerAnchor = [15, 15];
      }

      const yellowIcon = L.divIcon({
        className: 'custom-yellow-marker',
        html: markerHTML,
        iconSize: markerSize,
        iconAnchor: markerAnchor,
      });

      const marker = L.marker([lat, lng], { icon: yellowIcon });

      // Créer un objet match-like pour les annonces sans DPE
      const matchLikeObject: ClusterMatch = {
        id: `sans-dpe-${annonce.id}`,
        score: 0, // Pas de score pour les annonces sans DPE
        trackingStatut: undefined,
        annonce: {
          id: annonce.id,
          url: annonce.url,
          codePostal: annonce.codePostal,
          typeBien: annonce.typeBien,
          surface: annonce.surface,
          pieces: annonce.pieces,
          etiquetteDpe: annonce.etiquetteDpe,
          lat: lat,
          lng: lng,
          datePublication: annonce.datePublication,
          mandateType: annonce.mandateType,
          rawData: annonce.rawData,
          prix: annonce.prix,
          chambres: annonce.chambres,
          etatBien: annonce.etatBien,
          avecBalcon: annonce.avecBalcon,
          avecTerrasse: annonce.avecTerrasse,
          avecGarage: annonce.avecGarage,
          avecParkingPrive: annonce.avecParkingPrive,
          surfaceTerrain: annonce.surfaceTerrain,
        },
        bestDpe: undefined, // Pas de DPE pour ces annonces
      };

      // Événement click : ouvrir le panneau latéral
      marker.on('click', () => {
        setSelectedMatch(matchLikeObject);
        setIsPanelOpen(true);
      });

      yellowMarkersLayerRef.current!.addLayer(marker);
      displayedCount++;
    });

    console.log(`🟡 ${displayedCount} annonces sans DPE affichées (${filteredAnnoncesWithoutDpe.length} après filtrage)`);
  }, [filteredAnnoncesWithoutDpe, showAnnoncesWithoutDpe, filterCriteria, activeZones]);

  // Affichage des DPE sur la carte
  useEffect(() => {
    console.log('🟢 useEffect DPE triggered', {
      showAllDpes,
      allDpesCount: allDpes.length,
      filterCriteria
    });

    if (!mapInstanceRef.current) return;

    // 🟢 Créer les marqueurs pour tous les DPE si activés
    if (showAllDpes && allDpes.length > 0) {
      if (!dpeMarkersLayerRef.current) {
        dpeMarkersLayerRef.current = L.markerClusterGroup({
          maxClusterRadius: 80,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(40, 40),
            });
          },
        });
      } else {
        dpeMarkersLayerRef.current.clearLayers();
      }

      // Utiliser les DPE filtrés par le useMemo au lieu de refiltrer ici
      console.log('🟢 DPE affichage sur carte:', {
        total: allDpes.length,
        filtered: filteredDpes.length
      });

      filteredDpes.forEach((dpe) => {
        if (!dpe.coordonneeX || !dpe.coordonneeY) return;

        // Convertir Lambert93 vers WGS84
        const [lat, lng] = lambert93ToWGS84(dpe.coordonneeX, dpe.coordonneeY);

        // Créer le marqueur DPE (simple point vert)
        const dpeIcon = L.divIcon({
          html: `
            <div style="
              position: relative;
              width: 20px;
              height: 20px;
            ">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 20px;
                height: 20px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 10px;
                font-weight: bold;
              ">${dpe.etiquetteDpe || '?'}</div>
            </div>
          `,
          className: 'custom-dpe-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([lat, lng], { icon: dpeIcon });

        // Popup avec infos DPE
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">
              DPE ${dpe.etiquetteDpe || '?'}
            </div>
            <div style="font-size: 13px; color: #6b7280;">
              <div><strong>Adresse:</strong> ${dpe.adresseBan || 'N/A'}</div>
              <div><strong>Code postal:</strong> ${dpe.codePostalBan || 'N/A'}</div>
              <div><strong>Type:</strong> ${dpe.typeBatiment || 'N/A'}</div>
              <div><strong>Surface:</strong> ${dpe.surfaceHabitable || 'N/A'} m²</div>
              <div><strong>Année:</strong> ${dpe.anneConstruction || 'N/A'}</div>
              <div><strong>GES:</strong> ${dpe.etiquetteGes || 'N/A'}</div>
            </div>
          </div>
        `);

        // Click handler to open detail panel
        marker.on('click', () => {
          setSelectedDpe(dpe);
          setIsDpePanelOpen(true);
        });

        if (dpeMarkersLayerRef.current) {
          dpeMarkersLayerRef.current.addLayer(marker);
        }
      });

      if (mapInstanceRef.current && dpeMarkersLayerRef.current) {
        mapInstanceRef.current.addLayer(dpeMarkersLayerRef.current);
      }
    } else if (dpeMarkersLayerRef.current && mapInstanceRef.current) {
      // Retirer les marqueurs DPE si désactivés
      mapInstanceRef.current.removeLayer(dpeMarkersLayerRef.current);
    }
  }, [filteredDpes, showAllDpes]);

  // Affichage des parcelles cadastrales
  useEffect(() => {
    console.log('🗺️ useEffect cadastre triggered, parcelles:', cadastreParcelles.length);

    if (!mapInstanceRef.current) {
      console.log('⚠️ Pas de map instance');
      return;
    }

    // Supprimer l'ancien layer cadastre
    if (cadastreLayerRef.current) {
      console.log('🗑️ Suppression ancien layer cadastre');
      mapInstanceRef.current.removeLayer(cadastreLayerRef.current);
      cadastreLayerRef.current = null;
    }

    // Si pas de parcelles, ne rien afficher
    if (cadastreParcelles.length === 0) {
      console.log('⚠️ Aucune parcelle à afficher');
      return;
    }

    // Créer le GeoJSON des parcelles
    const geojsonFeatures = cadastreParcelles
      .filter(p => p.geometry)
      .map(parcelle => ({
        type: 'Feature',
        properties: {
          id: parcelle.id,
          section: parcelle.section,
          numero: parcelle.numero,
          contenance: parcelle.contenance,
          nomCommune: parcelle.nomCommune,
        },
        geometry: parcelle.geometry,
      }));

    console.log('📦 Features à afficher:', geojsonFeatures.length);
    console.log('🔍 Première feature:', geojsonFeatures[0]);

    // Créer le layer GeoJSON
    const geoJsonLayer = L.geoJSON(geojsonFeatures as any, {
      style: () => ({
        fillColor: '#9ca3af',
        fillOpacity: 0.2,
        color: '#6b7280',
        weight: 2,
        opacity: 0.6,
      }),
      onEachFeature: (feature: any, layer: any) => {
        // Hover effect
        layer.on({
          mouseover: (e: any) => {
            const layer = e.target;
            layer.setStyle({
              fillColor: '#10b981',
              fillOpacity: 0.4,
              color: '#059669',
              weight: 3,
              opacity: 1,
            });

            // Tooltip
            const { section, numero, contenance, nomCommune } = feature.properties;
            layer.bindTooltip(
              `<div class="text-sm">
                <div class="font-bold">${nomCommune || ''} - Section ${section} N°${numero}</div>
                <div>Surface: ${contenance}m²</div>
              </div>`,
              { sticky: true }
            ).openTooltip();
          },
          mouseout: (e: any) => {
            const layer = e.target;
            layer.setStyle({
              fillColor: '#9ca3af',
              fillOpacity: 0.2,
              color: '#6b7280',
              weight: 2,
              opacity: 0.6,
            });
            layer.closeTooltip();
          },
        });
      },
    });

    // Ajouter le layer à la carte
    geoJsonLayer.addTo(mapInstanceRef.current);
    cadastreLayerRef.current = geoJsonLayer;

    console.log(`🗺️  ${cadastreParcelles.length} parcelles cadastrales affichées`);
  }, [cadastreParcelles]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      console.log('📥 Chargement des clusters/matchs...');

      // Charger les clusters avec DPE
      const response = await fetch('http://localhost:3001/api/matching/clusters-with-dpe?limit=10000');
      const data = await response.json();
      console.log('📦 Données brutes reçues:', data.data.items.length, 'clusters');

      // Charger les annonces sans DPE
      const responseWithoutDpe = await fetch('http://localhost:3001/api/annonces/without-dpe?limit=5000');
      const dataWithoutDpe = await responseWithoutDpe.json();
      console.log('📦 Annonces sans DPE:', dataWithoutDpe.data.items.length, 'annonces');
      setAnnoncesWithoutDpe(dataWithoutDpe.data.items || []);

      // Charger tous les DPE pour la carte
      let dpeUrl = 'http://localhost:3001/api/dpes/map?limit=50000';

      // Ajouter le filtre de date si nécessaire
      if (dpeDateFilter !== 'all') {
        const year = parseInt(dpeDateFilter);
        const dateMin = new Date(year, 0, 1).toISOString();
        const dateMax = new Date(year, 11, 31, 23, 59, 59).toISOString();
        dpeUrl += `&dateMin=${dateMin}&dateMax=${dateMax}`;
      }

      const responseDpes = await fetch(dpeUrl);
      const dataDpes = await responseDpes.json();
      console.log('📦 DPE records:', dataDpes.data.length, 'dpe');
      setAllDpes(dataDpes.data || []);

      const clusters = (data.data.items || []).map((cluster: any) => {
        // Utiliser les coordonnées de l'annonce (WGS84) car les coordonnées DPE sont en Lambert93
        const lat = cluster.annonce.rawData?.location?.lat || cluster.annonce.lat;
        const lng = cluster.annonce.rawData?.location?.lng || cluster.annonce.lng;

        // Extraire le type de mandat depuis les attributs
        const attributes = cluster.annonce.rawData?.attributes || [];
        const mandateAttr = attributes.find((attr: any) => attr.key === 'mandate_type');
        const mandateType = mandateAttr?.value;

        return {
          id: cluster.id,
          score: cluster.score || cluster.meilleurScore,
          trackingStatut: cluster.trackingStatut || null,
          annonce: {
            id: cluster.annonce.id,
            url: cluster.annonce.url,
            codePostal: cluster.annonce.codePostal,
            typeBien: cluster.annonce.typeBien,
            surface: cluster.annonce.surface,
            pieces: cluster.annonce.pieces,
            etiquetteDpe: cluster.annonce.etiquetteDpe,
            lat: lat,
            lng: lng,
            datePublication: cluster.annonce.datePublication,
            mandateType: mandateType,
            rawData: cluster.annonce.rawData, // ⭐ IMPORTANT: Passer le rawData avec les images
            // Nouveaux champs extraits
            prix: cluster.annonce.prix,
            chambres: cluster.annonce.chambres,
            etatBien: cluster.annonce.etatBien,
            avecBalcon: cluster.annonce.avecBalcon,
            avecTerrasse: cluster.annonce.avecTerrasse,
            avecGarage: cluster.annonce.avecGarage,
            avecParkingPrive: cluster.annonce.avecParkingPrive,
            surfaceTerrain: cluster.annonce.surfaceTerrain,
          },
          bestDpe: cluster.bestDpe,
        };
      });

      const withGPS = clusters.filter((c: ClusterMatch) =>
        (c.bestDpe?.coordonneeX && c.bestDpe?.coordonneeY) || (c.annonce.lat && c.annonce.lng)
      );
      const avgScore = clusters.length > 0
        ? clusters.reduce((sum: number, c: ClusterMatch) => sum + c.score, 0) / clusters.length
        : 0;

      setMatches(clusters);
      setStats({
        totalMatches: clusters.length,
        avgScore: Math.round(avgScore),
        withGPS: withGPS.length,
      });

      // Compter les statuts
      const statutCounts = clusters.reduce((acc: any, c: ClusterMatch) => {
        const statut = c.trackingStatut || 'none';
        acc[statut] = (acc[statut] || 0) + 1;
        return acc;
      }, {});
      console.log(`✓ ${clusters.length} matchs chargés (${withGPS.length} avec GPS)`);
      console.log('📊 Statuts de tracking:', statutCounts);

    } catch (error) {
      console.error('❌ Erreur chargement matchs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recharger les DPE quand le filtre de date change
  useEffect(() => {
    if (showAllDpes) {
      fetchMapData();
    }
  }, [dpeDateFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl mb-4">🗺️</div>
          <div className="text-lg">Chargement des matchs...</div>
        </div>
      </div>
    );
  }

  const withGPS = filteredMatches.filter((m) =>
    (m.bestDpe?.coordonneeX && m.bestDpe?.coordonneeY) || (m.annonce.lat && m.annonce.lng)
  ).length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header avec logo et navigation */}
      <Header title="Carte Interactive" showBackButton={true} />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Filtres */}
        <div className="bg-white shadow-md p-4 z-10">
        <div className="max-w-7xl mx-auto">

          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total matchs</div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalMatches}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-600">Avec coordonnées GPS</div>
                <div className="text-2xl font-bold text-blue-600">{withGPS} / {filteredMatches.length}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-sm text-gray-600">Score moyen</div>
                <div className="text-2xl font-bold text-orange-600">{stats.avgScore}/100</div>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2">
              <span className="font-medium">Score minimum:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-48"
              />
              <span className="font-bold text-lg">{minScore}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAnnoncesWithoutDpe}
                onChange={(e) => setShowAnnoncesWithoutDpe(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-medium">🟡 Afficher annonces sans DPE ({annoncesWithoutDpe.length})</span>
            </label>

            {/* Toggle pour afficher/masquer les DPE */}
            <button
              onClick={() => setShowAllDpes(!showAllDpes)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                showAllDpes
                  ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={showAllDpes ? 'Masquer tous les DPE' : 'Afficher tous les DPE'}
            >
              <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', fontWeight: 'bold' }}>
                D
              </div>
              <span className="text-sm font-medium">
                Tous les DPE ({allDpes.length})
              </span>
            </button>

              {/* Filtre de date pour les DPE */}
              {showAllDpes && (
                <div className="mt-2 ml-8">
                  <div className="text-xs font-medium text-gray-600 mb-1">Filtrer par année :</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDpeDateFilter('all')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        dpeDateFilter === 'all'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setDpeDateFilter('2025')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        dpeDateFilter === '2025'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      2025
                    </button>
                    <button
                      onClick={() => setDpeDateFilter('2024')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        dpeDateFilter === '2024'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      2024
                    </button>
                    <button
                      onClick={() => setDpeDateFilter('2023')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        dpeDateFilter === '2023'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      2023
                    </button>
                    <button
                      onClick={() => setDpeDateFilter('2022')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        dpeDateFilter === '2022'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      2022
                    </button>
                  </div>
                </div>
              )}

            <button
              onClick={() => setIsZoneManagerOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              🎯 Zones de recherche
              {activeZones.length > 0 && (
                <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {activeZones.length}
                </span>
              )}
            </button>

            <div className="text-sm text-gray-600">
              ({withGPS} matchs affichés sur {filteredMatches.length})
            </div>
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="flex-1 relative" style={{ minHeight: '600px' }}>
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
          }}
        />

        {/* Panneau de filtres acquéreur */}
        <FilterPanel
          onFilterChange={setFilterCriteria}
          resultCount={filteredMatches.length + (showAnnoncesWithoutDpe ? filteredAnnoncesWithoutDpe.length : 0) + (showAllDpes ? filteredDpes.length : 0)}
          onOpenZoneManager={() => setIsZoneManagerOpen(true)}
        />
      </div>

      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white shadow-xl rounded-xl p-4 z-[1000] border border-gray-200">
        <div className="text-sm font-bold mb-3 text-gray-800">Légende</div>

        {/* Section Type de Mandat */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">Type de mandat</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="relative flex-shrink-0"
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  transform: 'rotate(45deg)',
                  borderRadius: '3px',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
                  border: '2px solid white'
                }}
              />
              <span className="text-xs text-gray-700">💎 Particuliers</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="relative flex-shrink-0"
                style={{
                  width: '26px',
                  height: '26px',
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  boxShadow: '0 0 8px rgba(251, 146, 60, 0.4)'
                }}
              />
              <span className="text-xs text-gray-700">⭐ Exclusif &gt;3 mois</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="relative flex-shrink-0"
                style={{
                  width: '22px',
                  height: '22px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                  boxShadow: '0 0 6px rgba(239, 68, 68, 0.3)'
                }}
              />
              <span className="text-xs text-gray-700">🔴 Exclusif récent</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                }}
              />
              <span className="text-xs text-gray-700">🟢 Mandat simple</span>
            </div>
          </div>
        </div>

        {/* Section Type de Bien */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-600 mb-2">Type de bien</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs">
                🏠
              </div>
              <span className="text-xs text-gray-700">Maison</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs">
                🏢
              </div>
              <span className="text-xs text-gray-700">Appartement</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Cliquez sur un marqueur pour voir les détails
        </div>
      </div>

      {/* Panneau latéral de détails */}
      <AnnonceDetailPanelNew
        match={selectedMatch}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setCadastreParcelles([]); // Effacer les parcelles quand on ferme le panneau
        }}
        onDataUpdated={fetchMapData} // Recharger les données après envoi à Monday
        onCadastreDataLoaded={setCadastreParcelles} // Callback pour afficher les parcelles sur la carte
      />

      {/* Zone Manager Modal */}
      <ZoneManager
        isOpen={isZoneManagerOpen}
        onClose={() => setIsZoneManagerOpen(false)}
        onZoneChange={async () => {
          // Recharger les zones actives
          const response = await fetch('http://localhost:3001/api/zones/active');
          const zones = await response.json();
          setActiveZones(zones);
        }}
        onStartDrawing={startDrawingMode}
      />

      {/* DPE Detail Panel */}
      {isDpePanelOpen && selectedDpe && (
        <DpeDetailPanel
          dpe={selectedDpe}
          onClose={() => {
            setIsDpePanelOpen(false);
            setSelectedDpe(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
