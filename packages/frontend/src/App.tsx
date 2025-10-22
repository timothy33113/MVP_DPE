import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from '@features/dashboard/Dashboard';
import Matches from '@features/matches/Matches';
import Validation from '@features/validation/Validation';
import { MapView } from '@features/map/MapView';
import { AcquereursDashboard } from '@features/acquereurs/AcquereursDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/validation/:clusterId" element={<Validation />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/acquereurs" element={<AcquereursDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
