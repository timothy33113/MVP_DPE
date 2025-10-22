import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AcquereurForm } from './components/AcquereurForm';
import { MatchingModal } from './components/MatchingModal';
import { Header } from '@/components/Header';

interface Acquereur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  budgetMin?: number;
  budgetMax?: number;
  typeBienRecherche: string[];
  statutActif: boolean;
  createdAt: string;
  localisationsRecherche?: Array<{
    id: string;
    type: string;
    valeur: string;
    priorite: number;
  }>;
}

export function AcquereursDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [editingAcquereur, setEditingAcquereur] = useState<any>(null);
  const [matchingAcquereur, setMatchingAcquereur] = useState<any>(null);

  // Fetch acquéreurs list
  const { data: acquereursData, isLoading: acquereursLoading, refetch } = useQuery({
    queryKey: ['acquereurs-list'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/acquereurs');
      if (!response.ok) throw new Error('Failed to fetch acquéreurs');
      const result = await response.json();
      return result;
    },
  });

  const acquereurs = acquereursData?.success ? (acquereursData?.data || []) : [];

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAcquereur(null);
  };

  const handleEdit = (acquereur: any) => {
    setEditingAcquereur(acquereur);
    setShowForm(true);
  };

  const handleOpenMatching = (acquereur: any) => {
    setMatchingAcquereur(acquereur);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec logo et navigation */}
      <Header title="Acquéreurs" showBackButton={true} />

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + Nouvel acquéreur
          </button>
        </div>

      {/* Contenu */}
      <div className="mt-6">
        <AcquereursListView
          acquereurs={acquereurs}
          onEdit={handleEdit}
          onMatching={handleOpenMatching}
          isLoading={acquereursLoading}
        />
      </div>
      </div>

      {showForm && (
        <AcquereurForm
          onClose={handleCloseForm}
          acquereur={editingAcquereur}
        />
      )}

      {matchingAcquereur && (
        <MatchingModal
          acquereur={matchingAcquereur}
          onClose={() => setMatchingAcquereur(null)}
        />
      )}
    </div>
  );
}

function AcquereursListView({ acquereurs, onEdit, onMatching, isLoading }: {
  acquereurs: Acquereur[];
  onEdit: (acq: any) => void;
  onMatching: (acq: any) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {acquereurs.length} acquéreur{acquereurs.length > 1 ? 's' : ''} actif{acquereurs.length > 1 ? 's' : ''}
          </h2>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Rechercher..."
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option>Tous les types</option>
              <option>Maison</option>
              <option>Appartement</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type recherché
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {acquereurs.map((acquereur) => (
              <tr key={acquereur.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {acquereur.prenom} {acquereur.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {acquereur.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {acquereur.budgetMin ? `${acquereur.budgetMin.toLocaleString()}€ - ` : ''}
                  {acquereur.budgetMax ? `${acquereur.budgetMax.toLocaleString()}€` : 'Non défini'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {acquereur.typeBienRecherche?.map((type: string) => (
                      <span
                        key={type}
                        className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    Actif
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(acquereur)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onMatching(acquereur)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Matchs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {acquereurs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun acquéreur trouvé</h3>
          <p className="text-gray-500">Commencez par ajouter votre premier acquéreur</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            + Ajouter un acquéreur
          </button>
        </div>
      )}
    </div>
  );
}
