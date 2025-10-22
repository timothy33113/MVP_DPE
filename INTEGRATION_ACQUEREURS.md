# 🏠 Intégration Système Acquéreurs

## 📋 Vue d'ensemble

Ce document décrit l'intégration du système de matching acquéreurs dans votre application DPE.

**Objectif :** Connecter votre base Monday d'acquéreurs pour proposer automatiquement les biens correspondant à leurs critères.

---

## 🎯 Fonctionnalités

### 1. **Matching Bidirectionnel**

```
Prospection Vendeurs          Placement Acquéreurs
        ↓                              ↓
   Annonces LBC              Base Monday Acquéreurs
        ↓                              ↓
    DPE Match                    Biens disponibles
        ↓                              ↓
   Prospection               Notification acquéreurs
```

### 2. **Critères de Recherche Flexibles**

✅ **Budget** : Min/Max avec apport personnel
✅ **Type de bien** : Maison, Appartement (multi-sélection)
✅ **Localisation** : Code postal, Ville, Quartier, Zone personnalisée
✅ **Surface** : Min/Max
✅ **Pièces/Chambres** : Min/Max
✅ **DPE/GES** : Niveau maximum accepté
✅ **Travaux** : Neuf, Peu de travaux, Gros travaux

**Maison spécifique :**
- Terrain min/max
- Avec jardin, piscine, garage

**Appartement spécifique :**
- Étage min/max
- Ascenseur, balcon, terrasse
- Taille copropriété max

---

## 🗄️ Structure de Données

### Base Acquéreurs (PostgreSQL)

```sql
-- Acquéreur principal
Acquereur {
  id, nom, prenom, email, telephone
  budgetMin, budgetMax, apportPersonnel
  typeBienRecherche[]
  surfaceMin, surfaceMax
  piecesMin, chambresMin
  statut, priorité
  mondayItemId  -- Lien avec Monday
}

-- Localisations flexibles
LocalisationRecherche {
  type: CODE_POSTAL | VILLE | QUARTIER | ZONE
  valeur: "64000" | "Pau" | "Trespoey"
  priorite: 1 (principale) | 2 (secondaire)
}

-- Matchs générés
MatchAcquereur {
  acquereur ↔ bien (annonce LBC ou DPE)
  scoreTotal, scoreDetails
  pointsForts[], pointsFaibles[]
  statut, dateEnvoi, dateOuverture
}
```

---

## 🔗 Intégration Monday.com

### Option 1 : Import Périodique (Recommandé au départ)

**Script d'import :**
```typescript
// Récupère depuis Monday API
const acquereursMonday = await fetchFromMonday();

// Import dans PostgreSQL
for (const acq of acquereursMonday) {
  await prisma.acquereur.upsert({
    where: { mondayItemId: acq.id },
    update: { ...acq },
    create: { ...acq }
  });
}
```

**Fréquence :** Toutes les heures ou on-demand

### Option 2 : Webhook en Temps Réel

```
Monday.com → Webhook → API MVP → Update PostgreSQL
```

**Avantages :**
- Synchronisation instantanée
- Pas de polling
- Moins de charge

---

## 🤖 Algorithme de Matching

### Scoring (sur 100 points)

| Critère | Points | Logique |
|---------|--------|---------|
| **Budget** | 30 | Éliminatoire si > budgetMax |
| **Type bien** | 20 | Éliminatoire si pas recherché |
| **Localisation** | 20 | Éliminatoire si pas dans zones |
| **Surface** | 10 | Bonus si dans fourchette |
| **Pièces** | 10 | Bonus si ≥ min |
| **DPE** | 5 | Bonus si bon DPE |
| **Spécifiques** | 5 | Terrain, ascenseur, balcon... |

**Seuil minimum :** 50 points pour considérer le match

### Exemple de résultat

```json
{
  "bien": {
    "id": "...",
    "prix": 285000,
    "surface": 82,
    "pieces": 3,
    "codePostal": "64000"
  },
  "scoreTotal": 85,
  "scoreDetails": {
    "budget": 30,
    "typeBien": 20,
    "localisation": 20,
    "surface": 10,
    "pieces": 5
  },
  "pointsForts": [
    "Prix excellent : 285000€ (80% du budget)",
    "Type de bien : APPARTEMENT",
    "Localisation 64000",
    "Surface 82m²"
  ],
  "pointsFaibles": [
    "Étage 1 sans ascenseur"
  ]
}
```

---

## 📧 Système de Notifications

### Canaux Disponibles

1. **Email** (prioritaire)
   - Template personnalisé
   - Tracking ouverture/clics
   - Images du bien

2. **SMS** (via Aircall)
   - Alertes immédiates
   - Lien court vers fiche bien

3. **Monday.com**
   - Création automatique d'items
   - Mise à jour statuts

4. **WhatsApp** (optionnel)
   - Messages rich media
   - Conversation directe

### Workflow Automatisé

