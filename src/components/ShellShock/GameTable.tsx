import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { ActionButtons } from './ActionButtons';
import { HealthMasks } from './HealthMasks';
import { ShellRack } from './ShellRack';

const ItemBubbles = ({ items, isDealer }: { items: any, isDealer: boolean }) => { 
  const itemList = [ 
    { key: 'magnifyingGlass', icon: '🔍' }, 
    { key: 'beer', icon: '🍺' }, 
    { key: 'handcuffs', icon: '🔗' }, 
    { key: 'cigarettes', icon: '🚬' }, 
    { key: 'pill', icon: '💊' }, 
    { key: 'saw', icon: '🪚' }, 
  ]; 

  return ( 
    <div className={`flex gap-[1vh] ${isDealer ? 'mb-[1vh]' : 'mt-[1vh]'}`}> 
      {itemList.map(item => { 
        const count = items[item.key]; 
        if (count <= 0) return null; 
        return ( 
          <motion.div 
            key={item.key} 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="rounded-full bg-black/60 border border-gray-700 flex items-center justify-center relative group" 
            style={{ width: '4vh', height: '4vh' }} 
          > 
            <span style={{ fontSize: '2vh' }}>{item.icon}</span> 
            {count > 1 && ( 
              <span 
                className="absolute -top-[0.5vh] -right-[0.5vh] bg-neon-yellow text-bg-black font-bold flex items-center justify-center rounded-full" 
                style={{ fontSize: '1.2vh', width: '2vh', height: '2vh' }} 
              > 
                {count} 
              </span> 
            )} 
          </motion.div> 
        ); 
      })} 
    </div> 
  ); 
};

