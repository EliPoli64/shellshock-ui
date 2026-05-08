import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const MainMenu: React.FC = () => {
  const { startGame, connectWallet, wallet } = useShellShockStore();
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const title = "SHELL SHOCK";
  const subtitle = "A Game of Chance. A Dance with Death.";

  const handleStartGame = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    startGame('pve', 0.01);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-black z-50 p-4">
      <div className="crt-overlay" />
      
      <div className="mb-12 text-center">
        <h1 className="font-special-elite text-4xl md:text-6xl lg:text-7xl text-neon-yellow neon-text mb-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {title.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
        </h1>
        
        <p className="font-special-elite text-lg md:text-xl text-text-cream animate-pulse-slow opacity-80">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartGame}
          className="w-full px-8 py-4 bg-gradient-to-b from-yellow-700 to-yellow-900 border-4 border-yellow-600 text-text-cream font-special-elite text-xl md:text-2xl shadow-lg hover:from-yellow-600 hover:to-yellow-800 transition-all"
        >
          PLAYER VS DEALER
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full px-8 py-4 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600 text-gray-400 font-special-elite text-xl md:text-2xl shadow-lg cursor-not-allowed"
          disabled
        >
          PLAYER VS PLAYER (SOON)
        </motion.button>
      </div>

      <div className="absolute bottom-8 right-8">
        {!wallet ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => connectWallet('demo-wallet')}
            className="px-6 py-3 bg-neon-yellow text-bg-black font-special-elite text-lg shadow-lg hover:bg-yellow-300 transition-all"
          >
            CONNECT WALLET (DEMO)
          </motion.button>
        ) : (
          <div className="px-6 py-3 bg-green-800 text-green-200 font-special-elite text-lg shadow-lg">
            WALLET CONNECTED
          </div>
        )}
      </div>
    </div>
  );
};
