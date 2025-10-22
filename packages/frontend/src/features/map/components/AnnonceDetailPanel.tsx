import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getPropertyIcon, getPropertyTypeName } from '../utils/propertyTypeHelpers';
import MatchValidationButtons from './MatchValidationButtons';

interface AnnonceDetailPanelProps {
  match: any;
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void; // Callback pour notifier que les données ont changé
  onCadastreDataLoaded?: (parcelles: any[]) => void; // Callback pour transmettre les parcelles cadastrales à la carte
}

const MONDAY_ETAPES = [
  { value: '0', label: '0 - Nouveau Prospect' },
  { value: '1a', label: '1a - Premier Contact Réussi' },
  { value: '1b', label: '1b - 1er Message Laissé' },
  { value: '1c', label: '1c - 2nd Message Laissé' },
  { value: '1d', label: '1d - 3ième message laissé' },
  { value: '1e', label: '1e - A recontacter' },
  { value: '2a', label: '2a - Rdv estimation programmé' },
  { value: '2b', label: '2b - En réflexion Client' },
  { value: '8', label: '8 - Rappel Spontané' },
  { value: '9z', label: '9z - Refus Définitif' },
  { value: '10', label: '10 - Hors cible' },
];

const getDPEColor = (etiquette: string) => {
  const colors: Record<string, string> = {
    'A': '#00a554', 'B': '#50b947', 'C': '#c6d100',
    'D': '#fccf00', 'E': '#f59c00', 'F': '#ed6c00', 'G': '#e63312',
  };
  return colors[etiquette] || '#94a3b8';
};

