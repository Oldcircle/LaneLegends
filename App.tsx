
import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleGameStateUpdate = useCallback((newState: GameState) => {
    // We only trigger React re-renders for the HUD at a lower interval
    setGameState(newState);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      <GameCanvas onGameStateUpdate={handleGameStateUpdate} />
      <HUD gameState={gameState} />
    </div>
  );
};

export default App;
