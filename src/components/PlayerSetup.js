import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPlayer } from '../utils/api';

function PlayerSetup() {
  const [nickname, setNickname] = useState('');
  const [characterId, setCharacterId] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionIdFromUrl = searchParams.get('sessionId');
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      console.log('Joining as guest to session:', sessionIdFromUrl);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await createPlayer(nickname, characterId, sessionId);
      localStorage.setItem('playerId', response.player.id);
      localStorage.setItem('token', response.token);
      localStorage.setItem('sessionId', response.player.sessionId);
      localStorage.setItem('characterId', response.player.characterId.toString());
      navigate(`/lobby/${response.player.sessionId}`);
    } catch (error) {
      console.error('Error creating player:', error);
    }
  };

  return (
    <div>
      <h2>{sessionId ? 'Join Game' : 'Create Game'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
          maxLength={7}
          required
        />
        <div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
            <img
              key={id}
              src={`/images/profile${id}.png`}
              alt={`Character ${id}`}
              onClick={() => setCharacterId(id)}
              style={{
                border: characterId === id ? '2px solid blue' : 'none',
                width: '50px',
                height: '50px',
                margin: '5px',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
        <p>Selected character: {characterId}</p>
        <button type="submit">{sessionId ? 'Join Game' : 'Create Game'}</button>
      </form>
    </div>
  );
}

export default PlayerSetup;