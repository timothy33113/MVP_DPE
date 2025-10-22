# 🏗️ Architecture Complète - Système DPE & Matching Acquéreurs

## 📋 Table des matières

1. [Vision Globale](#vision-globale)
2. [Architecture Technique](#architecture-technique)
3. [Flux de Données](#flux-de-données)
4. [Modules & Responsabilités](#modules--responsabilités)
5. [APIs & Intégrations](#apis--intégrations)
6. [Base de Données](#base-de-données)
7. [Automatisations n8n](#automatisations-n8n)
8. [Interface Utilisateur](#interface-utilisateur)
9. [Sécurité](#sécurité)
10. [Roadmap & Prochaines Étapes](#roadmap--prochaines-étapes)

---

## 🎯 Vision Globale

### Double Stratégie Business

```
┌─────────────────────────────────────────────────────────┐
│                    SYSTÈME COMPLET                       │
├──────────────────────────┬──────────────────────────────┤
│   PROSPECTION VENDEURS   │    PLACEMENT ACQUÉREURS      │
├──────────────────────────┼──────────────────────────────┤
│ Le Bon Coin Scraping     │ Base Acquéreurs (Supabase)   │
│         ↓                │         ↓                     │
│ Matching DPE             │ Matching IA Biens            │
│         ↓                │         ↓                     │
│ Leads Vendeurs Monday    │ Notifications Acquéreurs     │
│         ↓                │         ↓                     │
│ ✅ Commission Vente      │ ✅ Commission Placement       │
└──────────────────────────┴──────────────────────────────┘
```

### Objectifs Métier

**Prospection Vendeurs** (Existant)
- Identifier propriétaires de biens mal classés DPE
- Proposer audit énergétique
- Générer mandats de vente

**Placement Acquéreurs** (Nouveau)
- Matcher acquéreurs avec biens disponibles
- Notifications automatiques par email/SMS
- Suivi des visites et conversions

---

## 🏗️ Architecture Technique

### Stack Technologique

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  React + TypeScript + Vite + TanStack Query + Leaflet      │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  Express + TypeScript + Prisma ORM + PostgreSQL            │
│                                                             │
│  Modules:                                                   │
│  ├── Scraping Le Bon Coin (RapidAPI)                       │
│  ├── Matching DPE/Annonces                                 │
│  ├── Intégration Monday.com                                │
│  ├── Enrichissement Cadastre (IGN)                         │
│  └── API d'intégration (n8n/Supabase)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  PostgreSQL  │  │   Supabase       │  │      n8n        │
│              │  │                  │  │                 │
│ - DPE        │  │ - Acquéreurs     │  │ - Workflows     │
│ - Annonces   │  │ - Biens          │  │ - Automation    │
│ - Matchs     │  │ - Edge Func IA   │  │ - Emails/SMS    │
└──────────────┘  └──────────────────┘  └─────────────────┘
```

### Principes Architecturaux

✅ **Séparation des responsabilités**
- Backend MVP = Collecte données + Matching vendeurs
- Supabase = Gestion acquéreurs + Matching IA
- n8n = Orchestration & Notifications

✅ **API-First**
- Tous les modules exposent des APIs REST
- Intégrations via webhooks et endpoints dédiés

✅ **Modularité**
- Chaque système peut évoluer indépendamment
- Pas de couplage fort entre PostgreSQL et Supabase

---

## 🔄 Flux de Données

### Flux 1 : Prospection Vendeurs (Existant)

```
1. Script Cron → Scrape Le Bon Coin (RapidAPI)
                     ↓
2. Stockage PostgreSQL (table: leboncoin_annonces)
                     ↓
3. Matching avec base DPE (score de correspondance)
                     ↓
4. Détection anomalies (DPE F/G vs prix élevé)
                     ↓
5. Création leads Monday.com
                     ↓
6. Commercial contacte vendeur
```

### Flux 2 : Placement Acquéreurs (Nouveau)

```
1. Annonces LBC stockées dans PostgreSQL
                     ↓
2. n8n Workflow (toutes les heures)
   → API: GET /api/integration/annonces/new
                     ↓
3. Transformation & Upsert Supabase (biens_inter_agence)
                     ↓
4. Trigger Edge Function IA Matching
                     ↓
5. Scoring acquéreurs vs biens (top matches)
                     ↓
6. n8n envoie emails/SMS aux acquéreurs
                     ↓
7. Tracking ouverture & Analytics
```

### Flux 3 : Enrichissement Cadastre

```
1. Utilisateur clique sur annonce dans carte
                     ↓
2. Frontend → API: GET /api/cadastre/parcelles
                     ↓
3. Backend → Apicarto IGN (géométrie parcelles)
                     ↓
4. Affichage polygones cadastre sur carte Leaflet
```

---

## 📦 Modules & Responsabilités

### Module 1 : Scraping Le Bon Coin
**Fichier :** `packages/backend/scripts/fetch-leboncoin-*.ts`

**Responsabilités :**
- Scraping automatique via RapidAPI
- Pagination (100 items/page)
- Extraction attributs (DPE, surface, pièces, équipements)
- Stockage base PostgreSQL

**Configuration :**
- 30+ codes postaux autour de Pau
- Types : Maisons + Appartements
- Fréquence : Toutes les heures

### Module 2 : Matching DPE/Vendeurs
**Fichier :** `packages/backend/src/services/matching.service.ts`

**Responsabilités :**
- Algorithme de scoring (100 points)
- Comparaison adresse LBC ↔ adresse DPE
- Détection anomalies (prix vs DPE)
- Génération points forts/faibles

**Critères de matching :**
- Localisation (code postal, ville, adresse)
- Surface (+/- 20%)
- Type de bien
- DPE déclaré vs réel

### Module 3 : Intégration Monday.com
**Fichier :** `packages/backend/src/services/monday.service.ts`

**Responsabilités :**
- Création items dans board Monday
- Mise à jour statuts
- Upload images
- Gestion colonnes personnalisées

**Données envoyées :**
- Info bien (adresse, prix, surface)
- Statut DPE (déclaré vs réel)
- Potentiel économie énergie
- Photos annonce

### Module 4 : API Intégration n8n/Supabase
**Fichier :** `packages/backend/src/routes/integration.routes.ts`

**Endpoints :**

```typescript
// Récupérer nouvelles annonces
GET /api/integration/annonces/new
  ?since=2025-10-08T00:00:00Z
  &limit=100

// Statistiques
GET /api/integration/stats

// Webhook Supabase
POST /api/integration/webhook/match-created
```

**Authentification :** API Key via header `x-api-key`

### Module 5 : Cadastre & Cartographie
**Fichier :** `packages/backend/src/routes/cadastre.routes.ts`

**Responsabilités :**
- Requêtes API Apicarto IGN
- Récupération géométries parcelles
- Enrichissement données foncières

---

## 🗄️ Base de Données

### PostgreSQL (MVP App)

**Tables principales :**

```sql
-- Annonces Le Bon Coin
leboncoin_annonces {
  id, listId (unique)
  rawData (jsonb) -- Données brutes API
  typeBien, surface, prix
  codePostal, ville
  dpe, ges
  datePublication
  statutDisponibilite
}

-- DPE officiels (ADEME)
dpe_records {
  id, numeroIdentifiantDpe
  adresseComplete
  etiquetteDpe, etiquetteGes
  consommationEnergie
  dateEtablissement
}

-- Matchs DPE/LBC
matches {
  id
  annonceId (leboncoin)
  dpeId
  scoreTotal (0-100)
  scoreDetails (jsonb)
  pointsForts[], pointsFaibles[]
  statut (NOUVEAU, EN_COURS, VALIDE)
}

-- Items Monday.com
monday_items {
  mondayItemId
  annonceId
  matchId
  statut
  dateCreation
}
```

### Supabase (Système Acquéreurs)

**Tables principales :**

```sql
-- Acquéreurs (leads)
leads {
  id, nom, prenom, email, telephone
  budget_min, budget_max
  type_bien_recherche[] -- maison, appartement
  code_postal[], villes[], zones[]
  surface_min, pieces_min
  dpe_max_accepte
  statut_actif
  criteres_specifiques (jsonb)
}

-- Biens inter-agence
biens_inter_agence {
  id, lbc_id (unique)
  titre, description, prix
  ville, code_postal
  surface, nb_pieces, type_bien
  dpe, ges
  criteres_enrichis (jsonb) -- etage, ascenseur, balcon, etc.
  images[], date_publication
  source -- 'leboncoin', 'seloger', etc.
}

-- Matchs acquéreurs/biens
matchs_acquereurs {
  id
  lead_id
  bien_id
  score_ia (0-100)
  recommandations (jsonb)
  statut -- 'envoye', 'ouvert', 'visite_programmee'
  date_envoi, date_ouverture
}
```

---

## 🤖 Automatisations n8n

### Workflow 1 : Sync LBC → Supabase
**Fichier :** `workflow-sync-lbc-to-supabase.json`

**Trigger :** Cron (toutes les heures)

**Étapes :**
1. Cron Trigger (0 */1 * * *)
2. HTTP Request → API MVP `/api/integration/annonces/new?limit=200`
3. IF count > 0
4. Split Into Batches (5 items)
5. Transform Data (MVP format → Supabase format)
6. Supabase Upsert (biens_inter_agence)
7. Trigger Edge Function IA Matching
8. Send Email Notifications
9. Update Analytics

**Authentification :** Header `x-api-key: AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=`

### Workflow 2 : Matching Quotidien (Existant)
**Fichier :** `workflow-11-matching-quotidien.json`

**Trigger :** Cron (9h tous les jours)

**Étapes :**
1. Fetch Acquéreurs Actifs (Supabase)
2. Fetch Biens Disponibles
3. Edge Function IA → Scoring
4. Filter score > 70
5. Group by Acquéreur
6. Email Template Personnalisé
7. Track Opens/Clicks
8. Update Dashboard Admin

### Workflow 3 : Export DPE → Monday (Existant)

**Trigger :** Nouveau match validé

**Étapes :**
1. Webhook from Backend
2. Transform Data
3. Monday.com Create Item
4. Upload Images
5. Notify Commercial

---

## 🖥️ Interface Utilisateur

### Section 1 : Carte Interactive (Existant)
**Route :** `/`

**Fonctionnalités :**
- Carte Leaflet avec clusters d'annonces
- Filtres : Type bien, Prix, Surface, DPE
- Panel détail annonce
- Affichage parcelles cadastre (on-click)
- Matching DPE temps réel

**Composants clés :**
- `MapView.tsx` - Carte principale
- `AnnonceDetailPanel.tsx` - Détail annonce
- `ClusterMarker.tsx` - Clusters carte
- `CadastreLayer.tsx` - Parcelles cadastre

### Section 2 : Dashboard Acquéreurs (À créer)
**Route :** `/acquereurs`

**Fonctionnalités proposées :**
```
├── 📊 Vue d'ensemble
│   ├── Nombre acquéreurs actifs (50-100)
│   ├── Matchs générés aujourd'hui
│   ├── Taux ouverture emails (%)
│   └── Visites programmées
│
├── 👥 Liste Acquéreurs
│   ├── Tableau avec filtres (budget, statut, zone)
│   ├── Tri (date inscription, score moyen)
│   └── Actions : Éditer, Voir matchs, Archiver
│
├── 📝 Fiche Acquéreur
│   ├── Informations contact
│   ├── Critères recherche (éditable)
│   ├── Historique matchs
│   └── Timeline communications
│
└── 🎯 Matching Manuel
    ├── Vue "Biens à placer"
    │   └── Pour chaque bien : Top 5 acquéreurs
    │
    └── Vue "Acquéreurs à servir"
        └── Pour chaque acquéreur : Top 10 biens
```

### Section 3 : Analytics (À créer)
**Route :** `/analytics`

**Métriques clés :**
- Taux conversion matchs → visites
- Performance par zone géographique
- Délai moyen prospection → vente
- Évolution prix vs DPE

---

## 🔐 Sécurité

### Authentification API

**Backend → n8n/Supabase**
```typescript
// Middleware dans integration.routes.ts
const n8nAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

**Variables d'environnement :**
```bash
# Backend .env
N8N_API_KEY=AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=
MONDAY_API_TOKEN=eyJhbGci...
RAPIDAPI_KEY=b859fa9c...
```

**Supabase RLS (Row Level Security)**
- Policies sur table `leads` : read/write admin only
- Policies sur `biens_inter_agence` : read public, write API
- Edge Functions : service_role key seulement

### Rate Limiting

**Configuration actuelle :**
```typescript
// rate-limiter.ts
generalRateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 100
}
```

**Recommandations production :**
- 500 req/15min pour endpoints publics
- 2000 req/15min pour endpoints intégration (n8n)
- Monitoring avec Sentry

---

## 📈 Roadmap & Prochaines Étapes

### ✅ Phase 1 : MVP Prospection Vendeurs (TERMINÉ)
- [x] Scraping Le Bon Coin
- [x] Base DPE ADEME
- [x] Matching DPE/Annonces
- [x] Intégration Monday.com
- [x] Carte interactive
- [x] Enrichissement Cadastre

### ✅ Phase 2 : API Intégration Acquéreurs (TERMINÉ)
- [x] Routes API `/api/integration/*`
- [x] Authentification API Key
- [x] Workflow n8n Sync LBC → Supabase
- [x] Tests endpoints

### 🔄 Phase 3 : Interface Acquéreurs (EN COURS)
**Durée estimée : 1-2 semaines**

- [ ] Page Dashboard Acquéreurs
- [ ] Formulaire création/édition acquéreur
- [ ] Vue liste acquéreurs avec filtres
- [ ] Fiche détail acquéreur
- [ ] Interface matching manuel
- [ ] Tests E2E

**Étapes :**
1. Créer routes frontend `/acquereurs/*`
2. Créer API backend `/api/acquereurs/*`
3. Implémenter CRUD acquéreurs
4. Implémenter algorithme matching (service existant)
5. Interface graphique
6. Tests & déploiement

### 📅 Phase 4 : Analytics & Optimisation
**Durée estimée : 1 semaine**

- [ ] Dashboard analytics unifié
- [ ] KPIs temps réel
- [ ] Rapports automatisés
- [ ] A/B testing emails
- [ ] Optimisation algorithme matching

### 🚀 Phase 5 : Scale & Nouvelles Fonctionnalités
**Durée estimée : 1-2 mois**

- [ ] Sources additionnelles (SeLoger, PAP)
- [ ] Machine Learning scoring
- [ ] Mobile app (React Native)
- [ ] Intégration CRM externe
- [ ] Visites virtuelles
- [ ] Chatbot acquéreur

---

## 🎯 Actions Immédiates

### Pour démarrer Phase 3 (Interface Acquéreurs)

**1. Décision architecture acquéreurs**

Option A : **Garder Supabase uniquement** (Recommandé)
- ✅ Système déjà fonctionnel
- ✅ Edge Function IA opérationnelle
- ✅ Moins de code à maintenir
- ❌ Interface admin limitée

Option B : **Dupliquer dans PostgreSQL**
- ✅ Interface admin complète
- ✅ Contrôle total
- ✅ Données centralisées
- ❌ Duplication logique matching
- ❌ Plus de développement

**2. Si Option A (Recommandé) :**

```bash
# 1. Créer routes frontend React
npx create-route acquereurs

# 2. Créer API proxy vers Supabase
# Backend: /api/acquereurs/* → Supabase REST API

# 3. Interface simple CRUD
# Formulaire acquéreur
# Liste avec DataTable
# Vue matchs
```

**3. Si Option B (Plus complet) :**

```bash
# 1. Appliquer migration Prisma
cd packages/backend
npx prisma migrate dev --name add_acquereurs

# 2. Implémenter CRUD API
# POST /api/acquereurs
# GET /api/acquereurs
# PUT /api/acquereurs/:id
# DELETE /api/acquereurs/:id

# 3. Sync bidirectionnel PostgreSQL ↔ Supabase
# Webhook Supabase → Update PostgreSQL
# Webhook PostgreSQL → Update Supabase
```

---

## 📞 Support & Documentation

### Fichiers de référence

**Architecture :**
- `ARCHITECTURE_COMPLETE.md` (ce fichier)
- `INTEGRATION_ACQUEREURS.md` - Détails système acquéreurs
- `INTEGRATION_N8N_SUPABASE.md` - Guide intégration n8n

**Code source :**
- `packages/backend/src/routes/integration.routes.ts` - API intégration
- `packages/backend/src/services/matching-acquereur.service.ts` - Algorithme matching
- `workflow-sync-lbc-to-supabase.json` - Workflow n8n

**Schémas :**
- `packages/backend/prisma/schema.prisma` - Base PostgreSQL
- `packages/backend/prisma/schema-acquereurs.prisma` - Extension acquéreurs (optionnel)

### Prochaine session de travail

**Questions à résoudre :**
1. Quelle option choisir (A ou B) pour gestion acquéreurs ?
2. Priorité : Interface admin ou automatisation complète ?
3. Timeline : MVP rapide ou solution complète ?

### Métriques de succès

**Court terme (1 mois) :**
- [ ] 100% annonces LBC synchronisées vers Supabase
- [ ] 50 acquéreurs actifs dans le système
- [ ] 10 matchs/jour minimum
- [ ] Taux ouverture email > 30%

**Moyen terme (3 mois) :**
- [ ] 200 acquéreurs actifs
- [ ] 50 matchs/jour
- [ ] 5 visites/semaine générées
- [ ] 2 ventes/mois conclues via matching

---

## ✨ Conclusion

Le système est conçu en 3 couches indépendantes mais connectées :

1. **Collecte & Prospection** (PostgreSQL + Monday)
   → Biens LBC + DPE → Leads Vendeurs

2. **Placement Acquéreurs** (Supabase + n8n + IA)
   → Acquéreurs + Biens → Matchs automatiques

3. **Orchestration** (n8n + APIs)
   → Connexion des systèmes + Automatisations

**Avantages clés :**
- 🎯 Double flux de revenus (vendeurs + acquéreurs)
- ⚡ Automatisation maximale
- 🔧 Flexibilité & modularité
- 📊 Analytics cross-system
- 🚀 Scalabilité

**Prochaine étape critique :** Décider de l'architecture frontend acquéreurs (Option A ou B).

---

*Document créé le 2025-10-09*
*Dernière mise à jour : 2025-10-09*
