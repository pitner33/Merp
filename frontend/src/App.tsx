import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import EditPlayer from './pages/EditPlayer';
import CreateCharacter from './pages/CreateCharacter';
import Landing from './pages/Landing';
import AdventureMain from './pages/AdventureMain';
import AdventureFight from './pages/AdventureFight';
import AdventureFightRound from './pages/AdventureFightRound';

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
        <Route path="*" element={<p>Not Found</p>} />
      </Routes>
    </div>
  );
}

