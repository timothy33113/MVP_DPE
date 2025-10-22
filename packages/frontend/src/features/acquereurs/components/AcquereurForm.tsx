import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface AcquereurFormProps {
  onClose: () => void;
  acquereur?: any;
}

export function AcquereurForm({ onClose, acquereur }: AcquereurFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!acquereur;

  // Convertir les types de bien de la base de données (MAISON, APPARTEMENT) vers le format frontend
  const convertTypeBienFromDB = (types: string[] = []) => {
    const mapping: Record<string, string> = {
      'MAISON': 'Maison',
      'APPARTEMENT': 'Appartement',
      'TERRAIN': 'Terrain',
    };
    return types.map(type => mapping[type] || type);
  };

  const [formData, setFormData] = useState({
    nom: acquereur?.nom || '',
    prenom: acquereur?.prenom || '',
    email: acquereur?.email || '',
    telephone: acquereur?.telephone || '',
    budgetMin: acquereur?.budgetMin || '',
    budgetMax: acquereur?.budgetMax || '',
    typeBienRecherche: convertTypeBienFromDB(acquereur?.typeBienRecherche),
    surfaceMin: acquereur?.surfaceMin || '',
    surfaceMax: acquereur?.surfaceMax || '',
    piecesMin: acquereur?.piecesMin || '',
    piecesMax: acquereur?.piecesMax || '',
    chambresMin: acquereur?.chambresMin || '',
    dpeMax: acquereur?.dpeMax || '',
    niveauTravauxAccepte: acquereur?.niveauTravauxAccepte || '',
    terrainMin: acquereur?.terrainMin || '',
    avecJardin: acquereur?.avecJardin || false,
    avecTerrasse: acquereur?.avecTerrasse || false,
    avecBalcon: acquereur?.avecBalcon || false,
    avecPiscine: acquereur?.avecPiscine || false,
    avecGarage: acquereur?.avecGarage || false,
    avecAscenseur: acquereur?.avecAscenseur || false,
    avecCave: acquereur?.avecCave || false,
    avecCuisineEquipee: acquereur?.avecCuisineEquipee || false,
    avecInterphone: acquereur?.avecInterphone || false,
    avecSousSol: acquereur?.avecSousSol || false,
    avecParking: acquereur?.avecParking || false,
    etageMin: acquereur?.etageMin || '',
    etageMax: acquereur?.etageMax || '',
    localisations: acquereur?.localisationsRecherche?.map((loc: any) => ({
      type: loc.type,
      valeur: loc.valeur,
      priorite: loc.priorite || 1
    })) || [],
    notes: acquereur?.notes || '',
  });

  const [selectedZones, setSelectedZones] = useState<string[]>(
    acquereur?.localisationsRecherche
      ?.filter((loc: any) => loc.type === 'ZONE_CUSTOM')
      .map((loc: any) => loc.valeur) || []
  );

  // Fetch zones actives
  const { data: zonesData } = useQuery({
    queryKey: ['zones-active'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/zones/active');
      if (!response.ok) throw new Error('Failed to fetch zones');
      return response.json();
    },
  });

  const zones = zonesData || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEdit
        ? `http://localhost:3001/api/acquereurs/${acquereur.id}`
        : 'http://localhost:3001/api/acquereurs';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save acquéreur');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquereurs-list'] });
      queryClient.invalidateQueries({ queryKey: ['matchs'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construire les localisations avec les zones sélectionnées
    const localisations = selectedZones.map((zoneId) => ({
      type: 'ZONE_CUSTOM',
      valeur: zoneId,
      priorite: 1,
    }));

    // Nettoyer les données
    const cleanedData = {
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email,
      telephone: formData.telephone,
      budgetMin: formData.budgetMin ? Number(formData.budgetMin) : undefined,
      budgetMax: formData.budgetMax ? Number(formData.budgetMax) : undefined,
      typeBienRecherche: formData.typeBienRecherche,
      surfaceMin: formData.surfaceMin ? Number(formData.surfaceMin) : undefined,
      surfaceMax: formData.surfaceMax ? Number(formData.surfaceMax) : undefined,
      piecesMin: formData.piecesMin ? Number(formData.piecesMin) : undefined,
      piecesMax: formData.piecesMax ? Number(formData.piecesMax) : undefined,
      chambresMin: formData.chambresMin ? Number(formData.chambresMin) : undefined,
      dpeMax: formData.dpeMax || undefined,
      niveauTravauxAccepte: formData.niveauTravauxAccepte || undefined,
      terrainMin: formData.terrainMin ? Number(formData.terrainMin) : undefined,
      avecJardin: formData.avecJardin,
      avecTerrasse: formData.avecTerrasse,
      avecBalcon: formData.avecBalcon,
      avecPiscine: formData.avecPiscine,
      avecGarage: formData.avecGarage,
      avecAscenseur: formData.avecAscenseur,
      avecCave: formData.avecCave,
      avecCuisineEquipee: formData.avecCuisineEquipee,
      avecInterphone: formData.avecInterphone,
      avecSousSol: formData.avecSousSol,
      avecParking: formData.avecParking,
      etageMin: formData.etageMin ? Number(formData.etageMin) : undefined,
      etageMax: formData.etageMax ? Number(formData.etageMax) : undefined,
      localisations,
      notes: formData.notes,
    };

    createMutation.mutate(cleanedData);
  };

  const handleTypeBienChange = (type: string) => {
    const current = formData.typeBienRecherche;
    const updated = current.includes(type)
      ? current.filter((t: string) => t !== type)
      : [...current, type];

    setFormData({
      ...formData,
      typeBienRecherche: updated,
    });
  };

  const handleZoneToggle = (zoneId: string) => {
    setSelectedZones((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Modifier l\'acquéreur' : 'Nouvel acquéreur'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Informations personnelles */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Budget</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Budget minimum (€)</label>
                <input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Budget maximum (€)</label>
                <input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Critères de recherche */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Critères de recherche</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Type de bien *</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.typeBienRecherche.includes('Maison')}
                    onChange={() => handleTypeBienChange('Maison')}
                    className="mr-2"
                  />
                  Maison
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.typeBienRecherche.includes('Appartement')}
                    onChange={() => handleTypeBienChange('Appartement')}
                    className="mr-2"
                  />
                  Appartement
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.typeBienRecherche.includes('Terrain')}
                    onChange={() => handleTypeBienChange('Terrain')}
                    className="mr-2"
                  />
                  Terrain
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Zone de recherche *</label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                {zones.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune zone disponible</p>
                ) : (
                  <div className="space-y-2">
                    {zones.map((zone: any) => (
                      <label key={zone.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedZones.includes(zone.id)}
                          onChange={() => handleZoneToggle(zone.id)}
                          className="mr-2"
                        />
                        {zone.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Surface min (m²)</label>
                <input
                  type="number"
                  value={formData.surfaceMin}
                  onChange={(e) => setFormData({ ...formData, surfaceMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Surface max (m²)</label>
                <input
                  type="number"
                  value={formData.surfaceMax}
                  onChange={(e) => setFormData({ ...formData, surfaceMax: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terrain min (m²)</label>
                <input
                  type="number"
                  value={formData.terrainMin}
                  onChange={(e) => setFormData({ ...formData, terrainMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pièces min</label>
                <input
                  type="number"
                  value={formData.piecesMin}
                  onChange={(e) => setFormData({ ...formData, piecesMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pièces max</label>
                <input
                  type="number"
                  value={formData.piecesMax}
                  onChange={(e) => setFormData({ ...formData, piecesMax: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chambres min</label>
                <input
                  type="number"
                  value={formData.chambresMin}
                  onChange={(e) => setFormData({ ...formData, chambresMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">DPE max</label>
                <select
                  value={formData.dpeMax}
                  onChange={(e) => setFormData({ ...formData, dpeMax: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tous</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Niveau de travaux accepté</label>
              <select
                value={formData.niveauTravauxAccepte}
                onChange={(e) => setFormData({ ...formData, niveauTravauxAccepte: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Indifférent</option>
                <option value="AUCUN">Aucun travaux</option>
                <option value="LEGER">Travaux légers</option>
                <option value="MOYEN">Travaux moyens</option>
                <option value="IMPORTANT">Travaux importants</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Extérieur</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecJardin}
                    onChange={(e) => setFormData({ ...formData, avecJardin: e.target.checked })}
                    className="mr-2"
                  />
                  Jardin
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecTerrasse}
                    onChange={(e) => setFormData({ ...formData, avecTerrasse: e.target.checked })}
                    className="mr-2"
                  />
                  Terrasse
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecBalcon}
                    onChange={(e) => setFormData({ ...formData, avecBalcon: e.target.checked })}
                    className="mr-2"
                  />
                  Balcon
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecPiscine || false}
                    onChange={(e) => setFormData({ ...formData, avecPiscine: e.target.checked })}
                    className="mr-2"
                  />
                  Piscine
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Équipements et aménagements</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecGarage}
                    onChange={(e) => setFormData({ ...formData, avecGarage: e.target.checked })}
                    className="mr-2"
                  />
                  Garage/Parking
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecAscenseur}
                    onChange={(e) => setFormData({ ...formData, avecAscenseur: e.target.checked })}
                    className="mr-2"
                  />
                  Ascenseur
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecCave || false}
                    onChange={(e) => setFormData({ ...formData, avecCave: e.target.checked })}
                    className="mr-2"
                  />
                  Cave
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecCuisineEquipee || false}
                    onChange={(e) => setFormData({ ...formData, avecCuisineEquipee: e.target.checked })}
                    className="mr-2"
                  />
                  Cuisine équipée
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecInterphone || false}
                    onChange={(e) => setFormData({ ...formData, avecInterphone: e.target.checked })}
                    className="mr-2"
                  />
                  Interphone
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.avecSousSol || false}
                    onChange={(e) => setFormData({ ...formData, avecSousSol: e.target.checked })}
                    className="mr-2"
                  />
                  Sous-sol
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Étage min</label>
                <input
                  type="number"
                  value={formData.etageMin}
                  onChange={(e) => setFormData({ ...formData, etageMin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Étage max</label>
                <input
                  type="number"
                  value={formData.etageMax}
                  onChange={(e) => setFormData({ ...formData, etageMax: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Notes</h3>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes additionnelles sur l'acquéreur..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {createMutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>

          {createMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              ❌ Erreur lors de l'enregistrement de l'acquéreur
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
