import React from 'react';

function PlayerList({ players }) {
  return (
    <div>
      <h3>Players</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {players.map((player) => (
          <li key={player.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <img
              src={`/images/profile${player.characterId}.png`}
              alt={`${player.nickname}'s character`}
              style={{ width: '30px', height: '30px', marginRight: '10px' }}
            />
            <span>{player.nickname} {player.isHost && '(Host)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerList;