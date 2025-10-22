import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';

interface Candidat {
  id: string;
  rang: number;
  scoreNormalized: number;
  scoreTotal: number;
  scoreBase: number;
  scoreBonus: number;
  confiance: string;
  distanceGps: number | null;
  scoreDetails: any;
  dpe: {
    id: string;
    adresseBan: string;
    codePostalBan: string;
    typeBatiment: string;
    surfaceHabitable: number;
    etiquetteDpe: string | null;
    etiquetteGes: string | null;
    anneConstruction: number | null;
  };
}

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
    pieces: number | null;
    etiquetteDpe: string | null;
    etiquetteGes: string | null;
  };
  candidats: Candidat[];
}

export default function Validation() {
  const { clusterId } = useParams();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3001/api/clusters/${clusterId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setCluster(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clusterId]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfianceColor = (confiance: string) => {
    if (confiance === 'CERTAIN' || confiance === 'PROBABLE') return 'bg-green-100 text-green-800';
    if (confiance === 'POSSIBLE') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header title="Validation" showBackButton={true} />
      <div className="p-8">Chargement...</div>
    </div>
  );

  if (!cluster) return (
    <div className="min-h-screen flex flex-col">
      <Header title="Validation" showBackButton={true} />
      <div className="p-8">Cluster non trouvé</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Validation" showBackButton={true} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Validation du Matching</h1>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-3 text-blue-600">📋 Annonce Leboncoin</h2>
            <div className="space-y-2">
              <div><strong>Type:</strong> {cluster.annonce.typeBien}</div>
              <div><strong>Surface:</strong> {cluster.annonce.surface}m²</div>
              <div><strong>Pièces:</strong> {cluster.annonce.pieces || 'N/A'}</div>
              <div><strong>Code Postal:</strong> {cluster.annonce.codePostal}</div>
              <div><strong>DPE:</strong> {cluster.annonce.etiquetteDpe || 'N/A'}</div>
              <div><strong>GES:</strong> {cluster.annonce.etiquetteGes || 'N/A'}</div>
            </div>
            <a
              href={cluster.annonce.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Ouvrir l'annonce →
            </a>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">📊 Statistiques du Cluster</h2>
            <div className="space-y-2">
              <div><strong>Meilleur Score:</strong> <span className={`text-2xl font-bold ${getScoreColor(cluster.meilleurScore)}`}>{cluster.meilleurScore}/100</span></div>
              <div><strong>Nombre de candidats:</strong> {cluster.nombreCandidats}</div>
              <div><strong>Statut:</strong> <span className="px-2 py-1 bg-yellow-100 rounded text-sm">{cluster.statut}</span></div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">🏢 Candidats DPE ({cluster.candidats.length})</h2>

      <div className="space-y-4">
        {cluster.candidats.map((candidat) => (
          <div key={candidat.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-gray-400">#{candidat.rang}</div>
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(candidat.scoreNormalized)}`}>
                    {candidat.scoreNormalized.toFixed(0)}/100
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getConfianceColor(candidat.confiance)}`}>
                    {candidat.confiance}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">📍 Informations DPE</h3>
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-base">{candidat.dpe.adresseBan}</div>
                  <div><strong>Type:</strong> {candidat.dpe.typeBatiment}</div>
                  <div><strong>Surface:</strong> {candidat.dpe.surfaceHabitable}m²</div>
                  <div><strong>Code Postal:</strong> {candidat.dpe.codePostalBan}</div>
                  <div><strong>DPE:</strong> {candidat.dpe.etiquetteDpe || 'N/A'}</div>
                  <div><strong>GES:</strong> {candidat.dpe.etiquetteGes || 'N/A'}</div>
                  <div><strong>Année:</strong> {candidat.dpe.anneConstruction || 'N/A'}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">🎯 Détail des Scores</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Score Base:</strong> {candidat.scoreBase}/85</div>
                  <div className="ml-4 text-xs text-gray-600">
                    • DPE: {candidat.scoreDetails.scoreBase.dpe}/25
                  </div>
                  <div className="ml-4 text-xs text-gray-600">
                    • GES: {candidat.scoreDetails.scoreBase.ges}/25
                  </div>
                  <div className="ml-4 text-xs text-gray-600">
                    • Surface: {candidat.scoreDetails.scoreBase.surface}/15
                  </div>
                  <div className="ml-4 text-xs text-gray-600">
                    • Pièces: {candidat.scoreDetails.scoreBase.pieces}/10
                  </div>
                  <div className="ml-4 text-xs text-gray-600">
                    • Année: {candidat.scoreDetails.scoreBase.annee}/10
                  </div>
                  <div className="mt-2"><strong>Score Bonus:</strong> {candidat.scoreBonus}/27</div>
                  <div className="ml-4 text-xs text-gray-600">
                    • Distance GPS: {candidat.scoreDetails.bonus.distanceGPS}/10
                  </div>
                  <div className="ml-4 text-xs text-gray-600">
                    • Quartier: {candidat.scoreDetails.bonus.quartier}/5
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <strong>Correspondance:</strong>
                {candidat.scoreDetails.eliminatoires.codePostal && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">✓ Code postal</span>
                )}
                {candidat.scoreDetails.eliminatoires.typeBien && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">✓ Type de bien</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
