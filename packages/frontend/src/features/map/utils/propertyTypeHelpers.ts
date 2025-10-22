// Fonction helper pour déterminer l'icône en fonction du type de bien
export const getPropertyIcon = (typeBien: string, rawData?: any): string => {
  const type = typeBien?.toUpperCase() || '';

  // Vérifier d'abord le subject et le real_estate_type dans rawData pour plus de précision
  const subject = rawData?.subject?.toUpperCase() || '';
  const realEstateTypeAttr = rawData?.attributes?.find((attr: any) => attr.key === 'real_estate_type');
  const realEstateType = realEstateTypeAttr?.value_label?.toUpperCase() || '';
  const agencyName = rawData?.owner?.name?.toUpperCase() || '';
  const body = rawData?.body?.toUpperCase() || '';

  console.log('🔍 getPropertyIcon called with:', { typeBien, subject, realEstateType, agencyName });

  // Vérifier si c'est un immeuble (vérifier le subject en priorité)
  if (subject.includes('IMMEUBLE')) {
    console.log('✅ Matched IMMEUBLE from subject, returning 🏬');
    return '🏬';
  }

  // Vérifier si c'est un programme (avec espace, point, virgule ou retour à la ligne après)
  const isProgramme = body.includes('PROGRAMME ') || body.includes('PROGRAMME.') || body.includes('PROGRAMME,') || body.includes('PROGRAMME\n') || body.includes('PROGRAMME IMMOBILIER');
  const isTerrain = type.includes('TERRAIN') || realEstateType.includes('TERRAIN') || subject.includes('TERRAIN');

  // Vérifier d'abord si c'est un programme neuf : maisons du constructeur OU annonces (SAUF TERRAINS) contenant "programme"
  if (((type.includes('MAISON') || type.includes('VILLA') || realEstateType.includes('MAISON') || realEstateType.includes('VILLA')) &&
       agencyName.includes('CONSTRUCTEURS')) ||
      (isProgramme && !isTerrain)) {
    console.log('✅ Matched PROGRAMME NEUF, returning 🏘️');
    return '🏘️';
  }

  // Vérifier real_estate_type en priorité (plus fiable que subject qui peut mentionner des équipements)
  if (realEstateType.includes('TERRAIN')) {
    console.log('✅ Matched TERRAIN from realEstateType, returning 🌳');
    return '🌳';
  }

  // Pour parking/garage : vérifier UNIQUEMENT le real_estate_type, pas le subject
  // (car le subject peut mentionner "garage" même si c'est un appartement avec garage)
  if (realEstateType.includes('PARKING') || realEstateType.includes('GARAGE') || realEstateType.includes('BOX')) {
    console.log('✅ Matched PARKING/GARAGE from realEstateType, returning 🚗');
    return '🚗';
  }

  if (realEstateType.includes('MAISON') || realEstateType.includes('VILLA')) {
    console.log('✅ Matched MAISON from realEstateType, returning 🏠');
    return '🏠';
  }

  if (realEstateType.includes('APPARTEMENT')) {
    console.log('✅ Matched APPARTEMENT from realEstateType, returning 🏢');
    return '🏢';
  }

  // Si pas de real_estate_type, vérifier le subject (pour terrains seulement)
  if (subject.includes('TERRAIN')) {
    console.log('✅ Matched TERRAIN from subject, returning 🌳');
    return '🌳';
  }

  // Enfin, vérifier le typeBien de la base de données
  if (type.includes('TERRAIN')) {
    console.log('✅ Matched TERRAIN from typeBien, returning 🌳');
    return '🌳';
  }
  if (type.includes('PARKING') || type.includes('GARAGE') || type.includes('BOX')) {
    console.log('✅ Matched PARKING/GARAGE from typeBien, returning 🚗');
    return '🚗';
  }
  if (type.includes('MAISON') || type.includes('VILLA')) {
    console.log('✅ Matched MAISON from typeBien, returning 🏠');
    return '🏠';
  }
  if (type.includes('APPARTEMENT')) {
    console.log('✅ Matched APPARTEMENT from typeBien, returning 🏢');
    return '🏢';
  }
  console.log('⚠️ No match, returning default 🏗️');
  return '🏗️'; // Icône par défaut pour "autre"
};

// Fonction helper pour formater le nom du type de bien
export const getPropertyTypeName = (typeBien: string): string => {
  const type = typeBien?.toUpperCase() || '';
  if (type.includes('TERRAIN')) return 'Terrain';
  if (type.includes('PARKING')) return 'Parking';
  if (type.includes('GARAGE')) return 'Garage';
  if (type.includes('BOX')) return 'Box';
  if (type.includes('MAISON')) return 'Maison';
  if (type.includes('VILLA')) return 'Villa';
  if (type.includes('APPARTEMENT')) return 'Appartement';
  return typeBien; // Retourner la valeur originale si aucun match
};
