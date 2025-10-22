import { useState } from 'react';
import { Check, X, Search } from 'lucide-react';

interface MatchValidationButtonsProps {
  annonceId: string;
  proposedDpeId?: string;
  proposedDpeAddress?: string;
  onValidationSuccess?: () => void;
}

export default function MatchValidationButtons({
  annonceId,
  proposedDpeId,
  proposedDpeAddress,
  onValidationSuccess
}: MatchValidationButtonsProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleValidate = async () => {
    if (!proposedDpeId) return;

    setIsValidating(true);
    try {
      const response = await fetch('http://localhost:3001/api/matching/corrections/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annonceId,
          dpeId: proposedDpeId,
          notes: 'Validation manuelle - Match correct'
        })
      });

      if (response.ok) {
        alert('✅ Match validé ! Merci pour ton feedback.');
        if (onValidationSuccess) onValidationSuccess();
      } else {
        alert('❌ Erreur lors de la validation');
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('❌ Erreur réseau');
    } finally {
      setIsValidating(false);
    }
  };

  const searchDpe = async () => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    try {
      // Recherche par adresse dans la base DPE
      const response = await fetch(`http://localhost:3001/api/dpes/search?address=${encodeURIComponent(searchAddress)}`);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Réponse API DPE:', data);
        console.log('🔍 data.data:', data.data);
        console.log('🔍 Nombre de résultats:', data.data?.length || 0);
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCorrect = async (correctDpeId: string) => {
    setIsCorrecting(true);
    try {
      const body = {
        annonceId,
        dpeProposedId: proposedDpeId,
        dpeCorrectId: correctDpeId,
        notes: `Correction manuelle - Vrai DPE sélectionné`
      };
      console.log('📤 Envoi correction:', body);

      const response = await fetch('http://localhost:3001/api/matching/corrections/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('📥 Status:', response.status);
      const responseText = await response.text();
      console.log('📥 Réponse brute:', responseText);

      if (response.ok) {
        alert('✅ Correction enregistrée ! J\'apprends de mon erreur.');
        setShowCorrectionModal(false);
        if (onValidationSuccess) onValidationSuccess();
      } else {
        let errorData = null;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.error('Erreur parsing JSON:', e);
        }
        console.error('❌ Erreur API:', response.status, errorData);
        const errorMessage = errorData?.error?.message || errorData?.error || errorData?.message || response.statusText;
        alert(`❌ Erreur (${response.status}): ${errorMessage}`);
      }
    } catch (error) {
      console.error('Erreur correction:', error);
      alert('❌ Erreur réseau: ' + error);
    } finally {
      setIsCorrecting(false);
    }
  };

  if (!proposedDpeId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ Aucun DPE trouvé. Tu peux m'aider en cherchant le bon DPE :
        </p>
        <button
          onClick={() => setShowCorrectionModal(true)}
          className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          <Search className="inline w-4 h-4 mr-2" />
          Chercher le bon DPE
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-blue-900">
          🤖 J'ai trouvé ce DPE. Est-ce le bon ?
        </p>
        <p className="text-xs text-blue-700">
          📍 {proposedDpeAddress}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isValidating ? 'Validation...' : 'Oui, c\'est bon'}
          </button>

          <button
            onClick={() => setShowCorrectionModal(true)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Non, corriger
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Ton feedback m'aide à m'améliorer ! 🎯
        </p>
      </div>

      {/* Modal de correction */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900">
                  🔍 Trouver le bon DPE
                </h3>
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Rechercher par adresse :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchDpe()}
                    placeholder="Ex: 14 rue Alphonse Daudet, Pau"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={searchDpe}
                    disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSearching ? 'Recherche...' : 'Chercher'}
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Résultats ({searchResults.length}) :
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((dpe: any) => (
                      <div
                        key={dpe.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {dpe.adresseBan}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {dpe.surfaceHabitable}m² • {dpe.etiquetteDpe}/{dpe.etiquetteGes}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              DPE: {dpe.numeroDpe}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCorrect(dpe.id)}
                            disabled={isCorrecting}
                            className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {isCorrecting ? '...' : 'C\'est celui-ci'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && searchAddress && !isSearching && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun DPE trouvé pour cette adresse
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
