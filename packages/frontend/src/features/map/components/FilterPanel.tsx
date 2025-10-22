import { useState, useEffect } from 'react';

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

export interface FilterCriteria {
  // Critères de base
  typeBien: string[];
  typeMandat: string[]; // 'particulier', 'simple', 'exclusive', 'old_exclusive'
  excludeAmepiExclusive?: boolean; // Exclure les mandats exclusifs AMEPI
  budgetMin?: number;
  budgetMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  piecesMin?: number;
  chambresMin?: number;

  // Localisation
  zoneId?: string; // ID de la zone de recherche sélectionnée

  // Caractéristiques du bien
  jardin?: boolean;
  terrasse?: boolean;
  balcon?: boolean;
  piscine?: boolean;
  parking?: boolean;
  garage?: boolean;
  ascenseur?: boolean;
  cave?: boolean;
  cuisineEquipee?: boolean;
  interphone?: boolean;
  sousSol?: boolean;
  terrain?: boolean;

  // Énergie
  dpe?: string[]; // A, B, C, D, E, F, G - choix multiple
  typeChauffage?: string[];
  isolation?: string[];

  // État
  etatBien?: string[];
}

interface FilterPanelProps {
  onFilterChange: (filters: FilterCriteria) => void;
  resultCount: number;
  onOpenZoneManager?: () => void;
}

