import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className={`flex gap-[1.2vh] ${isDealer ? 'mb-[1vh]' : 'mt-[1vh]'}`}> 
      {itemList.map((item, idx) => { 
        const count = items[item.key]; 
        if (count <= 0) return null; 
        return ( 
          <motion.div 
            key={item.key}
            custom={idx}
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
            transition={{ delay: idx * 0.05, type: "spring", stiffness: 200, y: {
                repeat: Infinity,
                duration: 2 + Math.random() * 2,
                ease: "easeInOut",
              }}}
            whileHover={{ scale: 1.15, rotate: 5, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full backdrop-blur-xl bg-gradient-to-br from-yellow-500/20 to-black/80 border border-yellow-400/30 shadow-[0_0_20px_rgba(255,215,0,0.25)] flex items-center justify-center relative group"
            style={{ width: '4.5vh', height: '4.5vh' }} 
          > 
            <span style={{ fontSize: '2.2vh' }}>{item.icon}</span> 
            {count > 1 && ( 
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-[0.6vh] -right-[0.6vh] bg-neon-yellow text-bg-black font-bold flex items-center justify-center rounded-full shadow-lg"
                style={{ fontSize: '1.2vh', width: '2.2vh', height: '2.2vh' }} 
              > 
                {count} 
              </motion.span> 
            )} 
          </motion.div> 
        ); 
      })} 
    </div> 
  ); 
};

// Component for floating particles
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        initial={{
          opacity: 0,
          y: Math.random() * 100,
          x: Math.random() * window.innerWidth,
        }}
        animate={{
          opacity: [0, 0.5 + Math.random() * 0.3, 0],
          y: [0, -200 - Math.random() * 150],
          x: [0, (Math.random() - 0.5) * 50],
        }}
        transition={{
          repeat: Infinity,
          duration: 5 + Math.random() * 8,
          delay: Math.random() * 10,
          ease: "linear",
        }}
        className="absolute w-[0.3vh] h-[0.3vh] rounded-full bg-yellow-300/70"
        style={{ left: `${Math.random() * 100}%` }}
      />
    ))}
  </div>
);

const AnimatedGlow = () => (
  <motion.div
    animate={{
      opacity: [0.15, 0.35, 0.15],
      scale: [1, 1.2, 1],
    }}
    transition={{
      repeat: Infinity,
      duration: 6,
      ease: "easeInOut",
    }}
    className="absolute inset-[-20%] bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.2),transparent_70%)] pointer-events-none"
  />
);

