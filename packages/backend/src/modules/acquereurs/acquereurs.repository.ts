/**
 * Repository pour les acquéreurs
 */

import { PrismaClient } from '@prisma/client';
import { isPointInPolygon } from '@utils/quartiers';
import { emailService } from '@services/email.service';

const prisma = new PrismaClient();

export class AcquereurRepository {
  /**
   * Crée un nouvel acquéreur avec ses localisations
   */
  async createAcquereur(data: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    budgetMin?: number;
    budgetMax?: number;
    typeBienRecherche: string[];
    surfaceMin?: number;
    surfaceMax?: number;
    piecesMin?: number;
    piecesMax?: number;
    chambresMin?: number;
    dpeMax?: string;
    niveauTravauxAccepte?: string;
    terrainMin?: number;
    avecJardin?: boolean;
    avecTerrasse?: boolean;
    avecBalcon?: boolean;
    avecPiscine?: boolean;
    avecGarage?: boolean;
    avecAscenseur?: boolean;
    avecCave?: boolean;
    avecCuisineEquipee?: boolean;
    avecInterphone?: boolean;
    avecSousSol?: boolean;
    avecParking?: boolean;
    etageMin?: number;
    etageMax?: number;
    localisations: Array<{ type: string; valeur: string; priorite?: number }>;
    notes?: string;
  }) {
    const { localisations, typeBienRecherche, ...acquereurData } = data;

    // Convertir les types de bien en format enum
    const typeBienMap: Record<string, string> = {
      'Maison': 'MAISON',
      'Appartement': 'APPARTEMENT',
      'Terrain': 'TERRAIN',
      'Programme Neuf': 'APPARTEMENT', // Map to APPARTEMENT by default
      'Immeuble': 'APPARTEMENT',
      'Parking': 'TERRAIN',
      'Autre': 'TERRAIN',
    };

    const typeBienConverted = typeBienRecherche
      .map(type => typeBienMap[type] || type.toUpperCase())
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    const acquereur = await prisma.acquereur.create({
      data: {
        ...acquereurData,
        typeBienRecherche: typeBienConverted as any,
        localisationsRecherche: {
          create: localisations.map((loc) => ({
            type: loc.type as any,
            valeur: loc.valeur,
            priorite: loc.priorite || 1,
          })),
        },
      },
      include: {
        localisationsRecherche: true,
      },
    });

    return acquereur;
  }

  /**
   * Récupère tous les acquéreurs
   */
  async findAll(filters: { statutActif?: boolean } = {}) {
    return await prisma.acquereur.findMany({
      where: filters,
      include: {
        localisationsRecherche: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupère un acquéreur par son ID
   */
  async findById(id: string) {
    return await prisma.acquereur.findUnique({
      where: { id },
      include: {
        localisationsRecherche: true,
      },
    });
  }

  /**
   * Met à jour un acquéreur
   */
  async updateAcquereur(
    id: string,
    data: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      budgetMin?: number;
      budgetMax?: number;
      typeBienRecherche?: string[];
      surfaceMin?: number;
      surfaceMax?: number;
      piecesMin?: number;
      piecesMax?: number;
      chambresMin?: number;
      dpeMax?: string;
      niveauTravauxAccepte?: string;
      terrainMin?: number;
      avecJardin?: boolean;
      avecTerrasse?: boolean;
      avecBalcon?: boolean;
      avecPiscine?: boolean;
      avecGarage?: boolean;
      avecAscenseur?: boolean;
      avecCave?: boolean;
      avecCuisineEquipee?: boolean;
      avecInterphone?: boolean;
      avecSousSol?: boolean;
      avecParking?: boolean;
      etageMin?: number;
      etageMax?: number;
      statutActif?: boolean;
      notes?: string;
      localisations?: Array<{ type: string; valeur: string; priorite?: number }>;
    }
  ) {
    const { localisations, typeBienRecherche, ...updateData } = data;

    // Convertir les types de bien en format enum si fournis
    let typeBienConverted: string[] | undefined;
    if (typeBienRecherche) {
      const typeBienMap: Record<string, string> = {
        'Maison': 'MAISON',
        'Appartement': 'APPARTEMENT',
        'Terrain': 'TERRAIN',
        'Programme Neuf': 'APPARTEMENT',
        'Immeuble': 'APPARTEMENT',
        'Parking': 'TERRAIN',
        'Autre': 'TERRAIN',
      };

      typeBienConverted = typeBienRecherche
        .map(type => typeBienMap[type] || type.toUpperCase())
        .filter((value, index, self) => self.indexOf(value) === index);
    }

    // Si des localisations sont fournies, supprimer les anciennes et créer les nouvelles
    if (localisations) {
      await prisma.localisationRecherche.deleteMany({
        where: { acquereurId: id },
      });
    }

    const acquereur = await prisma.acquereur.update({
      where: { id },
      data: {
        ...updateData,
        ...(typeBienConverted && { typeBienRecherche: typeBienConverted as any }),
        ...(localisations && {
          localisationsRecherche: {
            create: localisations.map((loc) => ({
              type: loc.type as any,
              valeur: loc.valeur,
              priorite: loc.priorite || 1,
            })),
          },
        }),
      },
      include: {
        localisationsRecherche: true,
      },
    });

    return acquereur;
  }

  /**
   * Trouve toutes les annonces qui correspondent aux critères d'un acquéreur
   */
  async findMatchingAnnonces(acquereurId: string) {
    const acquereur = await prisma.acquereur.findUnique({
      where: { id: acquereurId },
      include: {
        localisationsRecherche: true,
      },
    });

    if (!acquereur) {
      return [];
    }

    // Construire les filtres pour la recherche
    const whereClause: any = {
      // Filtre par budget
      ...(acquereur.budgetMax && { prix: { lte: acquereur.budgetMax } }),
      ...(acquereur.budgetMin && { prix: { gte: acquereur.budgetMin } }),

      // Filtre par surface
      ...(acquereur.surfaceMin && { surface: { gte: acquereur.surfaceMin } }),
      ...(acquereur.surfaceMax && { surface: { lte: acquereur.surfaceMax } }),

      // Filtre par nombre de pièces
      ...(acquereur.piecesMin && { pieces: { gte: acquereur.piecesMin } }),
      ...(acquereur.piecesMax && { pieces: { lte: acquereur.piecesMax } }),

      // Filtre par type de bien
      ...(acquereur.typeBienRecherche.length > 0 && {
        typeBien: { in: acquereur.typeBienRecherche },
      }),
    };

    // Gérer les localisations
    const codesPostaux = acquereur.localisationsRecherche
      .filter(loc => loc.type === 'CODE_POSTAL')
      .map(loc => loc.valeur);

    const zonesCustom = acquereur.localisationsRecherche
      .filter(loc => loc.type === 'ZONE_CUSTOM')
      .map(loc => loc.valeur);

    // Si des codes postaux sont définis, les utiliser
    if (codesPostaux.length > 0) {
      whereClause.codePostal = { in: codesPostaux };
    }

    // Récupérer les annonces avec les critères de base
    let annonces = await prisma.leboncoinAnnonce.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Augmenter la limite pour le filtrage géographique
    });

    // Si des zones personnalisées sont définies, filtrer par géolocalisation
    if (zonesCustom.length > 0) {
      // Récupérer les zones
      const zones = await prisma.searchZone.findMany({
        where: {
          id: { in: zonesCustom },
          isActive: true,
        },
      });

      if (zones.length > 0) {
        // Étape 1: Déterminer les villes et quartiers couverts par la zone
        const villesInZone = new Set<string>();
        const quartiersInZone = new Set<string>();

        // Vérifier si c'est une zone de type "Quartier" (format textuel)
        zones.forEach((zone) => {
          const geometry = zone.geometry as any;

          if (geometry.type === 'Quartier' && geometry.city) {
            // Zone de type quartier : filtrer par ville + quartier
            villesInZone.add(geometry.city);

            // Ajouter le nom du quartier si défini
            if (geometry.district) {
              quartiersInZone.add(geometry.district);
            }
          }
        });

        // Si aucune zone de type Quartier, utiliser la géométrie
        if (villesInZone.size === 0) {
          annonces.forEach((annonce) => {
            const rawData = annonce.rawData as any;
            if (rawData?.location?.city && rawData?.location?.lat && rawData?.location?.lng) {
              const point: [number, number] = [rawData.location.lng, rawData.location.lat];

              // Vérifier si ce point est dans au moins une des zones
              const isInZone = zones.some((zone) => {
                const geometry = zone.geometry as any;

                // Gérer différents types de géométrie
                if (geometry.type === 'Polygon' && geometry.coordinates) {
                  const polygon = geometry.coordinates[0];
                  return isPointInPolygon(point, polygon);
                } else if (geometry.type === 'Circle' && geometry.center && geometry.radius) {
                  const [centerLng, centerLat] = geometry.center;
                  const distance = this.calculateDistance(
                    rawData.location.lat,
                    rawData.location.lng,
                    centerLat,
                    centerLng
                  );
                  return distance <= geometry.radius;
                }

                return false;
              });

              if (isInZone) {
                villesInZone.add(rawData.location.city);
              }
            }
          });
        }

        // Étape 2: Filtrer par ville et quartier
        if (villesInZone.size > 0) {
          annonces = annonces.filter((annonce) => {
            const rawData = annonce.rawData as any;
            const city = rawData?.location?.city;

            // Vérifier d'abord la ville
            if (!city || !villesInZone.has(city)) {
              return false;
            }

            // Si des quartiers spécifiques sont définis, filtrer par quartier
            if (quartiersInZone.size > 0) {
              const cityLabel = rawData?.location?.city_label || '';

              // Vérifier si le city_label contient un des quartiers recherchés
              // Ex: "Pau 64000 Centre-ville" contient "Centre"
              const hasMatchingQuartier = Array.from(quartiersInZone).some((quartier) => {
                // Normaliser et chercher des correspondances partielles
                const quartierNorm = quartier.toLowerCase()
                  .replace(/[^a-z0-9]/g, '');
                const cityLabelNorm = cityLabel.toLowerCase()
                  .replace(/[^a-z0-9]/g, '');

                return cityLabelNorm.includes(quartierNorm);
              });

              // Si pas de quartier trouvé dans city_label, mais que l'annonce a GPS
              // on peut vérifier avec la géométrie
              if (!hasMatchingQuartier && rawData?.location?.lat && rawData?.location?.lng) {
                const point: [number, number] = [rawData.location.lng, rawData.location.lat];

                // Vérifier si le point GPS est dans la zone
                const isInZone = zones.some((zone) => {
                  const geometry = zone.geometry as any;

                  if (geometry.type === 'Polygon' && geometry.coordinates) {
                    const polygon = geometry.coordinates[0];
                    return isPointInPolygon(point, polygon);
                  } else if (geometry.type === 'Circle' && geometry.center && geometry.radius) {
                    const [centerLng, centerLat] = geometry.center;
                    const distance = this.calculateDistance(
                      rawData.location.lat,
                      rawData.location.lng,
                      centerLat,
                      centerLng
                    );
                    return distance <= geometry.radius;
                  }

                  return false;
                });

                return isInZone;
              }

              return hasMatchingQuartier;
            }

            // Pas de filtre quartier, garder toutes les annonces de la ville
            return true;
          });
        }
        // Sinon, ne pas filtrer (on garde toutes les annonces)
      }
    }

    // Filtrer les annonces :
    // - Exclure mandats exclusifs
    // - Exclure ORPI (pas d'interagence)
    annonces = annonces.filter((annonce) => {
      // Exclure les mandats exclusifs
      if (annonce.mandateType === 'exclusive') {
        return false;
      }

      // Exclure ORPI
      const rawData = annonce.rawData as any;
      const ownerName = rawData?.owner?.name || '';
      if (ownerName.toUpperCase().includes('ORPI')) {
        return false;
      }

      return true;
    });

    // Limiter à 100 résultats
    return annonces.slice(0, 100);
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine) en mètres
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Envoie une sélection de biens par email à un acquéreur
   */
  async sendSelectionEmail(acquereurId: string, annonceIds: string[]) {
    // Récupérer l'acquéreur
    const acquereur = await prisma.acquereur.findUnique({
      where: { id: acquereurId },
    });

    if (!acquereur) {
      throw new Error('Acquéreur introuvable');
    }

    if (!acquereur.email) {
      throw new Error('Cet acquéreur n\'a pas d\'adresse email');
    }

    // Récupérer les annonces
    const annonces = await prisma.leboncoinAnnonce.findMany({
      where: {
        id: { in: annonceIds },
      },
    });

    // Générer le contenu de l'email HTML
    const emailHTML = this.generateSelectionEmailHTML(acquereur, annonces);

    // Envoyer l'email via le service email
    await emailService.sendEmail({
      to: acquereur.email,
      subject: `Sélection de ${annonces.length} bien(s) correspondant à vos critères`,
      html: emailHTML,
    });

    return {
      message: `Email envoyé à ${acquereur.prenom} ${acquereur.nom} (${acquereur.email})`,
      bienCount: annonces.length,
    };
  }

  /**
   * Génère le contenu HTML de l'email de sélection
   */
  private generateSelectionEmailHTML(acquereur: any, annonces: any[]): string {
    const biensHTML = annonces.map(annonce => {
      const rawData = annonce.rawData as any;
      const imageUrl = rawData?.images?.urls_large?.[0] || rawData?.images?.small_url || '';
      const typeBien = rawData?.attributes?.find((a: any) => a.key === 'real_estate_type')?.value_label || annonce.typeBien;
      const prix = rawData?.price?.[0] || annonce.prix;
      const ville = rawData?.location?.city || '';
      const pieces = annonce.pieces || rawData?.attributes?.find((a: any) => a.key === 'rooms')?.value || '';
      const surface = annonce.surface || rawData?.attributes?.find((a: any) => a.key === 'square')?.value || '';
      const url = rawData?.url || `https://www.leboncoin.fr/ventes_immobilieres/${annonce.listId}.htm`;

      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: white;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${typeBien}" style="width: 100%; max-width: 300px; height: auto; border-radius: 4px; margin-bottom: 12px;" />` : ''}
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px; font-weight: 600;">${typeBien} - ${ville}</h3>
          <p style="margin: 4px 0; color: #059669; font-size: 20px; font-weight: 700;">${prix ? prix.toLocaleString() + ' €' : 'Prix non renseigné'}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            ${pieces ? pieces + ' pièce(s)' : ''} ${surface ? '• ' + surface + ' m²' : ''}
          </p>
          <a href="${url}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">Voir l'annonce</a>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sélection de biens</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px;">Bonjour ${acquereur.prenom},</h1>
          <p style="margin: 8px 0; color: #6b7280; font-size: 16px;">
            Nous avons sélectionné pour vous ${annonces.length} bien(s) correspondant à vos critères de recherche.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          ${biensHTML}
        </div>

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Vous avez des questions ? N'hésitez pas à nous contacter.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

export const acquereurRepository = new AcquereurRepository();
