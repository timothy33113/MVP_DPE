# Guide - Système de Géolocalisation par Quartiers

## Vue d'ensemble

Le système permet de délimiter géographiquement des quartiers pour améliorer le matching DPE-Annonces. Quand une annonce mentionne "Centre-Ville" ou "Dufau-Tourasse", on peut maintenant la géolocaliser précisément.

## Fonctionnalités

### 1. Détection automatique du quartier
```typescript
import { findQuartier } from '@utils/quartiers';

// Avec coordonnées GPS d'une annonce
const quartier = findQuartier(-0.3685, 43.2990, '64000');
// Retourne: { name: 'Centre-Ville', ville: 'Pau', ... }
```

### 2. Recherche par nom
```typescript
import { searchQuartierByName } from '@utils/quartiers';

// L'annonce mentionne "centre ville pau"
const quartier = searchQuartierByName('centre ville', 'pau');
// Retourne le quartier Centre-Ville avec ses coordonnées
```

### 3. Quartiers à proximité
```typescript
import { findQuartiersNearby } from '@utils/quartiers';

// Trouver tous les quartiers dans un rayon de 2km
const nearby = findQuartiersNearby(-0.3685, 43.2990, 2000);
// Retourne une liste triée par distance
```

### 4. Lister les quartiers d'une ville
```typescript
import { getQuartiersByVille } from '@utils/quartiers';

const quartiers = getQuartiersByVille('Pau');
// Retourne tous les quartiers de Pau
```

## Ajouter de nouveaux quartiers

### Méthode 1: Définition manuelle simple

Éditez `/src/utils/quartiers.ts` et ajoutez dans `QUARTIERS_DATABASE`:

```typescript
{
  name: 'Nom du Quartier',
  ville: 'Ville',
  codePostal: ['64000'], // Peut contenir plusieurs codes postaux
  // Polygone simple (rectangle)
  coordinates: [
    [lng_min, lat_min], // Coin sud-ouest
    [lng_max, lat_min], // Coin sud-est
    [lng_max, lat_max], // Coin nord-est
    [lng_min, lat_max], // Coin nord-ouest
    [lng_min, lat_min], // Fermer le polygone
  ],
  // Point central (moyenne des coordonnées)
  center: [(lng_min + lng_max) / 2, (lat_min + lat_max) / 2],
}
```

### Méthode 2: Utiliser OpenStreetMap

1. Aller sur https://www.openstreetmap.org
2. Chercher le quartier (ex: "Dufau-Tourasse, Pau")
3. Cliquer sur "Exporter"
4. Noter les coordonnées min/max affichées

Exemple pour Pau Centre-Ville:
- Latitude: 43.2965 à 43.3015
- Longitude: -0.3719 à -0.3650

### Méthode 3: Polygone précis (forme irrégulière)

Pour un quartier avec une forme précise:

```typescript
{
  name: 'Quartier Complexe',
  ville: 'Pau',
  codePostal: ['64000'],
  coordinates: [
    [-0.370, 43.295], // Point 1
    [-0.368, 43.297], // Point 2
    [-0.365, 43.296], // Point 3
    [-0.367, 43.293], // Point 4
    [-0.370, 43.295], // Retour au point 1
  ],
  center: [-0.3675, 43.2952],
}
```

**Outils pour obtenir les coordonnées:**
- https://geojson.io - Dessiner un polygone et copier les coordonnées
- Google Maps - Clic droit > "Mesurer une distance"

## Exemples d'utilisation dans l'API

### Enrichir les annonces avec le quartier

```typescript
// Dans le service d'import d'annonces
import { findQuartier, searchQuartierByName } from '@utils/quartiers';

async function enrichAnnonce(annonce: any) {
  let quartier = null;

  // 1. Si l'annonce a des coordonnées GPS
  if (annonce.lat && annonce.lng) {
    quartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);
  }

  // 2. Si l'annonce mentionne un quartier dans le titre/description
  if (!quartier && annonce.description) {
    // Extraire les mots-clés du texte
    const keywords = ['centre ville', 'dufau', 'tourasse', 'trespoey'];
    for (const keyword of keywords) {
      if (annonce.description.toLowerCase().includes(keyword)) {
        quartier = searchQuartierByName(keyword);
        if (quartier) break;
      }
    }
  }

  return {
    ...annonce,
    quartier: quartier?.name,
    quartierCoordinates: quartier?.center,
  };
}
```

### Améliorer le matching avec les quartiers

```typescript
// Dans le service de matching
import { findQuartier } from '@utils/quartiers';

function calculateQuartierBonus(dpe: DpeRecord, annonce: LeboncoinAnnonce): number {
  const dpeQuartier = findQuartier(dpe.coordonneeX, dpe.coordonneeY, dpe.codePostalBan);
  const annonceQuartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);

  // Bonus si même quartier
  if (dpeQuartier && annonceQuartier && dpeQuartier.name === annonceQuartier.name) {
    return 10; // +10 points au score
  }

  return 0;
}
```

## Données actuellement disponibles

### Pau (64000)
- ✅ Centre-Ville
- ✅ Dufau-Tourasse
- ✅ Trespoey
- ✅ Saragosse
- ✅ Hameau

### Paris
- ✅ Marais (75003, 75004)
- ✅ Montmartre (75018)
- ✅ Quartier Latin (75005)

## TODO: Quartiers à ajouter

### Pau
- [ ] Université
- [ ] Buros
- [ ] Ousse-des-Bois
- [ ] Billère (commune voisine)

### Autres villes
- [ ] Bordeaux (quartiers: Bastide, Chartrons, etc.)
- [ ] Toulouse (quartiers: Capitole, Jean-Jaurès, etc.)
- [ ] Lyon
- [ ] Marseille

## Contribution

Pour ajouter des quartiers:

1. Collecter les données (OpenStreetMap, Google Maps)
2. Ajouter dans `QUARTIERS_DATABASE` dans `/src/utils/quartiers.ts`
3. Tester avec les fonctions existantes
4. Créer des tests si nécessaire

## API Endpoints suggérés

Vous pourriez créer ces endpoints:

```typescript
// GET /api/quartiers/:ville
// Liste tous les quartiers d'une ville

// GET /api/quartiers/search?name=centre&ville=pau
// Recherche un quartier par nom

// POST /api/quartiers/locate
// Body: { lat, lng, codePostal }
// Retourne le quartier correspondant

// GET /api/quartiers/nearby?lat=43.29&lng=-0.36&distance=2000
// Quartiers dans un rayon donné
```

## Performance

- ⚡ Algorithme ray-casting très rapide
- 📊 ~1ms pour tester 50 quartiers
- 💾 Pas de base de données externe nécessaire
- 🔄 Facile à mettre à jour (juste un fichier TypeScript)

## Limites actuelles

- Les polygones sont simplifiés (rectangles ou formes simples)
- Nécessite une mise à jour manuelle pour de nouveaux quartiers
- Pas de hiérarchie (quartier > arrondissement > ville)

## Améliorations futures possibles

1. **Base de données géographique externe**
   - Utiliser PostGIS pour stocker les polygones
   - Permettre l'ajout via API

2. **Import automatique**
   - Importer depuis OpenStreetMap API
   - Génération automatique des polygones

3. **Interface d'administration**
   - Dessiner les quartiers sur une carte
   - Validation visuelle

4. **Cache et optimisation**
   - Indexation spatiale R-tree
   - Cache des recherches fréquentes