export function FilterPanel({ onFilterChange, resultCount, onOpenZoneManager }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [filters, setFilters] = useState<FilterCriteria>({
    typeBien: [],
    typeMandat: [],
    dpe: [],
    typeChauffage: [],
    isolation: [],
    etatBien: [],
  });

  // État pour les zones
  const [zones, setZones] = useState<SearchZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // État pour le formulaire acquéreur
  const [acquereurForm, setAcquereurForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Charger les zones actives au montage
  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoadingZones(true);
    try {
      const response = await fetch('http://localhost:3001/api/zones/active');
      if (response.ok) {
        const data = await response.json();
        setZones(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur chargement zones:', error);
    } finally {
      setLoadingZones(false);
    }
  };

  const updateFilter = <K extends keyof FilterCriteria>(
    key: K,
    value: FilterCriteria[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleArrayFilter = (key: 'typeBien' | 'typeMandat' | 'dpe' | 'typeChauffage' | 'isolation' | 'etatBien', value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const resetFilters = () => {
    const emptyFilters: FilterCriteria = {
      typeBien: [],
      typeMandat: [],
      dpe: [],
      typeChauffage: [],
      isolation: [],
      etatBien: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = () => {
    return (
      filters.typeBien.length > 0 ||
      filters.typeMandat.length > 0 ||
      filters.budgetMin !== undefined ||
      filters.budgetMax !== undefined ||
      filters.surfaceMin !== undefined ||
      filters.surfaceMax !== undefined ||
      filters.piecesMin !== undefined ||
      filters.chambresMin !== undefined ||
      filters.jardin !== undefined ||
      filters.terrasse !== undefined ||
      filters.balcon !== undefined ||
      filters.piscine !== undefined ||
      filters.parking !== undefined ||
      filters.garage !== undefined ||
      filters.ascenseur !== undefined ||
      filters.cave !== undefined ||
      filters.cuisineEquipee !== undefined ||
      filters.interphone !== undefined ||
      filters.sousSol !== undefined ||
      filters.terrain !== undefined ||
      (filters.dpe && filters.dpe.length > 0) ||
      filters.typeChauffage.length > 0 ||
      filters.isolation.length > 0 ||
      filters.etatBien.length > 0 ||
      filters.zoneId !== undefined
    );
  };

  const handleSaveAcquereur = async () => {
    // Validation
    if (!acquereurForm.nom || !acquereurForm.prenom || !acquereurForm.email || !acquereurForm.telephone) {
      alert('Veuillez remplir tous les champs obligatoires (nom, prénom, email, téléphone)');
      return;
    }

    setIsSaving(true);
    try {
      // Préparer les données pour l'API
      const localisations = filters.zoneId
        ? [{
            type: 'ZONE_CUSTOM',
            valeur: filters.zoneId,
            priorite: 1,
          }]
        : [];

      const acquereurData = {
        nom: acquereurForm.nom,
        prenom: acquereurForm.prenom,
        email: acquereurForm.email,
        telephone: acquereurForm.telephone,
        budgetMin: filters.budgetMin,
        budgetMax: filters.budgetMax,
        typeBienRecherche: filters.typeBien,
        surfaceMin: filters.surfaceMin,
        surfaceMax: filters.surfaceMax,
        piecesMin: filters.piecesMin,
        chambresMin: filters.chambresMin,
        dpeMax: filters.dpe && filters.dpe.length > 0 ? filters.dpe[filters.dpe.length - 1] : undefined,
        avecJardin: filters.jardin,
        avecTerrasse: filters.terrasse,
        avecBalcon: filters.balcon,
        avecPiscine: filters.piscine,
        avecParking: filters.parking,
        avecGarage: filters.garage,
        avecAscenseur: filters.ascenseur,
        avecCave: filters.cave,
        avecCuisineEquipee: filters.cuisineEquipee,
        avecInterphone: filters.interphone,
        avecSousSol: filters.sousSol,
        terrainMin: filters.terrain ? 1 : undefined,
        localisations,
      };

      const response = await fetch('http://localhost:3001/api/acquereurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acquereurData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement de l\'acquéreur');
      }

      alert('✅ Acquéreur enregistré avec succès !');

      // Réinitialiser le formulaire
      setAcquereurForm({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
      });
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'enregistrement de l\'acquéreur');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg max-w-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎯</span>
          <h3 className="font-semibold text-gray-900">Critères de recherche</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white rounded-md transition-colors"
        >
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Results counter */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">
            <strong className="text-blue-600">{resultCount}</strong> bien{resultCount !== 1 ? 's' : ''} correspond{resultCount !== 1 ? 'ent' : ''}
          </span>
          {hasActiveFilters() && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Filters content */}
      {isOpen && (
        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
          {/* Type de bien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de bien
            </label>
            <div className="flex flex-wrap gap-2">
              {['Appartement', 'Maison', 'Programme Neuf', 'Immeuble', 'Terrain', 'Parking', 'Autre'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('typeBien', type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.typeBien.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Type de mandat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de mandat
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'particulier', label: '💎 Particulier' },
                { value: 'simple', label: '🟢 Mandat simple' },
                { value: 'exclusive', label: '🔴 Exclusif récent' },
                { value: 'old_exclusive', label: '⭐ Exclusif ancien' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleArrayFilter('typeMandat', value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.typeMandat.includes(value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 mt-2 p-2 bg-purple-50 rounded border border-purple-300">
              <input
                type="checkbox"
                checked={filters.excludeAmepiExclusive || false}
                onChange={(e) => updateFilter('excludeAmepiExclusive', e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm text-purple-900 font-medium">
                🚫 Exclure mandats exclusifs AMEPI (non interagence)
              </span>
            </label>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget (€)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.budgetMin || ''}
                onChange={(e) => updateFilter('budgetMin', e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.budgetMax || ''}
                onChange={(e) => updateFilter('budgetMax', e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Surface */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surface (m²)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.surfaceMin || ''}
                onChange={(e) => updateFilter('surfaceMin', e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.surfaceMax || ''}
                onChange={(e) => updateFilter('surfaceMax', e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Pièces et chambres */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pièces min
              </label>
              <input
                type="number"
                placeholder="Ex: 3"
                value={filters.piecesMin || ''}
                onChange={(e) => updateFilter('piecesMin', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chambres min
              </label>
              <input
                type="number"
                placeholder="Ex: 2"
                value={filters.chambresMin || ''}
                onChange={(e) => updateFilter('chambresMin', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Caractéristiques */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Caractéristiques souhaitées
            </label>

            {/* Extérieur */}
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Extérieur</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'jardin', label: 'Jardin' },
                  { key: 'terrasse', label: 'Terrasse' },
                  { key: 'balcon', label: 'Balcon' },
                  { key: 'piscine', label: 'Piscine' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateFilter(key as keyof FilterCriteria,
                      filters[key as keyof FilterCriteria] === true ? undefined : true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filters[key as keyof FilterCriteria] === true
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Équipements</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'garage', label: 'Garage/Parking' },
                  { key: 'ascenseur', label: 'Ascenseur' },
                  { key: 'cave', label: 'Cave' },
                  { key: 'cuisineEquipee', label: 'Cuisine équipée' },
                  { key: 'interphone', label: 'Interphone' },
                  { key: 'sousSol', label: 'Sous-sol' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateFilter(key as keyof FilterCriteria,
                      filters[key as keyof FilterCriteria] === true ? undefined : true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filters[key as keyof FilterCriteria] === true
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DPE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note DPE
            </label>
            <div className="flex flex-wrap gap-2">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => (
                <button
                  key={grade}
                  onClick={() => toggleArrayFilter('dpe', grade)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.dpe?.includes(grade)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Type de chauffage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de chauffage
            </label>
            <div className="flex flex-wrap gap-2">
              {['Électrique', 'Gaz', 'Fioul', 'Solaire', 'Autre', 'Collectif'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('typeChauffage', type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.typeChauffage.includes(type)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Isolation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Isolation
            </label>
            <div className="flex flex-wrap gap-2">
              {['Bonne', 'Moyenne', 'À améliorer'].map(niveau => (
                <button
                  key={niveau}
                  onClick={() => toggleArrayFilter('isolation', niveau)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.isolation.includes(niveau)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {niveau}
                </button>
              ))}
            </div>
          </div>

          {/* État du bien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              État du bien
            </label>
            <div className="flex flex-wrap gap-2">
              {['Bon état', 'Très bon état', 'Neuf', 'Rénové', 'À rafraichir', 'Travaux à prévoir', 'Non renseigné'].map(etat => (
                <button
                  key={etat}
                  onClick={() => toggleArrayFilter('etatBien', etat)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.etatBien.includes(etat)
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {etat}
                </button>
              ))}
            </div>
          </div>

          {/* Zone de recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Zone de recherche
            </label>
            <div className="space-y-2">
              {loadingZones ? (
                <div className="text-sm text-gray-500">Chargement des zones...</div>
              ) : zones.length === 0 ? (
                <div className="text-sm text-gray-500">Aucune zone active disponible</div>
              ) : (
                <select
                  value={filters.zoneId || ''}
                  onChange={(e) => updateFilter('zoneId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez une zone</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ({zone.type})
                    </option>
                  ))}
                </select>
              )}
              {filters.zoneId && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
                  <span className="text-sm text-blue-700">
                    ✓ {zones.find(z => z.id === filters.zoneId)?.name}
                  </span>
                  <button
                    onClick={() => updateFilter('zoneId', undefined)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ×
                  </button>
                </div>
              )}
              {onOpenZoneManager && (
                <button
                  onClick={() => {
                    onOpenZoneManager();
                    // Recharger les zones après fermeture du modal (après un délai)
                    setTimeout(() => loadZones(), 1000);
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>🗺️</span>
                  <span>Gérer les zones</span>
                </button>
              )}
            </div>
          </div>

          {/* Section de filtres DPE séparés supprimée - on utilise maintenant les mêmes filtres pour les annonces et les DPE */}

          {/* Séparateur */}
          <div className="border-t border-gray-300 my-4"></div>

          {/* Formulaire Acquéreur */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <span>👤</span>
              <span>Enregistrer un acquéreur</span>
            </h4>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nom *"
                  value={acquereurForm.nom}
                  onChange={(e) => setAcquereurForm({ ...acquereurForm, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Prénom *"
                  value={acquereurForm.prenom}
                  onChange={(e) => setAcquereurForm({ ...acquereurForm, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email *"
                  value={acquereurForm.email}
                  onChange={(e) => setAcquereurForm({ ...acquereurForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Téléphone *"
                  value={acquereurForm.telephone}
                  onChange={(e) => setAcquereurForm({ ...acquereurForm, telephone: e.target.value })}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSaveAcquereur}
                disabled={isSaving}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-md hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Enregistrer Acquéreur</span>
                  </>
                )}
              </button>
              <p className="text-xs text-indigo-700 mt-2">
                Les critères et la zone de recherche sélectionnés ci-dessus seront enregistrés avec cet acquéreur.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
