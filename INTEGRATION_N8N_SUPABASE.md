# 🔗 Intégration App MVP DPE ↔ Système Supabase/n8n

## 📋 Vue d'ensemble

Vous avez déjà un système de matching acquéreurs fonctionnel avec **Supabase + n8n + IA**.
Cette documentation explique comment connecter votre nouvelle app MVP DPE (Le Bon Coin + PostgreSQL) avec ce système existant.

---

## 🏗️ Architecture Globale

```
┌──────────────────────────────────────┐
│      APP MVP DPE (PostgreSQL)        │
│  - Scraping Le Bon Coin              │
│  - Stockage annonces + DPE           │
│  - Matching DPE/Vendeurs             │
│  - Carte interactive                 │
└────────────┬─────────────────────────┘
             │
             │ API REST
             │ /api/integration/*
             │
             ▼
┌──────────────────────────────────────┐
│         n8n (Orchestration)          │
│  - Workflow Sync LBC                 │
│  - Workflow Matching Quotidien       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│       Supabase (Production)          │
│  - Table leads (acquéreurs)          │
│  - Table biens_inter_agence          │
│  - Edge Function IA Matching         │
│  - Analytics                         │
└──────────────────────────────────────┘
```

---

## ✅ Ce qui fonctionne déjà

Votre système Supabase/n8n :

1. ✅ **Table `leads`** avec acquéreurs et leurs critères
2. ✅ **Workflow matching quotidien** (9h tous les jours)
3. ✅ **Edge Function IA** pour scoring intelligent
4. ✅ **Emails automatiques** aux acquéreurs
5. ✅ **Analytics** et rapports admin

---

## 🆕 Ce qu'on ajoute

### 1. **Flux de données Le Bon Coin → Supabase**

**Nouveau workflow n8n :** [`workflow-sync-lbc-to-supabase.json`](workflow-sync-lbc-to-supabase.json)

**Fonctionnement :**
```
Cron (toutes les heures)
    ↓
API MVP: GET /api/integration/annonces/new
    ↓
Transformation format MVP → Supabase
    ↓
Supabase: Upsert biens_inter_agence
    ↓
Trigger matching IA global
    ↓
Emails aux acquéreurs correspondants
```

### 2. **Nouveaux endpoints API MVP**

Fichier : [`integration.routes.ts`](packages/backend/src/routes/integration.routes.ts)

#### **GET /api/integration/annonces/new**
Récupère les nouvelles annonces LBC depuis la dernière sync

**Paramètres :**
- `since` : Date ISO (optionnel, défaut: dernières 24h)
- `limit` : Nombre max (défaut: 100)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "count": 15,
    "since": "2025-10-08T10:00:00Z",
    "annonces": [
      {
        "lbc_id": "2984825767",
        "source_id": "uuid-mvp",
        "titre": "Appartement 3 pièces 82 m²",
        "prix": 285000,
        "ville": "Pau",
        "code_postal": "64000",
        "surface": 82,
        "nb_pieces": 3,
        "type_bien": "appartement",
        "dpe": "D",
        "criteres_enrichis": {
          "etage": 1,
          "ascenseur": true,
          "balcon": true,
          "type_mandat": "exclusive"
        },
        "images": ["url1", "url2"],
        "date_publication": "2025-05-06T09:43:00Z"
      }
    ]
  }
}
```

#### **GET /api/integration/stats**
Statistiques pour monitoring

#### **POST /api/integration/webhook/match-created**
Webhook appelé depuis Supabase (optionnel)

---

## 🚀 Mise en Place

### Étape 1 : Activer les routes d'intégration

Ajouter dans [`src/index.ts`](packages/backend/src/index.ts) :

```typescript
import integrationRoutes from './routes/integration.routes';

// Après les autres routes
app.use('/api/integration', integrationRoutes);
```

### Étape 2 : Importer le workflow n8n

1. Ouvrir n8n
2. Import → [`workflow-sync-lbc-to-supabase.json`](workflow-sync-lbc-to-supabase.json)
3. Configurer l'URL de l'API MVP : `http://localhost:3001` ou votre URL de production
4. Activer le workflow

### Étape 3 : Vérifier la table Supabase

S'assurer que `biens_inter_agence` a ces colonnes :

```sql
CREATE TABLE biens_inter_agence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lbc_id TEXT UNIQUE,
  source_id TEXT,
  url TEXT,
  titre TEXT,
  description TEXT,
  prix NUMERIC,
  code_postal TEXT,
  ville TEXT,
  quartier TEXT,
  lat NUMERIC,
  lng NUMERIC,
  type_bien TEXT,
  surface NUMERIC,
  nb_pieces INTEGER,
  nb_chambres INTEGER,
  dpe TEXT,
  ges TEXT,
  criteres_enrichis JSONB,
  images TEXT[],
  image_principale TEXT,
  date_publication TIMESTAMPTZ,
  date_importation TIMESTAMPTZ DEFAULT NOW(),
  statut_disponibilite TEXT DEFAULT 'disponible',
  source TEXT DEFAULT 'leboncoin'
);
```

### Étape 4 : Test manuel

```bash
# Test API
curl http://localhost:3001/api/integration/annonces/new?limit=5

# Test workflow n8n
# → Clic droit sur le workflow → "Execute Workflow"
```

---

## 🔄 Flux Complet

### Scénario : Nouvelle annonce Le Bon Coin détectée

