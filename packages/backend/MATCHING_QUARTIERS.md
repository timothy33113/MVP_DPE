# Bonus Quartier dans le Matching DPE-Annonces

## Vue d'ensemble

Le système de matching intègre maintenant un **bonus de 5 points** (sur 120 max) lorsque l'annonce Leboncoin et le DPE sont situés dans le même quartier.

## Fonctionnement

### 1. Extraction du quartier de l'annonce

Le système utilise deux méthodes, dans cet ordre de priorité :

#### Méthode 1 : Extraction depuis `rawData.location.district`
```typescript
// L'API Leboncoin fournit le quartier directement
{
  "rawData": {
    "location": {
      "district": "Centre-ville",
      "city": "Pau",
      "zipcode": "64000"
    }
  }
}
```

#### Méthode 2 : Géolocalisation via GPS (fallback)
```typescript
// Si pas de district, on utilise les coordonnées GPS
if (annonce.lat && annonce.lng && annonce.codePostal) {
  const quartier = findQuartier(annonce.lng, annonce.lat, annonce.codePostal);
  // Retourne le quartier via algorithme ray-casting
}
```

### 2. Extraction du quartier du DPE

Pour les DPE, on utilise toujours la géolocalisation GPS :

```typescript
if (dpe.coordonneeX && dpe.coordonneeY && dpe.codePostalBan) {
  const quartier = findQuartier(
    dpe.coordonneeX,    // longitude
    dpe.coordonneeY,    // latitude
    dpe.codePostalBan
  );
}
```

### 3. Comparaison et attribution du bonus

```typescript
// Normalisation pour gérer les variations
const annonceNorm = normalizeQuartierName('Centre-ville');  // → 'centreville'
const dpeNorm = normalizeQuartierName('centre ville');      // → 'centreville'

if (annonceNorm === dpeNorm) {
  bonus.quartier = 5; // ✅ +5 points
}
```

## Quartiers supportés pour Pau (64000)

| Quartier | Occurrences Leboncoin | Zone géographique |
|----------|----------------------|-------------------|
| **Centre-ville** | 54% | Zone historique et commerciale |
| **Pau Sud** | 25% | Secteur résidentiel sud |
| **Pau Nord** | 13% | Université et zones récentes |
| **Le Hameau** | 4% | Quartier ouest |
| **Dufau - Tourasse** | 4% | Quartier résidentiel est |

Source : Analyse de 24 annonces Leboncoin réelles

## Impact sur le score

### Exemple de scoring

#### Sans bonus quartier
```
Score de base : 75/90
  - DPE : 25/25 ✅
  - GES : 25/25 ✅
  - Surface : 15/15 ✅
  - Timing : 5/5 ✅

Bonus : 5/30
  - Distance GPS : 5/10

Total : 80/120 (66.7%)
Confiance : PROBABLE
```

#### Avec bonus quartier
```
Score de base : 75/90
  - DPE : 25/25 ✅
  - GES : 25/25 ✅
  - Surface : 15/15 ✅
  - Timing : 5/5 ✅

Bonus : 10/30
  - Distance GPS : 5/10
  - Quartier : 5/5 ✅ (même quartier)

Total : 85/120 (70.8%)
Confiance : TRÈS FIABLE
```

Le bonus quartier peut **faire passer le niveau de confiance** de PROBABLE à TRÈS FIABLE !

## Cas d'usage

### ✅ Bonus attribué

1. **Même quartier avec normalisation**
   - Annonce : `"Centre-ville"`
   - DPE : géolocalisé dans Centre-ville
   - Résultat : **+5 points**

2. **Variations d'écriture**
   - `"Centre-ville"` = `"centre ville"` = `"CENTRE VILLE"`
   - Normalisation automatique
   - Résultat : **+5 points**

3. **Géolocalisation GPS**
   - Annonce sans `district` mais avec GPS
   - DPE avec GPS
   - Les deux dans Centre-ville
   - Résultat : **+5 points**

### ❌ Bonus non attribué

1. **Quartiers différents**
   - Annonce : `"Centre-ville"`
   - DPE : géolocalisé dans `"Pau Sud"`
   - Résultat : **0 point**

2. **Manque d'informations**
   - Annonce sans `district` ni GPS
   - Résultat : **0 point** (pas d'erreur)

3. **DPE sans coordonnées**
   - DPE sans `coordonneeX`/`coordonneeY`
   - Résultat : **0 point**

## Tests

6 tests unitaires couvrent le bonus quartier :

```bash
pnpm test matching-quartier.test.ts
```

Tests inclus :
- ✅ Bonus attribué si même quartier
- ✅ Pas de bonus si quartiers différents
- ✅ Gestion case-insensitive
- ✅ Gestion des variations de nom
- ✅ Fonctionne sans info de quartier
- ✅ Fallback GPS fonctionnel

## Performance

- **Coût calcul** : ~0.1ms par candidat
- **Algorithme** : Ray-casting O(n) où n = nombre de points du polygone
- **Cache** : Aucun (calcul à la volée)
- **Base de données** : En mémoire (TypeScript)

## Évolutions futures

### Court terme
- [ ] Ajouter plus de villes (Bordeaux, Toulouse, Lyon)
- [ ] Statistiques par quartier dans l'API
- [ ] Bonus gradué selon proximité des quartiers

### Long terme
- [ ] Importer automatiquement depuis OpenStreetMap
- [ ] Interface admin pour dessiner les quartiers
- [ ] Base de données PostGIS pour performance
- [ ] Bonus "rue" si même rue détectée

## API

### Endpoints disponibles

```bash
# Lister les quartiers d'une ville
GET /api/quartiers/:ville

# Rechercher par nom
GET /api/quartiers/search/name?name=centre&ville=pau

# Géolocaliser via GPS
POST /api/quartiers/locate
Body: { lat: 43.2985, lng: -0.3700, codePostal: "64000" }

# Quartiers à proximité
GET /api/quartiers/nearby/search?lat=43.2985&lng=-0.3700&distance=2000
```

Voir `QUARTIERS_GUIDE.md` et `EXEMPLES_QUARTIERS.md` pour plus de détails.

## Configuration

Aucune configuration nécessaire. Le bonus quartier est automatiquement activé dans le matching.

Pour désactiver temporairement (tests), modifier `matching.service.ts` :

```typescript
// Désactiver
bonus.quartier = 0;
```

## Logs

Le bonus quartier génère des logs de debug :

```typescript
logger.debug(`Quartier match: ${annonceQuartier} = ${dpeQuartier}`);
```

Visible avec `LOG_LEVEL=debug` dans `.env`.