export default function AnnonceDetailPanel({ match, isOpen, onClose, onDataUpdated, onCadastreDataLoaded }: AnnonceDetailPanelProps) {
  const [etapeSelected, setEtapeSelected] = useState('0');
  const [notes, setNotes] = useState('');
  const [tacheAFaire, setTacheAFaire] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [cadastreData, setCadastreData] = useState<any[]>([]);
  const [loadingCadastre, setLoadingCadastre] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
  const [iaAnalysisResult, setIaAnalysisResult] = useState<any>(null);

  useEffect(() => {
    // Réinitialiser les données quand on change d'annonce
    setTrackingData(null);
    setNotes('');
    setEtapeSelected('0');
    setTacheAFaire(false);
    setShowStreetView(false);
    setCadastreData([]);
    setIaAnalysisResult(null);

    if (match?.annonce?.id) {
      loadTrackingData();
    }
  }, [match?.annonce?.id]);

  const loadTrackingData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/tracking/${match.annonce.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Tracking data loaded:', data);
        setTrackingData(data);
        if (data.etapeMonday) setEtapeSelected(data.etapeMonday);
        if (data.notes) setNotes(data.notes);
      } else if (response.status === 404) {
        // Pas de tracking pour cette annonce
        setTrackingData(null);
      }
    } catch (error) {
      console.error('Erreur chargement tracking:', error);
      setTrackingData(null);
    }
  };

  const handleSendToMonday = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/monday/create-qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annonceId: match.annonce.id,
          annonceUrl: match.annonce.url,
          typeBien: match.annonce.typeBien,
          surface: match.annonce.surface,
          pieces: match.annonce.pieces,
          codePostal: match.annonce.codePostal,
          etiquetteDpe: match.annonce.etiquetteDpe,
          score: match.score,
          etape: etapeSelected,
          notes: notes,
          tacheAFaire: tacheAFaire,
          datePublication: match.annonce.datePublication,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ Annonce envoyée à Monday.com !');
        setTrackingData(result);
        setNotes(''); // Vider la textarea des notes
        await loadTrackingData();

        // Notifier le parent que les données ont changé (pour recharger la carte)
        console.log('🔄 Notification au parent pour recharger les données...');
        if (onDataUpdated) {
          console.log('✓ Callback onDataUpdated appelé');
          onDataUpdated();
        } else {
          console.warn('⚠️ Pas de callback onDataUpdated fourni');
        }
      } else {
        alert('❌ Erreur lors de l\'envoi à Monday');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur réseau');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetStatus = async () => {
    if (!confirm('Retirer l\'étiquette "Traité" de cette annonce ?')) return;

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/api/tracking/${match.annonce.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'nouveau' }),
      });

      if (response.ok) {
        alert('✅ Statut réinitialisé à "Nouveau"');
        await loadTrackingData();

        if (onDataUpdated) {
          onDataUpdated();
        }
      } else {
        alert('❌ Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur réseau');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIAAnalysis = async () => {
    setIsAnalyzingIA(true);
    try {
      const response = await fetch(`http://localhost:3001/api/ia-analysis/${annonce.id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setIaAnalysisResult(result);
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzingIA(false);
    }
  };

  const loadCadastreData = async () => {
    // Priorité 1 : Utiliser l'adresse du DPE ADEME (la plus fiable)
    let fullAddress = '';

    if (bestDpe?.adresse_bien) {
      fullAddress = bestDpe.adresse_bien;
      console.log('📍 Utilisation adresse DPE ADEME:', fullAddress);
    } else {
      // Priorité 2 : Construire depuis rawData de l'annonce
      const location = annonce.rawData?.location;
      if (!location) {
        console.warn('⚠️ Pas d\'adresse disponible');
        return;
      }

      const addressParts = [
        location.city_label || location.city,
        location.zipcode
      ].filter(Boolean);

      fullAddress = addressParts.join(', ');
      console.log('📍 Utilisation adresse annonce:', fullAddress);
    }

    if (!fullAddress) {
      console.warn('⚠️ Impossible de construire l\'adresse');
      return;
    }

    // Extraire la surface terrain de l'annonce si disponible
    let expectedSurface: number | undefined;
    if (annonce.rawData?.attributes && Array.isArray(annonce.rawData.attributes)) {
      const landPlotAttr = annonce.rawData.attributes.find(
        (attr: any) => attr.key === 'land_plot_surface'
      );
      if (landPlotAttr && landPlotAttr.value) {
        expectedSurface = parseInt(landPlotAttr.value);
        console.log('🎯 Surface terrain annoncée:', expectedSurface, 'm²');
      }
    }

    setLoadingCadastre(true);
    try {
      let url = `http://localhost:3001/api/cadastre/address?adresse=${encodeURIComponent(fullAddress)}`;

      // Ajouter la surface attendue si disponible
      if (expectedSurface) {
        url += `&expectedSurface=${expectedSurface}`;
      }

      console.log('🌐 Fetching cadastre:', url);

      const response = await fetch(url);
      console.log('📦 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Cadastre data:', data);

        if (data.success && data.data.parcelles.length > 0) {
          // Stocker TOUTES les parcelles trouvées
          setCadastreData(data.data.parcelles);

          // Transmettre les parcelles au MapView pour affichage sur la carte
          if (onCadastreDataLoaded) {
            onCadastreDataLoaded(data.data.parcelles);
          }

          const totalSurface = data.data.parcelles.reduce((sum: number, p: any) => sum + (p.contenance || 0), 0);
          console.log(`✅ Trouvé ${data.data.parcelles.length} parcelle(s) - Surface totale: ${totalSurface}m²`);
          data.data.parcelles.forEach((p: any, i: number) => {
            console.log(`  ${i + 1}. Section ${p.section} N°${p.numero} - ${p.contenance}m²`);
          });
        } else {
          console.warn('⚠️ Aucune parcelle trouvée');
          setCadastreData([]);
          // Effacer les parcelles sur la carte
          if (onCadastreDataLoaded) {
            onCadastreDataLoaded([]);
          }
        }
      } else {
        console.error('❌ Erreur API cadastre:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur chargement cadastre:', error);
    } finally {
      setLoadingCadastre(false);
    }
  };

  if (!match) return null;

  const annonce = match.annonce;
  const bestDpe = match.bestDpe;
  const score = match.score;
  const images = annonce.rawData?.images?.urls || [];

  const datePublication = annonce.datePublication ? new Date(annonce.datePublication) : null;
  const ageInDays = datePublication ? Math.floor((new Date().getTime() - datePublication.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isOldExclusive = annonce.mandateType === 'exclusive' && ageInDays > 90;
  const isRecentExclusive = annonce.mandateType === 'exclusive' && ageInDays <= 90;

  const mandateTypeLabel = annonce.mandateType === 'exclusive'
    ? '⭐ Mandat exclusif'
    : annonce.mandateType === 'simple'
    ? '🟢 Mandat simple'
    : '💎 Particulier';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-[2000] transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-[2001] transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-start justify-between flex-shrink-0">
            <div className="flex-1">
              {/* Titre de l'annonce et prix */}
              <div className="flex items-start justify-between gap-3 mb-2">
                {annonce.rawData?.subject && (
                  <h1 className="text-lg font-bold leading-tight flex-1">
                    {annonce.rawData.subject}
                  </h1>
                )}
                <div className="flex items-center gap-2">
                  {/* Note DPE */}
                  {annonce.etiquetteDpe && (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg"
                      style={{ backgroundColor: getDPEColor(annonce.etiquetteDpe) }}
                    >
                      {annonce.etiquetteDpe}
                    </div>
                  )}
                  {/* Prix */}
                  {annonce.prix && (
                    <div className="text-xl font-bold text-yellow-300 whitespace-nowrap">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annonce.prix)}
                    </div>
                  )}
                </div>
              </div>

              {/* Infos complémentaires */}
              <div className="flex items-center gap-3 text-blue-100 text-sm">
                <span>{annonce.codePostal}</span>
                <span>•</span>
                <span>{mandateTypeLabel}</span>
                <span>•</span>
                <span className="font-bold text-white">Score: {score}/100</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors flex-shrink-0"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isOldExclusive && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-lg">
                <div className="font-bold text-center text-lg">💎 OPPORTUNITÉ EXCLUSIVE</div>
                <div className="text-center text-sm mt-1">
                  Mandat exclusif depuis {Math.floor(ageInDays / 30)} mois - Forte marge de négociation
                </div>
              </div>
            )}

            {isRecentExclusive && (
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-3 rounded-lg text-center font-bold">
                🔶 MANDAT EXCLUSIF
              </div>
            )}

            {/* Bouton d'analyse IA */}
            <section>
              <button
                onClick={handleIAAnalysis}
                disabled={isAnalyzingIA}
                className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzingIA ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyse en cours...
                  </>
                ) : (
                  <>🤖 Lancer l'analyse IA</>
                )}
              </button>
            </section>

            {/* Résultats de l'analyse IA */}
            {iaAnalysisResult && (
              <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                <h3 className="text-sm font-bold text-purple-900 mb-3">🤖 ANALYSE IA</h3>
                <div className="space-y-3 text-sm">
                  {iaAnalysisResult.etatGeneral && (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-semibold text-purple-900 mb-1">État général :</div>
                      <div className="text-gray-700">{iaAnalysisResult.etatGeneral}</div>
                    </div>
                  )}
                  {iaAnalysisResult.travauxEstimes && (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-semibold text-purple-900 mb-1">Travaux estimés :</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{iaAnalysisResult.travauxEstimes}</div>
                    </div>
                  )}
                  {iaAnalysisResult.coutEstime && (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-semibold text-purple-900 mb-1">Coût estimé :</div>
                      <div className="text-xl font-bold text-purple-600">{iaAnalysisResult.coutEstime}</div>
                    </div>
                  )}
                  {iaAnalysisResult.pointsForts && iaAnalysisResult.pointsForts.length > 0 && (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-semibold text-green-900 mb-2">✅ Points forts :</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {iaAnalysisResult.pointsForts.map((point: string, idx: number) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {iaAnalysisResult.pointsFaibles && iaAnalysisResult.pointsFaibles.length > 0 && (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-semibold text-red-900 mb-2">⚠️ Points faibles :</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {iaAnalysisResult.pointsFaibles.map((point: string, idx: number) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Bouton de génération PDF */}
            <section>
              <button
                onClick={async () => {
                  setIsDownloadingPdf(true);
                  try {
                    const response = await fetch(`http://localhost:3001/api/pdf/fiche/${annonce.id}`);
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;

                    // Construire le nom du fichier : "Fiche - Maison - 6 pièces - Lescar.pdf"
                    const typeBien = annonce.rawData?.attributes?.find((a: any) => a.key === 'real_estate_type')?.value_label || annonce.typeBien || 'Bien';
                    const pieces = annonce.pieces || annonce.rawData?.attributes?.find((a: any) => a.key === 'rooms')?.value || '';
                    const ville = annonce.rawData?.location?.city_label || annonce.rawData?.location?.city || '';

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
                    setIsDownloadingPdf(false);
                  }
                }}
                disabled={isDownloadingPdf}
                className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloadingPdf ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  <>📄 Télécharger la fiche PDF</>
                )}
              </button>
            </section>

            {images.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-3">📸 GALERIE PHOTOS ({images.length})</h3>
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(0, 9).map((img: string, idx: number) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-md">
                      <img
                        src={img}
                        alt={`Photo ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                        onClick={() => window.open(img, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900">Score de matching</span>
                <span className="text-3xl font-bold text-purple-600">{score}/100</span>
              </div>
            </section>

            {bestDpe && (
              <section className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 space-y-4">
                <h3 className="text-sm font-bold text-blue-900">🏠 DIAGNOSTIC DPE</h3>

                {annonce.rawData?.location && (
                  <div className="bg-green-50 p-3 rounded border-l-2 border-green-500">
                    <div className="text-xs font-bold text-green-800 mb-1">
                      📌 Localisation Leboncoin:
                    </div>
                    <div className="text-sm text-green-700 font-medium">
                      {annonce.rawData.location.city_label || annonce.rawData.location.city}
                      {annonce.rawData.location.zipcode && `, ${annonce.rawData.location.zipcode}`}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 p-3 rounded border-l-2 border-yellow-500">
                  <div className="text-xs font-bold text-yellow-800 mb-1">📋 Adresse DPE ADEME:</div>
                  <div className="text-sm text-yellow-700">{bestDpe.adresseBan || 'Non disponible'}</div>
                  <div className="text-xs text-yellow-600 mt-1">{bestDpe.codePostalBan} • N° {bestDpe.numeroDpe}</div>
                </div>

                {/* Boutons de validation du matching */}
                <MatchValidationButtons
                  annonceId={annonce.id}
                  proposedDpeId={bestDpe.id}
                  proposedDpeAddress={bestDpe.adresseBan}
                  onValidationSuccess={() => {
                    console.log('✅ Feedback enregistré - Rafraîchissement des données...');
                    if (onDataUpdated) {
                      onDataUpdated();
                    }
                  }}
                />

                <div className="grid grid-cols-2 gap-3">
                  {bestDpe.anneConstruction && (
                    <div className="text-sm"><span className="font-semibold">🏗️ Année:</span> {bestDpe.anneConstruction}</div>
                  )}
                  {bestDpe.surfaceHabitable && (
                    <div className="text-sm"><span className="font-semibold">📐 Surface:</span> {Math.round(bestDpe.surfaceHabitable)} m²</div>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <div className="px-4 py-2 rounded-lg font-bold text-white shadow-md" style={{ backgroundColor: getDPEColor(bestDpe.etiquetteDpe) }}>
                    DPE: {bestDpe.etiquetteDpe}
                  </div>
                  <div className="px-4 py-2 rounded-lg font-bold text-white shadow-md" style={{ backgroundColor: getDPEColor(bestDpe.etiquetteGes) }}>
                    GES: {bestDpe.etiquetteGes}
                  </div>
                </div>

                <details className="bg-white rounded p-3">
                  <summary className="cursor-pointer font-semibold text-blue-900 text-sm">▶ Voir les détails énergétiques</summary>
                  <div className="mt-4 space-y-4">
                    {bestDpe.consoParM2Ef && (
                      <div>
                        <h4 className="text-xs font-bold text-blue-900 mb-2">⚡ CONSOMMATIONS</h4>
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-bold">{Math.round(bestDpe.consoParM2Ef)} kWh/m²/an</div>
                        </div>
                      </div>
                    )}
                    {bestDpe.coutTotal5Usages && (
                      <div>
                        <h4 className="text-xs font-bold text-blue-900 mb-2">💰 COÛTS ANNUELS</h4>
                        <div className="text-sm">Total: <strong>{Math.round(bestDpe.coutTotal5Usages)} €/an</strong></div>
                      </div>
                    )}
                    {bestDpe.qualiteIsolationEnveloppe && (
                      <div>
                        <h4 className="text-xs font-bold text-blue-900 mb-2">🏗️ ISOLATION</h4>
                        <div className="bg-blue-100 p-2 rounded text-sm">Global: <strong>{bestDpe.qualiteIsolationEnveloppe}</strong></div>
                      </div>
                    )}
                  </div>
                </details>
              </section>
            )}

            {annonce.typeBien?.toLowerCase().includes('maison') && (
              <section className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                <h3 className="text-sm font-bold text-amber-900 mb-3">🏡 DONNÉES CADASTRALES</h3>

                {cadastreData.length === 0 && !loadingCadastre && (
                  <button
                    onClick={loadCadastreData}
                    className="block w-full bg-amber-600 hover:bg-amber-700 text-white text-center py-3 rounded-lg transition-colors font-medium shadow-md"
                  >
                    📊 Charger les données cadastrales
                  </button>
                )}

                {loadingCadastre && (
                  <div className="text-center py-3 text-amber-700">
                    ⏳ Chargement des données cadastrales...
                  </div>
                )}

                {cadastreData.length > 0 && (
                  <div className="space-y-3">
                    {/* Surface totale */}
                    <div className="bg-gradient-to-r from-amber-100 to-amber-50 p-4 rounded-lg border-2 border-amber-300">
                      <div className="text-xs text-amber-700 mb-1">🌳 Surface totale du terrain</div>
                      <div className="text-2xl font-bold text-amber-900">
                        {Math.round(cadastreData.reduce((sum, p) => sum + (p.contenance || 0), 0))} m²
                      </div>
                      {cadastreData.length > 1 && (
                        <div className="text-xs text-amber-600 mt-1">
                          Composé de {cadastreData.length} parcelles
                        </div>
                      )}
                    </div>

                    {/* Liste des parcelles */}
                    {cadastreData.map((parcelle, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-amber-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-amber-700">
                            Parcelle {index + 1}/{cadastreData.length}
                          </span>
                          <span className="text-sm font-bold text-amber-900">
                            {Math.round(parcelle.contenance)} m²
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-amber-600">Section</div>
                            <div className="font-mono font-bold">{parcelle.section}</div>
                          </div>
                          <div>
                            <div className="text-amber-600">N°</div>
                            <div className="font-mono font-bold">{parcelle.numero}</div>
                          </div>
                          <div>
                            <div className="text-amber-600">Commune</div>
                            <div className="font-bold text-xs">{parcelle.nomCommune}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {bestDpe && bestDpe.adresseBan && (
              <section className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-500">
                <h3 className="text-sm font-bold text-gray-900 mb-3">🗺️ LOCALISATION DPE</h3>
                <div className="text-xs text-gray-600 mb-3">
                  📍 {bestDpe.adresseBan}, {bestDpe.codePostalBan}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bestDpe.adresseBan + ', ' + bestDpe.codePostalBan)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg transition-colors font-medium shadow-md"
                >
                  🗺️ Ouvrir dans Google Maps
                </a>
              </section>
            )}

            <section className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
              <h3 className="text-sm font-bold text-yellow-900 mb-3">📋 ANNONCE LEBONCOIN</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Type:</strong> {getPropertyTypeName(annonce.typeBien || '')}</div>
                {annonce.surface && <div><strong>Surface:</strong> {annonce.surface} m²</div>}
                {annonce.pieces && <div><strong>Pièces:</strong> {annonce.pieces}</div>}
              </div>
              <a
                href={annonce.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-lg transition-colors font-medium"
              >
                🔗 Voir l'annonce sur Leboncoin
              </a>
            </section>

            <section className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
              <h3 className="text-sm font-bold text-purple-900 mb-4">🎯 QUALIFICATION MONDAY</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Étape de qualification</label>
                <select
                  value={etapeSelected}
                  onChange={(e) => setEtapeSelected(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {MONDAY_ETAPES.map((etape) => (
                    <option key={etape.value} value={etape.value}>{etape.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tacheAFaire} onChange={(e) => setTacheAFaire(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-medium">À faire</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Boîtage effectué, propriétaire intéressé..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>

              {/* Si annonce traitée : uniquement bouton "Retirer" */}
              {trackingData?.statut === 'envoye_monday' ? (
                <>
                  {trackingData?.mondayItemId && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <div className="text-green-700">✅ Envoyé à Monday</div>
                      <div className="text-xs text-green-600">ID: #{trackingData.mondayItemId}</div>
                    </div>
                  )}

                  <button
                    onClick={handleResetStatus}
                    disabled={isSaving}
                    className="w-full py-3 rounded-lg font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {isSaving ? '⏳ Traitement...' : '🔄 Retirer l\'étiquette "Traité"'}
                  </button>
                </>
              ) : (
                /* Si annonce nouvelle : uniquement bouton "Envoyer" */
                <button
                  onClick={handleSendToMonday}
                  disabled={isSaving}
                  className="w-full py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isSaving ? '⏳ Envoi...' : '💾 Envoyer à Monday'}
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
