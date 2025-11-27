
import React, { useState, useEffect } from 'react';
import { GameState, Team, EntityType } from '../types';
import { buyItem, startRecall } from '../services/gameEngine';
import { ITEMS, SHOP_RANGE, GAME_WIDTH, LANE_Y } from '../constants';
import { Sword, Shield, Activity, Skull, Zap, Timer, Coins, ShoppingBag, X, ArrowUpCircle, Home } from 'lucide-react';

interface HUDProps {
  gameState: GameState | null;
}

const HUD: React.FC<HUDProps> = ({ gameState }) => {
  const [shopOpen, setShopOpen] = useState(false);

  // Keyboard shortcut for Shop
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key.toLowerCase() === 'p') setShopOpen(prev => !prev);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!gameState) return null;

  const player = gameState.entities.find(e => e.id === gameState.playerId);
  const blueNexus = gameState.entities.find(e => e.type === EntityType.NEXUS && e.team === Team.BLUE);
  const redNexus = gameState.entities.find(e => e.type === EntityType.NEXUS && e.team === Team.RED);

  if (!player && !gameState.gameOver) return null;

  const canBuy = (cost: number) => {
      if (!player) return false;
      // Check range
      const spawnX = player.team === Team.BLUE ? 0 : GAME_WIDTH;
      const inRange = Math.hypot(player.position.x - spawnX, player.position.y - LANE_Y) <= SHOP_RANGE;
      return inRange && player.gold >= cost;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans">
      
      {/* Top Header: Score & Time */}
      <div className="flex justify-center items-start space-x-6 pt-2 pointer-events-auto">
        
        {/* Blue Team Score */}
        <div className="flex flex-col items-end">
             <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-600 rounded-md px-4 py-2 shadow-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
                <span className="text-blue-100 font-bold text-xl">{Math.floor(blueNexus?.hp || 0)}</span>
             </div>
             <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, (blueNexus?.hp || 0) / 50)}%` }}></div>
             </div>
        </div>

        {/* Timer Box */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-x border-b border-yellow-600/50 px-8 py-3 rounded-b-lg shadow-2xl flex items-center space-x-2">
           <Timer className="w-4 h-4 text-yellow-500" />
           <span className="text-white font-mono text-2xl font-black tracking-widest">
             {Math.floor(gameState.gameTime / 60)}:{(Math.floor(gameState.gameTime) % 60).toString().padStart(2, '0')}
           </span>
        </div>

        {/* Red Team Score */}
        <div className="flex flex-col items-start">
             <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-600 rounded-md px-4 py-2 shadow-lg">
                <span className="text-red-100 font-bold text-xl">{Math.floor(redNexus?.hp || 0)}</span>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></div>
             </div>
             <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${Math.min(100, (redNexus?.hp || 0) / 50)}%` }}></div>
             </div>
        </div>
      </div>

      {/* SHOP MODAL */}
      {shopOpen && player && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="bg-slate-900 border-2 border-yellow-600 rounded-xl shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-950 p-4 border-b border-yellow-600/30 flex justify-between items-center">
                    <h2 className="text-yellow-500 text-xl font-bold flex items-center gap-2">
                        <ShoppingBag /> ITEM SHOP
                    </h2>
                    <div className="text-yellow-400 font-mono text-xl flex items-center gap-2">
                        <Coins size={20} /> {player.gold}
                    </div>
                    <button onClick={() => setShopOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto grid grid-cols-4 gap-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
                    {ITEMS.map(item => {
                        const affordable = canBuy(item.cost);
                        return (
                            <div key={item.id} className="bg-slate-800 border border-slate-600 p-3 rounded-lg flex flex-col gap-2 hover:border-yellow-500 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-slate-900 rounded border border-slate-500 flex items-center justify-center text-slate-300">
                                        {/* Dynamic Icons based on name/config */}
                                        {item.icon === 'Sword' && <Sword size={20} />}
                                        {item.icon === 'Footprints' && <Activity size={20} />} 
                                        {item.icon === 'Heart' && <Activity size={20} className="text-red-400"/>} 
                                        {item.icon === 'Zap' && <Zap size={20} className="text-yellow-400"/>} 
                                        {item.icon === 'Shield' && <Shield size={20} />} 
                                        {item.icon === 'Star' && <Sword size={20} className="text-orange-400"/>} 
                                        {item.icon === 'Wind' && <Activity size={20} className="text-blue-400"/>} 
                                    </div>
                                    <span className={`text-sm font-mono ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>{item.cost}g</span>
                                </div>
                                <div className="font-bold text-slate-200 text-sm">{item.name}</div>
                                <div className="text-xs text-slate-400">{item.description}</div>
                                <button 
                                    disabled={!affordable}
                                    onClick={() => buyItem(gameState, item.id)}
                                    className={`mt-auto py-1 px-2 rounded text-xs font-bold ${affordable ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                >
                                    BUY
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 pointer-events-auto backdrop-blur-md z-50 animate-in fade-in duration-500">
             <div className="text-center p-12 bg-slate-900 border-4 border-yellow-600 rounded-2xl shadow-[0_0_100px_rgba(234,179,8,0.3)] transform scale-100">
                <h1 className={`text-9xl font-black mb-4 tracking-tighter drop-shadow-2xl ${gameState.winner === Team.BLUE ? 'text-blue-500' : 'text-red-500'}`}>
                   {gameState.winner === Team.BLUE ? 'VICTORY' : 'DEFEAT'}
                </h1>
                <p className="text-slate-400 text-lg mb-8 uppercase tracking-[0.2em]">The battle has ended</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-12 py-5 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white font-bold text-2xl rounded shadow-lg border-2 border-yellow-400 transition-all active:scale-95"
                >
                  PLAY AGAIN
                </button>
             </div>
          </div>
      )}

      {/* Bottom HUD */}
      {!gameState.gameOver && player && (
        <div className="flex items-end justify-center w-full pointer-events-auto pb-6 space-x-4">
           
           {/* Inventory & Gold */}
           <div className="flex flex-col gap-2">
               {/* Shop Button */}
               <button onClick={() => setShopOpen(!shopOpen)} className="bg-yellow-900/80 border border-yellow-600 p-2 rounded-lg text-yellow-400 hover:bg-yellow-800 transition-colors flex items-center justify-center gap-2 shadow-lg">
                   <ShoppingBag size={18} /> <span className="text-xs font-bold font-mono">SHOP (P)</span>
               </button>

               <div className="bg-slate-900/90 border border-slate-600 rounded-xl p-2 flex flex-col items-center gap-2 shadow-xl">
                   <div className="text-yellow-400 font-mono font-bold text-sm flex items-center gap-1">
                       <Coins size={14} /> {player.gold}
                   </div>
                   <div className="grid grid-cols-3 gap-1">
                       {[0,1,2,3,4,5].map(i => {
                           const item = player.inventory[i];
                           return (
                               <div key={i} className="w-8 h-8 bg-slate-950 border border-slate-700 rounded flex items-center justify-center">
                                   {item ? (
                                       <div className="text-slate-200" title={item.name + "\n" + item.description}>
                                            {item.icon === 'Sword' && <Sword size={14} />}
                                            {item.icon === 'Footprints' && <Activity size={14} />} 
                                            {item.icon === 'Heart' && <Activity size={14} className="text-red-400"/>} 
                                            {item.icon === 'Zap' && <Zap size={14} className="text-yellow-400"/>} 
                                            {item.icon === 'Shield' && <Shield size={14} />} 
                                            {item.icon === 'Star' && <Sword size={14} className="text-orange-400"/>} 
                                            {item.icon === 'Wind' && <Activity size={14} className="text-blue-400"/>} 
                                       </div>
                                   ) : null}
                               </div>
                           )
                       })}
                   </div>
               </div>
           </div>

           {/* Main Control Panel */}
           <div className="bg-slate-900/95 border border-slate-600 rounded-2xl p-4 flex items-center space-x-6 shadow-2xl relative backdrop-blur-md">
              
              {/* Gold Top Border */}
              <div className="absolute -top-[2px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

              {/* Portrait */}
              <div className="relative group">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 border-2 border-blue-400/50 flex items-center justify-center shadow-inner overflow-hidden group-hover:border-blue-400 transition-colors">
                     {/* Placeholder Avatar */}
                     <div className="absolute inset-0 bg-[url('https://ui-avatars.com/api/?name=G&background=0D8ABC&color=fff&size=128')] bg-cover opacity-80"></div>
                     <span className="z-10 text-4xl shadow-black drop-shadow-lg">🛡️</span>
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-600 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                    LVL 18
                  </div>
              </div>

              {/* Stats Block */}
              <div className="flex flex-col w-56 space-y-2">
                  <div className="flex justify-between items-end">
                     <span className="text-xs font-bold text-slate-400 tracking-wider">GAREN</span>
                     <span className="text-sm font-mono text-white/90 drop-shadow-md">{Math.floor(player.hp)} <span className="text-slate-500 text-xs">/ {player.maxHp}</span></span>
                  </div>
                  
                  {/* Health Bar */}
                  <div className="relative h-5 w-full bg-slate-950 rounded-md border border-slate-700 overflow-hidden shadow-inner">
                      {/* Background Striping */}
                      <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '10px 10px'}}></div>
                      
                      {/* HP Fill */}
                      <div className="absolute h-full bg-gradient-to-r from-green-600 via-green-500 to-green-400 transition-all duration-200" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} />
                      
                      {/* Shield Fill */}
                      {player.shield > 0 && (
                        <div className="absolute h-full bg-white/40 border-l border-white/60 transition-all duration-200 backdrop-blur-sm" 
                             style={{ left: `${(player.hp / player.maxHp) * 100}%`, width: `${(player.shield / player.maxHp) * 100}%` }} />
                      )}
                  </div>
                  
                  {/* Attribute Icons */}
                  <div className="flex space-x-4 pt-1">
                      <div className="flex items-center text-xs text-red-300 font-medium bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50">
                        <Sword size={12} className="mr-1.5"/> {Math.floor(player.damage)}
                      </div>
                      <div className="flex items-center text-xs text-blue-300 font-medium bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/50">
                        <Zap size={12} className="mr-1.5"/> {Math.floor(player.moveSpeed)}
                      </div>
                  </div>
              </div>

              {/* Divider */}
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>

              {/* Skills Deck */}
              <div className="flex space-x-3 items-center">
                  {['q', 'w', 'e', 'r'].map((key) => {
                      const cd = player.cooldowns[key];
                      const isReady = cd <= 0;
                      const isActive = (key === 'q' && player.qActive) || (key === 'w' && player.wActive) || (key === 'e' && player.eActive);
                      
                      return (
                        <div key={key} className="group relative transition-transform hover:-translate-y-1">
                            {/* Keybind Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950 text-[9px] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 z-20 font-bold shadow-md">
                                {key.toUpperCase()}
                            </div>
                            
                            {/* Skill Button */}
                            <div className={`
                                w-16 h-16 rounded-xl border-b-4 flex items-center justify-center transition-all duration-150 overflow-hidden relative shadow-lg
                                ${isReady 
                                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-900 hover:brightness-110 cursor-pointer' 
                                    : 'bg-slate-900 border-slate-950 grayscale'
                                }
                                ${isActive ? 'ring-2 ring-yellow-400 border-yellow-600 !bg-yellow-900/20' : ''}
                            `}>
                                {/* Inner Glow for Ready state */}
                                {isReady && <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>}

                                {/* Icons */}
                                <div className={`relative z-10 transform transition-transform group-hover:scale-110 ${isActive ? 'text-yellow-400 scale-110' : isReady ? 'text-blue-100' : 'text-slate-600'}`}>
                                    {key === 'q' && <Zap size={28} strokeWidth={2.5} />}
                                    {key === 'w' && <Shield size={28} strokeWidth={2.5} />}
                                    {key === 'e' && <Activity size={28} strokeWidth={2.5} className={isActive ? 'animate-spin' : ''} />}
                                    {key === 'r' && <Sword size={28} strokeWidth={2.5} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
                                </div>
                            </div>

                            {/* Cooldown Mask */}
                            {!isReady && (
                                <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center backdrop-blur-[2px] z-20">
                                    <span className="text-white font-mono font-bold text-xl drop-shadow-md">{Math.ceil(cd)}</span>
                                </div>
                            )}
                        </div>
                      );
                  })}

                  {/* Recall Button */}
                  <div className="ml-2 group relative transition-transform hover:-translate-y-1">
                       <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950 text-[9px] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 z-20 font-bold shadow-md">B</div>
                       <button 
                            onClick={() => startRecall(gameState)}
                            className="w-12 h-12 bg-blue-900/50 border border-blue-600/50 rounded-lg flex items-center justify-center hover:bg-blue-800/80 hover:border-blue-400"
                        >
                           <Home size={20} className="text-blue-200" />
                       </button>
                  </div>
              </div>
           </div>
        </div>
      )}
      
      {/* Death Screen Overlay */}
      {player?.isDead && !gameState.gameOver && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-40">
              <div className="bg-slate-900/90 p-8 rounded-3xl border border-red-900/50 backdrop-blur-md shadow-2xl">
                <Skull className="w-20 h-20 text-red-500 mx-auto mb-4 animate-bounce" />
                <div className="text-red-200 text-sm uppercase tracking-[0.3em] mb-2 font-bold">Resurrecting</div>
                <div className="text-6xl text-white font-mono font-black tracking-tighter">
                    {Math.ceil(player.respawnTimer)}<span className="text-2xl text-red-400 ml-1">.0</span>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HUD;
