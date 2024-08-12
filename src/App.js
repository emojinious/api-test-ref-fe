import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainPage from './components/MainPage';
import PlayerSetup from './components/PlayerSetup';
import GameLobby from './components/GameLobby';

function JoinRedirect() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    return <Navigate to={`/setup?sessionId=${sessionId}`} replace />;
  } else {
    return <Navigate to="/" replace />;
  }
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/setup" element={<PlayerSetup />} />
        <Route path="/lobby/:sessionId" element={<GameLobby />} />
        <Route path="/join" element={<JoinRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;