1. **Script MVP** scrape Le Bon Coin (toutes les heures)
   → Stocke dans `leboncoin_annonces` (PostgreSQL)

2. **Workflow n8n** appelle `/api/integration/annonces/new`
   → Récupère les nouvelles annonces

3. **n8n** transforme et insère dans `biens_inter_agence` (Supabase)

4. **n8n** trigger la **Edge Function IA**
   → Matching avec tous les acquéreurs actifs

5. **Edge Function** retourne les matchs (score + recommandations)

6. **n8n** envoie emails aux acquéreurs concernés
   → Template HTML avec top 5 biens

7. **Analytics** mise à jour dans Supabase

8. **Email admin** avec rapport quotidien

---

## 📊 Avantages de cette architecture

### ✅ **Séparation des responsabilités**

- **MVP App** : Collecte données Le Bon Coin + Matching vendeurs
- **Supabase** : Stockage acquéreurs + Matching IA acquéreurs
- **n8n** : Orchestration et automatisations

### ✅ **Pas de duplication de code**

- Vous gardez votre Edge Function IA existante
- Pas besoin de recréer la logique de matching
- Réutilisation des workflows n8n

### ✅ **Flexibilité**

- Si vous changez de base acquéreurs : modifier seulement n8n
- Si vous ajoutez des sources (SeLoger, etc.) : juste ajouter à l'API
- Indépendance des systèmes

### ✅ **Double matching**

```
Le Bon Coin
    ↓
MVP App
    ├→ Matching DPE/Vendeurs (prospection)
    └→ Export vers Supabase
            ↓
        Matching IA Acquéreurs (placement)
```

---

## 🎯 Prochaines étapes recommandées

### Immédiat (1-2h)

1. ✅ Ajouter route d'intégration dans l'app
2. ✅ Tester endpoint `/api/integration/annonces/new`
3. ✅ Importer workflow n8n
4. ✅ Premier test de synchronisation

### Court terme (1 semaine)

- [ ] Monitoring erreurs (Sentry, Logflare)
- [ ] Webhook Supabase → MVP pour tracking
- [ ] Dashboard unifié (optionnel)
- [ ] Alertes si sync échoue

### Moyen terme (1 mois)

- [ ] Statistiques cross-system
- [ ] Enrichissement bidirectionnel
- [ ] Machine Learning sur préférences réelles
- [ ] Mobile app avec notifications push

---

## 🐛 Troubleshooting

### Problème : Annonces ne se synchronisent pas

**Vérifier :**
1. API MVP accessible depuis n8n : `curl http://localhost:3001/api/integration/annonces/new`
2. Workflow n8n activé
3. Logs n8n pour erreurs
4. Rate limiting pas dépassé

### Problème : Matchs non déclenchés

**Vérifier :**
1. Edge Function Supabase active
2. Table `biens_inter_agence` a bien `criteres_enrichis`
3. Acquéreurs ont des critères définis
4. Logs Edge Function

### Problème : Format données incompatible

**Solution :**
Ajuster la transformation dans le node n8n "Code - Extract Annonces"

---

## 📝 Configuration Environnement

### Variables `.env` MVP

```bash
# Existantes
DATABASE_URL=postgresql://...
RAPIDAPI_KEY=your_key

# Nouvelles (optionnelles)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
```

### Variables n8n

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_service_role_key
MVP_API_URL=http://localhost:3001  # ou https://api.votredomaine.com
```

---

## 🔐 Sécurité

### API MVP → n8n

**Option 1 : API Key** (recommandé)
```typescript
// Middleware auth simple
router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

**Option 2 : IP Whitelist**
```typescript
const allowedIPs = ['ip.de.n8n'];
if (!allowedIPs.includes(req.ip)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Supabase → MVP (webhooks)

Vérifier signature Supabase :
```typescript
const signature = req.headers['x-supabase-signature'];
// Validation...
```

---

## 📈 Métriques à suivre

- **Taux de synchronisation** : % annonces MVP → Supabase
- **Latence sync** : Temps entre scraping et matching
- **Taux de matching** : % acquéreurs recevant des emails
- **Taux d'ouverture** : Emails ouverts / envoyés
- **Conversions** : Visites programmées / matchs

---

## 💡 Idées d'améliorations futures

1. **IA améliorée** : Fine-tuning sur vos données réelles
2. **Prédiction prix** : Suggérer négociation
3. **Scoring vendeur** : Probabilité de vendre vite
4. **Alertes temps réel** : Push notification mobile
5. **Intégration CRM** : HubSpot, Pipedrive
6. **Visites virtuelles** : Intégration Matterport
7. **Chatbot acquéreur** : Questions/réponses automatiques

---

## 🤝 Support

**Documentation :**
- MVP App : [`README.md`](README.md)
- Workflows n8n : [`workflow-*.json`](.)
- Schéma acquéreurs : [`schema-acquereurs.prisma`](packages/backend/prisma/schema-acquereurs.prisma)

**Contact :**
- Issues GitHub
- Email : support@taskimmo.com
- Slack : #dev-matching

---

## ✨ Conclusion

Cette intégration vous permet de :

🎯 **Maximiser vos revenus** : Prospection vendeurs + Placement acquéreurs
⚡ **Automatiser** : Matching et notifications sans intervention
📊 **Analyser** : Métriques unifiées cross-system
🚀 **Scaler** : Architecture modulaire et évolutive

**Temps estimé de mise en place complète : 2-4 heures**

Let's go ! 🚀
