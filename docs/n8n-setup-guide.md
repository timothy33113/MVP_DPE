# Guide de configuration n8n pour l'enrichissement Claude

## ✅ Backend prêt

Les webhooks sont configurés et testés avec succès :
- ✅ `POST /api/webhooks/batch-enrich` - Retourne les annonces à enrichir
- ✅ `POST /api/webhooks/enrich-annonce` - Reçoit l'enrichissement Claude

## 🚀 Configuration n8n

### 1. Prérequis

Assurez-vous d'avoir dans votre `.env` :
```bash
N8N_API_KEY=AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=
ANTHROPIC_API_KEY=sk-ant-xxx... # Votre clé Claude API
```

### 2. Importer le workflow

1. Ouvrez n8n
2. Cliquez sur "Import from File"
3. Sélectionnez le fichier `n8n-workflow-template.json`
4. Le workflow sera créé avec 5 nœuds pré-configurés

### 3. Configuration des variables d'environnement dans n8n

Dans n8n, ajoutez la variable d'environnement :
- `ANTHROPIC_API_KEY` : Votre clé API Claude

### 4. Workflow détaillé - SLOW MODE (avec pauses)

**⏱️ IMPORTANT : Claude enrichit lentement, le workflow inclut des pauses importantes**

```
┌─────────────────────┐
│ 1. Batch Enrich     │  → Récupère 50 annonces à enrichir (réduit de 100→50)
│ POST /batch-enrich  │     Headers: x-api-key
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. Split Batches    │  → Traite par lots de 5 (réduit de 10→5)
│ Lots de 5           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. ⏸️ PAUSE 3s      │  → Attente avant chaque appel Claude
│ Wait 3 secondes     │     Évite le rate limiting
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. Claude API       │  → Analyse la description
│ claude-3-5-sonnet   │     Temp: 0.2, Max tokens: 500
│ POST /v1/messages   │     Timeout: 30s
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Parse JSON       │  → Extrait la réponse Claude
│ Code Node           │     content[0].text → JSON
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Enrich Annonce   │  → Envoie au backend
│ POST /enrich-annonce│     ✅ Sync PostgreSQL + Supabase
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 7. ⏸️ PAUSE 2s      │  → Attente avant l'annonce suivante
│ Wait 2 secondes     │     Cycle: 50 annonces = 10 lots de 5
└─────────────────────┘
           │
           └──────────> Retour au step 2 (lot suivant)
```

**Timings calculés :**
- Pause avant Claude : **3 secondes**
- Appel Claude + traitement : **~5-7 secondes**
- Pause après envoi : **2 secondes**
- **Total par annonce : ~10-12 secondes**
- **50 annonces : ~8-10 minutes** (très lent mais respecte les rate limits)

### 5. Test du workflow

#### Test manuel avec 3 annonces :

```bash
# 1. Vérifier que le backend tourne
curl http://localhost:3001/api/health

# 2. Tester batch-enrich (déjà testé avec succès ✅)
curl -X POST http://localhost:3001/api/webhooks/batch-enrich \
  -H "x-api-key: AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=" \
  -H "Content-Type: application/json" \
  -d '{"limit": 3}'

# Retourne 3 annonces avec descriptions complètes ✅
```

#### Exemple de réponse Claude attendue :

```json
{
  "etat_bien": "bon_etat",
  "avec_balcon": false,
  "avec_terrasse": true,
  "avec_garage": true,
  "avec_cave": false,
  "avec_parking": false,
  "surface_terrain": null,
  "details_travaux": null,
  "confiance": "high"
}
```

### 6. Lancer l'enrichissement complet

1. Dans n8n, activez le workflow
2. Exécutez-le manuellement pour tester
3. Vérifiez les logs backend pour voir les enrichissements

**⚠️ Progression attendue avec SLOW MODE :**
- 5216 annonces à enrichir
- **50 par batch** (réduit de 100)
- **~105 exécutions du workflow** (au lieu de 52)
- **Durée estimée : 10-12 heures** ⏱️ (très lent, ~10-12 sec/annonce)
- Coût : ~$15-20 avec Claude 3.5 Sonnet

