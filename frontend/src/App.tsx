import { Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import PlayersList from './pages/PlayersList';
import EditPlayer from './pages/EditPlayer';
import CreateCharacter from './pages/CreateCharacter';
import Landing from './pages/Landing';
import AdventureMain from './pages/AdventureMain';

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/players">Players</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Landing />} />
        <Route path="/players" element={<PlayersList />} />
        <Route path="/players/:id/edit" element={<EditPlayer />} />
        <Route path="/create-character" element={<CreateCharacter />} />
        <Route path="/adventure/main" element={<AdventureMain />} />
        <Route path="*" element={<p>Not Found</p>} />
      </Routes>
    </div>
  );
}
