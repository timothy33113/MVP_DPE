import { useState, useEffect } from 'react';
import { X, Home, Activity, Brain, ClipboardCheck, Image, FileText, Download, ExternalLink } from 'lucide-react';
import { getPropertyIcon, getPropertyTypeName } from '../utils/propertyTypeHelpers';
import MatchValidationButtons from './MatchValidationButtons';

interface AnnonceDetailPanelProps {
  match: any;
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
  onCadastreDataLoaded?: (parcelles: any[]) => void;
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

type TabType = 'overview' | 'diagnostic' | 'ia' | 'qualification';

export default function AnnonceDetailPanelNew({ match, isOpen, onClose, onDataUpdated, onCadastreDataLoaded }: AnnonceDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [etapeSelected, setEtapeSelected] = useState('0');
  const [notes, setNotes] = useState('');
  const [tacheAFaire, setTacheAFaire] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [cadastreData, setCadastreData] = useState<any[]>([]);
  const [loadingCadastre, setLoadingCadastre] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
  const [iaAnalysisResult, setIaAnalysisResult] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dpeCandidates, setDpeCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [acquereurs, setAcquereurs] = useState<any[]>([]);
  const [loadingAcquereurs, setLoadingAcquereurs] = useState(false);

  useEffect(() => {
    setTrackingData(null);
    setNotes('');
    setEtapeSelected('0');
    setTacheAFaire(false);
    setCadastreData([]);
    setIaAnalysisResult(null);
    setSelectedImageIndex(0);
    setActiveTab('overview');
    setDpeCandidates([]);
    setAcquereurs([]);

    if (match?.annonce?.id) {
      loadTrackingData();
      loadIAAnalysis();
      loadDpeCandidates();
      loadAcquereurs(); // Charger les acquéreurs dès l'ouverture
    }
  }, [match?.annonce?.id]);

  const loadTrackingData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/tracking/${match.annonce.id}`);
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
        if (data.etapeMonday) setEtapeSelected(data.etapeMonday);
        if (data.notes) setNotes(data.notes);
      }
    } catch (error) {
      console.error('Erreur chargement tracking:', error);
    }
  };

  const loadIAAnalysis = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/ia-analysis/${match.annonce.id}`);
      if (response.ok) {
        const result = await response.json();
        setIaAnalysisResult(result);
      }
    } catch (error) {
      // Pas d'analyse existante - c'est normal
    }
  };

  const loadDpeCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const response = await fetch(`http://localhost:3001/api/matching/candidates/${match.annonce.id}`);
      if (response.ok) {
        const result = await response.json();
        // Trier par score décroissant et prendre les 5 meilleurs
        const sortedCandidates = (result.data?.candidats || [])
          .sort((a: any, b: any) => b.scoreNormalized - a.scoreNormalized)
          .slice(0, 5);
        setDpeCandidates(sortedCandidates);
      }
    } catch (error) {
      console.error('Erreur chargement candidats DPE:', error);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadAcquereurs = async () => {
    setLoadingAcquereurs(true);
    try {
      const response = await fetch(`http://localhost:3001/api/matching/acquereurs/${match.annonce.id}`);
      if (response.ok) {
        const result = await response.json();
        setAcquereurs(result.data?.acquereurs || []);
      }
    } catch (error) {
      console.error('Erreur chargement acquéreurs:', error);
    } finally {
      setLoadingAcquereurs(false);
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
        setNotes('');
        await loadTrackingData();
        if (onDataUpdated) onDataUpdated();
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
        if (onDataUpdated) onDataUpdated();
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
      setActiveTab('ia'); // Basculer vers l'onglet IA
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzingIA(false);
    }
  };

  const handleDownloadPdf = async () => {
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
  };

  const loadCadastreData = async () => {
    let fullAddress = '';

    if (bestDpe?.adresse_bien) {
      fullAddress = bestDpe.adresse_bien;
    } else {
      const location = annonce.rawData?.location;
      if (!location) return;

      const addressParts = [
        location.city_label || location.city,
        location.zipcode
      ].filter(Boolean);

      fullAddress = addressParts.join(', ');
    }

    if (!fullAddress) return;

    let expectedSurface: number | undefined;
    if (annonce.rawData?.attributes && Array.isArray(annonce.rawData.attributes)) {
      const landPlotAttr = annonce.rawData.attributes.find(
        (attr: any) => attr.key === 'land_plot_surface'
      );
      if (landPlotAttr && landPlotAttr.value) {
        expectedSurface = parseInt(landPlotAttr.value);
      }
    }

    setLoadingCadastre(true);
    try {
      let url = `http://localhost:3001/api/cadastre/address?adresse=${encodeURIComponent(fullAddress)}`;
      if (expectedSurface) {
        url += `&expectedSurface=${expectedSurface}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data.parcelles.length > 0) {
          setCadastreData(data.data.parcelles);
          if (onCadastreDataLoaded) {
            onCadastreDataLoaded(data.data.parcelles);
          }
        } else {
          setCadastreData([]);
          if (onCadastreDataLoaded) {
            onCadastreDataLoaded([]);
          }
        }
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

  const tabs = [
    { id: 'overview' as TabType, label: 'Vue d\'ensemble', icon: Home },
    { id: 'diagnostic' as TabType, label: 'Diagnostic', icon: Activity },
    { id: 'ia' as TabType, label: 'Analyse IA', icon: Brain, badge: iaAnalysisResult ? '✓' : null },
    { id: 'qualification' as TabType, label: 'Qualification', icon: ClipboardCheck },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-[2000] transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[750px] bg-white shadow-2xl z-[2001] transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                {annonce.rawData?.subject && (
                  <h1 className="text-lg font-bold leading-tight mb-2">
                    {annonce.rawData.subject}
                  </h1>
                )}
                <div className="flex items-center gap-3 text-blue-100 text-sm">
                  <span>{annonce.codePostal}</span>
                  <span>•</span>
                  <span>{mandateTypeLabel}</span>
                  <span>•</span>
                  <span className="font-bold text-white">Score: {score}/100</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {annonce.etiquetteDpe && (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg"
                    style={{ backgroundColor: getDPEColor(annonce.etiquetteDpe) }}
                  >
                    {annonce.etiquetteDpe}
                  </div>
                )}
                {annonce.prix && (
                  <div className="text-xl font-bold text-yellow-300 whitespace-nowrap">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annonce.prix)}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors flex-shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            {/* Floating Action Bar */}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex-1 py-2 px-3 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
              >
                {isDownloadingPdf ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Download size={16} />
                )}
                PDF
              </button>
              {bestDpe?.adresseBan ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bestDpe.adresseBan + ', ' + bestDpe.codePostalBan)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.19 8.5 15.5 8.5 15.5s8.5-9.31 8.5-15.5C20.5 3.81 16.69 0 12 0zm0 11.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                  </svg>
                  Maps
                </a>
              ) : (
                <button
                  disabled
                  className="flex-1 py-2 px-3 rounded-lg bg-white bg-opacity-10 text-sm font-medium flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.19 8.5 15.5 8.5 15.5s8.5-9.31 8.5-15.5C20.5 3.81 16.69 0 12 0zm0 11.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                  </svg>
                  Maps
                </button>
              )}
              <a
                href={annonce.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Leboncoin
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                    {tab.badge && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Score */}
                <section className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">Score de matching</span>
                    <span className="text-3xl font-bold text-purple-600">{score}/100</span>
                  </div>
                </section>

                {/* Photos Gallery */}
                {images.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Image size={18} />
                      GALERIE PHOTOS ({images.length})
                    </h3>
                    <div className="bg-gray-100 rounded-lg overflow-hidden mb-3 aspect-video">
                      <img
                        src={images[selectedImageIndex]}
                        alt={`Photo ${selectedImageIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => window.open(images[selectedImageIndex], '_blank')}
                      />
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {images.slice(0, 12).map((img: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square rounded overflow-hidden bg-gray-100 cursor-pointer transition-all ${
                            selectedImageIndex === idx ? 'ring-2 ring-blue-600' : 'hover:opacity-75'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Miniature ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Annonce Details */}
                <section className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                  <h3 className="text-sm font-bold text-yellow-900 mb-3">📋 DÉTAILS DE L'ANNONCE</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Type:</strong> {getPropertyTypeName(annonce.typeBien || '')}</div>
                    {annonce.surface && <div><strong>Surface:</strong> {annonce.surface} m²</div>}
                    {annonce.pieces && <div><strong>Pièces:</strong> {annonce.pieces}</div>}
                    {annonce.chambres && <div><strong>Chambres:</strong> {annonce.chambres}</div>}
                    {annonce.surfaceTerrain && <div><strong>Terrain:</strong> {annonce.surfaceTerrain} m²</div>}
                  </div>
                </section>
              </div>
            )}

            {/* Diagnostic Tab */}
            {activeTab === 'diagnostic' && (
              <div className="space-y-6">
                {bestDpe ? (
                  <>
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

                      <MatchValidationButtons
                        annonceId={annonce.id}
                        proposedDpeId={bestDpe.id}
                        proposedDpeAddress={bestDpe.adresseBan}
                        onValidationSuccess={() => {
                          if (onDataUpdated) onDataUpdated();
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

                    {/* Candidats DPE */}
                    <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border-2 border-indigo-200">
                      <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <Activity size={18} />
                        AUTRES DPE CORRESPONDANTS
                      </h3>

                      {loadingCandidates ? (
                        <div className="text-center py-4 text-indigo-700">
                          <svg className="animate-spin h-6 w-6 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Chargement...
                        </div>
                      ) : dpeCandidates.length > 0 ? (
                        <div className="space-y-2">
                          {dpeCandidates.map((candidate, index) => {
                            const hasScore = candidate.scoreNormalized > 0;
                            const isAdditional = candidate.confiance === 'POTENTIEL';
                            return (
                              <div
                                key={candidate.id}
                                className={`bg-white p-3 rounded-lg border-2 transition-all ${
                                  candidate.dpe.id === bestDpe?.id
                                    ? 'border-green-500 shadow-md'
                                    : isAdditional
                                    ? 'border-purple-200 hover:border-purple-300 bg-purple-50/30'
                                    : 'border-gray-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {candidate.dpe.id === bestDpe?.id && (
                                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                                          ✓ SÉLECTIONNÉ
                                        </span>
                                      )}
                                      {isAdditional && (
                                        <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">
                                          🔍 ALTERNATIF
                                        </span>
                                      )}
                                      <span className="text-xs font-semibold text-indigo-700">
                                        #{index + 1}
                                        {hasScore && ` • Score: ${Math.round(candidate.scoreNormalized)}/100`}
                                      </span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      📍 {candidate.dpe.adresseBan}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {candidate.dpe.codePostalBan} • N° {candidate.dpe.numeroDpe}
                                    </div>
                                  </div>
                                <div className="flex gap-2 ml-3">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow"
                                    style={{ backgroundColor: getDPEColor(candidate.dpe.etiquetteDpe) }}
                                  >
                                    {candidate.dpe.etiquetteDpe}
                                  </div>
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow"
                                    style={{ backgroundColor: getDPEColor(candidate.dpe.etiquetteGes) }}
                                  >
                                    {candidate.dpe.etiquetteGes}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-gray-100">
                                {candidate.dpe.anneConstruction && (
                                  <div>
                                    <span className="text-gray-500">Année:</span>{' '}
                                    <span className="font-semibold">{candidate.dpe.anneConstruction}</span>
                                  </div>
                                )}
                                {candidate.dpe.surfaceHabitable && (
                                  <div>
                                    <span className="text-gray-500">Surface:</span>{' '}
                                    <span className="font-semibold">{Math.round(candidate.dpe.surfaceHabitable)} m²</span>
                                  </div>
                                )}
                              </div>
                              {candidate.distanceGps !== null && candidate.distanceGps !== undefined && (
                                <div className="text-xs text-gray-500 mt-2">
                                  📏 Distance GPS: {Math.round(candidate.distanceGps)}m
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-4 text-sm">
                          Aucun autre candidat DPE trouvé
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun diagnostic DPE disponible
                  </div>
                )}
              </div>
            )}

            {/* IA Tab */}
            {activeTab === 'ia' && (
              <div className="space-y-6">
                {!iaAnalysisResult ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 mb-6">
                      <Brain size={40} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Analyse IA des photos</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Lancez l'analyse intelligente pour obtenir une estimation des travaux,
                      des points forts et points faibles du bien
                    </p>
                    <button
                      onClick={handleIAAnalysis}
                      disabled={isAnalyzingIA}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <>
                          <Brain size={20} />
                          Lancer l'analyse IA
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                      Analyse basée sur {images.length} photo{images.length > 1 ? 's' : ''} disponible{images.length > 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <section className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Brain size={24} />
                        ANALYSE IA
                      </h3>
                    </div>

                    {iaAnalysisResult.etatGeneral && (
                      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <span className="text-blue-600">📊</span>
                          État général
                        </div>
                        <div className="text-gray-700">{iaAnalysisResult.etatGeneral}</div>
                      </div>
                    )}

                    {iaAnalysisResult.coutEstime && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                        <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <span>💰</span>
                          Coût estimé des travaux
                        </div>
                        <div className="text-2xl font-bold text-green-600">{iaAnalysisResult.coutEstime}</div>
                      </div>
                    )}

                    {iaAnalysisResult.travauxEstimes && Array.isArray(iaAnalysisResult.travauxEstimes) && iaAnalysisResult.travauxEstimes.length > 0 && (
                      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-orange-600">🔧</span>
                          Travaux estimés
                        </div>
                        <ul className="space-y-2">
                          {iaAnalysisResult.travauxEstimes.map((travail: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              <span className="text-gray-700">{travail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {iaAnalysisResult.pointsForts && iaAnalysisResult.pointsForts.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <span>✅</span>
                          Points forts
                        </div>
                        <ul className="space-y-2">
                          {iaAnalysisResult.pointsForts.map((point: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-600 mt-1">▸</span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {iaAnalysisResult.pointsFaibles && iaAnalysisResult.pointsFaibles.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <span>⚠️</span>
                          Points d'attention
                        </div>
                        <ul className="space-y-2">
                          {iaAnalysisResult.pointsFaibles.map((point: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-600 mt-1">▸</span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {/* Qualification Tab */}
            {activeTab === 'qualification' && (
              <div className="space-y-6">
                {/* Section Acquéreurs */}
                <section className="bg-white rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <ClipboardCheck size={18} />
                    ACQUÉREURS INTÉRESSÉS
                  </h3>

                  {loadingAcquereurs ? (
                    <div className="text-center py-4 text-gray-500">⏳ Recherche d'acquéreurs...</div>
                  ) : acquereurs.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Aucun acquéreur trouvé pour ce bien</div>
                  ) : (
                    <div className="space-y-3">
                      {acquereurs.map((match, index) => {
                        const acq = match.acquereur;
                        return (
                          <div key={acq.id} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-blue-50 to-white">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {acq.nom} {acq.prenom}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {acq.email} • {acq.telephone}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">
                                  {Math.round(match.scoreTotal)}/100
                                </div>
                                <div className="text-xs text-gray-500">Score</div>
                              </div>
                            </div>

                            {/* Budget */}
                            <div className="text-xs text-gray-700 mb-2">
                              💰 Budget: {acq.budgetMin ? `${acq.budgetMin.toLocaleString()}€ - ` : ''}{acq.budgetMax.toLocaleString()}€
                            </div>

                            {/* Critères de recherche */}
                            <div className="text-xs text-gray-600 mb-2">
                              🏠 Recherche: {acq.typeBienRecherche.join(', ')}
                              {acq.surfaceMin && ` • ${acq.surfaceMin}m²+`}
                              {acq.piecesMin && ` • ${acq.piecesMin} pièces+`}
                            </div>

                            {/* Localisations */}
                            {acq.localisationsRecherche && acq.localisationsRecherche.length > 0 && (
                              <div className="text-xs text-gray-600 mb-2">
                                📍 {acq.localisationsRecherche.map((loc: any) => loc.valeur).join(', ')}
                              </div>
                            )}

                            {/* Points forts */}
                            {match.pointsForts && match.pointsForts.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-green-700 mb-1">✅ Points forts:</div>
                                <ul className="text-xs text-green-600 space-y-0.5">
                                  {match.pointsForts.slice(0, 3).map((point: string, i: number) => (
                                    <li key={i}>• {point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Points faibles */}
                            {match.pointsFaibles && match.pointsFaibles.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-orange-700 mb-1">⚠️ Points d'attention:</div>
                                <ul className="text-xs text-orange-600 space-y-0.5">
                                  {match.pointsFaibles.slice(0, 2).map((point: string, i: number) => (
                                    <li key={i}>• {point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
                  <h3 className="text-sm font-bold text-purple-900 mb-4 flex items-center gap-2">
                    <ClipboardCheck size={18} />
                    QUALIFICATION MONDAY
                  </h3>

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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
