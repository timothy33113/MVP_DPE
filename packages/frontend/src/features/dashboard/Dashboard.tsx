import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/clusters/stats')
      .then(r => r.json())
      .then(res => {
        if (res.success) setStats(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />

      <div className="container mx-auto px-6 py-12">{/* Stats cards */}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-1">Total Clusters</div>
            <div className="text-4xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-1">Score Moyen</div>
            <div className="text-4xl font-bold">{stats.scoreMoyen.toFixed(0)}<span className="text-2xl">/100</span></div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-1">Meilleur Score</div>
            <div className="text-4xl font-bold">{stats.meilleurScore}<span className="text-2xl">/100</span></div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-1">À Vérifier</div>
            <div className="text-4xl font-bold">{stats.parStatut.NON_VERIFIE}</div>
          </div>
        </div>
      )}

      {/* Accès rapides - Grandes cartes */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Accès rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/map"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Carte Interactive</h3>
            <p className="text-gray-600 mb-4">Visualisez toutes les annonces Leboncoin sur la carte avec filtres DPE</p>
            <div className="flex items-center text-blue-600 font-semibold">
              Ouvrir la carte
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          <Link
            to="/acquereurs"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-green-500"
          >
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Acquéreurs</h3>
            <p className="text-gray-600 mb-4">Gérez vos acquéreurs et lancez des matchings personnalisés</p>
            <div className="flex items-center text-green-600 font-semibold">
              Voir les acquéreurs
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          <Link
            to="/matches"
            className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-purple-500"
          >
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Clusters d'annonces</h3>
            <p className="text-gray-600 mb-4">Consultez et validez les {stats?.total || 0} clusters de matching DPE</p>
            <div className="flex items-center text-purple-600 font-semibold">
              Voir les clusters
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-500 mt-8">Chargement des statistiques...</div>
      )}
      </div>
    </div>
  );
}
