# Scripts de Collecte pour Pau et Environs

Scripts optimisés pour collecter un maximum de données DPE et annonces Leboncoin sur **Pau et dans un rayon de 30km**.

## 🎯 Objectif

Maximiser le nombre de matchs en collectant massivement :
- **DPE** : Via l'API publique ADEME
- **Annonces Leboncoin** : Via RapidAPI sur tous les codes postaux de la zone

---

## 📡 1. Collecte des DPE - API ADEME

### Script : `fetch-dpe-pau.ts`

Collecte automatique des DPE depuis l'API publique ADEME pour la zone de Pau.

### 🚀 Utilisation

```bash
cd packages/backend
pnpm fetch:dpe:pau
```

### ✨ Fonctionnalités

- ✅ **API publique ADEME** (pas de clé API nécessaire)
- ✅ **Filtrage géographique précis** : rayon de 30km autour de Pau (43.2951, -0.3708)
- ✅ **Filtrage par département** : 64 (Pyrénées-Atlantiques)
- ✅ **Pagination automatique** : 1000 DPE par requête
- ✅ **Rate limiting respecté** : 10 req/s max
- ✅ **Gestion des doublons** : upsert automatique
- ✅ **Validation stricte** : Zod schemas
- ✅ **Statistiques détaillées**

### 📊 API ADEME

**Endpoint** : `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france/lines`

**Rate Limit** : 10 requêtes/seconde/IP

**Données disponibles** :
- Numéro DPE unique
- Adresse complète (BAN)
- Code postal
- Type de bâtiment (Maison/Appartement)
- Surface habitable
- Année de construction
- Étiquettes DPE et GES (A-G)
- Coordonnées GPS (X, Y)
- Date d'établissement

**Filtres appliqués** :
- `Code_postal__BAN_:64*` → Département 64
- Distance GPS < 30km de Pau
- Validation complète des données

### 📈 Performance Attendue

