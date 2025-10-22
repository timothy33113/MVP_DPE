import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';

interface Cluster {
  id: string;
  meilleurScore: number;
  nombreCandidats: number;
  statut: string;
  annonce: {
    url: string;
    codePostal: string;
    typeBien: string;
    surface: number | null;
    etiquetteDpe: string | null;
  };
}

export default function Matches() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/clusters?limit=20').then(r => r.json()),
      fetch('http://localhost:3001/api/clusters/stats').then(r => r.json())
    ]).then(([clustersRes, statsRes]) => {
      if (clustersRes.success) setClusters(clustersRes.data);
      if (statsRes.success) setStats(statsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header title="Clusters" showBackButton={true} />
      <div className="p-8">Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Clusters" showBackButton={true} />

      <div className="container mx-auto px-4 py-8">

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Score Moyen</div>
            <div className="text-2xl font-bold">{stats.scoreMoyen.toFixed(0)}/100</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Meilleur Score</div>
            <div className="text-2xl font-bold">{stats.meilleurScore}/100</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Non Vérifiés</div>
            <div className="text-2xl font-bold">{stats.parStatut.NON_VERIFIE}</div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl font-bold text-blue-600">{cluster.meilleurScore}/100</span>
                  <span className="px-3 py-1 bg-gray-100 rounded text-sm">
                    {cluster.nombreCandidats} candidats
                  </span>
                  <span className="px-3 py-1 bg-yellow-100 rounded text-sm">
                    {cluster.statut}
                  </span>
                </div>
                <div className="text-gray-600">
                  <div>{cluster.annonce.typeBien} • {cluster.annonce.surface}m² • {cluster.annonce.codePostal}</div>
                  <div className="text-sm">DPE: {cluster.annonce.etiquetteDpe || 'N/A'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/validation/${cluster.id}`}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Voir candidats DPE
                </a>
                <a
                  href={cluster.annonce.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Voir annonce
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