```
Nouveau bien détecté
    ↓
Matching avec acquéreurs actifs
    ↓
Score > 50 ?
    ↓ Oui
Créer MatchAcquereur
    ↓
Vérifier fréquence alerte acquéreur
    ↓
Envoyer notification (email/SMS)
    ↓
Tracking ouverture/clic
    ↓
Mise à jour Monday (optionnel)
```

---

## 🔌 API Endpoints

### Pour n8n ou Monday Automation

```typescript
// 1. Créer/Mettre à jour un acquéreur
POST /api/acquereurs
{
  "mondayItemId": "123456",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean@example.com",
  "budgetMax": 350000,
  "typeBienRecherche": ["MAISON"],
  "localisations": [
    { "type": "CODE_POSTAL", "valeur": "64000" },
    { "type": "VILLE", "valeur": "Jurançon" }
  ]
}

// 2. Lancer un matching
POST /api/matchs/acquereur/{id}
{
  "scoreMin": 50,
  "limit": 20
}

// 3. Récupérer les matchs
GET /api/acquereurs/{id}/matchs
→ Liste des matchs avec détails

// 4. Marquer un match comme envoyé
PATCH /api/matchs/{matchId}
{
  "statut": "ENVOYE",
  "canal": "EMAIL"
}

// 5. Webhook pour tracking email
POST /api/webhooks/email-opened
{
  "matchId": "...",
  "timestamp": "..."
}
```

---

## 📊 Interface Utilisateur

### Nouvelle Section "Acquéreurs"

```
├── 📋 Dashboard Acquéreurs
│   ├── Nombre total d'acquéreurs actifs
│   ├── Nombre de matchs générés aujourd'hui
│   ├── Taux d'ouverture des emails
│   └── Visites programmées
│
├── 👥 Liste Acquéreurs
│   ├── Filtres : Statut, Priorité, Budget
│   ├── Tri par : Date, Score moyen, Nombre de matchs
│   └── Actions : Éditer, Voir matchs, Archiver
│
├── 📝 Fiche Acquéreur
│   ├── Informations personnelles
│   ├── Critères de recherche (éditable)
│   ├── Liste des matchs
│   └── Historique des envois
│
└── 🎯 Matching
    ├── Vue "Biens à placer"
    │   └── Pour chaque bien : Top 5 acquéreurs
    │
    └── Vue "Acquéreurs à servir"
        └── Pour chaque acquéreur : Top 10 biens
```

---

## 🚀 Plan de Déploiement

### Phase 1 : Setup Base de Données ✅
- [x] Créer schéma Prisma
- [x] Créer service de matching
- [ ] Migration base de données
- [ ] Tests unitaires algorithme

### Phase 2 : Import Monday
- [ ] Script d'import Monday → PostgreSQL
- [ ] Mapping des champs Monday ↔ PostgreSQL
- [ ] Configuration webhook (optionnel)
- [ ] Test import 10 acquéreurs

### Phase 3 : Matching & API
- [ ] API REST pour acquéreurs
- [ ] Endpoint matching
- [ ] Tests de performance (100+ acquéreurs)

### Phase 4 : Notifications
- [ ] Templates email
- [ ] Intégration Aircall SMS
- [ ] Tracking email (ouvertures/clics)
- [ ] Configuration n8n workflow

### Phase 5 : Interface
- [ ] Section Acquéreurs dans l'app
- [ ] Dashboard statistiques
- [ ] Formulaire édition acquéreur
- [ ] Vue matching

### Phase 6 : Optimisation
- [ ] Cache Redis pour matchs fréquents
- [ ] Indexation base de données
- [ ] Logs & monitoring
- [ ] Alertes erreurs

---

## 📝 Prochaines Étapes

### Action Immédiate

1. **Partager structure Monday**
   - Quels champs existent ?
   - Comment sont stockés les critères ?
   - API key disponible ?

2. **Valider le schéma**
   - Tous les critères sont-ils couverts ?
   - Champs manquants ?

3. **Décider de l'approche**
   - Import périodique ou webhook ?
   - Commencer par combien d'acquéreurs tests ?

### Pour Démarrer le Développement

```bash
# 1. Créer la migration
cd packages/backend
npx prisma migrate dev --name add_acquereurs

# 2. Générer le client Prisma
npx prisma generate

# 3. Créer le script d'import Monday
pnpm create-script import-monday-acquereurs

# 4. Tester le matching
pnpm test:matching-acquereur
```

---

## 💡 Idées Futures

- **ML/IA** : Apprentissage des préférences réelles (clics, visites)
- **Score dynamique** : Ajustement selon historique
- **Prédiction prix** : Proposer négociation si prix élevé
- **Alertes proactives** : "Nouveau bien dans 2h correspond à 5 acquéreurs"
- **Mobile app** : Push notifications temps réel
- **Chat intégré** : Communication directe acquéreur ↔ agent

---

## 🤝 Support

Pour toute question sur l'intégration :

1. Vérifier ce document
2. Consulter le code : `src/services/matching-acquereur.service.ts`
3. Tester avec des données fictives
4. Valider avec vraies données Monday

**Note :** Le système est conçu pour être flexible. Les critères peuvent être ajoutés/modifiés sans casser l'algorithme de matching.
