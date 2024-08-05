import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { connectToSocket, sendChatMessage, disconnect } from '../utils/socket';
import Chat from './Chat';
import PlayerList from './PlayerList';
import { updateGameSettings } from '../utils/api';

function GameLobby() {
  const { sessionId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    const token = localStorage.getItem('token');
    const characterId = localStorage.getItem('characterId');

    console.log('Player info:', { playerId, characterId, sessionId });

    let stompClient;

    const connectAndSubscribe = async () => {
      try {
        stompClient = await connectToSocket(token, playerId, sessionId, () => {
          console.log('Successfully connected and joined the game');
        });

        stompClient.subscribe(`/topic/game/${sessionId}`, function(gameState) {
          const newGameState = JSON.parse(gameState.body);
          console.log('Received game state:', newGameState);
          setGameState(newGameState);
          setIsHost(newGameState.players.find(p => p.id === playerId)?.isHost || false);
        });

        stompClient.subscribe(`/topic/game/${sessionId}/chat`, function(chatMessage) {
          const newChatMessage = JSON.parse(chatMessage.body);
          console.log('Received chat message:', newChatMessage);
          setChatMessages(prevMessages => [...prevMessages, newChatMessage]);
        });

        setConnectionError(null);
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionError('Failed to connect to the game server. Please try again.');
      }
    };

    connectAndSubscribe();

    return () => {
      if (stompClient) {
        disconnect();
      }
    };
  }, [sessionId]);

  const handleUpdateGameSettings = async (settings) => {
    try {
      const token = localStorage.getItem('token');
      await updateGameSettings(sessionId, settings, token);
      console.log('Game settings updated successfully');
    } catch (error) {
      console.error('Failed to update game settings:', error);
    }
  };

  const handleSendChatMessage = (content) => {
    sendChatMessage(sessionId, content);
  };

  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?sessionId=${sessionId}`;
  };

  const copyInviteLink = () => {
    const inviteLink = generateInviteLink();
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy invite link: ', err);
    });
  };

  if (connectionError) {
    return <div>Error: {connectionError}</div>;
  }

  return (
    <div>
      <h2>Game Lobby</h2>
      {gameState && (
        <>
          <button onClick={copyInviteLink}>Copy Invite Link</button>
          <PlayerList players={gameState.players} />
          <div>
            <h3>Game Settings</h3>
            {isHost ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateGameSettings({
                  promptTimeLimit: parseInt(e.target.promptTimeLimit.value),
                  guessTimeLimit: parseInt(e.target.guessTimeLimit.value),
                  difficulty: e.target.difficulty.value,
                  turns: parseInt(e.target.turns.value)
                });
              }}>
                <input name="promptTimeLimit" type="number" placeholder="Prompt Time Limit" defaultValue={gameState.settings.promptTimeLimit} />
                <input name="guessTimeLimit" type="number" placeholder="Guess Time Limit" defaultValue={gameState.settings.guessTimeLimit} />
                <input name="difficulty" type="text" placeholder="Difficulty" defaultValue={gameState.settings.difficulty} />
                <input name="turns" type="number" placeholder="Number of Turns" defaultValue={gameState.settings.turns} />
                <button type="submit">Update Settings</button>
              </form>
            ) : (
              <div>
                <p>Prompt Time Limit: {gameState.settings.promptTimeLimit}</p>
                <p>Guess Time Limit: {gameState.settings.guessTimeLimit}</p>
                <p>Difficulty: {gameState.settings.difficulty}</p>
                <p>Number of Turns: {gameState.settings.turns}</p>
              </div>
            )}
          </div>
          <Chat messages={chatMessages} onSendMessage={handleSendChatMessage} />
        </>
      )}
    </div>
  );
}

export default GameLobby;