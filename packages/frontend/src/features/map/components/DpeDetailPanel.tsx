import { useState } from 'react';
import { X } from 'lucide-react';

const MONDAY_ETAPES = [
  'À contacter',
  'Devis envoyé',
  'Relances',
  'Gagné',
  'Perdu',
  'Pas intéressé',
];

interface DpeRecord {
  id: string;
  numeroDpe: string;
  adresseBan: string;
  codePostalBan: string;
  typeBatiment: string;
  surfaceHabitable: number;
  surfaceTerrain?: number;
  anneConstruction?: number;
  etiquetteDpe: string;
  etiquetteGes: string;
  coordonneeX?: number;
  coordonneeY?: number;
  dateEtablissement?: string;
  rawData?: any;
}

interface DpeDetailPanelProps {
  dpe: DpeRecord;
  onClose: () => void;
}

export function DpeDetailPanel({ dpe, onClose }: DpeDetailPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [etapeSelected, setEtapeSelected] = useState('À contacter');
  const [notes, setNotes] = useState('');
  const [tacheAFaire, setTacheAFaire] = useState(false);
  const [mondayItemId, setMondayItemId] = useState<string | null>(null);
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non renseignée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDpeColor = (etiquette: string) => {
    const colors: Record<string, string> = {
      A: '#00a04f',
      B: '#50b748',
      C: '#c2d545',
      D: '#f5e841',
      E: '#f3b540',
      F: '#e97a3e',
      G: '#e0302c',
    };
    return colors[etiquette] || '#ccc';
  };

  const handleSendToMonday = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/monday/create-dpe-qualification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dpeId: dpe.id,
          numeroDpe: dpe.numeroDpe,
          adresse: dpe.adresseBan,
          codePostal: dpe.codePostalBan,
          typeBatiment: dpe.typeBatiment,
          surface: dpe.surfaceHabitable,
          etiquetteDpe: dpe.etiquetteDpe,
          etiquetteGes: dpe.etiquetteGes,
          anneConstruction: dpe.anneConstruction,
          etape: etapeSelected,
          notes: notes,
          tacheAFaire: tacheAFaire,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMondayItemId(data.mondayItemId);
        alert('✅ DPE envoyé à Monday.com !');
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur Monday:', error);
      alert('❌ Erreur lors de l\'envoi à Monday');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl overflow-y-auto border-l border-gray-200" style={{ zIndex: 9999 }}>
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: getDpeColor(dpe.etiquetteDpe) }}
              >
                DPE {dpe.etiquetteDpe}
              </div>
              <div
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: getDpeColor(dpe.etiquetteGes) }}
              >
                GES {dpe.etiquetteGes}
              </div>
            </div>
            <h2 className="text-xl font-bold">{dpe.adresseBan}</h2>
            <p className="text-green-100 text-sm">{dpe.codePostalBan}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Fermer"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Informations générales */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
            Informations générales
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Type de bien" value={dpe.typeBatiment} />
            <InfoItem label="Surface habitable" value={`${dpe.surfaceHabitable || 'N/A'} m²`} />
            <InfoItem label="Année construction" value={dpe.anneConstruction?.toString() || 'Non renseignée'} />
            <InfoItem label="Date du DPE" value={formatDate(dpe.dateEtablissement)} />
            <InfoItem label="Numéro DPE" value={dpe.numeroDpe} />
            {dpe.surfaceTerrain && (
              <InfoItem label="Surface terrain" value={`${dpe.surfaceTerrain} m²`} />
            )}
          </div>
        </section>

        {/* Étiquettes énergétiques */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
            Performance énergétique
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Consommation énergétique</span>
                <span
                  className="px-3 py-1 rounded-full text-white font-bold"
                  style={{ backgroundColor: getDpeColor(dpe.etiquetteDpe) }}
                >
                  {dpe.etiquetteDpe}
                </span>
              </div>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label) => (
                  <div
                    key={label}
                    className={`flex-1 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${
                      label === dpe.etiquetteDpe ? 'ring-4 ring-gray-800' : 'opacity-30'
                    }`}
                    style={{ backgroundColor: getDpeColor(label) }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Émissions de GES</span>
                <span
                  className="px-3 py-1 rounded-full text-white font-bold"
                  style={{ backgroundColor: getDpeColor(dpe.etiquetteGes) }}
                >
                  {dpe.etiquetteGes}
                </span>
              </div>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label) => (
                  <div
                    key={label}
                    className={`flex-1 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${
                      label === dpe.etiquetteGes ? 'ring-4 ring-gray-800' : 'opacity-30'
                    }`}
                    style={{ backgroundColor: getDpeColor(label) }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Détails techniques supplémentaires du rawData */}
        {dpe.rawData && (
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              Détails techniques
            </h3>
            <div className="space-y-2 text-sm">
              {dpe.rawData.type_energie_principale_chauffage && (
                <InfoItem
                  label="Énergie chauffage"
                  value={dpe.rawData.type_energie_principale_chauffage}
                />
              )}
              {dpe.rawData.type_installation_chauffage && (
                <InfoItem
                  label="Installation chauffage"
                  value={dpe.rawData.type_installation_chauffage}
                />
              )}
              {dpe.rawData.type_ventilation && (
                <InfoItem label="Ventilation" value={dpe.rawData.type_ventilation} />
              )}
              {dpe.rawData.qualite_isolation_enveloppe && (
                <InfoItem
                  label="Isolation enveloppe"
                  value={dpe.rawData.qualite_isolation_enveloppe}
                />
              )}
              {dpe.rawData['conso_5 usages_par_m2_ef'] && (
                <InfoItem
                  label="Consommation / m²"
                  value={`${dpe.rawData['conso_5 usages_par_m2_ef']} kWh/m²/an`}
                />
              )}
              {dpe.rawData.cout_total_5_usages && (
                <InfoItem
                  label="Coût énergétique annuel"
                  value={`${dpe.rawData.cout_total_5_usages} €/an`}
                />
              )}
            </div>
          </section>
        )}

        {/* Qualification Monday */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>QUALIFICATION MONDAY</span>
          </h3>

          {/* Étape */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Étape
            </label>
            <select
              value={etapeSelected}
              onChange={(e) => setEtapeSelected(e.target.value)}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              {MONDAY_ETAPES.map((etape) => (
                <option key={etape} value={etape}>
                  {etape}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Ajoutez des notes pour ce DPE..."
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tâche à faire */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tacheAFaire}
                onChange={(e) => setTacheAFaire(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Tâche à faire
              </span>
            </label>
          </div>

          {/* Bouton d'envoi */}
          {mondayItemId ? (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <div className="text-green-700">✅ Envoyé à Monday</div>
              <div className="text-xs text-green-600">ID: #{mondayItemId}</div>
            </div>
          ) : (
            <button
              onClick={handleSendToMonday}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '⏳ Envoi...' : '💾 Envoyer à Monday'}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