**💡 Recommandations :**
- **Lancer la nuit** ou en arrière-plan
- Surveiller les 50 premières annonces pour valider
- Relancer le workflow plusieurs fois (il ne traite que les annonces non enrichies)
- Si Claude API rate limite, augmenter les pauses (3s → 5s, 2s → 3s)

### 7. Monitoring

#### Vérifier les enrichissements en base :

```sql
-- Nombre d'annonces enrichies
SELECT COUNT(*)
FROM "LeboncoinAnnonce"
WHERE "rawData"::jsonb -> 'enrichissement_ia' IS NOT NULL;

-- Derniers enrichissements
SELECT
  "listId",
  "etatBien",
  "rawData"::jsonb -> 'enrichissement_ia' ->> 'date' as enrichi_le,
  "rawData"::jsonb -> 'enrichissement_ia' ->> 'confiance' as confiance
FROM "LeboncoinAnnonce"
WHERE "rawData"::jsonb -> 'enrichissement_ia' IS NOT NULL
ORDER BY "rawData"::jsonb -> 'enrichissement_ia' ->> 'date' DESC
LIMIT 10;
```

#### Vérifier la synchronisation Supabase :

```sql
-- Dans Supabase (biens_inter_agence)
SELECT
  lbc_id,
  criteres_enrichis -> 'etat' as etat,
  criteres_enrichis -> 'enrichissement_ia' ->> 'date' as enrichi_le,
  criteres_enrichis -> 'enrichissement_ia' ->> 'confiance' as confiance
FROM biens_inter_agence
WHERE criteres_enrichis -> 'enrichissement_ia' IS NOT NULL
ORDER BY criteres_enrichis -> 'enrichissement_ia' ->> 'date' DESC
LIMIT 10;
```

#### Logs backend :

```bash
# Suivre les enrichissements en temps réel
tail -f /Users/timothy/MVP_DPE/packages/backend/logs/combined.log | grep enrichissement

# Rechercher les synchronisations Supabase
tail -f /Users/timothy/MVP_DPE/packages/backend/logs/combined.log | grep "synchronisé vers Supabase"
```

## 📊 Résultats attendus

Avant enrichissement (extraction simple) :
- 100% prix détecté
- 72% chambres détectées
- 34% garage détecté
- 30% terrasse détectée
- **27% état détecté** ⚠️

Après enrichissement Claude :
- **80-90% état détecté** 🎯
- Équipements : +10-15% de précision
- Détails travaux : descriptions riches
- Confiance : niveau de certitude par annonce
- **✅ Synchronisation automatique vers Supabase** (biens_inter_agence.criteres_enrichis)

## 🔧 Troubleshooting

### Erreur 401 Unauthorized
➜ Vérifier que `x-api-key` est bien `AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=`

### Erreur Claude API
➜ Vérifier `ANTHROPIC_API_KEY` dans les variables d'environnement n8n

### Annonce non trouvée (404)
➜ L'annonce a peut-être été supprimée de la base, le workflow continue avec la suivante

### Timeout
➜ Réduire le batch size de 100 à 50 dans le premier nœud

## 📝 Notes

- Le workflow peut être relancé plusieurs fois, seules les annonces non enrichies seront traitées
- La confiance "low" indique qu'il faudra peut-être vérifier manuellement
- Les détails_travaux sont stockés dans rawData.enrichissement_ia pour audit
- Le champ etatBien est mis à jour directement et utilisé par l'algorithme de matching

## ✅ Checklist

- [ ] Clé API Claude configurée dans n8n
- [ ] Workflow importé depuis n8n-workflow-template.json
- [ ] Test manuel avec 3 annonces réussi
- [ ] Backend en cours d'exécution (port 3001)
- [ ] Lancement de l'enrichissement complet
- [ ] Vérification des résultats en base
- [ ] Test du matching avec les nouveaux critères d'état
