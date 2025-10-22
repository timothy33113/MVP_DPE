import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface MatchingModalProps {
  acquereur: any;
  onClose: () => void;
}

export function MatchingModal({ acquereur, onClose }: MatchingModalProps) {
  const [downloadingPdfIds, setDownloadingPdfIds] = useState<Set<string>>(new Set());
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Fetch matchs for this acquéreur
  const { data: matchsData, isLoading } = useQuery({
    queryKey: ['matchs', acquereur.id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/acquereurs/${acquereur.id}/matches`);
      if (!response.ok) throw new Error('Failed to fetch matchs');
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch zones names
  const { data: zonesData } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/zones/active');
      if (!response.ok) throw new Error('Failed to fetch zones');
      return response.json();
    },
  });

  const annonces = matchsData || [];
  const zones = zonesData || [];

  // Get zone name from ID
  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z: any) => z.id === zoneId);
    return zone?.name || 'Zone personnalisée';
  };

  // Télécharger le PDF d'un bien
  const handleDownloadPdf = async (annonce: any) => {
    setDownloadingPdfIds(prev => new Set(prev).add(annonce.id));
    try {
      const response = await fetch(`http://localhost:3001/api/pdf/fiche/${annonce.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Construire le nom du fichier
      const rawData = annonce.rawData as any;
      const typeBien = rawData?.attributes?.find((a: any) => a.key === 'real_estate_type')?.value_label || annonce.typeBien || 'Bien';
      const pieces = annonce.pieces || rawData?.attributes?.find((a: any) => a.key === 'rooms')?.value || '';
      const ville = rawData?.location?.city || annonce.ville || '';

      let fileName = 'Fiche';
      if (typeBien) fileName += ` - ${typeBien}`;
      if (pieces) fileName += ` - ${pieces} pièces`;
      if (ville) fileName += ` - ${ville}`;
      fileName += '.pdf';

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPdfIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(annonce.id);
        return newSet;
      });
    }
  };

  // Gérer la sélection
  const toggleSelection = (annonceId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(annonceId)) {
        newSet.delete(annonceId);
      } else {
        newSet.add(annonceId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(annonces.map((a: any) => a.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  // Télécharger les PDFs sélectionnés
  const handleDownloadSelectedPdfs = async () => {
    if (selectedIds.size === 0) {
      alert('Aucun bien sélectionné');
      return;
    }

    if (!confirm(`Voulez-vous télécharger les fiches PDF des ${selectedIds.size} bien(s) sélectionné(s) ?`)) {
      return;
    }

    setIsDownloadingSelected(true);
    let successCount = 0;
    let errorCount = 0;

    const selectedAnnonces = annonces.filter((a: any) => selectedIds.has(a.id));
    for (const annonce of selectedAnnonces) {
      try {
        await handleDownloadPdf(annonce);
        successCount++;
        // Petite pause entre chaque téléchargement pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errorCount++;
        console.error(`Erreur pour l'annonce ${annonce.id}:`, error);
      }
    }

    setIsDownloadingSelected(false);
    alert(`Téléchargement terminé !\n${successCount} fiche(s) téléchargée(s)${errorCount > 0 ? `\n${errorCount} erreur(s)` : ''}`);
    exitSelectionMode();
  };

  // Envoyer les biens sélectionnés par email
  const handleSendEmail = async () => {
    if (selectedIds.size === 0) {
      alert('Aucun bien sélectionné');
      return;
    }

    if (!acquereur.email) {
      alert('Cet acquéreur n\'a pas d\'adresse email renseignée');
      return;
    }

    if (!confirm(`Voulez-vous envoyer une sélection de ${selectedIds.size} bien(s) à ${acquereur.prenom} ${acquereur.nom} (${acquereur.email}) ?`)) {
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('http://localhost:3001/api/acquereurs/send-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acquereurId: acquereur.id,
          annonceIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert(`Email envoyé avec succès à ${acquereur.prenom} ${acquereur.nom} !`);
      exitSelectionMode();
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{acquereur.prenom} {acquereur.nom}</h2>
            </div>
            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  {selectedIds.size > 0 && (
                    <>
                      <button
                        onClick={handleSendEmail}
                        disabled={isSendingEmail || isDownloadingSelected}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        {isSendingEmail ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Envoi...
                          </>
                        ) : (
                          <>
                            ✉️ Envoyer par email ({selectedIds.size})
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadSelectedPdfs}
                        disabled={isDownloadingSelected || isSendingEmail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        {isDownloadingSelected ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Téléchargement...
                          </>
                        ) : (
                          <>
                            📄 Télécharger ({selectedIds.size})
                          </>
                        )}
                      </button>
                    </>
                  )}
                  {selectedIds.size < annonces.length && (
                    <button
                      onClick={selectAll}
                      className="px-3 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Tout sélectionner
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="px-3 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium"
                    >
                      Tout désélectionner
                    </button>
                  )}
                  <button
                    onClick={exitSelectionMode}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  {annonces.length > 0 && (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                    >
                      ✓ Sélectionner
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Critères de recherche */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Critères de recherche</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {(acquereur.budgetMin || acquereur.budgetMax) && (
                <div>
                  <span className="font-medium">Budget: </span>
                  {acquereur.budgetMin?.toLocaleString() || '0'}€ - {acquereur.budgetMax?.toLocaleString() || 'Non défini'}€
                </div>
              )}
              {acquereur.typeBienRecherche && acquereur.typeBienRecherche.length > 0 && (
                <div>
                  <span className="font-medium">Type: </span>
                  {acquereur.typeBienRecherche.join(', ')}
                </div>
              )}
              {acquereur.localisationsRecherche && acquereur.localisationsRecherche.length > 0 && (
                <div>
                  <span className="font-medium">Zone: </span>
                  {acquereur.localisationsRecherche
                    .filter((loc: any) => loc.type === 'ZONE_CUSTOM')
                    .map((loc: any) => getZoneName(loc.valeur))
                    .join(', ') ||
                   acquereur.localisationsRecherche
                    .filter((loc: any) => loc.type === 'CODE_POSTAL')
                    .map((loc: any) => loc.valeur)
                    .join(', ')}
                </div>
              )}
              {acquereur.surfaceMin && (
                <div>
                  <span className="font-medium">Surface min: </span>
                  {acquereur.surfaceMin}m²
                </div>
              )}
              {acquereur.piecesMin && (
                <div>
                  <span className="font-medium">Pièces min: </span>
                  {acquereur.piecesMin}
                </div>
              )}
              {acquereur.dpeMax && (
                <div>
                  <span className="font-medium">DPE max: </span>
                  {acquereur.dpeMax}
                </div>
              )}
              {(acquereur.avecJardin || acquereur.avecTerrasse || acquereur.avecBalcon || acquereur.avecPiscine ||
                acquereur.avecGarage || acquereur.avecAscenseur || acquereur.avecCave || acquereur.avecCuisineEquipee ||
                acquereur.avecInterphone || acquereur.avecSousSol) && (
                <div className="col-span-2 md:col-span-3">
                  <span className="font-medium">Caractéristiques: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {acquereur.avecJardin && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Jardin</span>}
                    {acquereur.avecTerrasse && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Terrasse</span>}
                    {acquereur.avecBalcon && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Balcon</span>}
                    {acquereur.avecPiscine && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Piscine</span>}
                    {acquereur.avecGarage && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Garage/Parking</span>}
                    {acquereur.avecAscenseur && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Ascenseur</span>}
                    {acquereur.avecCave && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Cave</span>}
                    {acquereur.avecCuisineEquipee && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Cuisine équipée</span>}
                    {acquereur.avecInterphone && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Interphone</span>}
                    {acquereur.avecSousSol && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Sous-sol</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 text-sm text-gray-600">
            <strong>{annonces.length}</strong> bien{annonces.length > 1 ? 's' : ''} trouvé{annonces.length > 1 ? 's' : ''}
          </div>

          {/* Liste des matchs */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : annonces.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bien trouvé</h3>
              <p className="text-gray-500">Aucun bien ne correspond aux critères de cet acquéreur pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {annonces.map((annonce: any) => {
                const bestMatch = annonce.dpeMatches?.[0];
                const rawData = annonce.rawData as any;
                const mainImage = rawData?.images?.urls_large?.[0] || rawData?.images?.small_url || rawData?.images?.thumb_url || null;
                const city = rawData?.location?.city || annonce.ville || 'Ville inconnue';
                const address = rawData?.location?.address;

                return (
                  <div
                    key={annonce.id}
                    className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                      isSelectionMode && selectedIds.has(annonce.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex">
                      {/* Checkbox en mode sélection */}
                      {isSelectionMode && (
                        <div className="flex items-center justify-center px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(annonce.id)}
                            onChange={() => toggleSelection(annonce.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {/* Photo à gauche */}
                      <div className="w-48 h-48 flex-shrink-0 bg-gray-200">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={annonce.typeBien}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-4xl">📷</span>
                          </div>
                        )}
                      </div>

                      {/* Contenu à droite */}
                      <div className="flex-1 p-4">
                        {/* En-tête: Type + Ville + Actions */}
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">
                            {annonce.typeBien} - {city}
                          </h4>
                          {!isSelectionMode && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownloadPdf(annonce)}
                                disabled={downloadingPdfIds.has(annonce.id)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {downloadingPdfIds.has(annonce.id) ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    ...
                                  </>
                                ) : (
                                  <>
                                    📄 PDF
                                  </>
                                )}
                              </button>
                              <a
                                href={annonce.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 flex items-center gap-1.5"
                              >
                                🔗 Voir
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Adresse */}
                        <div className="text-sm text-gray-600 mb-3">
                          <div>{annonce.codePostal} - {city}</div>
                          {address && (
                            <div className="text-xs mt-1">{address}</div>
                          )}
                        </div>

                        {/* Prix + Surface + Pièces */}
                        <div className="flex gap-4 text-sm mb-2">
                          {annonce.prix && (
                            <span className="font-semibold text-green-700">
                              💰 {annonce.prix.toLocaleString()}€
                            </span>
                          )}
                          {annonce.surface && <span>📐 {annonce.surface}m²</span>}
                          {annonce.pieces && <span>🚪 {annonce.pieces} pièces</span>}
                        </div>

                        {/* DPE et mandat */}
                        <div className="flex justify-between items-center mt-3">
                          {bestMatch?.dpe && (
                            <div className="text-sm">
                              <span className="text-gray-600">DPE: </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                bestMatch.dpe.noteDpe === 'A' || bestMatch.dpe.noteDpe === 'B' ? 'bg-green-100 text-green-800' :
                                bestMatch.dpe.noteDpe === 'C' || bestMatch.dpe.noteDpe === 'D' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {bestMatch.dpe.noteDpe}
                              </span>
                              <span className="text-gray-500 text-xs ml-2">
                                Score: {bestMatch.score}/100
                              </span>
                            </div>
                          )}
                          <div className="text-right text-xs text-gray-500">
                            <div>
                              {annonce.mandateType === 'particulier' ? '💎 Particulier' :
                               annonce.mandateType === 'simple' ? '🟢 Mandat simple' : ''}
                            </div>
                            <div className="mt-1">
                              {new Date(annonce.createdAt).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
