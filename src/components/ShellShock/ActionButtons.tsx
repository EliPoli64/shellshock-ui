import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { ItemMenu } from './ItemMenu';

export const ActionButtons = () => {
  const { 
    gameMode,
    isPlayerTurn, 
    shootDealer, 
    shootSelf, 
    fold,
    showItemMenu,
    setShowItemMenu,
    isAnimating,
    isRevealingShells,
  } = useShellShockStore();

  const toggleItemMenu = () => {
    setShowItemMenu(!showItemMenu);
  };

  const isPvpLocked = gameMode === 'pvp';
  const isDisabled = isPvpLocked || !isPlayerTurn || isAnimating || isRevealingShells;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 mb-8">
      {showItemMenu && !isPvpLocked && <ItemMenu />}
      {isPvpLocked && (
        <div className="max-w-2xl border border-gray-700 bg-black/80 px-4 py-3 text-center font-special-elite text-sm text-gray-300">
          PvP relay mode is connected. This screen now waits for real on-chain actions instead of
          simulating local turns.
        </div>
      )}
      
      <div className="flex gap-3 sm:gap-4 flex-wrap justify-center">
        <motion.button
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={shootDealer}
          disabled={isDisabled}
          className="font-special-elite shadow-lg transition-all border-2 sm:border-4"
          style={{ 
            padding: '2vh 3vh',
            fontSize: '2.5vh',
            backgroundColor: !isDisabled ? 'linear-gradient(to bottom, #b91c1c, #7f1d1d)' : '#1f2937',
            borderColor: !isDisabled ? '#dc2626' : '#374151',
            color: !isDisabled ? '#e8e0d4' : '#6b7280',
            cursor: !isDisabled ? 'pointer' : 'not-allowed'
          }}
        >
          🔫 SHOOT DEALER
        </motion.button>

        <motion.button
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={shootSelf}
          disabled={isDisabled}
          className="font-special-elite shadow-lg transition-all border-2 sm:border-4"
          style={{ 
            padding: '2vh 3vh',
            fontSize: '2.5vh',
            backgroundColor: !isDisabled ? 'linear-gradient(to bottom, #a16207, #78350f)' : '#1f2937',
            borderColor: !isDisabled ? '#ca8a04' : '#374151',
            color: !isDisabled ? '#e8e0d4' : '#6b7280',
            cursor: !isDisabled ? 'pointer' : 'not-allowed'
          }}
        >
          🎯 SHOOT YOURSELF
        </motion.button>

        <motion.button
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={toggleItemMenu}
          disabled={isDisabled}
          className="font-special-elite shadow-lg transition-all border-2 sm:border-4"
          style={{ 
            padding: '2vh 3vh',
            fontSize: '2.5vh',
            backgroundColor: !isDisabled ? 'linear-gradient(to bottom, #1d4ed8, #1e3a8a)' : '#1f2937',
            borderColor: !isDisabled ? '#2563eb' : '#374151',
            color: !isDisabled ? '#e8e0d4' : '#6b7280',
            cursor: !isDisabled ? 'pointer' : 'not-allowed'
          }}
        >
          🎒 USE ITEM
        </motion.button>

        <motion.button
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={fold}
          disabled={isDisabled}
          className="font-special-elite shadow-lg transition-all border-2 sm:border-4"
          style={{ 
            padding: '2vh 3vh',
            fontSize: '2.5vh',
            backgroundColor: !isDisabled ? 'linear-gradient(to bottom, #4b5563, #1f2937)' : '#1f2937',
            borderColor: !isDisabled ? '#6b7280' : '#374151',
            color: !isDisabled ? '#e8e0d4' : '#6b7280',
            cursor: !isDisabled ? 'pointer' : 'not-allowed'
          }}
        >
          🏳️ FOLD
        </motion.button>
      </div>
    </div>
  );
};
