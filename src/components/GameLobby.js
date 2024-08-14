import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectToSocket, sendChatMessage, disconnect, startGame, submitPrompt, submitGuess } from '../utils/socket';
import Chat from './Chat';
import PlayerList from './PlayerList';
import { updateGameSettings } from '../utils/api';
import MessageDisplay from '../utils/MessageDisplay';

function GameLobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentGuess, setCurrentGuess] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [submissionProgress, setSubmissionProgress] = useState({ submitted: 0, total: 0 });
  const [message, setMessage] = useState('');

  const stompClientRef = useRef(null);
  const isConnectedRef = useRef(false);

  const connectAndSubscribe = useCallback(async () => {
    if (isConnectedRef.current) return;

    const playerId = localStorage.getItem('playerId');
    const token = localStorage.getItem('token');

    try {
      stompClientRef.current = await connectToSocket(token, playerId, sessionId, () => {
        console.log('Successfully connected and joined the game');
      });

      const subscriptions = [
        { topic: `/topic/game/${sessionId}`, callback: handleGameState },
        { topic: `/topic/game/${sessionId}/chat`, callback: handleChatMessage },
        { topic: `/user/queue/game/${sessionId}`, callback: handlePersonalMessage },
        { topic: `/topic/game/${sessionId}/progress`, callback: handleProgress },
        { topic: `/topic/game/${sessionId}/phase`, callback: handlePhase },
      ];

      subscriptions.forEach(({ topic, callback }) => {
        stompClientRef.current.subscribe(topic, callback);
      });

      isConnectedRef.current = true;
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionError('Failed to connect to the game server. Please try again.');
    }
  }, [sessionId]);

  const handleGameState = useCallback((gameState) => {
    const newGameState = JSON.parse(gameState.body);
    setGameState(newGameState);
    const playerId = localStorage.getItem('playerId');
    setIsHost(newGameState.players.find(p => p.id === playerId)?.isHost || false);
    setRemainingTime(Math.floor(newGameState.remainingTime / 1000));
  }, []);

  const handleChatMessage = useCallback((chatMessage) => {
    const newChatMessage = JSON.parse(chatMessage.body);
    setChatMessages(prevMessages => [...prevMessages, newChatMessage]);
  }, []);

  const handlePersonalMessage = useCallback((message) => {
    alert(message);
    const data = JSON.parse(message.body);
    if (data.type === 'keyword') {
      setCurrentKeyword(data.data);
    } else if (data.type === 'image') {
      setCurrentImage(data.data);
    }
  }, []);

  const handleProgress = useCallback((progress) => {
    const newProgress = JSON.parse(progress.body);
    setSubmissionProgress(newProgress);
  }, []);

  const handlePhase = useCallback((phaseMessage) => {
    const phaseData = JSON.parse(phaseMessage.body);
    setMessage(phaseData.message);
  }, []);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (sessionId !== storedSessionId) {
      navigate('/');
      return;
    }

    connectAndSubscribe();

    return () => {
      if (stompClientRef.current) {
        disconnect(stompClientRef.current);
        isConnectedRef.current = false;
      }
    };
  }, [sessionId, navigate, connectAndSubscribe]);

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

  const handleStartGame = () => {
    startGame(sessionId);
  };

  const handleSubmitPrompt = () => {
    submitPrompt(sessionId, currentPrompt);
    setCurrentPrompt('');
  };

  const handleSubmitGuess = () => {
    submitGuess(sessionId, currentGuess);
    setCurrentGuess('');
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

  const renderGameContent = () => {
    if (!gameState) return null;

    switch (gameState.state) {
      case 'WAITING':
        return (
          <>
            <button onClick={copyInviteLink}>Copy Invite Link</button>
            {isHost && <button onClick={handleStartGame}>Start Game</button>}
          </>
        );
      case 'IN_PROGRESS':
        return (
          <div>
            <h3>Game in Progress</h3>
            <p>Current Turn: {gameState.currentTurn}</p>
            <p>Current Phase: {
              ['Waiting', 'Description', 'Generation', 'Guessing', 'Result'][gameState.currentPhase]
            }</p>
            <p>Remaining Time: {remainingTime} seconds</p>
            <p>Submission Progress: {submissionProgress.submitted}/{submissionProgress.total}</p>
            {renderPhaseContent()}
          </div>
        );
      case 'FINISHED':
        return (
          <div>
            <h3>Game Finished</h3>
            <p>Winner: {gameState.players.reduce((prev, current) => (prev.score > current.score) ? prev : current).nickname}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPhaseContent = () => {
    switch (gameState.currentPhase) {
      case 1: // Description phase
        return (
          <div>
            <p>Your Keyword: {currentKeyword}</p>
            <input
              type="text"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="Enter your prompt"
            />
            <button onClick={handleSubmitPrompt}>Submit Prompt</button>
          </div>
        );
      case 2: // Generation phase
        return <p>Generating images...</p>;
      case 3: // Guessing phase
        return (
          <div>
            {currentImage && <img src={currentImage} alt="Generated" style={{maxWidth: '300px'}} />}
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              placeholder="Enter your guess"
            />
            <button onClick={handleSubmitGuess}>Submit Guess</button>
          </div>
        );
      default:
        return null;
    }
  };

  if (connectionError) {
    return <div>Error: {connectionError}</div>;
  }

  return (
    <div>
      <h2>Game Lobby</h2>
      <MessageDisplay message={message} />
      {connectionError && <div className="error-message">{connectionError}</div>}
      {gameState && (
        <>
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
          {renderGameContent()}
          <Chat messages={chatMessages} onSendMessage={handleSendChatMessage} />
        </>
      )}
    </div>
  );
}

export default GameLobby;