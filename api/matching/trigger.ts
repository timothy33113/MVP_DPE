/**
 * Vercel Serverless Function — POST /api/matching/trigger
 *
 * Lance le matching acquéreur ↔ bien Amanda via Supabase REST API (HTTPS).
 * Pas de Prisma, pas de connexion PostgreSQL directe.
 *
 * Body JSON :
 *   { "apiKey": "...", "scoreMin": 40, "bienIds": [...], "dryRun": false }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface BienNormalise {
  id: string;
  typeBien: string | null;
  surface: number;
  pieces: number;
  chambres: number;
  codePostal: string;
  ville: string | null;
  prix: number | null;
  etiquetteDpe: string | null;
  etiquetteGes: string | null;
  surfaceTerrain: number | null;
  etage: number | null;
  anneConstruction: number | null;
  etatGeneral: string | null;
  avecAscenseur: boolean;
  avecBalcon: boolean;
  avecTerrasse: boolean;
  avecParking: boolean;
  avecGarage: boolean;
  avecJardin: boolean;
  avecPiscine: boolean;
  avecCave: boolean;
  estCopropriete: boolean;
  nbLotsCopro: number | null;
  mandateRef: string;
  mondayItemId: string | null;
}

interface ScoreDetails {
  budget: number;
  typeBien: number;
  localisation: number;
  surface: number;
  pieces: number;
  dpe: number;
  equipements: number;
}

interface ResultatMatch {
  bien: BienNormalise;
  scoreTotal: number;
  scoreDetails: ScoreDetails;
  pointsForts: string[];
  pointsFaibles: string[];
}

// ============================================================================
// Supabase client
// ============================================================================

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  return createClient(url, key);
}

// ============================================================================
// Data fetching via Supabase REST
// ============================================================================

async function fetchBiens(supabase: SupabaseClient, bienIds?: string[]) {
  let query = supabase
    .from('amanda_biens')
    .select('*')
    .in('statut', ['DISPONIBLE', 'OFFRE_EN_COURS'])
    .not('type_bien', 'is', null)
    .not('code_postal', 'is', null);

  if (bienIds && bienIds.length > 0) {
    query = query.in('id', bienIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur fetch biens: ${error.message}`);
  return data || [];
}

async function fetchAcquereurs(supabase: SupabaseClient, acquereurIds?: string[]) {
  let query = supabase
    .from('acquereurs')
    .select('*')
    .eq('statutActif', true);

  if (acquereurIds && acquereurIds.length > 0) {
    query = query.in('id', acquereurIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur fetch acquéreurs: ${error.message}`);
  return data || [];
}

async function fetchLocalisations(supabase: SupabaseClient, acquereurIds: string[]) {
  if (acquereurIds.length === 0) return [];

  // Supabase REST a une limite sur la taille du IN, on batch par 500
  const allLocs: any[] = [];
  for (let i = 0; i < acquereurIds.length; i += 500) {
    const batch = acquereurIds.slice(i, i + 500);
    const { data, error } = await supabase
      .from('localisations_recherche')
      .select('*')
      .in('acquereur_id', batch);
    if (error) throw new Error(`Erreur fetch localisations: ${error.message}`);
    if (data) allLocs.push(...data);
  }
  return allLocs;
}

// ============================================================================
// Normalisation AmandaBien (snake_case → BienNormalise)
// ============================================================================

function amandaBienToNormalise(ab: any): BienNormalise {
  return {
    id: ab.id,
    typeBien: ab.type_bien,
    surface: ab.surface_habitable || ab.surface_carrez || 0,
    pieces: ab.nb_pieces || 0,
    chambres: ab.nb_chambres || 0,
    codePostal: ab.code_postal || '',
    ville: ab.ville,
    prix: ab.prix,
    etiquetteDpe: ab.dpe_classe,
    etiquetteGes: ab.ges_classe,
    surfaceTerrain: ab.surface_terrain,
    etage: ab.etage,
    anneConstruction: ab.anne_construction,
    etatGeneral: ab.etat_general,
    avecAscenseur: ab.avec_ascenseur || false,
    avecBalcon: ab.avec_balcon || false,
    avecTerrasse: ab.avec_terrasse || false,
    avecParking: ab.avec_parking || false,
    avecGarage: ab.avec_garage || false,
    avecJardin: ab.avec_jardin || false,
    avecPiscine: ab.avec_piscine || false,
    avecCave: ab.avec_cave || false,
    estCopropriete: ab.est_copropriete || false,
    nbLotsCopro: ab.nb_lots_copro,
    mandateRef: ab.mandate_ref,
    mondayItemId: ab.monday_item_id,
  };
}

// ============================================================================
// Algorithme de scoring (100 points) — identique au service existant
// ============================================================================

function formatPrix(prix: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix);
}

function eliminatoire(bien: BienNormalise, scores: ScoreDetails, raison: string): ResultatMatch {
  return { bien, scoreTotal: 0, scoreDetails: scores, pointsForts: [], pointsFaibles: [raison] };
}

function calculateMatch(bien: BienNormalise, acquereur: any, localisations: any[]): ResultatMatch {
  const scores: ScoreDetails = { budget: 0, typeBien: 0, localisation: 0, surface: 0, pieces: 0, dpe: 0, equipements: 0 };
  const pointsForts: string[] = [];
  const pointsFaibles: string[] = [];

  // 1. BUDGET (30 points)
  if (bien.prix && acquereur.budgetMax) {
    if (bien.prix > acquereur.budgetMax) {
      const depassement = Math.round(((bien.prix - acquereur.budgetMax) / acquereur.budgetMax) * 100);
      if (depassement > 15) return eliminatoire(bien, scores, `Prix ${formatPrix(bien.prix)} dépasse le budget de ${depassement}%`);
      scores.budget = 5;
      pointsFaibles.push(`Prix ${formatPrix(bien.prix)} > budget max ${formatPrix(acquereur.budgetMax)} (+${depassement}%)`);
    } else {
      const pourcentage = bien.prix / acquereur.budgetMax;
      if (acquereur.budgetMin && bien.prix < acquereur.budgetMin) {
        scores.budget = 10;
        pointsFaibles.push(`Prix ${formatPrix(bien.prix)} < budget min ${formatPrix(acquereur.budgetMin)}`);
      } else if (pourcentage <= 0.75) {
        scores.budget = 30;
        pointsForts.push(`Excellent prix : ${formatPrix(bien.prix)} (${Math.round(pourcentage * 100)}% du budget)`);
      } else if (pourcentage <= 0.90) {
        scores.budget = 25;
        pointsForts.push(`Bon prix : ${formatPrix(bien.prix)}`);
      } else {
        scores.budget = 20;
        pointsForts.push(`Prix dans le budget : ${formatPrix(bien.prix)}`);
      }
    }
  } else {
    scores.budget = 15;
  }

  // 2. TYPE DE BIEN (20 points)
  if (!bien.typeBien) {
    scores.typeBien = 5;
  } else if (acquereur.typeBienRecherche && acquereur.typeBienRecherche.length > 0) {
    if (acquereur.typeBienRecherche.includes(bien.typeBien)) {
      scores.typeBien = 20;
    } else {
      return eliminatoire(bien, scores, `Type ${bien.typeBien} non recherché (cherche: ${acquereur.typeBienRecherche.join(', ')})`);
    }
  } else {
    scores.typeBien = 10;
  }

  // 3. LOCALISATION (20 points)
  let matchLoc = false;

  if (bien.codePostal) {
    const locCP = localisations.find((loc: any) => loc.type === 'CODE_POSTAL' && loc.valeur === bien.codePostal);
    if (locCP) {
      scores.localisation = locCP.priorite === 1 ? 20 : 15;
      pointsForts.push(`Localisation ${bien.codePostal}${bien.ville ? ` (${bien.ville})` : ''}`);
      matchLoc = true;
    }
  }

  if (!matchLoc && bien.ville) {
    const locVille = localisations.find((loc: any) => loc.type === 'VILLE' && loc.valeur.toLowerCase() === bien.ville!.toLowerCase());
    if (locVille) {
      scores.localisation = locVille.priorite === 1 ? 20 : 15;
      pointsForts.push(`Ville ${bien.ville}`);
      matchLoc = true;
    }
  }

  if (!matchLoc && bien.codePostal) {
    const dept = bien.codePostal.substring(0, 2);
    const locDept = localisations.find((loc: any) => loc.valeur.startsWith(dept));
    if (locDept) {
      scores.localisation = 8;
      pointsForts.push(`Même département ${dept}`);
      matchLoc = true;
    }
  }

  if (!matchLoc && localisations.length > 0) {
    return eliminatoire(bien, scores, `Localisation ${bien.codePostal || bien.ville} non recherchée`);
  } else if (!matchLoc) {
    scores.localisation = 10;
  }

  // 4. SURFACE (10 points)
  if (bien.surface > 0) {
    if (acquereur.surfaceMin && bien.surface < acquereur.surfaceMin) {
      const deficit = Math.round(((acquereur.surfaceMin - bien.surface) / acquereur.surfaceMin) * 100);
      if (deficit > 30) {
        pointsFaibles.push(`Surface ${bien.surface}m² très insuffisante (min ${acquereur.surfaceMin}m²)`);
      } else {
        scores.surface = 3;
        pointsFaibles.push(`Surface ${bien.surface}m² < min ${acquereur.surfaceMin}m²`);
      }
    } else if (acquereur.surfaceMax && bien.surface > acquereur.surfaceMax) {
      scores.surface = 5;
      pointsFaibles.push(`Surface ${bien.surface}m² > max ${acquereur.surfaceMax}m²`);
    } else {
      scores.surface = 10;
      pointsForts.push(`Surface ${bien.surface}m²`);
    }
  } else {
    scores.surface = 5;
  }

  // 5. PIECES / CHAMBRES (10 points)
  let scorePieces = 0;
  if (bien.chambres > 0 && acquereur.chambresMin) {
    if (bien.chambres >= acquereur.chambresMin) {
      scorePieces = 7;
      pointsForts.push(`${bien.chambres} chambres`);
    } else {
      pointsFaibles.push(`${bien.chambres} ch. < min ${acquereur.chambresMin}`);
    }
  }
  if (bien.pieces > 0) {
    if (acquereur.piecesMin && bien.pieces < acquereur.piecesMin) {
      pointsFaibles.push(`${bien.pieces} pièces < min ${acquereur.piecesMin}`);
    } else if (acquereur.piecesMax && bien.pieces > acquereur.piecesMax) {
      scores.pieces = Math.max(scorePieces, 5);
    } else if (acquereur.piecesMin && bien.pieces >= acquereur.piecesMin) {
      scores.pieces = Math.max(scorePieces, 10);
      if (scorePieces === 0) pointsForts.push(`${bien.pieces} pièces`);
    } else {
      scores.pieces = Math.max(scorePieces, 5);
    }
  } else {
    scores.pieces = Math.max(scorePieces, 5);
  }

  // 6. DPE (5 points)
  if (bien.etiquetteDpe && acquereur.dpeMax) {
    const dpeValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const indexBien = dpeValues.indexOf(bien.etiquetteDpe);
    const indexMax = dpeValues.indexOf(acquereur.dpeMax);
    if (indexBien >= 0 && indexMax >= 0) {
      if (indexBien <= indexMax) {
        scores.dpe = indexBien <= 2 ? 5 : 3;
        pointsForts.push(`DPE ${bien.etiquetteDpe}`);
      } else {
        pointsFaibles.push(`DPE ${bien.etiquetteDpe} > max accepté ${acquereur.dpeMax}`);
      }
    }
  } else if (bien.etiquetteDpe) {
    const idx = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].indexOf(bien.etiquetteDpe);
    scores.dpe = idx <= 2 ? 5 : idx <= 4 ? 3 : 1;
  }

  // 7. EQUIPEMENTS (5 points)
  let scoreEquip = 0;
  const equipDemandes: string[] = [];
  const equipPresents: string[] = [];

  if (bien.typeBien === 'MAISON') {
    if (acquereur.terrainMin && bien.surfaceTerrain) {
      if (bien.surfaceTerrain >= acquereur.terrainMin) {
        scoreEquip += 1.5;
        pointsForts.push(`Terrain ${bien.surfaceTerrain}m²`);
      } else {
        pointsFaibles.push(`Terrain ${bien.surfaceTerrain}m² < min ${acquereur.terrainMin}m²`);
      }
    }
    if (acquereur.avecGarage) { equipDemandes.push('garage'); if (bien.avecGarage) { scoreEquip += 1; equipPresents.push('garage'); } }
    if (acquereur.avecJardin) { equipDemandes.push('jardin'); if (bien.avecJardin) { scoreEquip += 1; equipPresents.push('jardin'); } }
    if (acquereur.avecPiscine) { equipDemandes.push('piscine'); if (bien.avecPiscine) { scoreEquip += 1.5; equipPresents.push('piscine'); } }
  }

  if (bien.typeBien === 'APPARTEMENT') {
    if (acquereur.avecAscenseur) {
      equipDemandes.push('ascenseur');
      if (bien.avecAscenseur) { scoreEquip += 1.5; equipPresents.push('ascenseur'); }
      else if (bien.etage && bien.etage > 2) {
        pointsFaibles.push(`Étage ${bien.etage} sans ascenseur`);
      }
    }
    if (acquereur.avecBalcon) { equipDemandes.push('balcon'); if (bien.avecBalcon) { scoreEquip += 1; equipPresents.push('balcon'); } }
    if (acquereur.avecTerrasse) { equipDemandes.push('terrasse'); if (bien.avecTerrasse) { scoreEquip += 1.5; equipPresents.push('terrasse'); } }
    if (acquereur.avecParking) { equipDemandes.push('parking'); if (bien.avecParking) { scoreEquip += 1; equipPresents.push('parking'); } }
    if (acquereur.tailleCoproMax && bien.estCopropriete && bien.nbLotsCopro && bien.nbLotsCopro > acquereur.tailleCoproMax) {
      pointsFaibles.push(`Copro ${bien.nbLotsCopro} lots > max ${acquereur.tailleCoproMax}`);
    }
  }

  scores.equipements = Math.min(scoreEquip, 5);
  if (equipPresents.length > 0) pointsForts.push(`Équipements : ${equipPresents.join(', ')}`);
  const equipManquants = equipDemandes.filter(e => !equipPresents.includes(e));
  if (equipManquants.length > 0) pointsFaibles.push(`Manque : ${equipManquants.join(', ')}`);

  // SCORE TOTAL
  const scoreTotal = Math.round(
    scores.budget + scores.typeBien + scores.localisation +
    scores.surface + scores.pieces + scores.dpe + scores.equipements
  );

  return { bien, scoreTotal, scoreDetails: scores, pointsForts, pointsFaibles };
}

// ============================================================================
// Upsert match via Supabase
// ============================================================================

async function upsertMatchs(supabase: SupabaseClient, matchsToUpsert: any[]): Promise<{ nouveaux: number; misAJour: number }> {
  if (matchsToUpsert.length === 0) return { nouveaux: 0, misAJour: 0 };

  let nouveaux = 0;
  let misAJour = 0;

  // Batch upsert par 500
  for (let i = 0; i < matchsToUpsert.length; i += 500) {
    const batch = matchsToUpsert.slice(i, i + 500);

    const { data, error } = await supabase
      .from('match_acquereur_amanda')
      .upsert(batch, {
        onConflict: 'acquereur_id,bien_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`Erreur upsert batch ${i}:`, error.message);
      // Continue with next batch
    } else {
      // On ne peut pas facilement distinguer new vs update avec upsert
      // On compte tout comme "traité"
      nouveaux += (data?.length || 0);
    }
  }

  return { nouveaux, misAJour };
}

// ============================================================================
// Handler principal
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const { apiKey, scoreMin = 40, bienIds, acquereurIds, dryRun = false } = req.body || {};
  const expectedKey = process.env.MATCHING_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const startTime = Date.now();

  try {
    const supabase = getSupabase();

    console.log('[Matching] Déclenchement matching...');

    // 1. Fetch biens
    const biens = await fetchBiens(supabase, bienIds);
    console.log(`[Matching] ${biens.length} biens récupérés`);

    // 2. Fetch acquéreurs
    const acquereurs = await fetchAcquereurs(supabase, acquereurIds);
    console.log(`[Matching] ${acquereurs.length} acquéreurs récupérés`);

    // 3. Fetch toutes les localisations en une seule requête
    const acquereurIdsAll = acquereurs.map((a: any) => a.id);
    const allLocalisations = await fetchLocalisations(supabase, acquereurIdsAll);
    console.log(`[Matching] ${allLocalisations.length} localisations récupérées`);

    // Index localisations par acquereur_id pour accès rapide
    const locsByAcquereur = new Map<string, any[]>();
    for (const loc of allLocalisations) {
      const key = loc.acquereur_id;
      if (!locsByAcquereur.has(key)) locsByAcquereur.set(key, []);
      locsByAcquereur.get(key)!.push(loc);
    }

    // 4. Matching
    const matchsToUpsert: any[] = [];
    const topMatchs: Array<{ acquereurNom: string; bienRef: string; score: number }> = [];

    for (const rawBien of biens) {
      const bien = amandaBienToNormalise(rawBien);

      for (const acquereur of acquereurs) {
        const locs = locsByAcquereur.get(acquereur.id) || [];
        const resultat = calculateMatch(bien, acquereur, locs);

        if (resultat.scoreTotal < scoreMin) continue;

        topMatchs.push({
          acquereurNom: `${acquereur.prenom || ''} ${acquereur.nom || ''}`.trim(),
          bienRef: bien.mandateRef,
          score: resultat.scoreTotal,
        });

        if (!dryRun) {
          matchsToUpsert.push({
            acquereur_id: acquereur.id,
            bien_id: bien.id,
            score_total: resultat.scoreTotal,
            score_budget: resultat.scoreDetails.budget,
            score_type: resultat.scoreDetails.typeBien,
            score_localisation: resultat.scoreDetails.localisation,
            score_surface: resultat.scoreDetails.surface,
            score_pieces: resultat.scoreDetails.pieces,
            score_dpe: resultat.scoreDetails.dpe,
            score_equipements: resultat.scoreDetails.equipements,
            score_details: {
              pointsForts: resultat.pointsForts,
              pointsFaibles: resultat.pointsFaibles,
            },
            statut: 'NOUVEAU',
          });
        }
      }
    }

    // 5. Persist
    let nouveauxMatchs = topMatchs.length;
    let matchsMisAJour = 0;

    if (!dryRun && matchsToUpsert.length > 0) {
      const result = await upsertMatchs(supabase, matchsToUpsert);
      nouveauxMatchs = result.nouveaux;
      matchsMisAJour = result.misAJour;
    }

    // Sort top matchs
    topMatchs.sort((a, b) => b.score - a.score);

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      duration: `${duration}ms`,
      totalBiens: biens.length,
      totalAcquereurs: acquereurs.length,
      nouveauxMatchs,
      matchsMisAJour,
      topMatchs: topMatchs.slice(0, 50),
    };

    console.log(`[Matching] Terminé en ${duration}ms — ${nouveauxMatchs} matchs`);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Matching] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
    });
  }
}
