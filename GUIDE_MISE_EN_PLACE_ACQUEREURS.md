# 🚀 Guide de Mise en Place - Module Acquéreurs

## ✅ Ce qui a été fait

### Backend (API Proxy vers Supabase)

**Fichiers créés :**
- [`packages/backend/src/routes/acquereurs.routes.ts`](packages/backend/src/routes/acquereurs.routes.ts) - Routes API CRUD acquéreurs

**Endpoints disponibles :**
```typescript
GET    /api/acquereurs              // Liste acquéreurs (avec filtres)
GET    /api/acquereurs/:id          // Détail acquéreur
POST   /api/acquereurs              // Créer acquéreur
PUT    /api/acquereurs/:id          // Modifier acquéreur
DELETE /api/acquereurs/:id          // Archiver acquéreur (soft delete)
GET    /api/acquereurs/:id/matchs   // Matchs d'un acquéreur
GET    /api/acquereurs/stats/dashboard // Stats dashboard
```

**Configuration :**
- Variables d'environnement ajoutées dans [`.env`](packages/backend/.env) :
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
  ```

### Frontend (Interface Acquéreurs)

**Fichiers créés :**
- [`packages/frontend/src/features/acquereurs/AcquereursDashboard.tsx`](packages/frontend/src/features/acquereurs/AcquereursDashboard.tsx)

**Pages disponibles :**
- `/acquereurs` - Dashboard + Liste acquéreurs

**Fonctionnalités :**
- ✅ Dashboard avec 4 KPIs (acquéreurs actifs, matchs aujourd'hui, taux ouverture, visites)
- ✅ Liste acquéreurs avec filtres
- ✅ Tableau complet (nom, email, budget, type recherché, statut)
- ✅ Activité récente
- ✅ Actions rapides

---

## 🔧 Configuration Requise

### 1. Obtenir les credentials Supabase

**a) URL du projet**
```
https://[votre-projet-id].supabase.co
```

**b) Service Role Key (attention : secret !)**
- Aller dans Supabase Dashboard
- Settings → API
- Copier `service_role` (pas `anon` !)

### 2. Configurer le backend

Éditer [`packages/backend/.env`](packages/backend/.env) :

```bash
# Remplacer par vos vraies valeurs
SUPABASE_URL=https://xxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...votre-clé...
```

### 3. Vérifier la structure Supabase

**Table `leads` (acquéreurs) :**
```sql
-- Colonnes minimales requises
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  prenom TEXT,
  email TEXT UNIQUE NOT NULL,
  telephone TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC NOT NULL,
  type_bien_recherche TEXT[], -- ['maison', 'appartement']
  statut_actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table `biens_inter_agence` (déjà créée normalement) :**
```sql
-- Utilisée pour les annonces LBC synchronisées
CREATE TABLE biens_inter_agence (
  id UUID PRIMARY KEY,
  lbc_id TEXT UNIQUE,
  titre TEXT,
  prix NUMERIC,
  type_bien TEXT,
  -- ... autres colonnes
);
```

