/**
 * Script de test de l'API Leboncoin via RapidAPI
 *
 * Usage: pnpm test:leboncoin
 *
 * Fonctionnalités:
 * - Teste l'accès à l'API Leboncoin via RapidAPI
 * - Récupère des annonces immobilières pour un code postal donné
 * - Vérifie la présence des champs critiques
 * - Affiche les résultats formatés
 */

import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================================================
// Configuration
// ============================================================================

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'leboncoin1.p.rapidapi.com';
const API_URL = `https://${RAPIDAPI_HOST}/v2/leboncoin/search_api`;

// Paramètres de recherche par défaut
const DEFAULT_SEARCH_BODY = {
  filters: {
    category: {
      id: '9', // 9 = Ventes immobilières
    },
    enums: {
      ad_type: ['offer'],
    },
    location: {
      locations: [
        {
          locationType: 'city',
          label: 'Pau',
          city: 'Pau',
          zipcode: '64000',
        },
      ],
    },
  },
  owner_type: 'all',
  limit: 5,
  sort_by: 'time',
  sort_order: 'desc',
  offset: 0,
};

// ============================================================================
// Types
// ============================================================================

interface LeboncoinAttribute {
  key: string;
  value: string;
  value_label?: string;
}

interface LeboncoinLocation {
  city?: string;
  zipcode?: string;
  department?: string;
  region?: string;
}

interface LeboncoinAnnonce {
  list_id: string;
  url: string;
  subject: string;
  price: number[];
  location?: LeboncoinLocation;
  attributes?: LeboncoinAttribute[];
  images?: {
    thumb_url?: string;
    small_url?: string;
  };
  first_publication_date?: string;
}

interface LeboncoinResponse {
  ads?: LeboncoinAnnonce[];
  total?: number;
  error?: string;
  message?: string;
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Trouve un attribut par sa clé
 */
function findAttribute(attributes: LeboncoinAttribute[] | undefined, key: string): string | null {
  if (!attributes) return null;
  const attr = attributes.find(a => a.key === key);
  return attr?.value_label || attr?.value || null;
}

/**
 * Vérifie la présence des champs critiques
 */
function verifyCriticalFields(annonce: LeboncoinAnnonce): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!annonce.list_id) missing.push('list_id');
  if (!annonce.url) missing.push('url');
  if (!annonce.subject) missing.push('subject');
  if (!annonce.location?.zipcode) missing.push('location.zipcode');
  if (!annonce.attributes) missing.push('attributes');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Extrait les attributs importants d'une annonce
 */
function extractImportantAttributes(annonce: LeboncoinAnnonce) {
  const attrs = annonce.attributes || [];

  return {
    surface: findAttribute(attrs, 'square'),
    pieces: findAttribute(attrs, 'rooms'),
    type_bien: findAttribute(attrs, 'real_estate_type'),
    dpe: findAttribute(attrs, 'energy_rate'),
    ges: findAttribute(attrs, 'ges'),
    meuble: findAttribute(attrs, 'furnished'),
  };
}

/**
 * Formate une annonce pour l'affichage
 */
function formatAnnonce(annonce: LeboncoinAnnonce, index: number) {
  const attrs = extractImportantAttributes(annonce);
  const verification = verifyCriticalFields(annonce);

  return {
    '#': index + 1,
    'ID': annonce.list_id,
    'Titre': annonce.subject?.substring(0, 40) || 'N/A',
    'Prix': annonce.price?.[0] ? `${annonce.price[0].toLocaleString('fr-FR')} €` : 'N/A',
    'CP': annonce.location?.zipcode || 'N/A',
    'Ville': annonce.location?.city || 'N/A',
    'Surface': attrs.surface || 'N/A',
    'Pièces': attrs.pieces || 'N/A',
    'Type': attrs.type_bien || 'N/A',
    'DPE': attrs.dpe || 'N/A',
    'GES': attrs.ges || 'N/A',
    'Valide': verification.valid ? '✅' : '❌',
  };
}

// ============================================================================
// Fonction principale
// ============================================================================

/**
 * Test API Leboncoin
 */
