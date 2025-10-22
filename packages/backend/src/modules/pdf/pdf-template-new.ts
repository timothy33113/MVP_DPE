/**
 * Template PDF professionnel inspiré du format TaskImmo
 */
export function renderProfessionalTemplate(data: {
  annonce: any;
  bestDpe: any;
  score: number;
  images: string[];
  logoPath?: string;
}): string {
  const { annonce, bestDpe, score, images, logoPath } = data;
  const rawData = annonce.rawData as any;

  // Extraction des données Leboncoin
  const prix = rawData?.price?.[0] || annonce.prix || 'Non renseigné';
  const description = rawData?.body || '';
  const location = rawData?.location;
  const ville = location?.city_label || location?.city || '';
  const codePostal = location?.zipcode || annonce.codePostal || '';
  const adresse = bestDpe?.adresseBan || `${ville}`;

  // Attributs du bien
  const attributes = rawData?.attributes || [];
  const surface = attributes.find((a: any) => a.key === 'square')?.value || annonce.surface || '';
  const pieces = attributes.find((a: any) => a.key === 'rooms')?.value || annonce.pieces || '';
  const chambres = attributes.find((a: any) => a.key === 'bedrooms')?.value || '';

  // Type de bien - utiliser real_estate_type en priorité
  const realEstateType = attributes.find((a: any) => a.key === 'real_estate_type')?.value_label || '';
  const typeBien = realEstateType || rawData?.category_name || annonce.typeBien || 'Bien immobilier';

  const ges = attributes.find((a: any) => a.key === 'ges')?.value_label || '';
  const dpe = attributes.find((a: any) => a.key === 'energy_rate')?.value_label || '';
  const energie = attributes.find((a: any) => a.key === 'energy_rate')?.value || '';

  // Nouvelles données extraites
  const surfaceTerrain = attributes.find((a: any) => a.key === 'land_plot_surface')?.value || '';
  const etage = attributes.find((a: any) => a.key === 'floor_number')?.value || '';
  const nbEtagesImmeuble = attributes.find((a: any) => a.key === 'nb_floors_building')?.value || '';

  // Extérieur: balcon, terrasse
  const outsideAccess = attributes.find((a: any) => a.key === 'outside_access');
  const hasBalcon = outsideAccess?.values?.includes('balcony') || false;
  const hasTerrasse = outsideAccess?.values?.includes('terrace') || false;

  // Parking
  const parking = attributes.find((a: any) => a.key === 'parking');
  const hasParking = parking?.values && parking.values.length > 0;
  const nbParkings = hasParking ? parking.values.length : 0;

  // Ascenseur et autres spécificités
  const specificities = attributes.find((a: any) => a.key === 'specificities');
  const hasAscenseur = specificities?.values?.includes('elevator') || false;
  const hasInterphone = specificities?.values?.includes('intercom') || false;
  const hasDigicode = specificities?.values?.includes('digicode') || false;
  const hasCave = specificities?.values?.includes('cellar') || false;

  // Informations complémentaires
  const nbSallesBain = attributes.find((a: any) => a.key === 'bathrooms')?.value || '';
  const nbSallesEau = attributes.find((a: any) => a.key === 'nb_shower_room')?.value || '';
  const modeChauffage = attributes.find((a: any) => a.key === 'heating_mode')?.value_label || '';
  const etatGeneral = attributes.find((a: any) => a.key === 'condition')?.value_label || '';

  // Copropriété
  const chargesAnnuelles = attributes.find((a: any) => a.key === 'annual_charges')?.value || '';
  const nbLotsCopro = attributes.find((a: any) => a.key === 'lots')?.value || '';

  // Taxe foncière
  const taxeFonciere = attributes.find((a: any) => a.key === 'property_tax')?.value || '';

  // Données DPE ADEME
  const dpeClass = bestDpe?.etiquetteDpe || annonce.etiquetteDpe || dpe;
  const gesClass = bestDpe?.etiquetteGes || annonce.etiquetteGes || ges;
  const conso = bestDpe?.consoEnergie || energie || '';
  const emission = bestDpe?.emissionGes || '';
  const anneConstruction = bestDpe?.anneConstruction || attributes.find((a: any) => a.key === 'building_year')?.value || '';

  // URLs des images - Maximum 37 images (1 principale + 36 additionnelles)
  const mainImage = images[0] || '';
  const additionalImages = images.slice(1, 37);

  // Diviser les images en pages de 6 photos
  const imagesPerPage = 6;
  const photoPages: string[][] = [];
  for (let i = 0; i < additionalImages.length; i += imagesPerPage) {
    photoPages.push(additionalImages.slice(i, i + imagesPerPage));
  }

  // Fonction pour obtenir la couleur DPE/GES
  const getDpeColor = (etiquette: string): string => {
    const colors: Record<string, string> = {
      'A': '#319834',
      'B': '#34a639',
      'C': '#c2d545',
      'D': '#f5e625',
      'E': '#f7b715',
      'F': '#ed7a24',
      'G': '#e4162b',
    };
    return colors[etiquette?.toUpperCase()] || '#9ca3af';
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Synthèse du bien - ${ville}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      background: white;
    }

    @page {
      margin: 0;
    }

    .page {
      padding: 50px 40px 180px 40px;
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      min-height: 200px;
    }

    .page:not(:last-child) {
      page-break-after: always;
    }

    .page:empty,
    .page:not(:has(*:not(.footer))) {
      display: none;
    }

    /* Page 1: Synthèse */
    .title {
      color: rgb(27, 30, 100);
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 15px;
      text-transform: uppercase;
      page-break-after: avoid;
    }

    .header-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 0;
      page-break-inside: avoid;
    }

    .main-image {
      width: 100%;
      height: 320px;
      object-fit: contain;
      border-radius: 8px;
      page-break-inside: avoid;
      background: #f9fafb;
    }

    /* Sections */
    .section {
      background: white;
      border: 3px solid rgb(90, 100, 242);
      margin-bottom: 0;
      page-break-inside: avoid;
    }

    .section-title {
      background: rgb(90, 100, 242);
      color: white;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .section-content {
      padding: 10px 12px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 12px;
    }

    .info-line {
      padding: 2px 0;
      font-size: 11px;
      line-height: 1.3;
    }

    .info-line strong {
      color: #1a1a1a;
      font-weight: bold;
    }

    /* Section financière */
    .price-highlight {
      font-size: 18px;
      color: #4f46e5;
      font-weight: bold;
    }

    /* Table des surfaces */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 10px;
    }

    table thead {
      background: #4f46e5;
      color: white;
    }

    table th {
      padding: 8px;
      text-align: center;
      font-weight: bold;
    }

    table td {
      padding: 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    /* Page 2: Diagnostics */
    .diagnostic-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
      font-size: 13px;
    }

    .diagnostic-item {
      padding: 8px;
    }

    .diagnostic-item strong {
      display: block;
      color: #1a1a1a;
      margin-bottom: 3px;
    }

    .diagnostic-text {
      font-size: 12px;
      line-height: 1.6;
      text-align: justify;
      margin-top: 15px;
    }

    /* Page 3: Photos */
    .photos-page {
      padding-top: 60px !important;
      padding-bottom: 180px !important;
    }

    .photos-title {
      background: rgb(90, 100, 242);
      color: white;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 15px;
      width: 100%;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 0;
    }

    .photo-item {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    .photo-wrapper {
      page-break-inside: avoid;
    }

    /* Footer fixe */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 40px;
      background: white;
      border-top: 2px solid #e5e7eb;
      font-size: 7px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
      z-index: 1000;
    }

    .footer-logo {
      text-align: center;
      margin-bottom: 10px;
    }

    .footer-logo img {
      height: 40px;
      width: auto;
    }

    .page-break {
      page-break-before: always;
    }

    /* Badges DPE/GES */
    .dpe-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      font-size: 20px;
      text-align: center;
      min-width: 50px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .dpe-badges-container {
      display: flex;
      gap: 15px;
      align-items: center;
      margin-top: 10px;
    }

    .dpe-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: normal;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: SYNTHÈSE DU BIEN -->
  <div class="page">
    <!-- Logo TASKIMO -->
    ${logoPath ? `<div style="margin-bottom: 20px;"><img src="${logoPath}" alt="TASKIMO" style="height: 60px; width: auto;" /></div>` : ''}

    <h1 class="title">SYNTHÈSE DU BIEN</h1>

    <div class="header-layout">
      <!-- Colonne gauche: Caractéristiques -->
      <div>
        <!-- Caractéristiques -->
        <div class="section">
          <div class="section-title">DESCRIPTION</div>
          <div class="section-content">
            <div class="info-line"><strong>Type de bien :</strong> ${typeBien}</div>
            <div class="info-line"><strong>Type de transaction :</strong> Vente</div>
            <div class="info-line"><strong>Code postal :</strong> ${codePostal || '-'}</div>
            <div class="info-line"><strong>Ville :</strong> ${ville}</div>
            ${nbEtagesImmeuble ? `<div class="info-line"><strong>Nombre d'étages :</strong> ${nbEtagesImmeuble}</div>` : ''}

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">ASPECT FINANCIER</strong>
              <div class="info-line"><strong>Prix :</strong> ${typeof prix === 'number' ? prix.toLocaleString('fr-FR') : prix} €</div>
              <div class="info-line"><strong>Taxe foncière :</strong> ${taxeFonciere ? taxeFonciere + ' €' : 'Non renseignée'}</div>
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">COPROPRIÉTÉ</strong>
              <div class="info-line"><strong>Copropriété :</strong> ${chargesAnnuelles || nbLotsCopro ? 'Oui' : 'Non'}</div>
              ${nbLotsCopro ? `<div class="info-line"><strong>Nombre de lots :</strong> ${nbLotsCopro}</div>` : ''}
              ${chargesAnnuelles ? `<div class="info-line"><strong>Charges annuelles :</strong> ${chargesAnnuelles} €</div>` : ''}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">CARACTÉRISTIQUES DU BIEN</strong>
              <div class="info-line"><strong>Surface :</strong> ${surface ? surface + ' m²' : '-'}</div>
              ${anneConstruction ? `<div class="info-line"><strong>Année de construction :</strong> ${anneConstruction}</div>` : ''}
              ${etatGeneral ? `<div class="info-line"><strong>État général :</strong> ${etatGeneral}</div>` : ''}
              <div class="info-line"><strong>Nombre de pièces :</strong> ${pieces || '-'}</div>
              <div class="info-line"><strong>Nombre de chambres :</strong> ${chambres || '-'}</div>
              ${nbSallesBain ? `<div class="info-line"><strong>Nombre de salles de bain :</strong> ${nbSallesBain}</div>` : ''}
              ${nbSallesEau ? `<div class="info-line"><strong>Nombre de salles d'eau :</strong> ${nbSallesEau}</div>` : ''}
              ${modeChauffage ? `<div class="info-line"><strong>Mode de chauffage :</strong> ${modeChauffage}</div>` : ''}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">AUTRES</strong>
              ${hasAscenseur ? `<div class="info-line">• Ascenseur</div>` : ''}
              ${hasInterphone ? `<div class="info-line">• Interphone</div>` : ''}
              ${hasDigicode ? `<div class="info-line">• Digicode</div>` : ''}
              ${hasTerrasse ? `<div class="info-line">• Terrasse</div>` : ''}
              ${hasBalcon ? `<div class="info-line">• Balcon</div>` : ''}
              ${hasCave ? `<div class="info-line">• Cave</div>` : ''}
              ${hasParking ? `<div class="info-line">• Parking (${nbParkings} place${nbParkings > 1 ? 's' : ''})</div>` : ''}
              ${!hasAscenseur && !hasInterphone && !hasDigicode && !hasTerrasse && !hasBalcon && !hasCave && !hasParking ? '<div class="info-line">-</div>' : ''}
            </div>

            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">TERRAIN</strong>
              <div class="info-line"><strong>Terrain :</strong> ${surfaceTerrain ? 'Oui' : 'Non'}</div>
              ${surfaceTerrain ? `<div class="info-line"><strong>Superficie :</strong> ${surfaceTerrain} m²</div>` : ''}
            </div>

            ${dpeClass || gesClass ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <strong style="color: rgb(27, 30, 100); display: block; margin-bottom: 4px; font-size: 11px;">DIAGNOSTIC</strong>
              <div class="dpe-badges-container">
                ${dpeClass ? `
                <div>
                  <div class="dpe-label">Classe DPE</div>
                  <div class="dpe-badge" style="background-color: ${getDpeColor(dpeClass)};">${dpeClass}</div>
                </div>
                ` : ''}
                ${gesClass ? `
                <div>
                  <div class="dpe-label">Classe GES</div>
                  <div class="dpe-badge" style="background-color: ${getDpeColor(gesClass)};">${gesClass}</div>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Colonne droite: Photo principale -->
      <div>
        ${mainImage ? `<img src="${mainImage}" alt="Photo principale" class="main-image" />` : '<div style="width:100%;height:280px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;">Aucune photo disponible</div>'}
      </div>
    </div>

  </div>

  <!-- PAGES PHOTOS -->
  ${photoPages.length > 0 ? photoPages.map((pageImages, index) => `
  <div class="page page-break photos-page">
    <div class="photos-title">LE BIEN EN PHOTOS</div>
    <div class="photo-grid">
      ${pageImages.map(img => `
        <div class="photo-wrapper">
          <img src="${img}" alt="Photo du bien" class="photo-item" />
        </div>
      `).join('')}
    </div>
  </div>
  `).join('') : ''}

  <!-- FOOTER FIXE SUR TOUTES LES PAGES -->
  <div class="footer">
    ${logoPath ? `
    <div class="footer-logo">
      <img src="${logoPath}" alt="TASKIMO" />
    </div>
    ` : ''}
    <strong>LEVEL UP Immobilier</strong><br/>
    SARL LEVEL UP au capital de 10 000 euros - Siège social : 4 rue des Charmes MORLAÀS<br/>
    RCS de Pau : 944348903 - Carte professionnelle Transaction n° CPI64022025000000009 délivrée par CCI de Pau Bearn<br/>
    Garantie financière Galian (89, rue La Boétie 75008 Paris) N°. 159600 d'un montant de 120 000 € (sans détention de fonds)<br/>
    RCP Galian N° RCP_01_174606P - TVA Intracommunautaire : FR22944348903<br/>
    CNPM MEDIATION CONSOMMATION : https://www.cnpm-mediation-consommation.eu/ - 27, avenue de la Libération, 42400 Saint-Chamond
  </div>
</body>
</html>
  `;
}
