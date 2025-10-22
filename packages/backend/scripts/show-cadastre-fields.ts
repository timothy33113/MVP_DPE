/**
 * Script pour afficher toutes les variables disponibles dans l'API Cadastre
 */

import axios from 'axios';

async function main() {
  console.log('🔍 Variables disponibles dans l\'API Cadastre (Apicarto IGN)\n');

  // Exemple d'adresse pour tester
  const lat = 43.273251;
  const lon = -0.218912;

  // Créer un buffer de 15m
  const deltaLat = 15 / 111000;
  const deltaLon = 15 / (111000 * Math.cos(lat * Math.PI / 180));
  const numPoints = 16;
  const coordinates: number[][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const x = lon + deltaLon * Math.cos(angle);
    const y = lat + deltaLat * Math.sin(angle);
    coordinates.push([x, y]);
  }

  const geometry = {
    type: 'Polygon',
    coordinates: [coordinates]
  };

  try {
    const response = await axios.post(
      'https://apicarto.ign.fr/api/cadastre/parcelle',
      {
        geom: geometry
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const parcelles = response.data.features;

    if (parcelles.length > 0) {
      console.log(`✅ ${parcelles.length} parcelle(s) trouvée(s)\n`);

      const parcelle = parcelles[0];

      console.log('📋 STRUCTURE COMPLÈTE D\'UNE PARCELLE:\n');
      console.log(JSON.stringify(parcelle, null, 2));

      console.log('\n\n📊 PROPRIÉTÉS DISPONIBLES (properties):\n');

      const props = parcelle.properties;
      Object.keys(props).sort().forEach(key => {
        const value = props[key];
        const type = typeof value;
        console.log(`   ${key.padEnd(25)} : ${value} (${type})`);
      });

      console.log('\n\n🗺️  GÉOMÉTRIE:\n');
      console.log(`   Type: ${parcelle.geometry.type}`);
      console.log(`   Nombre de coordonnées: ${parcelle.geometry.coordinates[0].length}`);

    } else {
      console.log('❌ Aucune parcelle trouvée');
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

main();
