import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { ActionButtons } from './ActionButtons';
import { HealthMasks } from './HealthMasks';
import { ShellRack } from './ShellRack';

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
    dealerTurn
  } = useShellShockStore();
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayerTurn && gameStatus === 'playing' && !isAnimating && !isRevealingShells) {
      timer = setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayerTurn, gameStatus, isAnimating, isRevealingShells, decrementTimer]);

  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'playing' && !isAnimating) {
      dealerTurn();
    }
  }, [isPlayerTurn, gameStatus, isAnimating, dealerTurn]);

  return (
    <div className="absolute inset-0 flex flex-col bg-bg-black">
      <div className="crt-overlay" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6">
        <div className="mb-2 sm:mb-4">
          <h2 className="font-special-elite text-[2vh] sm:text-[2.5vh] md:text-[3vh] text-text-cream mb-1 sm:mb-2">THE DEALER</h2>
          <HealthMasks health={dealerHealth} isPlayer={false} />
        </div>
        
        <div className="h-[35vh] w-[80vw] sm:w-[80vw] md:w-[80vw] lg:w-[60vw] xl:w-[60vw] max-h-[30vh] sm:max-h-[40vh] md:max-h-[50vh] aspect-video bg-table-green rounded-lg border-2 sm:border-4 border-gray-800 shadow-2xl relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
          
          <div className="text-center z-10">
            {isRevealingShells && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="flex flex-col items-center gap-6"
              >
                <h3 className="font-special-elite text-2xl sm:text-3xl text-text-cream tracking-widest animate-pulse">
                  LOADING CHAMBER...
                </h3>
                <div className="flex gap-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-12 bg-danger-red rounded-full border-2 border-red-900 shadow-[0_0_15px_rgba(139,0,0,0.8)]" />
                    <span className="font-special-elite text-3xl text-danger-red">{liveShells} LIVE</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-12 bg-gray-600 rounded-full border-2 border-gray-800 shadow-[0_0_15px_rgba(75,85,99,0.5)]" />
                    <span className="font-special-elite text-3xl text-gray-400">{blankShells} BLANKS</span>
                  </div>
                </div>
              </motion.div>
            )}

            {gameStatus === 'shot_animation' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="font-special-elite text-[4vh] sm:text-[5vh] md:text-[6vh] lg:text-[7vh]">
                  {lastShotResult === 'live' ? (
                    <span className="text-danger-red">BOOM!</span>
                  ) : (
                    <span className="text-gray-400">CLICK...</span>
                  )}
                </div>
                <div className="font-special-elite text-[2vh] sm:text-[2.5vh] text-text-cream uppercase tracking-widest opacity-80">
                  {lastShotTarget === 'dealer' ? 'Target: Dealer' : 'Target: You'}
                </div>
              </motion.div>
            )}
            
            {gameStatus === 'playing' && !isAnimating && !isRevealingShells && (
              <div className="flex flex-col items-center gap-2">
                <div className="font-special-elite text-[3vh] sm:text-[4vh] md:text-[5vh] lg:text-[6vh] text-neon-yellow neon-text">
                  {isPlayerTurn ? 'YOUR TURN' : 'DEALER\'S TURN'}
                </div>
                {isPlayerTurn && (
                  <div className="relative flex items-center justify-center">
                    <svg className="w-[10vh] h-[10vh] sm:w-[12vh] sm:h-[12vh] -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        className="fill-none stroke-gray-800 stroke-[4px]"
                      />
                      <motion.circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        className={`fill-none stroke-[4px] ${turnTimer <= 5 ? 'stroke-danger-red' : 'stroke-text-cream'}`}
                        pathLength={100}
                        strokeDasharray="100 100"
                        animate={{ strokeDashoffset: 100 - ((turnTimer - 1)/ 14) * 100 }}
                        transition={{ duration: 1, ease: "linear" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className={`absolute font-special-elite text-[3vh] sm:text-[4vh] ${turnTimer <= 5 ? 'text-danger-red animate-pulse' : 'text-text-cream'}`}>
                      {turnTimer}s
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-2 sm:mt-4">
          <ShellRack />
        </div>
        
        <div className="mt-4 sm:mt-6">
          <HealthMasks health={playerHealth} isPlayer={true} />
          <h2 className="font-special-elite text-[2vh] sm:text-[2.5vh] md:text-[3vh] text-text-cream mt-1 sm:mt-2">YOU</h2>
        </div>
      </div>
      
      <div className="p-2 sm:p-4">
        <ActionButtons />
      </div>
    </div>
  );
};
