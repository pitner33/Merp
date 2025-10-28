import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import EditPlayer from './pages/EditPlayer';
import CreateCharacter from './pages/CreateCharacter';
import Landing from './pages/Landing';
import AdventureMain from './pages/AdventureMain';
import AdventureFight from './pages/AdventureFight';
import AdventureFightRound from './pages/AdventureFightRound';
import D100 from './pages/D100';
import Crit from './pages/Crit';
import Attack from './pages/Attack';
import MM from './pages/MM';

export default function App() {
  return (
    <div style={{ padding: 0 }}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Landing />} />
        <Route path="/players/:id/edit" element={<EditPlayer />} />
        <Route path="/create-character" element={<CreateCharacter />} />
        <Route path="/adventure/main" element={<AdventureMain />} />
        <Route path="/adventure/fight" element={<AdventureFight />} />
        <Route path="/adventure/fight/round" element={<AdventureFightRound />} />
        <Route path="/adventure/d100" element={<D100 />} />
        <Route path="/adventure/crit" element={<Crit />} />
        <Route path="/adventure/attack" element={<Attack />} />
        <Route path="/adventure/mm" element={<MM />} />
        <Route path="*" element={<p>Not Found</p>} />
      </Routes>
    </div>
  );
}