**Table `matchs_acquereurs` (optionnelle pour l'instant) :**
```sql
CREATE TABLE matchs_acquereurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  bien_id UUID REFERENCES biens_inter_agence(id),
  score_ia NUMERIC,
  statut TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Tests de Fonctionnement

### Test 1 : API Backend

```bash
# 1. Vérifier que le serveur backend tourne
curl http://localhost:3001/health

# 2. Tester l'endpoint acquéreurs
curl http://localhost:3001/api/acquereurs

# Résultat attendu :
# {
#   "success": true,
#   "data": {
#     "acquereurs": [...],
#     "count": X
#   }
# }
```

### Test 2 : Stats Dashboard

```bash
curl http://localhost:3001/api/acquereurs/stats/dashboard

# Résultat attendu :
# {
#   "success": true,
#   "data": {
#     "total_acquereurs_actifs": 50,
#     "matchs_aujourdhui": 12,
#     "taux_ouverture_emails": 0,
#     "visites_programmees": 0
#   }
# }
```

### Test 3 : Frontend

1. Ouvrir [`http://localhost:5173/acquereurs`](http://localhost:5173/acquereurs)
2. Vérifier que la page se charge
3. Vérifier que les stats s'affichent
4. Cliquer sur "Liste" pour voir le tableau

---

## 🐛 Troubleshooting

### Erreur : "Supabase credentials not configured"

**Cause :** Variables d'environnement manquantes

**Solution :**
1. Vérifier que `.env` contient bien `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
2. Redémarrer le serveur backend
3. Vérifier avec : `console.log(config.externalApis.supabaseUrl)`

### Erreur : "Failed to fetch acquéreurs"

**Cause :** Problème de connexion Supabase ou table inexistante

**Solution :**
1. Vérifier que la table `leads` existe dans Supabase
2. Tester manuellement :
   ```bash
   curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
        "https://your-project.supabase.co/rest/v1/leads?select=*"
   ```
3. Vérifier les logs backend : `packages/backend/logs/combined.log`

### Erreur CORS

**Cause :** Frontend et backend sur des ports différents

**Solution :**
- Déjà configuré dans [`packages/backend/src/config/index.ts`](packages/backend/src/config/index.ts)
- Vérifier que `CORS_ORIGIN` inclut `http://localhost:5173`

### Page /acquereurs vide

**Possible causes :**
1. Pas d'acquéreurs dans Supabase → Ajouter des données de test
2. Filtres trop restrictifs → Vérifier query params
3. Erreur JS dans la console → Ouvrir DevTools

---

## 📝 Prochaines Étapes

### Court Terme (À faire maintenant)

1. **Configurer Supabase** (15 min)
   - [ ] Récupérer URL + Service Role Key
   - [ ] Mettre à jour `.env`
   - [ ] Redémarrer backend

2. **Tester les endpoints** (10 min)
   - [ ] `curl http://localhost:3001/api/acquereurs`
   - [ ] Vérifier réponse JSON

3. **Ajouter des données de test** (10 min)
   - [ ] Créer 3-5 acquéreurs dans Supabase
   - [ ] Vérifier qu'ils s'affichent dans `/acquereurs`

4. **Ajouter lien navigation** (5 min)
   - [ ] Ajouter bouton "Acquéreurs" dans Dashboard principal
   - [ ] Permettre accès facile à la page

### Moyen Terme (Semaine 1)

5. **Formulaire création/édition acquéreur**
   - Composant modal ou page dédiée
   - Validation des champs
   - Intégration avec API POST/PUT

6. **Page détail acquéreur**
   - Affichage complet des critères
   - Historique des matchs
   - Timeline communications

7. **Matching manuel**
   - Interface pour sélectionner acquéreur
   - Lancer matching avec Edge Function IA
   - Afficher résultats top 10 biens

### Long Terme (Semaine 2-4)

8. **Analytics avancées**
   - Graphiques performances
   - Rapports hebdomadaires
   - Prédictions ML

9. **Notifications temps réel**
   - WebSockets pour nouveaux matchs
   - Push notifications
   - Alertes personnalisées

10. **Optimisations**
    - Cache Redis pour requêtes fréquentes
    - Pagination côté serveur
    - Lazy loading images

---

## 💡 Données de Test Supabase

Pour tester rapidement, insérer dans Supabase SQL Editor :

```sql
-- Insérer 3 acquéreurs de test
INSERT INTO leads (nom, prenom, email, budget_max, type_bien_recherche, statut_actif)
VALUES
  ('Dupont', 'Jean', 'jean.dupont@example.com', 350000, ARRAY['maison'], TRUE),
  ('Martin', 'Marie', 'marie.martin@example.com', 250000, ARRAY['appartement'], TRUE),
  ('Durand', 'Pierre', 'pierre.durand@example.com', 400000, ARRAY['maison', 'appartement'], TRUE);

-- Vérifier l'insertion
SELECT * FROM leads ORDER BY created_at DESC LIMIT 10;
```

---

## 📚 Ressources

**Documentation :**
- [ARCHITECTURE_COMPLETE.md](ARCHITECTURE_COMPLETE.md) - Vision globale
- [INTEGRATION_N8N_SUPABASE.md](INTEGRATION_N8N_SUPABASE.md) - Guide intégration n8n
- [Supabase REST API Docs](https://supabase.com/docs/guides/api)

**Code Source :**
- Backend API : [`acquereurs.routes.ts`](packages/backend/src/routes/acquereurs.routes.ts)
- Frontend Dashboard : [`AcquereursDashboard.tsx`](packages/frontend/src/features/acquereurs/AcquereursDashboard.tsx)

---

## ✅ Checklist de Déploiement

Avant de passer en production :

- [ ] Variables Supabase configurées (URL + Service Role Key)
- [ ] Backend redémarré et fonctionnel
- [ ] Tests API réussis (curl)
- [ ] Frontend accessible sur `/acquereurs`
- [ ] Données de test créées dans Supabase
- [ ] Page se charge sans erreur console
- [ ] Stats dashboard affichent des chiffres
- [ ] Liste acquéreurs s'affiche correctement
- [ ] Workflow n8n sync LBC → Supabase actif
- [ ] Matching IA Edge Function testée

---

## 🎯 Résultat Attendu

Une fois configuré, vous devriez avoir :

1. **Page `/acquereurs` fonctionnelle** avec :
   - Dashboard affichant stats en temps réel
   - Liste complète des acquéreurs actifs
   - Filtres et recherche
   - Actions rapides (matching, rapports)

2. **API backend opérationnelle** :
   - CRUD complet acquéreurs
   - Proxy vers Supabase
   - Authentification sécurisée

3. **Synchronisation automatique** :
   - Annonces LBC → Supabase (via n8n)
   - Matching IA quotidien
   - Emails/SMS aux acquéreurs

4. **Deux flux de revenus** :
   - Prospection vendeurs (DPE/Monday)
   - Placement acquéreurs (Supabase/n8n)

---

**Temps total de mise en place : 30-45 minutes**

Bonne chance ! 🚀
