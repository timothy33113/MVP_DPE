import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export function Header({ title, showBackButton = false }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + titre */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/taskimmo-logo.png"
                alt="TaskImmo Logo"
                className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Taskimmo</h1>
                <p className="text-xs text-gray-600 italic">L'agence qui révèle enfin le potentiel de votre bien</p>
              </div>
            </Link>

            {/* Bouton retour si demandé */}
            {showBackButton && (
              <>
                <div className="h-10 w-px bg-gray-300 mx-2"></div>
                <Link
                  to="/"
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="font-medium">Retour accueil</span>
                </Link>
              </>
            )}

            {/* Titre de la page */}
            {title && (
              <>
                <div className="h-10 w-px bg-gray-300 mx-2"></div>
                <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
              </>
            )}
          </div>

          {/* Navigation rapide */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              to="/map"
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
            >
              🗺️ Carte
            </Link>
            <Link
              to="/acquereurs"
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
            >
              👥 Acquéreurs
            </Link>
            <Link
              to="/matches"
              className="px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
            >
              📊 Clusters
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
