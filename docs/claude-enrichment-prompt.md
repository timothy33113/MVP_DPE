# Prompt Claude pour enrichissement des annonces Leboncoin

## Objectif
Analyser la description d'une annonce immobilière pour extraire des informations précises sur l'état du bien et les travaux nécessaires.

---

## Prompt à utiliser dans n8n

```
Tu es un expert en analyse d'annonces immobilières. Ton rôle est d'analyser la description d'une annonce Leboncoin et d'extraire des informations précises sur l'état du bien et les équipements.

# ANNONCE À ANALYSER

**Type de bien**: {{$json.type}}
**Surface**: {{$json.surface}}m²
**Pièces**: {{$json.pieces}}
**Prix**: {{$json.prix}}€

**Description complète**:
{{$json.description}}

---

# INSTRUCTIONS

Analyse cette description et retourne UNIQUEMENT un objet JSON (sans markdown, sans explication) avec les champs suivants:

## 1. État du bien (etat_bien)
Détermine l'état parmi ces 5 catégories EXACTES:
- **"neuf"**: Construction neuve, jamais habité, livraison récente
- **"renove"**: Entièrement rénové, refait à neuf, rénovation complète récente
- **"bon_etat"**: Bon état général, bien entretenu, habitable sans travaux
- **"a_rafraichir"**: Petits travaux à prévoir, rafraîchissement, peinture, quelques finitions
- **"travaux"**: Gros travaux nécessaires, à rénover, gros chantier, rénovation importante

## 2. Équipements (boolean)
Détecte la présence explicite de:
- **avec_balcon**: true si balcon mentionné
- **avec_terrasse**: true si terrasse mentionnée
- **avec_garage**: true si garage, box ou parking fermé mentionné
- **avec_cave**: true si cave ou cellier mentionné
- **avec_parking**: true si parking privatif ou place de parking

## 3. Surface terrain (surface_terrain)
Si c'est une maison et qu'un terrain est mentionné, extrais la surface en m² (nombre uniquement)

## 4. Détails des travaux (details_travaux)
Si des travaux sont mentionnés, liste-les de manière concise:
- Type de travaux (cuisine, sdb, toiture, etc.)
- Estimation de l'ampleur si mentionnée
- Budget travaux si indiqué

## 5. Confiance (confiance)
Ton niveau de confiance: "high", "medium", "low"

---

# EXEMPLES

**Exemple 1 - Neuf**:
Description: "Programme neuf, livraison T3 2025, jamais habité, cuisine équipée..."
```json
{
  "etat_bien": "neuf",
  "avec_balcon": false,
  "avec_terrasse": false,
  "avec_garage": false,
  "avec_cave": false,
  "avec_parking": false,
  "surface_terrain": null,
  "details_travaux": null,
  "confiance": "high"
}
```

**Exemple 2 - Rénové avec équipements**:
Description: "Appartement entièrement rénové en 2023, cuisine neuve, salle de bain refaite, parquet restauré, avec balcon et cave"
```json
{
  "etat_bien": "renove",
  "avec_balcon": true,
  "avec_terrasse": false,
  "avec_garage": false,
  "avec_cave": true,
  "avec_parking": false,
  "surface_terrain": null,
  "details_travaux": null,
  "confiance": "high"
}
```

**Exemple 3 - Gros travaux**:
Description: "Maison à rénover entièrement, gros chantier, toiture à refaire, électricité à revoir, cuisine et SDB à créer. Terrain 500m²"
```json
{
  "etat_bien": "travaux",
  "avec_balcon": false,
  "avec_terrasse": false,
  "avec_garage": false,
  "avec_cave": false,
  "avec_parking": false,
  "surface_terrain": 500,
  "details_travaux": "Rénovation complète: toiture, électricité, cuisine, SDB",
  "confiance": "high"
}
```

**Exemple 4 - À rafraîchir**:
Description: "Maison en bon état général mais à rafraîchir (peinture, quelques finitions). Garage et jardin 800m²"
```json
{
  "etat_bien": "a_rafraichir",
  "avec_balcon": false,
  "avec_terrasse": false,
  "avec_garage": true,
  "avec_cave": false,
  "avec_parking": false,
  "surface_terrain": 800,
  "details_travaux": "Rafraîchissement: peinture, finitions",
  "confiance": "high"
}
```

---

# RÈGLES IMPORTANTES

1. **Sois précis**: Ne mets "neuf" que si explicitement mentionné
2. **Sois conservateur**: En cas de doute entre deux états, choisis le moins favorable
3. **Équipements**: true SEULEMENT si explicitement mentionné dans la description
4. **Surface terrain**: Uniquement pour maisons/villas, null pour appartements sauf terrasse avec surface
5. **Confiance**:
   - "high": Information explicite et claire
   - "medium": Déduction logique mais pas explicite
   - "low": Incertain, manque d'information

---

**RETOURNE UNIQUEMENT LE JSON, RIEN D'AUTRE.**
```

---

## Format de réponse attendu

```json
{
  "etat_bien": "neuf|renove|bon_etat|a_rafraichir|travaux",
  "avec_balcon": boolean,
  "avec_terrasse": boolean,
  "avec_garage": boolean,
  "avec_cave": boolean,
  "avec_parking": boolean,
  "surface_terrain": number | null,
  "details_travaux": string | null,
  "confiance": "high|medium|low"
}
```

---

## Intégration dans n8n

### Workflow recommandé:

1. **HTTP Request** - GET `http://localhost:3001/api/webhooks/batch-enrich`
   - Headers: `x-api-key: [VOTRE_CLE_N8N]`
   - Retourne 100 annonces à enrichir

2. **Split In Batches** - Traiter par lots de 10

3. **Claude API**
   - Model: `claude-3-5-sonnet-20241022`
   - Prompt: (voir ci-dessus)
   - Temperature: 0.2 (pour plus de cohérence)
   - Max tokens: 500

4. **Code Node** - Parse JSON response
```javascript
const response = $json.content[0].text;
const parsed = JSON.parse(response);

return {
  json: {
    listId: $json.listId,
    enrichissement: parsed
  }
};
```

5. **HTTP Request** - POST `http://localhost:3001/api/webhooks/enrich-annonce`
   - Headers: `x-api-key: [VOTRE_CLE_N8N]`
   - Body: `{{ $json }}`

---

## Coût estimé

- **Claude 3.5 Sonnet**: ~$3 / 1M input tokens, ~$15 / 1M output tokens
- **Par annonce**: ~500 tokens input + ~100 tokens output = **~$0.003 / annonce**
- **5216 annonces**: ~$15-20 total

---

## Variables d'environnement nécessaires

Dans votre fichier `.env`:
```bash
N8N_API_KEY=AqkAGV95jdFedL1SxT8CKBTO1MmDPULIuSJAIAaBHRo=
ANTHROPIC_API_KEY=sk-ant-xxx... # Votre clé Claude API
```
