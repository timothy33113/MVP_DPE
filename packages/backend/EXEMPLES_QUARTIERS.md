# Exemples d'utilisation - Système de Quartiers

## Cas d'usage réels

### 1. Annonce Leboncoin mentionnant un quartier

**Scénario:** Une annonce dit "Appartement 2 pièces, centre ville de Pau"

```typescript
import { searchQuartierByName } from '@utils/quartiers';

// Extraire "centre ville" du texte
const description = "Appartement 2 pièces, centre ville de Pau";
const quartier = searchQuartierByName('centre ville', 'pau');

console.log(quartier);
// {
//   name: 'Centre-Ville',
//   ville: 'Pau',
//   center: [-0.3685, 43.299],
//   codePostal: ['64000']
// }

// Utiliser les coordonnées du centre pour le matching
const enrichedAnnonce = {
  ...annonce,
  quartier: quartier.name,
  lat: quartier.center[1],
  lng: quartier.center[0],
};
```

### 2. DPE avec coordonnées GPS → Déterminer le quartier

**Scénario:** Un DPE a des coordonnées GPS, on veut savoir dans quel quartier il se trouve

```typescript
import { findQuartier } from '@utils/quartiers';

const dpe = {
  coordonneeX: -0.3685, // longitude
  coordonneeY: 43.299,  // latitude
  codePostalBan: '64000',
};

const quartier = findQuartier(dpe.coordonneeX, dpe.coordonneeY, dpe.codePostalBan);

if (quartier) {
  console.log(`Ce DPE est dans le quartier ${quartier.name} à ${quartier.ville}`);
}
```

### 3. Matching amélioré avec bonus quartier

**Scénario:** Donner un bonus de score si DPE et annonce sont dans le même quartier

```typescript
import { findQuartier } from '@utils/quartiers';

function calculateMatchScore(dpe: DpeRecord, annonce: LeboncoinAnnonce): number {
  let score = 0;

  // Scores normaux (surface, type, etc.)
  score += calculateBaseScore(dpe, annonce);

  // BONUS QUARTIER
  const dpeQuartier = findQuartier(dpe.coordonneeX, dpe.coordonneeY, dpe.codePostalBan);
  const annonceQuartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);

  if (dpeQuartier && annonceQuartier) {
    if (dpeQuartier.name === annonceQuartier.name) {
      score += 15; // +15 points si même quartier
      console.log(`✅ Match quartier: ${dpeQuartier.name}`);
    } else {
      // Quartiers différents mais même ville
      score += 5; // +5 points quand même
    }
  }

  return score;
}
```

### 4. Recherche d'annonces par quartier

**Scénario:** Un utilisateur cherche "appartement Dufau-Tourasse Pau"

```typescript
import { searchQuartierByName, findQuartiersNearby } from '@utils/quartiers';

async function searchAnnoncesByQuartier(quartierName: string, ville: string) {
  // 1. Trouver le quartier
  const quartier = searchQuartierByName(quartierName, ville);

  if (!quartier) {
    return { error: 'Quartier non trouvé' };
  }

  // 2. Chercher les annonces dans un rayon de 1km autour du centre
  const [lng, lat] = quartier.center;
  const annonces = await prisma.leboncoinAnnonce.findMany({
    where: {
      // Filtre approximatif sur coordonnées
      lat: { gte: lat - 0.01, lte: lat + 0.01 },
      lng: { gte: lng - 0.01, lte: lng + 0.01 },
    },
  });

  // 3. Filtrer précisément celles dans le quartier
  const annoncesDansQuartier = annonces.filter((a) => {
    const annonceQuartier = findQuartier(a.lng, a.lat, a.codePostal);
    return annonceQuartier?.name === quartier.name;
  });

  return {
    quartier: quartier.name,
    count: annoncesDansQuartier.length,
    annonces: annoncesDansQuartier,
  };
}
```

### 5. Suggestions de quartiers à proximité

**Scénario:** Montrer les quartiers voisins pour élargir la recherche

```typescript
import { findQuartiersNearby } from '@utils/quartiers';

async function suggestNearbyQuartiers(lat: number, lng: number) {
  const nearby = findQuartiersNearby(lng, lat, 3000); // 3km

  return nearby.map((q) => ({
    name: q.name,
    ville: q.ville,
    distance: q.distance,
    distanceText: q.distance < 1000
      ? `${q.distance}m`
      : `${(q.distance / 1000).toFixed(1)}km`,
  }));
}

// Utilisation dans une recherche
const suggestions = await suggestNearbyQuartiers(43.299, -0.3685);
console.log('Quartiers à proximité:');
suggestions.forEach((s) => {
  console.log(`- ${s.name} (${s.distanceText})`);
});
// Output:
// - Centre-Ville (0m)
// - Dufau-Tourasse (820m)
// - Trespoey (850m)
```

