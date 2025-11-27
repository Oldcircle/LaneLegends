
import React, { useRef, useEffect, useState } from 'react';
import { createInitialState, updateGame, castSkill, startRecall } from '../services/gameEngine';
import { renderGame } from '../services/renderer';
import { GameState, Team, Vector2, EntityType } from '../types';
import { GAME_HEIGHT } from '../constants';

interface GameCanvasProps {
  onGameStateUpdate: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameStateUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set size properly
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      // Update
      gameStateRef.current = updateGame(gameStateRef.current, time);
      
      // Draw
      renderGame(ctx, gameStateRef.current, canvas.width, canvas.height);
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    // HUD Update Interval (10fps)
    const hudInterval = setInterval(() => {
        onGameStateUpdate({ ...gameStateRef.current });
    }, 100);

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      clearInterval(hudInterval);
    };
  }, [onGameStateUpdate]);

  // Input Handling
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to World Coordinates
    const worldX = screenX + gameStateRef.current.cameraX;
    const worldY = screenY;

    // Check if clicked an enemy
    const state = gameStateRef.current;
    const player = state.entities.find(en => en.id === state.playerId);
    if (!player || player.isDead) return;

    let clickedTargetId: string | null = null;
    
    // Simple click detection
    for (const entity of state.entities) {
        if (entity.isDead || entity.team === player.team) continue;
        const d = Math.hypot(entity.position.x - worldX, entity.position.y - worldY);
        if (d < entity.radius + 10) {
            clickedTargetId = entity.id;
            break;
        }
    }

    if (clickedTargetId) {
        // Attack Move (Manual Chase)
        player.targetId = clickedTargetId;
        player.chaseTarget = true;
        player.moveTarget = null; // Clear manual move target
    } else {
        // Move Command (Disable Chase)
        player.targetId = null;
        player.chaseTarget = false;
        
        // Precise movement target
        player.moveTarget = { x: worldX, y: worldY };
        
        // Initial velocity calc for immediate response (gameEngine will maintain it)
        const dx = worldX - player.position.x;
        const dy = worldY - player.position.y;
        const len = Math.hypot(dx, dy);
        player.velocity = {
            x: (dx / len) * player.moveSpeed,
            y: (dy / len) * player.moveSpeed
        };
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
     const key = e.key.toLowerCase();
     if (['q', 'w', 'e', 'r'].includes(key)) {
         castSkill(gameStateRef.current, key);
     }
     if (key === 'b') {
         startRecall(gameStateRef.current);
     }
  };

  useEffect(() => {
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-crosshair"
      onContextMenu={handleContextMenu}
    />
  );
};

export default GameCanvas;
