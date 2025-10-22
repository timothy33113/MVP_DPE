import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import { PathOptions } from 'leaflet';

interface CadastreParcel {
  id: string;
  section: string;
  numero: string;
  contenance: number;
  nomCommune?: string;
  geometry?: {
    type: string;
    coordinates: any;
  };
}

interface CadastreLayerProps {
  parcelles: CadastreParcel[];
}

export function CadastreLayer({ parcelles }: CadastreLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!parcelles || parcelles.length === 0) {
    return null;
  }

  // Convertir les parcelles en GeoJSON
  const geojsonData = {
    type: 'FeatureCollection',
    features: parcelles
      .filter(p => p.geometry) // Filtrer uniquement celles avec géométrie
      .map(parcelle => ({
        type: 'Feature',
        id: parcelle.id,
        properties: {
          id: parcelle.id,
          section: parcelle.section,
          numero: parcelle.numero,
          contenance: parcelle.contenance,
          nomCommune: parcelle.nomCommune,
        },
        geometry: parcelle.geometry,
      })),
  };

  // Style par défaut (gris)
  const defaultStyle: PathOptions = {
    fillColor: '#9ca3af',
    fillOpacity: 0.2,
    color: '#6b7280',
    weight: 2,
    opacity: 0.6,
  };

  // Style au survol (vert fluo)
  const hoverStyle: PathOptions = {
    fillColor: '#10b981',
    fillOpacity: 0.4,
    color: '#059669',
    weight: 3,
    opacity: 1,
  };

  // Fonction pour obtenir le style d'une parcelle
  const getStyle = (feature: any): PathOptions => {
    const isHovered = hoveredId === feature.properties.id;
    return isHovered ? hoverStyle : defaultStyle;
  };

  // Ajouter les event handlers sur chaque feature
  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: () => {
        setHoveredId(feature.properties.id);

        // Afficher un popup avec les infos de la parcelle
        const { section, numero, contenance, nomCommune } = feature.properties;
        layer.bindTooltip(
          `
          <div class="text-sm">
            <div class="font-bold">${nomCommune || ''} - Section ${section} N°${numero}</div>
            <div>Surface: ${contenance}m²</div>
          </div>
          `,
          { sticky: true }
        ).openTooltip();
      },
      mouseout: () => {
        setHoveredId(null);
        layer.closeTooltip();
      },
    });
  };

  return (
    <GeoJSON
      key={JSON.stringify(parcelles.map(p => p.id))} // Force re-render si parcelles changent
      data={geojsonData as any}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}
