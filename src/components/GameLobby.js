import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const updateTimer = useCallback(() => {
    if (remainingTime > 0) {
      setRemainingTime(prevTime => prevTime - 1);
    }
  }, [remainingTime]);

  useEffect(() => {
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [updateTimer]);

  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    const token = localStorage.getItem('token');
    const storedSessionId = localStorage.getItem('sessionId');

    if (sessionId !== storedSessionId) {
      navigate('/');
      return;
    }

    const connectAndSubscribe = async () => {
      try {
        if (stompClientRef.current) {
          await stompClientRef.current.deactivate();
        }

        stompClientRef.current = await connectToSocket(token, playerId, sessionId, () => {
          console.log('Successfully connected and joined the game');
        });

        stompClientRef.current.subscribe(`/topic/game/${sessionId}`, function(gameState) {
          const newGameState = JSON.parse(gameState.body);
          console.log('Received game state:', newGameState);
          setGameState(newGameState);
          setIsHost(newGameState.players.find(p => p.id === playerId)?.isHost || false);
          setRemainingTime(Math.floor(newGameState.remainingTime / 1000));
        });

        stompClientRef.current.subscribe(`/topic/game/${sessionId}/chat`, function(chatMessage) {
          const newChatMessage = JSON.parse(chatMessage.body);
          console.log('Received chat message:', newChatMessage);
          setChatMessages(prevMessages => [...prevMessages, newChatMessage]);
        });

        stompClientRef.current.subscribe(`/user/queue/game/${sessionId}`, function(message) {
          const data = JSON.parse(message.body);
          console.log('Received personal message:', data);
          if (data.type === 'keyword') {
            setCurrentKeyword(data.data);
          } else if (data.type === 'image') {
            setCurrentImage(data.data);
          }
        });

        stompClientRef.current.subscribe(`/topic/game/${sessionId}/progress`, function(progress) {
          const newProgress = JSON.parse(progress.body);
          console.log('Received submission progress:', newProgress);
          setSubmissionProgress(newProgress);
        });

        stompClientRef.current.subscribe(`/topic/game/${sessionId}/phase`, function(phaseMessage) {
          const phaseData = JSON.parse(phaseMessage.body);
          console.log('Received phase message:', phaseData);
          setMessage(phaseData.message);
        });

        setConnectionError(null);
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionError('Failed to connect to the game server. Please try again.');
      }
    };

    connectAndSubscribe();

    return () => {
      if (stompClientRef.current) {
        disconnect(stompClientRef.current);
      }
    };
  }, [sessionId, navigate]);

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
              ['Waiting', 'Description', 'Generation', 'Checking', 'Guessing', 'Turn Result', 'Result'][gameState.currentPhase]
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
      case 3: // Checking phase
        return <p>Your Image: {currentImage}</p>  
      case 4: // Guessing phase
        return (
          <div>
            <p>Guess Image: {currentImage}</p>
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              placeholder="Enter your guess"
            />
            <button onClick={handleSubmitGuess}>Submit Guess</button>
          </div>
        );
      case 5:
        return <div>
                <p>Open Result</p>;
                <p>Image: {currentImage}</p>;
                <p>Prompt: {currentPrompt}</p>;
                <p>Keyword: {currentKeyword}</p>;
              </div> 
                
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