export const GameTable: React.FC = () => {
  const { 
    playerHealth, 
    dealerHealth, 
    isPlayerTurn, 
    gameStatus, 
    lastShotResult, 
    lastShotTarget, 
    isAnimating, 
    isRevealingShells, 
    liveShells, 
    blankShells, 
    turnTimer, 
    decrementTimer, 
    dealerTurn, 
    dealerActionText, 
    playerHandcuffed, 
    dealerHandcuffed, 
    isSawActive, 
    items, 
    dealerItems, 
    currentShell, 
    resetPeek,
    gameMode,
    players,
    wallet,
    turnWallet
  } = useShellShockStore();

  const isPvP = gameMode === 'pvp';
  const myTurn = isPvP ? turnWallet === wallet : isPlayerTurn;
  
  useEffect(() => { 
    let timer: NodeJS.Timeout; 
    if (myTurn && gameStatus === 'playing' && !isAnimating && !isRevealingShells) { 
      timer = setInterval(() => { 
        decrementTimer(); 
      }, 1000); 
    } 
    return () => clearInterval(timer); 
  }, [myTurn, gameStatus, isAnimating, isRevealingShells, decrementTimer]); 

  useEffect(() => { 
    if (!isPvP && !isPlayerTurn && gameStatus === 'playing' && !isAnimating) { 
      void dealerTurn(); 
    } 
  }, [isPvP, isPlayerTurn, gameStatus, isAnimating, dealerTurn]); 

  // PvP Layout calculations
  const otherPlayers = isPvP ? players.filter(p => p.wallet !== wallet) : [];
  
  return ( 
    <div className="absolute inset-0 flex flex-col bg-bg-black overflow-hidden"> 
      <div className="crt-overlay" /> 
      
      <div className="flex-1 flex flex-col items-center justify-center p-[2vh] relative"> 
        {/* Opponents Area */}
        <div className={`w-full flex justify-center gap-[4vw] mb-[2vh] ${isPvP ? 'flex-wrap px-[2vw]' : 'flex-col items-center'}`}>
          {!isPvP ? (
            <div className="flex flex-col items-center"> 
              <div className="flex items-center gap-[2vw]"> 
                <h2 className="font-special-elite text-[3vh] text-text-cream mb-[1vh]">THE DEALER</h2> 
                {dealerHandcuffed && ( 
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    style={{ fontSize: '4vh' }} 
                  > 
                    🔗 
                  </motion.span> 
                )} 
              </div> 
              <HealthMasks health={dealerHealth} isPlayer={false} /> 
              <div className="mt-[2vh]"> 
                <ItemBubbles items={dealerItems} isDealer={true} /> 
              </div> 
            </div>
          ) : (
            otherPlayers.map((p, idx) => (
              <div key={p.wallet} className="flex flex-col items-center min-w-[20vw]">
                <div className="flex items-center gap-[1vw]">
                  <h2 className="font-special-elite text-[2vh] text-text-cream mb-[0.5vh] opacity-70">
                    {p.wallet.slice(0, 4)}...{p.wallet.slice(-4)}
                  </h2>
                  {p.handcuffed && <span style={{ fontSize: '2vh' }}>🔗</span>}
                  {turnWallet === p.wallet && <span className="w-2 h-2 rounded-full bg-neon-yellow animate-pulse" />}
                </div>
                <HealthMasks health={p.health} isPlayer={false} />
                <div className="mt-[1vh]">
                  <ItemBubbles items={p.items} isDealer={true} />
                </div>
              </div>
            ))
          )}
        </div>
        
        <motion.div 
          animate={gameStatus === 'shot_animation' && lastShotResult === 'live' ? { 
            x: [0, -10, 10, -10, 10, 0], 
            y: [0, 5, -5, 5, -5, 0], 
            transition: { duration: 0.4 } 
          } : {}} 
          className="h-[28vh] w-[90vw] lg:w-[60vw] aspect-video bg-table-green rounded-[1vh] border-[0.5vh] border-gray-800 shadow-2xl relative overflow-hidden flex items-center justify-center" 
        > 
          {/* Table Content - Keep same as before but update labels */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" /> 
          
          {/* Peek Overlay */} 
          {currentShell !== 'unknown' && ( 
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md" 
              onClick={resetPeek} 
            > 
              {/* ... existing peek UI ... */}
              <motion.div 
                initial={{ scale: 0.8, rotate: -10 }} 
                animate={{ scale: 1, rotate: 0 }} 
                className="flex flex-col items-center gap-8" 
              > 
                <h3 className="font-special-elite text-[3vh] text-text-cream tracking-[0.3em] uppercase opacity-60"> 
                  Inside the chamber... 
                </h3> 
                <div className="relative"> 
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.05, 1], 
                      boxShadow: currentShell === 'live' 
                        ? ['0 0 20px rgba(220,38,38,0.3)', '0 0 40px rgba(220,38,38,0.6)', '0 0 20px rgba(220,38,38,0.3)'] 
                        : ['0 0 20px rgba(75,85,99,0.3)', '0 0 40px rgba(75,85,99,0.6)', '0 0 20px rgba(75,85,99,0.3)'] 
                    }} 
                    transition={{ repeat: Infinity, duration: 2 }} 
                    className={`w-[12vh] h-[20vh] rounded-[5vh] border-[0.5vh] shadow-2xl flex items-center justify-center ${ 
                      currentShell === 'live' ? 'bg-danger-red border-red-900' : 'bg-gray-600 border-gray-800' 
                    }`} 
                  > 
                    <div className="w-full h-1/4 bg-black/20 absolute top-0 rounded-t-[5vh]" /> 
                    <span className="font-special-elite text-[4vh] text-white/20 rotate-90 tracking-widest"> 
                      {currentShell === 'live' ? 'LIVE' : 'BLANK'} 
                    </span> 
                  </motion.div> 
                </div> 
                <div className="font-special-elite text-neon-yellow text-[2vh] animate-pulse"> 
                  CLICK ANYWHERE TO CLOSE 
                </div> 
              </motion.div> 
            </motion.div> 
          )} 
 
          {/* Dealer/Opponent Action Overlay */} 
          {(dealerActionText || (isPvP && !myTurn && gameStatus === 'playing')) && ( 
            <motion.div 
              initial={{ opacity: 0, backgroundColor: 'rgba(0,0,0,0)' }} 
              animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} 
              exit={{ opacity: 0, backgroundColor: 'rgba(0,0,0,0)' }} 
              className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]" 
            > 
              <motion.div
                initial={{ scale: 0.5, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-center px-[2vw]"
              >
                <h3 className="font-special-elite text-[4vh] text-neon-yellow neon-text uppercase tracking-widest drop-shadow-[0_0_20px_rgba(255,255,0,0.9)]">
                  {isPvP ? "OPPONENT'S TURN" : dealerActionText}
                </h3>
              </motion.div> 
            </motion.div> 
          )} 
 
          <div className="text-center z-10 w-full px-[2vw]"> 
            {isSawActive && gameStatus === 'playing' && ( 
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: [0.4, 1, 0.4] }} 
                transition={{ repeat: Infinity, duration: 1.5 }} 
                className="absolute top-[2vh] right-[2vh] flex items-center gap-[1vw]" 
              > 
                <span style={{ fontSize: '3vh' }}>🪚</span> 
                <span className="font-special-elite text-danger-red text-[2.5vh]">SAWED BARREL</span> 
              </motion.div> 
            )} 
 
            {isRevealingShells && ( 
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 1.2 }} 
                className="flex flex-col items-center gap-[2vh]" 
              > 
                <h3 className="font-special-elite text-[3vh] text-text-cream tracking-widest animate-pulse"> 
                  LOADING CHAMBER... 
                </h3> 
                <div className="flex gap-[10vw]"> 
                  <div className="flex flex-col items-center gap-[1vh]"> 
                    <div className="w-[3vh] h-[5vh] bg-danger-red rounded-full border-[0.3vh] border-red-900 shadow-[0_0_15px_rgba(139,0,0,0.8)]" /> 
                    <span className="font-special-elite text-[3vh] text-danger-red">{liveShells} LIVE</span> 
                  </div> 
                  <div className="flex flex-col items-center gap-[1vh]"> 
                    <div className="w-[3vh] h-[5vh] bg-gray-600 rounded-full border-[0.3vh] border-gray-800 shadow-[0_0_15px_rgba(75,85,99,0.5)]" /> 
                    <span className="font-special-elite text-[3vh] text-gray-400">{blankShells} BLANKS</span> 
                  </div> 
                </div> 
              </motion.div> 
            )} 
 
            {gameStatus === 'shot_animation' && (
              <motion.div
                initial={{ scale: 0.1, opacity: 0, rotate: -10 }}
                animate={{ 
                  scale: [1, 1.8, 1.2], 
                  opacity: 1,
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 0.4, times: [0, 0.4, 1] }}
                className="flex flex-col items-center gap-[2vh] relative z-[70]"
              >
                {lastShotResult === 'live' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ duration: 0.4, repeat: 1 }}
                    className="absolute inset-[-50vh] bg-danger-red/20 pointer-events-none z-[-1]"
                  />
                )}

                <motion.div 
                  animate={lastShotResult === 'live' ? {
                    color: ['#ff0000', '#ffffff', '#ff0000'],
                    textShadow: [
                      '0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000',
                      '0 0 40px #ffadadff, 0 0 80px #ffadadff, 0 0 120px #ffadadff',
                      '0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000'
                    ],
                    scale: [1, 1.1, 1]
                  } : {
                    color: ['#9ca3af', '#ffffff', '#9ca3af'],
                    textShadow: ['0 0 10px #4b5563', '0 0 20px #9ca3af', '0 0 10px #4b5563']
                  }}
                  transition={{ repeat: Infinity, duration: 0.30 }}
                  className="font-special-elite text-[8vh] leading-none tracking-tighter italic"
                >
                  {lastShotResult === 'live' ? "BOOM!" : "CLICK..."}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-special-elite text-[3vh] text-text-cream uppercase tracking-[0.4em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/40 px-[2vh] py-[0.5vh] rounded-full backdrop-blur-sm"
                >
                  {lastShotTarget === wallet ? 'Target: You' : 'Target: Opponent'}
                </motion.div>
              </motion.div>
            )} 
             
            {gameStatus === 'playing' && !isAnimating && !isRevealingShells && !dealerActionText && ( 
              <div className="flex flex-col items-center gap-[1vh]"> 
                <div className="font-special-elite text-[4vh] text-neon-yellow neon-text"> 
                  {myTurn ? 'YOUR TURN' : "WAITING..."} 
                </div> 
                {myTurn && ( 
                  <div className="relative flex items-center justify-center"> 
                    <svg className="w-[10vh] h-[10vh] -rotate-90"> 
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="40%" 
                        className="fill-none stroke-gray-800 stroke-[0.5vh]" 
                      /> 
                      <motion.circle 
                        cx="50%" 
                        cy="50%" 
                        r="40%" 
                        className={`fill-none stroke-[0.5vh] ${turnTimer <= 5 ? 'stroke-danger-red' : 'stroke-text-cream'}`} 
                        pathLength={100} 
                        strokeDasharray="100 100" 
                        animate={{ strokeDashoffset: 100 - ((turnTimer - 1)/ 14) * 100 }} 
                        transition={{ duration: 1, ease: "linear" }} 
                        strokeLinecap="round" 
                      /> 
                    </svg> 
                    <div className={`absolute font-special-elite text-[3vh] ${turnTimer <= 5 ? 'text-danger-red animate-pulse' : 'text-text-cream'}`}> 
                      {turnTimer}s 
                    </div> 
                  </div> 
                )} 
              </div> 
            )} 
          </div> 
        </motion.div> 
         
        <div className="mt-[2vh]"> 
          <ShellRack /> 
        </div> 
         
        <div className="mt-auto mb-[2vh] flex flex-col items-center"> 
          <div className="mb-[1vh]"> 
            <ItemBubbles items={items} isDealer={false} /> 
          </div> 
          <HealthMasks health={playerHealth} isPlayer={true} /> 
          <div className="flex items-center gap-[2vw] mt-[1vh]"> 
            <h2 className="font-special-elite text-[2.5vh] text-text-cream">YOU</h2> 
            {playerHandcuffed && <span style={{ fontSize: '3vh' }}>🔗</span>} 
          </div> 
        </div> 
      </div> 
       
      <div className="p-[2vh] bg-black/40 backdrop-blur-sm border-t border-gray-800"> 
        <ActionButtons /> 
      </div> 
    </div> 
  ); 
};
