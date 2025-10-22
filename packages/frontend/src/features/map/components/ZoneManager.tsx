import { useState, useEffect } from 'react';
import { QUARTIERS_COORDINATES } from '@dpe-matching/shared/src/quartiers-coordinates';

interface SearchZone {
  id: string;
  name: string;
  description?: string;
  type: 'POLYGON' | 'CIRCLE' | 'QUARTIER' | 'VILLE';
  geometry: any;
  isActive: boolean;
  color: string;
  createdAt: string;
}

interface ZoneManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onZoneChange: () => void;
  onStartDrawing: (type: 'polygon' | 'circle') => void;
}

export function ZoneManager({ isOpen, onClose, onZoneChange, onStartDrawing }: ZoneManagerProps) {
  const [zones, setZones] = useState<SearchZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);
  const [newZoneType, setNewZoneType] = useState<'draw' | 'quartier' | 'circle'>('draw');

  // Formulaire nouvelle zone quartier
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#3b82f6');

  // Formulaire cercle
  const [circleRadius, setCircleRadius] = useState(5);

  useEffect(() => {
    if (isOpen) {
      loadZones();
    }
  }, [isOpen]);

  const loadZones = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/zones');
      if (!response.ok) {
        console.error('Erreur HTTP zones:', response.status);
        setZones([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setZones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement zones:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleZone = async (zoneId: string, isActive: boolean) => {
    try {
      await fetch(`http://localhost:3001/api/zones/${zoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      await loadZones();
      onZoneChange();
    } catch (error) {
      console.error('Erreur toggle zone:', error);
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!confirm('Supprimer cette zone ?')) return;

    try {
      await fetch(`http://localhost:3001/api/zones/${zoneId}`, {
        method: 'DELETE'
      });
      await loadZones();
      onZoneChange();
    } catch (error) {
      console.error('Erreur suppression zone:', error);
    }
  };

  const createQuartierZone = async () => {
    if (!zoneName || !selectedCity || !selectedDistrict) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const quartierCoords = QUARTIERS_COORDINATES[selectedCity]?.[selectedDistrict];
    if (!quartierCoords) {
      alert('Quartier non trouvé');
      return;
    }

    try {
      await fetch('http://localhost:3001/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoneName,
          type: 'QUARTIER',
          geometry: {
            type: 'Quartier',
            city: selectedCity,
            district: selectedDistrict,
            center: [quartierCoords.lng, quartierCoords.lat],
            radius: quartierCoords.radius || 1
          },
          color: zoneColor
        })
      });

      setShowNewZoneForm(false);
      resetForm();
      await loadZones();
      onZoneChange();
    } catch (error) {
      console.error('Erreur création zone:', error);
    }
  };

  const resetForm = () => {
    setZoneName('');
    setSelectedCity('');
    setSelectedDistrict('');
    setZoneColor('#3b82f6');
    setCircleRadius(5);
  };

  const cities = Object.keys(QUARTIERS_COORDINATES).sort();
  const districts = selectedCity ? Object.keys(QUARTIERS_COORDINATES[selectedCity] || {}).sort() : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">🎯 Zones de recherche clients</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : (
            <>
              {/* Bouton nouvelle zone */}
              {!showNewZoneForm && (
                <button
                  onClick={() => setShowNewZoneForm(true)}
                  className="w-full mb-4 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  ➕ Nouvelle zone
                </button>
              )}

              {/* Formulaire nouvelle zone */}
              {showNewZoneForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-blue-300">
                  <h3 className="font-bold mb-3 text-lg">Créer une nouvelle zone</h3>

                  {/* Type de zone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Type de zone</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewZoneType('quartier')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                          newZoneType === 'quartier'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📍 Quartier
                      </button>
                      <button
                        onClick={() => setNewZoneType('circle')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                          newZoneType === 'circle'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ⭕ Cercle
                      </button>
                      <button
                        onClick={() => setNewZoneType('draw')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                          newZoneType === 'draw'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ✏️ Dessiner
                      </button>
                    </div>
                  </div>

                  {/* Formulaire Quartier */}
                  {newZoneType === 'quartier' && (
                    <>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Nom de la zone</label>
                        <input
                          type="text"
                          value={zoneName}
                          onChange={(e) => setZoneName(e.target.value)}
                          placeholder="Ex: Zone Client - Jean Dupont"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Ville</label>
                        <select
                          value={selectedCity}
                          onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setSelectedDistrict('');
                          }}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">Sélectionner une ville</option>
                          {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>

                      {selectedCity && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-1">Quartier</label>
                          <select
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="">Sélectionner un quartier</option>
                            {districts.map(district => (
                              <option key={district} value={district}>{district}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Couleur</label>
                        <input
                          type="color"
                          value={zoneColor}
                          onChange={(e) => setZoneColor(e.target.value)}
                          className="w-full h-10 border rounded-md cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={createQuartierZone}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Créer
                        </button>
                        <button
                          onClick={() => {
                            setShowNewZoneForm(false);
                            resetForm();
                          }}
                          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  )}

                  {/* Mode Cercle */}
                  {newZoneType === 'circle' && (
                    <div className="text-center py-6">
                      <p className="mb-4 text-gray-700">Cliquez sur la carte pour placer le centre du cercle</p>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Rayon (km)</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={circleRadius}
                          onChange={(e) => setCircleRadius(Number(e.target.value))}
                          className="w-32 px-3 py-2 border rounded-md text-center"
                        />
                      </div>
                      <button
                        onClick={() => {
                          onStartDrawing('circle');
                          setShowNewZoneForm(false);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                      >
                        📍 Placer sur la carte
                      </button>
                      <button
                        onClick={() => {
                          setShowNewZoneForm(false);
                          resetForm();
                        }}
                        className="ml-2 px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* Mode Dessin */}
                  {newZoneType === 'draw' && (
                    <div className="text-center py-6">
                      <p className="mb-4 text-gray-700">Dessinez un polygone sur la carte pour définir la zone</p>
                      <button
                        onClick={() => {
                          onStartDrawing('polygon');
                          setShowNewZoneForm(false);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                      >
                        ✏️ Commencer à dessiner
                      </button>
                      <button
                        onClick={() => {
                          setShowNewZoneForm(false);
                          resetForm();
                        }}
                        className="ml-2 px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Liste des zones */}
              <div>
                <h3 className="font-bold mb-3 text-lg">Zones existantes ({zones.length})</h3>
                {zones.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune zone créée. Créez votre première zone pour filtrer les annonces.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {zones.map(zone => (
                      <div
                        key={zone.id}
                        className={`p-3 border rounded-lg ${
                          zone.isActive ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={zone.isActive}
                              onChange={(e) => toggleZone(zone.id, e.target.checked)}
                              className="w-5 h-5 cursor-pointer"
                            />
                            <div
                              className="w-6 h-6 rounded border-2 border-gray-300"
                              style={{ backgroundColor: zone.color }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-xs text-gray-500">
                                {zone.type === 'QUARTIER' && '📍 Quartier'}
                                {zone.type === 'CIRCLE' && '⭕ Cercle'}
                                {zone.type === 'POLYGON' && '✏️ Polygone'}
                                {zone.type === 'VILLE' && '🏙️ Ville'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteZone(zone.id)}
                            className="text-red-600 hover:text-red-700 font-bold px-3 py-1"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 text-center text-sm text-gray-600">
          Les zones actives filtrent automatiquement les annonces affichées sur la carte
        </div>
      </div>
    </div>
  );
}
