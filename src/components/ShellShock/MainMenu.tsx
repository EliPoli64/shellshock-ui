import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { WalletButton } from '../WalletButton';
import { soundManager } from '../../utils/soundEffects';
import { MatchHistory } from './MatchHistory';

export const MainMenu = () => {
  const { startGame, wallet, relayReady, relayConnectionState, openPvpSetup, refreshRelayStatus } =
    useShellShockStore();
  
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void refreshRelayStatus();
  }, [refreshRelayStatus]);

  const title = "SHELL SHOCK";
  const subtitle = "A Game of Chance. A Dance with Death.";
  const canEnterPvp = Boolean(wallet) && relayReady;

  const handleStartGame = () => {
    soundManager.play('uiClick');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    startGame('pve', 0.01);
  };

  const handleShowHelp = () => {
    soundManager.play('uiClick');
    setShowHelp(true);
  };

  const handleCloseHelp = () => {
    soundManager.play('uiClick');
    setShowHelp(false);
  };

  const handleShowHistory = () => {
    soundManager.play('uiClick');
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    soundManager.play('uiClick');
    setShowHistory(false);
  };

  const handlePvpClick = () => {
    if (canEnterPvp) {
      soundManager.play('uiClick');
      void openPvpSetup();
    }
  };

  const instructions = [
    { title: "THE BASICS", content: "A shotgun is loaded with a random mix of Live and Blank shells. You and the Dealer take turns shooting. Shoot the dealer to deal damage. Shoot yourself with a blank to get an extra turn." },
    { title: "POWER-UPS", content: "Use items to gain an advantage. You and the dealer both start with a random stash of tools." },
  ];

  const itemsHelp = [
    { icon: "🔍", name: "MAGNIFYING GLASS", desc: "Peek at the current shell in the chamber." },
    { icon: "🍺", name: "BEER", desc: "Rack the shotgun to eject the current shell." },
    { icon: "🔗", name: "HANDCUFFS", desc: "Skip your opponent's next turn." },
    { icon: "🚬", name: "CIGARETTES", desc: "Restore 1 unit of health." },
    { icon: "🪚", name: "SAW", desc: "Saw the barrel to deal double damage with the next shell." },
    { icon: "💊", name: "LUCKY PILL", desc: "50% chance to heal 2 health, 50% chance to lose 1." },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-black z-50 p-[4vh] overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="crt-overlay" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 to-transparent opacity-30" />
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + 'vw', 
              y: Math.random() * 100 + 'vh', 
              opacity: 0.1,
              rotate: Math.random() * 360
            }}
            animate={{ 
              y: ['-10vh', '110vh'],
              rotate: 360
            }}
            transition={{ 
              duration: Math.random() * 10 + 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * -20
            }}
            className="absolute text-[2vh] opacity-20"
          >
            {['🔫', '🎯', '🪚', '🔗', '🍺', '🚬'][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}
      </div>
      
      <div className="mb-[6vh] text-center z-10">
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0 }}
          animate={{ filter: "blur(0px)", opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <h1 className="font-special-elite text-[8vh] md:text-[10vh] lg:text-[12vh] text-neon-yellow neon-text mb-[1vh] tracking-tighter">
            {title}
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1, duration: 1 }}
          className="font-special-elite text-[2vh] md:text-[2.5vh] text-text-cream animate-pulse-slow tracking-widest uppercase"
        >
          {subtitle}
        </motion.p>
      </div>

      <div className="flex flex-col gap-[2vh] w-full max-w-[40vh] z-10">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(185, 28, 28, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartGame}
          className="w-full px-[4vh] py-[2vh] bg-gradient-to-b from-danger-red to-red-900 border-[0.4vh] border-red-700 text-text-cream font-special-elite text-[2.5vh] shadow-lg transition-all"
        >
          ENTER THE TABLE
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowHelp}
          className="w-full px-[4vh] py-[2vh] bg-transparent border-[0.4vh] border-gray-700 text-gray-400 font-special-elite text-[2.2vh] shadow-lg transition-all"
        >
          📜 HOW TO PLAY
        </motion.button>

        {wallet && (
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShowHistory}
            className="w-full px-[4vh] py-[2vh] bg-transparent border-[0.4vh] border-gray-700 text-gray-400 font-special-elite text-[2.2vh] shadow-lg transition-all"
          >
            📊 BATTLE LOGS
          </motion.button>
        )}

        <motion.button
          whileHover={canEnterPvp ? { scale: 1.05 } : {}}
          whileTap={canEnterPvp ? { scale: 0.95 } : {}}
          onClick={handlePvpClick}
          className={`w-full px-[4vh] py-[2vh] border-[0.4vh] font-special-elite text-[2.5vh] shadow-lg transition-all ${
            canEnterPvp
              ? 'bg-gradient-to-b from-red-900 to-black border-red-700 text-text-cream hover:from-red-800 hover:to-gray-950'
              : 'cursor-not-allowed border-gray-600 bg-gradient-to-b from-gray-700 to-gray-900 text-gray-400'
          }`}
          disabled={!canEnterPvp}
        >
          PLAYER VS PLAYER
        </motion.button>

        <p className="text-center font-special-elite text-sm text-gray-400">
          Relay: {relayConnectionState} {relayReady ? '• ready' : '• waiting'}
        </p>
        {!wallet && (
          <p className="text-center font-special-elite text-sm text-gray-500">
            Connect a wallet to unlock PvP matchmaking.
          </p>
        )}
      </div>

      <div className="absolute bottom-8 right-8">
        <WalletButton />
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-bg-black/95 backdrop-blur-md p-[4vh]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900/80 border-[0.3vh] border-purple-900/50 p-[4vh] rounded-[2vh] max-w-[80vh] w-full max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-[4vh]">
                <h2 className="font-special-elite text-[4vh] text-neon-yellow neon-text">INSTRUCTIONS</h2>
                <button 
                  onClick={handleCloseHelp}
                  className="text-gray-500 hover:text-white text-[3vh] transition-colors"
                >✕</button>
              </div>

              <div className="space-y-[4vh]">
                {instructions.map((inst, i) => (
                  <div key={i} className="space-y-[1vh]">
                    <h3 className="font-special-elite text-[2.5vh] text-purple-400 tracking-widest">{inst.title}</h3>
                    <p className="font-special-elite text-[1.8vh] text-text-cream opacity-80 leading-relaxed">
                      {inst.content}
                    </p>
                  </div>
                ))}

                <div className="space-y-[2vh]">
                  <h3 className="font-special-elite text-[2.5vh] text-purple-400 tracking-widest uppercase">The Toolkit</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2vh]">
                    {itemsHelp.map((item, i) => (
                      <div key={i} className="flex gap-[2vh] items-start bg-black/40 p-[1.5vh] rounded-[1vh] border border-gray-800">
                        <span className="text-[3vh]">{item.icon}</span>
                        <div>
                          <div className="font-special-elite text-[1.6vh] text-text-cream font-bold">{item.name}</div>
                          <div className="font-special-elite text-[1.4vh] text-gray-400 leading-tight mt-[0.5vh]">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCloseHelp}
                className="w-full mt-[4vh] py-[2vh] bg-purple-900/40 border border-purple-500/50 text-purple-200 font-special-elite text-[2vh] rounded-[1vh] hover:bg-purple-800/40 transition-all"
              >
                GOT IT
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-bg-black/95 backdrop-blur-md p-[4vh]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900/80 border-[0.3vh] border-purple-900/50 p-[4vh] rounded-[2vh] max-w-[60vh] w-full max-h-[85vh] overflow-hidden"
            >
              <MatchHistory onClose={handleCloseHistory} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
