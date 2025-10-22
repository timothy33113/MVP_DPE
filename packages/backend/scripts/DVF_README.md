# 🏢 Intégration DVF (Demandes de Valeurs Foncières)

## Qu'est-ce que DVF?

DVF est une base de données publique qui recense **toutes les ventes immobilières en France depuis 2014** (hors Alsace-Moselle et Mayotte).

## Données disponibles

Pour chaque transaction immobilière:
- 💰 **Prix de vente réel**
- 📏 **Surface habitable** (m²)
- 🏠 **Type de bien** (maison, appartement, terrain)
- 🏘️ **Nombre de pièces**
- 📍 **Adresse complète** + coordonnées GPS
- 📅 **Date de vente**
- 🌳 **Surface terrain** (pour maisons/terrains)

## Utilisation pour votre outil

### 1️⃣ Télécharger les données DVF

```bash
cd packages/backend
pnpm fetch:dvf:pau
```

⚠️ **Attention**: Le fichier DVF 2024 complet fait ~2GB. Le téléchargement peut prendre plusieurs minutes.

Le script va:
1. Télécharger le fichier DVF 2024 (compressed)
2. Le décompresser
3. Filtrer les transactions pour Pau et environs (~15 communes)
4. Afficher des statistiques et exemples

### 2️⃣ Créer la table Prisma

Ajoutez ce modèle à `prisma/schema.prisma`:

```prisma
model DvfTransaction {
  id                      String    @id @default(uuid())
  idMutation              String    @map("id_mutation")
  dateMutation            DateTime  @map("date_mutation")
  natureMutation          String    @map("nature_mutation") // Vente, échange, etc.
  valeurFonciere          Float?    @map("valeur_fonciere")

  // Adresse
  adresseNumero           String?   @map("adresse_numero")
  adresseNomVoie          String?   @map("adresse_nom_voie")
  codePostal              String    @map("code_postal")
  codeCommune             String    @map("code_commune")
  nomCommune              String    @map("nom_commune")

  // Bien
  typeLocal               String?   @map("type_local") // Maison, Appartement
  surfaceReelleBati       Float?    @map("surface_reelle_bati")
  nombrePiecesPrincipales Int?      @map("nombre_pieces_principales")
  surfaceTerrain          Float?    @map("surface_terrain")
  nombreLots              Int?      @map("nombre_lots")

  // Géolocalisation
  latitude                Float?
  longitude               Float?

  createdAt               DateTime  @default(now()) @map("created_at")

  @@index([codeCommune])
  @@index([codePostal])
  @@index([typeLocal])
  @@index([dateMutation])
  @@index([latitude, longitude])
  @@map("dvf_transactions")
}
```

Puis lancez:
```bash
pnpm db:migrate
```

### 3️⃣ Importer en base

Modifiez le script `fetch-dvf-pau.ts` pour importer en base au lieu de juste afficher:

```typescript
// Insérer les transactions en base
for (const record of pauTransactions) {
  await prisma.dvfTransaction.create({
    data: {
      idMutation: record.id_mutation,
      dateMutation: new Date(record.date_mutation),
      natureMutation: record.nature_mutation,
      valeurFonciere: parseFloat(record.valeur_fonciere || '0') || null,
      adresseNumero: record.adresse_numero,
      adresseNomVoie: record.adresse_nom_voie,
      codePostal: record.code_postal,
      codeCommune: record.code_commune,
      nomCommune: record.nom_commune,
      typeLocal: record.type_local,
      surfaceReelleBati: parseFloat(record.surface_reelle_bati || '0') || null,
      nombrePiecesPrincipales: parseInt(record.nombre_pieces_principales || '0') || null,
      surfaceTerrain: parseFloat(record.surface_terrain || '0') || null,
      nombreLots: parseInt(record.nombre_lots || '0') || null,
      latitude: parseFloat(record.latitude || '0') || null,
      longitude: parseFloat(record.longitude || '0') || null,
    }
  });
}
```

### 4️⃣ Créer l'endpoint API

Créez `src/modules/dvf/dvf.controller.ts`:

```typescript
export class DvfController {
  /**
   * GET /api/dvf/comparables?lat=43.295&lng=-0.370&type=Maison&surface=120
   * Trouve des transactions comparables
   */
  getComparables = asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, type, surface } = req.query;

    // Recherche dans un rayon de 500m
    const comparables = await prisma.dvfTransaction.findMany({
      where: {
        typeLocal: type as string,
        surfaceReelleBati: {
          gte: Number(surface) * 0.8,  // -20%
          lte: Number(surface) * 1.2,  // +20%
        },
        dateMutation: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 derniers mois
        },
      },
      orderBy: {
        dateMutation: 'desc',
      },
      take: 5,
    });

    res.json({ success: true, data: comparables });
  });
}
```

### 5️⃣ Afficher dans les popups

Dans `MapView.tsx`, ajoutez une section "Prix du marché":

```typescript
<!-- Prix du marché -->
<div style="background: #fff; padding: 6px; border-radius: 4px; margin: 6px 0;">
  <div style="font-size: 10px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">
    📈 ANALYSE DE MARCHÉ
  </div>

  ${comparables?.length > 0 ? `
    <div style="font-size: 10px;">
      <strong>Prix moyen secteur:</strong> ${avgPrixM2}€/m²
    </div>
    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
      Basé sur ${comparables.length} ventes récentes
    </div>

    ${prixAnnonce > avgPrixM2 * 1.1 ? `
      <div style="font-size: 9px; padding: 3px; background: #fee2e2; color: #991b1b; border-radius: 3px; margin-top: 3px;">
        ⚠️ Surévalué de ${Math.round((prixAnnonce / avgPrixM2 - 1) * 100)}%
      </div>
    ` : prixAnnonce < avgPrixM2 * 0.9 ? `
      <div style="font-size: 9px; padding: 3px; background: #dcfce7; color: #166534; border-radius: 3px; margin-top: 3px;">
        ✅ Bon rapport qualité/prix (-${Math.round((1 - prixAnnonce / avgPrixM2) * 100)}%)
      </div>
    ` : ''}
  ` : '<div style="font-size: 9px; color: #64748b;">Pas de comparables récents</div>'}
</div>
```

## Cas d'usage

### 🎯 Détecter sur/sous-évaluation
- Comparer prix annoncé vs prix marché
- Argument de négociation pour acheteurs

### 📊 Analyse de quartier
- Prix moyen au m² dans le secteur
- Tendances des prix (hausse/baisse)

### 🔍 Historique du bien
- Voir si le bien a été vendu récemment
- Détecter les flips immobiliers

### 💰 Estimation de valeur
- Fournir une estimation basée sur transactions réelles
- Plus fiable que les estimations algorithmiques

## Limites

- ❌ Pas de données pour Alsace-Moselle et Mayotte
- ⏳ Données disponibles depuis 2014 seulement
- 🕐 Mise à jour tous les 6 mois
- 📦 Fichier volumineux (~2GB pour la France entière)

## Ressources

- [Data.gouv.fr - DVF](https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/)
- [App DVF Etalab](https://app.dvf.etalab.gouv.fr/)
- [Documentation officielle](https://cadastre.data.gouv.fr/dvf)
