import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const GameOverScreen = () => {
  const { playerHealth, dealerHealth, playAgain, leaveTable, roundsWon, roundsLost, totalWon, totalLost } = useShellShockStore();
  
  const isPlayerWinner = playerHealth > 0;
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-black z-50 p-4">
      <div className="crt-overlay" />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        {isPlayerWinner ? (
          <>
            <h1 className="font-special-elite text-5xl md:text-7xl text-neon-yellow neon-text mb-4">
              VICTORY
            </h1>
            <p className="font-special-elite text-xl md:text-2xl text-text-cream mb-8">
              You walked away with the prize.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-special-elite text-4xl md:text-6xl text-danger-red mb-4">
              The House Always Wins...
            </h1>
            <p className="font-special-elite text-xl md:text-2xl text-text-cream mb-8">
              Better luck in the next life.
            </p>
          </>
        )}
        
        <div className="font-special-elite text-lg md:text-xl text-text-cream mb-8 bg-black/40 p-6 rounded-lg backdrop-blur-md border border-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">Rounds Won:</div>
            <div className="text-right text-neon-yellow">{roundsWon}</div>
            <div className="text-left">Rounds Lost:</div>
            <div className="text-right text-danger-red">{roundsLost}</div>
            <div className="text-left border-t border-gray-700 pt-2">Total Won:</div>
            <div className="text-right text-neon-yellow border-t border-gray-700 pt-2">{totalWon} SOL</div>
            <div className="text-left">Total Lost:</div>
            <div className="text-right text-danger-red">{totalLost} SOL</div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={playAgain}
            className={`px-8 py-4 font-special-elite text-xl md:text-2xl shadow-lg transition-all border-4 ${
              isPlayerWinner 
                ? 'bg-gradient-to-b from-neon-yellow to-yellow-700 border-yellow-600 text-bg-black hover:from-yellow-300 hover:to-yellow-600' 
                : 'bg-gradient-to-b from-neon-yellow to-yellow-700 border-yellow-600 text-bg-black hover:from-yellow-300 hover:to-yellow-600'
            }`}
          >
            {isPlayerWinner ? 'PLAY AGAIN' : 'DOUBLE OR NOTHING'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={leaveTable}
            className="px-8 py-4 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600 text-text-cream font-special-elite text-xl md:text-2xl shadow-lg hover:from-gray-600 hover:to-gray-800 transition-all"
          >
            {isPlayerWinner ? 'WALK AWAY' : 'WALK AWAY'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