### 6. Validation des données d'import

**Scénario:** Vérifier la cohérence des données lors de l'import

```typescript
import { findQuartier } from '@utils/quartiers';

async function validateImportData(data: any) {
  const errors = [];

  // Si coordonnées ET quartier fournis, vérifier cohérence
  if (data.lat && data.lng && data.quartier) {
    const detectedQuartier = findQuartier(data.lng, data.lat, data.codePostal);

    if (detectedQuartier && detectedQuartier.name !== data.quartier) {
      errors.push({
        field: 'quartier',
        message: `Incohérence: coordonnées indiquent "${detectedQuartier.name}" mais quartier fourni est "${data.quartier}"`,
        severity: 'warning',
      });
    }
  }

  return errors;
}
```

### 7. Statistiques par quartier

**Scénario:** Analyser la répartition des DPE par quartier

```typescript
import { findQuartier, getQuartiersByVille } from '@utils/quartiers';

async function getStatsParQuartier(ville: string) {
  const quartiers = getQuartiersByVille(ville);
  const stats = [];

  for (const quartier of quartiers) {
    // Compter les DPE dans ce quartier
    const dpes = await prisma.dpeRecord.findMany({
      where: {
        codePostalBan: { in: quartier.codePostal },
      },
    });

    const dpesInQuartier = dpes.filter((dpe) => {
      const q = findQuartier(dpe.coordonneeX, dpe.coordonneeY);
      return q?.name === quartier.name;
    });

    // Calculer moyenne étiquette DPE
    const moyenneScore = calculateAverageScore(dpesInQuartier);

    stats.push({
      quartier: quartier.name,
      nombreDPE: dpesInQuartier.length,
      moyenneScore,
      etiquetteMoyenne: scoreToEtiquette(moyenneScore),
    });
  }

  return stats.sort((a, b) => b.nombreDPE - a.nombreDPE);
}

// Résultat:
// [
//   { quartier: 'Centre-Ville', nombreDPE: 234, moyenneScore: 'C' },
//   { quartier: 'Dufau-Tourasse', nombreDPE: 156, moyenneScore: 'D' },
//   ...
// ]
```

### 8. Interface utilisateur avec carte

**Scénario:** Afficher les quartiers sur une carte interactive

```typescript
// Frontend React avec Leaflet
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';

function QuartiersMap({ ville }: { ville: string }) {
  const [quartiers, setQuartiers] = useState([]);

  useEffect(() => {
    fetch(`/api/quartiers/${ville}`)
      .then((r) => r.json())
      .then((data) => setQuartiers(data.data.quartiers));
  }, [ville]);

  return (
    <MapContainer center={[43.299, -0.3685]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {quartiers.map((q) => (
        <Polygon
          key={q.name}
          positions={q.coordinates.map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: 'blue', fillOpacity: 0.2 }}
        >
          <Popup>
            <h3>{q.name}</h3>
            <p>Code postal: {q.codePostal.join(', ')}</p>
          </Popup>
        </Polygon>
      ))}
    </MapContainer>
  );
}
```

## Tests avec curl

```bash
# Liste des quartiers de Pau
curl http://localhost:3001/api/quartiers/Pau

# Recherche par nom
curl "http://localhost:3001/api/quartiers/search/name?name=dufau&ville=pau"

# Localiser à partir de coordonnées
curl -X POST http://localhost:3001/api/quartiers/locate \
  -H "Content-Type: application/json" \
  -d '{"lat": 43.299, "lng": -0.3685, "codePostal": "64000"}'

# Quartiers à proximité
curl "http://localhost:3001/api/quartiers/nearby/search?lat=43.299&lng=-0.3685&distance=2000"
```

## Prochaines étapes suggérées

1. **Enrichir automatiquement les annonces**
   - Ajouter un champ `quartier` à la table `LeboncoinAnnonce`
   - Lors de l'import, détecter automatiquement le quartier

2. **Améliorer le scoring de matching**
   - Bonus +15 points si même quartier
   - Bonus +5 points si quartiers adjacents

3. **Ajouter plus de villes**
   - Bordeaux, Toulouse, Lyon, etc.
   - Importer depuis OpenStreetMap

4. **Interface d'administration**
   - Page pour dessiner de nouveaux quartiers
   - Validation visuelle sur carte

5. **Machine Learning**
   - Analyser les descriptions d'annonces
   - Détecter automatiquement les mentions de quartiers
