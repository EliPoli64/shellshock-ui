import React from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const GameOverScreen: React.FC = () => {
  const { playAgain, leaveTable, roundsWon, roundsLost, totalWon, totalLost } = useShellShockStore();
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-black z-50 p-4">
      <div className="crt-overlay" />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <h1 className="font-special-elite text-4xl md:text-6xl text-danger-red mb-4">
          The House Always Wins...
        </h1>
        
        <div className="font-special-elite text-lg md:text-xl text-text-cream mb-8">
          <p>Rounds Won: {roundsWon}</p>
          <p>Rounds Lost: {roundsLost}</p>
          <p>Total Won: {totalWon} SOL</p>
          <p>Total Lost: {totalLost} SOL</p>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={playAgain}
            className="px-8 py-4 bg-gradient-to-b from-neon-yellow to-yellow-700 border-4 border-yellow-600 text-bg-black font-special-elite text-xl md:text-2xl shadow-lg hover:from-yellow-300 hover:to-yellow-600 transition-all"
          >
            DOUBLE OR NOTHING
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={leaveTable}
            className="px-8 py-4 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600 text-text-cream font-special-elite text-xl md:text-2xl shadow-lg hover:from-gray-600 hover:to-gray-800 transition-all"
          >
            WALK AWAY
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
