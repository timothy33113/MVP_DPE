/**
 * Liste des agences AMEPI (membres de l'Association des Mandats Exclusifs de Professionnels de l'Immobilier)
 *
 * Ces agences ne permettent PAS l'interagence sur leurs mandats exclusifs.
 * Les mandats simples de ces agences SONT ouverts à l'interagence.
 */

export const AGENCES_AMEPI = [
  'AD HOC CONSEIL PAU',
  'AGIT IMMOBILIER',
  'AMAYA TRANSACTIONS',
  'BEARN IMMOBILIER',
  'CENTURY 21 OCI IMMOBILIER',
  'COFIM GROUPE',
  'CREDOT IMMOBILIER',
  'DABADIE IMMOBILIER',
  'IMMO 64 GAN',
  'IMMO 64 LONS',
  'IMMO 64 SERRES-CASTET',
  'IMMO 64 SOUMOULOU',
  'IMMO64 LESCAR',
  'JPC IMMOBILIER',
  'L\'ADRESSE PAU',
  'NESTENN PAU - BERIEL IMMOBILIER',
  'OPT IMMO',
  'ORPI Aquitaine Immobilier',
  'ORPI Immobilière du Luy',
  'ORPI Lescar Immobilier',
  'ORPI Morlaas Habitat',
  'ORPI Pau Immobilier Conseils & Expertises',
  'ORPI Pierre Conchez Immobilier',
  'ORPI Saint Cricq',
  'ORPI Soumoulou Immobilier',
  'ORPI Sud 64 Immobilier',
  'SARL CPC INVEST',
];

/**
 * Vérifie si une annonce est un mandat exclusif d'une agence AMEPI
 * (donc NON accessible en interagence)
 */
export function isAmepiExclusiveMandate(
  agencyName: string | null | undefined,
  mandateType: string | null | undefined
): boolean {
  if (!agencyName || mandateType !== 'exclusive') {
    return false;
  }

  return AGENCES_AMEPI.includes(agencyName);
}