async function testLeboncoinApi(customBody?: Record<string, any>): Promise<void> {
  console.log('\n🔍 Test de l\'API Leboncoin via RapidAPI\n');

  // Vérifier la clé API
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === '') {
    console.error('❌ Erreur: RAPIDAPI_KEY non définie dans le fichier .env');
    console.error('\n💡 Pour obtenir une clé API:');
    console.error('   1. Créer un compte sur https://rapidapi.com/');
    console.error('   2. S\'abonner à l\'API Leboncoin');
    console.error('   3. Copier la clé et l\'ajouter dans .env: RAPIDAPI_KEY=votre_cle');
    process.exit(1);
  }

  // Préparer le body
  const searchBody = customBody || DEFAULT_SEARCH_BODY;

  console.log('📡 Configuration:');
  console.log(`   URL: ${API_URL}`);
  console.log(`   Méthode: POST`);
  console.log(`   Catégorie: ${searchBody.filters?.category?.id || 'N/A'}`);
  console.log(`   Localisation: ${searchBody.filters?.location?.locations?.[0]?.city || 'N/A'}`);
  console.log(`   Limite: ${searchBody.limit || 'N/A'}`);
  console.log(`   API Key: ${RAPIDAPI_KEY.substring(0, 8)}...`);
  console.log('');

  try {
    console.log('⏳ Envoi de la requête...\n');

    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      body: JSON.stringify(searchBody),
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Réponse reçue (${duration}ms) - Status: ${response.status}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur HTTP ${response.status}: ${response.statusText}`);
      console.error(`   Message: ${errorText}`);
      process.exit(1);
    }

    const data: LeboncoinResponse = await response.json();

    // Vérifier la présence d'erreurs dans la réponse
    if (data.error) {
      console.error(`❌ Erreur API: ${data.error}`);
      if (data.message) {
        console.error(`   Message: ${data.message}`);
      }
      process.exit(1);
    }

    // Vérifier la présence d'annonces
    if (!data.ads || data.ads.length === 0) {
      console.warn('⚠️  Aucune annonce trouvée pour ces critères');
      console.log('\n💡 Suggestions:');
      console.log('   - Vérifier le code postal');
      console.log('   - Essayer une catégorie différente');
      console.log('   - Augmenter la limite');
      process.exit(0);
    }

    console.log('📊 Résultats:\n');
    console.log(`   Total d'annonces disponibles: ${data.total || 'N/A'}`);
    console.log(`   Annonces récupérées: ${data.ads.length}\n`);

    // Afficher les annonces formatées
    const formattedAnnonces = data.ads.map((annonce, index) =>
      formatAnnonce(annonce, index)
    );

    console.table(formattedAnnonces);

    // Statistiques de validation
    console.log('\n🔍 Validation des champs critiques:\n');

    const validations = data.ads.map(verifyCriticalFields);
    const validCount = validations.filter(v => v.valid).length;
    const invalidCount = validations.length - validCount;

    console.log(`   ✅ Annonces valides: ${validCount}/${data.ads.length}`);
    console.log(`   ❌ Annonces invalides: ${invalidCount}/${data.ads.length}`);

    if (invalidCount > 0) {
      console.log('\n   Champs manquants par annonce:');
      validations.forEach((validation, index) => {
        if (!validation.valid) {
          const annonce = data.ads![index];
          console.log(`   - Annonce #${index + 1} (${annonce.list_id}): ${validation.missing.join(', ')}`);
        }
      });
    }

    // Afficher les attributs détaillés de la première annonce
    if (data.ads.length > 0) {
      console.log('\n📋 Détails de la première annonce:\n');

      const firstAnnonce = data.ads[0];
      const attrs = extractImportantAttributes(firstAnnonce);

      console.log(`   ID: ${firstAnnonce.list_id}`);
      console.log(`   URL: ${firstAnnonce.url}`);
      console.log(`   Titre: ${firstAnnonce.subject}`);
      console.log(`   Prix: ${firstAnnonce.price?.[0]?.toLocaleString('fr-FR')} €`);
      console.log(`   Date: ${firstAnnonce.first_publication_date || 'N/A'}`);
      console.log('');
      console.log(`   Localisation:`);
      console.log(`     - Code postal: ${firstAnnonce.location?.zipcode || 'N/A'}`);
      console.log(`     - Ville: ${firstAnnonce.location?.city || 'N/A'}`);
      console.log(`     - Département: ${firstAnnonce.location?.department || 'N/A'}`);
      console.log(`     - Région: ${firstAnnonce.location?.region || 'N/A'}`);
      console.log('');
      console.log(`   Caractéristiques:`);
      console.log(`     - Type de bien: ${attrs.type_bien || 'N/A'}`);
      console.log(`     - Surface: ${attrs.surface || 'N/A'}`);
      console.log(`     - Pièces: ${attrs.pieces || 'N/A'}`);
      console.log(`     - DPE: ${attrs.dpe || 'N/A'}`);
      console.log(`     - GES: ${attrs.ges || 'N/A'}`);
      console.log(`     - Meublé: ${attrs.meuble || 'N/A'}`);

      if (firstAnnonce.attributes && firstAnnonce.attributes.length > 0) {
        console.log('\n   Tous les attributs disponibles:');
        firstAnnonce.attributes.forEach(attr => {
          console.log(`     - ${attr.key}: ${attr.value_label || attr.value}`);
        });
      }
    }

    console.log('\n✅ Test terminé avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'appel API:\n');

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if ('cause' in error) {
        console.error(`   Cause: ${error.cause}`);
      }
    } else {
      console.error(`   ${error}`);
    }

    console.log('\n💡 Vérifications:');
    console.log('   - La clé RapidAPI est-elle valide ?');
    console.log('   - Y a-t-il une connexion Internet ?');
    console.log('   - Le quota d\'API n\'est-il pas dépassé ?');
    console.log('   - L\'abonnement à l\'API Leboncoin est-il actif ?');

    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  await testLeboncoinApi();
}

main();