Estimation pour la zone de Pau (30km) :
- **DPE disponibles** : ~10 000 - 50 000 (selon l'activité immobilière)
- **Vitesse** : ~500-1000 DPE/s
- **Durée** : 10-60 secondes

### 🔧 Configuration

Modifiable dans le script :
```typescript
const PAU_LAT = 43.2951;      // Latitude Pau
const PAU_LNG = -0.3708;      // Longitude Pau
const RADIUS_KM = 30;         // Rayon en km
const PAGE_SIZE = 1000;       // Records par page
const MAX_PAGES = 100;        // Limite de sécurité
```

---

## 🏠 2. Collecte des Annonces Leboncoin

### Script : `fetch-leboncoin-pau.ts`

Collecte automatique des annonces immobilières Leboncoin sur tous les codes postaux de Pau et environs.

### 🚀 Utilisation

```bash
cd packages/backend

# Configuration requise : RAPIDAPI_KEY dans .env
echo "RAPIDAPI_KEY=your_key_here" >> .env

pnpm fetch:leboncoin:pau
```

### ✨ Fonctionnalités

- ✅ **Multi codes postaux** : 13 codes couvrant Pau + 30km
- ✅ **Pagination automatique** : 100 annonces par code postal
- ✅ **Retry automatique** : en cas d'erreur réseau
- ✅ **Rate limiting** : pause entre requêtes
- ✅ **Gestion des doublons** : upsert par `list_id`
- ✅ **Extraction intelligente** : type bien, surface, DPE, GES, pièces
- ✅ **Statistiques par code postal**

### 🗺️ Codes Postaux Couverts

**Zone Pau** (13 codes postaux, rayon ~30km) :

| Zone | Codes Postaux | Communes |
|------|---------------|----------|
| **Pau centre** | 64000, 64140, 64110, 64320 | Pau, Lons, Billère, Jurançon, Gelos, Bizanos |
| **Ouest** | 64230, 64121, 64160, 64350 | Lescar, Serres-Castet, Morlaàs, Lembeye |
| **Nord** | 64800, 64410, 64150 | Nay, Arzacq, Mourenx |
| **Sud** | 64400, 64490 | Oloron-Sainte-Marie |
| **Est** | 64420, 64170 | Soumoulou, Artix |

### 📊 API Leboncoin (RapidAPI)

**Endpoint** : `https://leboncoin1.p.rapidapi.com/v2/leboncoin/search_api`

**Authentification** : RapidAPI Key (header `X-RapidAPI-Key`)

**S'inscrire** :
1. Créer un compte sur [RapidAPI](https://rapidapi.com)
2. S'abonner à [Leboncoin API](https://rapidapi.com/hub) (plan gratuit disponible)
3. Copier votre clé API
4. Ajouter dans `.env` : `RAPIDAPI_KEY=your_key`

**Limitations** :
- **Plan gratuit** : ~500 requêtes/mois
- **Plan Basic** : ~10 000 requêtes/mois (payant)
- **Rate limit** : variable selon abonnement

**Données extraites** :
- ID annonce (`list_id`)
- URL annonce
- Code postal
- Type de bien (Maison/Appartement)
- Surface (m²)
- Nombre de pièces
- Étiquettes DPE et GES
- Date de publication

### 📈 Performance Attendue

Avec les 13 codes postaux :
- **Annonces par code** : 0-100 (selon disponibilité)
- **Total attendu** : 200-800 annonces
- **Durée** : ~30-60 secondes (avec rate limiting)
- **Coût API** : 13 requêtes

### 🔧 Configuration

Modifiable dans le script :
```typescript
const ZIPCODES_PAU_AREA = [
  '64000', '64140', '64110', '64320',
  '64230', '64121', '64160', '64350',
  '64800', '64410', '64150',
  '64400', '64490',
  '64420', '64170',
];

const LIMIT_PER_ZIPCODE = 100;      // Annonces par code
const DELAY_BETWEEN_REQUESTS = 200;  // ms entre requêtes
```

---

## 🔄 Workflow Complet

### Collecte Initiale

```bash
cd packages/backend

# 1. Collecter les DPE (API publique, rapide)
pnpm fetch:dpe:pau
# → ~10 000 - 50 000 DPE en 10-60s

# 2. Collecter les annonces (RapidAPI, nécessite clé)
pnpm fetch:leboncoin:pau
# → ~200-800 annonces en 30-60s
```

### Collecte Périodique

Pour maintenir les données à jour, automatiser avec cron :

```bash
# Ajouter dans crontab
# Tous les jours à 2h du matin
0 2 * * * cd /path/to/MVP_DPE/packages/backend && pnpm fetch:dpe:pau >> logs/cron-dpe.log 2>&1

# Toutes les 6 heures (nouvelles annonces)
0 */6 * * * cd /path/to/MVP_DPE/packages/backend && pnpm fetch:leboncoin:pau >> logs/cron-lbc.log 2>&1
```

---

## 📊 Vérification des Données

Après la collecte, vérifier les données importées :

```bash
# Ouvrir Prisma Studio
pnpm db:studio

# Ou via psql
psql postgresql://user:pass@localhost:5432/dpe_matching

# Statistiques DPE
SELECT
  code_postal_ban,
  COUNT(*) as total,
  AVG(surface_habitable) as surface_moy
FROM dpe_records
WHERE code_postal_ban LIKE '64%'
GROUP BY code_postal_ban
ORDER BY total DESC;

# Statistiques Annonces
SELECT
  code_postal,
  COUNT(*) as total,
  AVG(surface) as surface_moy
FROM leboncoin_annonces
WHERE code_postal LIKE '64%'
GROUP BY code_postal
ORDER BY total DESC;
```

---

## 🎯 Matching Automatique

Une fois les données collectées, lancer le matching :

```bash
# Créer les clusters de matching pour toutes les annonces
pnpm create:clusters

# Ou via l'API
curl -X POST http://localhost:3001/api/matching/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key"
```

---

## ⚠️ Limitations & Solutions

### API ADEME

**Limitations** :
- 10 req/s max
- Pas de filtrage par ville (seulement département)
- Nécessite filtrage GPS post-requête

**Solutions** :
- ✅ Respect automatique du rate limit
- ✅ Filtrage GPS intégré (30km)
- ✅ Pagination efficace

### API Leboncoin (RapidAPI)

**Limitations** :
- Clé API requise (payant après quota)
- 100 annonces max par requête
- Données parfois incomplètes (DPE manquant)

**Solutions** :
- ✅ Multi codes postaux pour couvrir la zone
- ✅ Validation flexible (champs optionnels)
- ✅ Retry automatique
- 💡 Alternative : scraping direct (légal mais fragile)

---

## 🚀 Optimisations Futures

### DPE
- [ ] Cache des résultats (éviter re-fetch)
- [ ] Mode incrémental (seulement nouveaux DPE)
- [ ] Support d'autres départements
- [ ] Export des statistiques

### Leboncoin
- [ ] Scraping direct (sans RapidAPI)
- [ ] Pagination profonde (offset)
- [ ] Détection automatique nouveaux codes postaux
- [ ] Enrichissement données (géocodage)

---

## 📚 Ressources

### API ADEME
- [Portail Open Data ADEME](https://data.ademe.fr)
- [Dataset DPE France](https://data.ademe.fr/datasets/dpe-france)
- [Documentation API](https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france/api-docs)

### API Leboncoin
- [RapidAPI Hub](https://rapidapi.com)
- [Leboncoin API sur RapidAPI](https://rapidapi.com/hub)

### Données Géographiques
- [Base Adresse Nationale](https://adresse.data.gouv.fr)
- [Codes Postaux France](https://www.data.gouv.fr/fr/datasets/base-officielle-des-codes-postaux/)

---

## 🆘 Troubleshooting

### Erreur : `RAPIDAPI_KEY non définie`
```bash
# Solution : ajouter la clé dans .env
cd packages/backend
echo "RAPIDAPI_KEY=your_key_here" >> .env
```

### Erreur : `Rate limit exceeded` (API ADEME)
```bash
# Le script respecte automatiquement la limite
# Si problème persiste, augmenter le délai :
# Dans fetch-dpe-pau.ts, ligne ~350 :
await new Promise(resolve => setTimeout(resolve, 200)); // 150 → 200ms
```

### Erreur : `Prisma connection failed`
```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.dev.yml up -d

# Vérifier DATABASE_URL dans .env
cat .env | grep DATABASE_URL

# Tester la connexion
pnpm db:studio
```

### Peu d'annonces récupérées
```bash
# Normal si :
# - Zone peu dense
# - Codes postaux ruraux
# - Heure creuse

# Solutions :
# 1. Augmenter LIMIT_PER_ZIPCODE
# 2. Ajouter plus de codes postaux
# 3. Exécuter plusieurs fois par jour
```

---

## 📝 Notes

- **Données publiques** : Les DPE sont en open data (licence Etalab)
- **Respect RGPD** : Les annonces Leboncoin sont publiques
- **Rate limiting** : Toujours respecter les limites APIs
- **Coût** : API ADEME gratuite, Leboncoin RapidAPI payant après quota
- **Maintenance** : Vérifier régulièrement la validité des codes postaux

---

**Créé le** : 2025-10-07
**Auteur** : Claude Code
**Version** : 1.0
