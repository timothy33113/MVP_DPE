# Frontend - DPE Matching UI

Application React pour la visualisation et validation des matchings DPE-Leboncoin.

## Architecture

```
src/
├── features/        # Features modulaires
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── matches/
│   │   ├── Matches.tsx
│   │   ├── MatchCard.tsx
│   │   └── MatchFilters.tsx
│   └── validation/
│       ├── Validation.tsx
│       ├── CandidateList.tsx
│       └── ValidationForm.tsx
├── components/      # Composants réutilisables
│   ├── Layout/
│   ├── Button/
│   ├── Card/
│   └── Input/
├── hooks/           # Custom hooks
│   ├── useMatching.ts
│   ├── useAuth.ts
│   └── usePagination.ts
├── services/        # API clients
│   ├── api.ts
│   ├── matching.service.ts
│   ├── dpe.service.ts
│   └── annonces.service.ts
├── types/           # Types TypeScript
├── utils/           # Utilitaires
├── App.tsx
├── main.tsx
└── index.css
```

## Features

### Dashboard
Vue d'ensemble avec statistiques et accès rapides.

### Matches
Liste des clusters de matching avec filtres et pagination.

### Validation
Interface de validation des matchs avec visualisation des candidats.

## Composants

Tous les composants utilisent:
- TypeScript strict
- Tailwind CSS pour le styling
- Props typées avec interfaces

### Exemple
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', onClick, children }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

## State Management

### React Query
Pour les requêtes serveur:
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['matches', page],
  queryFn: () => matchingService.listClusters(page),
});
```

### Zustand
Pour le state global:
```typescript
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  login: (token) => set({ token }),
  logout: () => set({ token: null }),
}));
```

## Hooks Personnalisés

### useMatching
```typescript
export const useMatching = (annonceId: string) => {
  const runMatching = useMutation({
    mutationFn: (options) => matchingService.runMatching(annonceId, options),
  });

  return { runMatching };
};
```

## Services API

### Axios Instance
```typescript
import { api } from './api';

export const matchingService = {
  runMatching: (annonceId: string, options: MatchingOptions) =>
    api.post(`/matching/annonces/${annonceId}`, options),

  getCluster: (clusterId: string) =>
    api.get(`/matching/clusters/${clusterId}`),

  listClusters: (page: number, limit: number) =>
    api.get('/matching/clusters', { params: { page, limit } }),
};
```

## Styling

### Tailwind CSS
Utilise le système de design Tailwind avec customisation:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: { /* ... */ },
    },
  },
}
```

### Classes Utilitaires
```css
/* index.css */
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.btn-primary {
  @apply btn bg-primary-600 text-white hover:bg-primary-700;
}

.card {
  @apply bg-white rounded-lg shadow-md p-6;
}
```

## Routing

React Router DOM v6:
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/matches" element={<Matches />} />
  <Route path="/validation/:clusterId" element={<Validation />} />
</Routes>
```

## Tests

### Vitest
```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

### Exemple de Test
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## Build & Déploiement

```bash
# Développement
pnpm dev

# Build production
pnpm build

# Preview du build
pnpm preview
```

Le build Vite génère:
- HTML, CSS, JS optimisés
- Code splitting automatique
- Assets avec hash
- Sourcemaps (si configuré)

## Bonnes Pratiques

1. **Feature-Based Structure**: Organisation par features
2. **Component Composition**: Composants petits et réutilisables
3. **Custom Hooks**: Logique réutilisable
4. **TypeScript**: Typage strict
5. **React Query**: Cache et gestion serveur
6. **Error Boundaries**: Gestion d'erreurs React
7. **Loading States**: Feedback utilisateur
8. **Responsive Design**: Mobile-first avec Tailwind
