import { Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import PlayersList from './pages/PlayersList';
import EditPlayer from './pages/EditPlayer';

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/players">Players</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/players" replace />} />
        <Route path="/players" element={<PlayersList />} />
        <Route path="/players/:id/edit" element={<EditPlayer />} />
        <Route path="*" element={<p>Not Found</p>} />
      </Routes>
    </div>
  );
}