const ShineOverlay = () => (
  <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.08)_50%,transparent_80%)] animate-[shine_8s_linear_infinite] pointer-events-none" />
);

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
        //decrementTimer(); 
      }, 1000); 
    } 
    return () => clearInterval(timer); 
  }, [myTurn, gameStatus, isAnimating, isRevealingShells, decrementTimer]); 

  useEffect(() => { 
    if (!isPvP && !isPlayerTurn && gameStatus === 'playing' && !isAnimating && !isRevealingShells) { 
      void dealerTurn(); 
    } 
  }, [isPvP, isPlayerTurn, gameStatus, isAnimating, isRevealingShells, dealerTurn]); 

  const otherPlayers = isPvP ? players.filter(p => p.wallet !== wallet) : [];

  // Screen flash effect for shots
  const showFlash = lastShotResult === 'live' && gameStatus === 'shot_animation';

  return ( 
    <div className="relative flex flex-col h-screen w-screen bg-black overflow-hidden"> 
      {/* Ambient Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.1),transparent_80%)]" />
      <div className="absolute inset-0 backdrop-blur-[1px] bg-black/30" />
      <FloatingParticles />
      
      {/* CRT Overlay with stronger animation */}
      <div className="crt-overlay" /> 
      <style>{`
        .crt-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px);
          pointer-events: none;
          z-index: 10;
          animation: flicker 0.2s infinite;
        }
        @keyframes flicker {
          0% { opacity: 0.03; }
          50% { opacity: 0.08; }
          100% { opacity: 0.02; }
        }
        @keyframes shine {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
      `}</style>
      
      <div className="flex-1 flex flex-col items-center justify-center p-[2vh] relative z-20"> 
        {/* Opponents Area */}
        <div className={`w-full flex justify-center gap-[4vw] mb-[2vh] ${isPvP ? 'flex-wrap px-[2vw]' : 'flex-col items-center'}`}>
          {!isPvP ? (
            <motion.div 
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            > 
              <div className="flex items-center gap-[2vw]"> 
                <h2 className="font-special-elite text-[3vh] text-text-cream mb-[1vh] tracking-wider drop-shadow-lg">THE DEALER</h2> 
                {dealerHandcuffed && ( 
                  <motion.span 
                    initial={{ scale: 0, rotate: -180 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    transition={{ type: "spring", stiffness: 200 }}
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
            </motion.div>
          ) : (
            otherPlayers.map((p, idx) => (
              <motion.div 
                key={p.wallet} 
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center min-w-[20vw] bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-yellow-500/20"
              >
                <div className="flex items-center gap-[1vw]">
                  <h2 className="font-special-elite text-[2vh] text-text-cream mb-[0.5vh] opacity-80">
                    {p.wallet.slice(0, 4)}...{p.wallet.slice(-4)}
                  </h2>
                  {p.handcuffed && <span style={{ fontSize: '2vh' }}>🔗</span>}
                  {turnWallet === p.wallet && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2.5 h-2.5 rounded-full bg-neon-yellow shadow-[0_0_10px_gold]"
                    />
                  )}
                </div>
                <HealthMasks health={p.health} isPlayer={false} />
                <div className="mt-[1vh]">
                  <ItemBubbles items={p.items} isDealer={true} />
                </div>
              </motion.div>
            ))
          )}
        </div>
        
        {/* Main Table Area */}
        <motion.div 
          animate={gameStatus === 'shot_animation' && lastShotResult === 'live' ? { 
            x: [0, -25, 20, -15, 10, -5, 0], 
            y: [0, 8, -6, 5, -3, 0], 
            rotate: [0, -1.5, 1.2, -0.8, 0.5, 0],
            transition: { duration: 0.5, ease: "easeOut" } 
          } : {}}
          className="relative h-[30vh] w-[95vw] lg:w-[65vw] aspect-video rounded-[1.5vh] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden" 
        >
          {/* Table Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b3d2c] via-[#14532d] to-[#02120c]" />
          
          {/* Felt Texture */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay" />
          
          {/* Neon Border Pulse */}
          <motion.div
            animate={{
              boxShadow: [
                'inset 0 0 20px rgba(255,215,0,0.2)',
                'inset 0 0 45px rgba(255,215,0,0.45)',
                'inset 0 0 20px rgba(255,215,0,0.2)',
              ],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-[1.5vh] pointer-events-none z-10"
          />
          
          {/* Lighting Effects */}
          <AnimatedGlow />
          <ShineOverlay />
          
          {/* Floating Particles inside table */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={`table-particle-${i}`}
                initial={{ opacity: 0, y: '100%', x: `${Math.random() * 100}%` }}
                animate={{ opacity: [0, 0.6, 0], y: '-100%' }}
                transition={{ repeat: Infinity, duration: 3 + Math.random() * 4, delay: Math.random() * 5 }}
                className="absolute w-[0.2vh] h-[0.2vh] rounded-full bg-yellow-400/80"
              />
            ))}
          </div>

          {/* Peek Overlay */} 
          <AnimatePresence>
            {currentShell !== 'unknown' && ( 
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }} 
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80" 
                onClick={resetPeek} 
              >
                <motion.div 
                  initial={{ scale: 0.8, rotate: -10, opacity: 0 }} 
                  animate={{ scale: 1, rotate: 0, opacity: 1 }} 
                  exit={{ scale: 0.8, rotate: 10, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex flex-col items-center gap-8" 
                > 
                  <h3 className="font-special-elite text-[3vh] text-neon-yellow tracking-[0.3em] uppercase animate-pulse"> 
                    Inside the chamber... 
                  </h3> 
                  <div className="relative"> 
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.05, 1], 
                        boxShadow: currentShell === 'live' 
                          ? ['0 0 20px rgba(220,38,38,0.4)', '0 0 60px rgba(220,38,38,0.8)', '0 0 20px rgba(220,38,38,0.4)'] 
                          : ['0 0 20px rgba(75,85,99,0.4)', '0 0 40px rgba(75,85,99,0.6)', '0 0 20px rgba(75,85,99,0.4)'] 
                      }} 
                      transition={{ repeat: Infinity, duration: 2 }} 
                      className={`w-[14vh] h-[22vh] rounded-[6vh] border-[0.5vh] shadow-2xl flex items-center justify-center ${ 
                        currentShell === 'live' ? 'bg-gradient-to-b from-danger-red to-red-950 border-red-500' : 'bg-gradient-to-b from-gray-600 to-gray-900 border-gray-500' 
                      }`} 
                    > 
                      <div className="w-full h-1/4 bg-black/30 absolute top-0 rounded-t-[6vh]" /> 
                      <span className="font-special-elite text-[5vh] text-white/30 rotate-90 tracking-widest"> 
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
          </AnimatePresence>
 
          {/* Dealer/Opponent Action Overlay */} 
          <AnimatePresence>
            {((dealerActionText || (isPvP && !myTurn && gameStatus === 'playing') || (gameMode === 'pve' && !isPlayerTurn && isAnimating)) && gameStatus !== 'shot_animation') && ( 
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                animate={{ opacity: 1, backdropFilter: "blur(4px)" }} 
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50" 
              > 
                <motion.div
                  initial={{ scale: 0.5, y: 50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0, y: -50 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-center px-[2vw]"
                >
                  <h3 className="font-special-elite text-[5vh] text-neon-yellow neon-text uppercase tracking-widest drop-shadow-[0_0_30px_rgba(255,255,0,0.8)]">
                    {isPvP ? "OPPONENT'S TURN" : (dealerActionText || "DEALER IS THINKING...")}
                  </h3>
                </motion.div> 
              </motion.div> 
            )} 
          </AnimatePresence>

          {/* White Flash for Shot */}
          {showFlash && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white z-[200] pointer-events-none"
            />
          )}
 
          <div className="text-center z-10 w-full h-full flex items-center justify-center px-[2vw] relative"> 
            {isSawActive && gameStatus === 'playing' && ( 
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: [0.4, 1, 0.4], x: 0 }} 
                transition={{ repeat: Infinity, duration: 1.5 }} 
                className="absolute top-[2vh] right-[2vh] flex items-center gap-[1vw] bg-black/40 p-2 rounded-full backdrop-blur-sm" 
              > 
                <span style={{ fontSize: '3vh' }}>🪚</span> 
                <span className="font-special-elite text-danger-red text-[2.5vh] font-bold">SAWED BARREL</span> 
              </motion.div> 
            )} 
 
            <AnimatePresence mode="wait">
              {isRevealingShells && ( 
                <motion.div 
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 1.2 }} 
                  className="flex flex-col items-center gap-[2vh]" 
                > 
                  <h3 className="font-special-elite text-[3vh] text-text-cream tracking-widest animate-pulse"> 
                    LOADING CHAMBER... 
                  </h3> 
                  <div className="flex gap-[15vw]"> 
                    <div className="flex flex-col items-center gap-[1vh]"> 
                      <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-[4vh] h-[6vh] bg-gradient-to-b from-danger-red to-red-950 rounded-full border-[0.3vh] border-red-500 shadow-[0_0_15px_red]" 
                      /> 
                      <span className="font-special-elite text-[3.5vh] text-danger-red">{liveShells} LIVE</span> 
                    </div> 
                    <div className="flex flex-col items-center gap-[1vh]"> 
                      <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                        className="w-[4vh] h-[6vh] bg-gradient-to-b from-gray-600 to-gray-900 rounded-full border-[0.3vh] border-gray-500 shadow-[0_0_15px_gray]" 
                      /> 
                      <span className="font-special-elite text-[3.5vh] text-gray-400">{blankShells} BLANKS</span> 
                    </div> 
                  </div> 
                </motion.div> 
              )} 
 
              {gameStatus === 'shot_animation' && (
                <motion.div
                  key="shot"
                  initial={{ scale: 0.1, opacity: 0, rotate: -10 }}
                  animate={{ 
                    scale: [1, 1.6, 1.2], 
                    opacity: 1,
                    rotate: [0, 8, -4, 0],
                  }}
                  transition={{ duration: 0.4, times: [0, 0.3, 1] }}
                  className="flex flex-col items-center gap-[2vh] relative z-[70]"
                >
                  {lastShotResult === 'live' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 0.4, repeat: 1 }}
                      className="absolute inset-[-50vh] bg-danger-red/30 pointer-events-none z-[-1]"
                    />
                  )}

                  <motion.div 
                    animate={lastShotResult === 'live' ? {
                      color: ['#ff0000', '#ffffff', '#ff0000'],
                      textShadow: [
                        '0 0 20px #ff0000, 0 0 40px #ff0000',
                        '0 0 60px #ffadad, 0 0 100px #ffadad',
                        '0 0 20px #ff0000, 0 0 40px #ff0000'
                      ],
                      scale: [1, 1.2, 1]
                    } : {
                      color: ['#9ca3af', '#ffffff', '#9ca3af'],
                      textShadow: ['0 0 10px #4b5563', '0 0 30px #9ca3af', '0 0 10px #4b5563']
                    }}
                    transition={{ repeat: Infinity, duration: 0.35 }}
                    className="font-special-elite text-[10vh] leading-none tracking-tighter italic"
                  >
                    {lastShotResult === 'live' ? "BOOM!" : "CLICK..."}
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="font-special-elite text-[3vh] text-text-cream uppercase tracking-[0.4em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/60 px-[2vh] py-[0.5vh] rounded-full backdrop-blur-md border border-yellow-500/30"
                  >
                    {lastShotTarget === "player" ? 'Target: You' : 'Target: Opponent'}
                  </motion.div>
                </motion.div>
              )} 
              
              {gameStatus === 'playing' && !isAnimating && !isRevealingShells && !dealerActionText && ( 
                <motion.div 
                  key="turn-indicator"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center gap-[1vh]" 
                > 
                  <motion.div 
                    animate={myTurn ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`font-special-elite text-[5vh] font-bold ${myTurn ? 'text-neon-yellow neon-text' : 'text-gray-400'}`}
                  > 
                    {myTurn ? 'YOUR TURN' : "WAITING..."} 
                  </motion.div> 
                  {myTurn && ( 
                    <div className="relative flex items-center justify-center"> 
                      <svg className="w-[12vh] h-[12vh] -rotate-90"> 
                        <circle 
                          cx="50%" 
                          cy="50%" 
                          r="40%" 
                          className="fill-none stroke-gray-700 stroke-[0.7vh]" 
                        /> 
                        <motion.circle 
                          cx="50%" 
                          cy="50%" 
                          r="40%" 
                          className={`fill-none stroke-[0.7vh] ${turnTimer <= 5 ? 'stroke-danger-red' : 'stroke-neon-yellow'}`} 
                          pathLength={100} 
                          strokeDasharray="100 100" 
                          animate={{ strokeDashoffset: 100 - ((turnTimer - 1)/ 14) * 100 }} 
                          transition={{ duration: 1, ease: "linear" }} 
                          strokeLinecap="round" 
                        /> 
                      </svg> 
                      <motion.div 
                        animate={turnTimer <= 5 ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className={`absolute font-special-elite text-[4vh] font-bold ${turnTimer <= 5 ? 'text-danger-red' : 'text-text-cream'}`}
                      > 
                        {turnTimer}s 
                      </motion.div> 
                    </div> 
                  )} 
                </motion.div> 
              )} 
            </AnimatePresence>
          </div> 
        </motion.div> 
         
        <div className="mt-[3vh]"> 
          <ShellRack /> 
        </div> 
         
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-auto mb-[2vh] flex flex-col items-center" 
        > 
          <div className="mb-[1vh]"> 
            <ItemBubbles items={items} isDealer={false} /> 
          </div> 
          <HealthMasks health={playerHealth} isPlayer={true} /> 
          <div className="flex items-center gap-[2vw] mt-[1vh]"> 
            <h2 className="font-special-elite text-[3vh] text-text-cream drop-shadow-lg">YOU</h2> 
            {playerHandcuffed && (
              <motion.span 
                initial={{ scale: 0, rotate: -180 }} 
                animate={{ scale: 1, rotate: 0 }} 
                style={{ fontSize: '3.5vh' }} 
              > 
                🔗 
              </motion.span>
            )} 
          </div> 
        </motion.div> 
      </div> 
       
      <div className="p-[-40vh] bg-black/60 backdrop-blur-md border-t border-yellow-500/30 z-30 mt--5"> 
        <ActionButtons /> 
      </div> 
    </div> 
  ); 
};