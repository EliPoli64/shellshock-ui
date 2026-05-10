import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { ItemMenu } from './ItemMenu';
import { soundManager } from '../../utils/soundEffects';

export const ActionButtons: React.FC = () => {
  const {
    isPlayerTurn,
    shootDealer,
    shootSelf,
    fold,
    showItemMenu,
    setShowItemMenu,
    isAnimating,
    isRevealingShells,
    gameMode,
    wallet,
    turnWallet,
    players,
    isPendingAction
  } = useShellShockStore();

  const isPvP = gameMode === 'pvp';
  const myTurn = isPvP ? turnWallet === wallet : isPlayerTurn;
  const otherPlayers = isPvP ? players.filter(p => p.wallet !== wallet) : [];

  const toggleItemMenu = () => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    setShowItemMenu(!showItemMenu);
  };

  const handleShootDealer = () => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    shootDealer();
  };

  const handleShootSelf = () => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    shootSelf();
  };

  const handleFold = () => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    fold();
  };

  const isVisible =
    myTurn &&
    !isAnimating &&
    !isRevealingShells &&
    !showItemMenu;

  const baseButtonClass =
    `
    relative overflow-hidden
    font-special-elite
    uppercase tracking-[0.12em]
    text-text-cream
    border-[0.25vh]
    rounded-[1.2vh]
    px-[3vh] py-[1.9vh]
    text-[2vh]
    cursor-pointer
    shadow-[0_0_25px_rgba(0,0,0,0.45)]
    backdrop-blur-md
    transition-all duration-300
    before:absolute before:top-0 before:left-[-120%]
    before:w-[120%] before:h-full
    before:bg-gradient-to-r
    before:from-transparent
    before:via-white/20
    before:to-transparent
    hover:before:left-[120%]
    before:transition-all before:duration-700
    `;

  return (
    <div className="flex flex-col items-center gap-[1.5vw] mb-[8vh] min-h-[11vh] justify-end">
      <AnimatePresence mode="wait">
        {isPendingAction ? (
          <motion.div
            key="pending-action"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            className="flex flex-col gap-[0.5vh]"
          >
            <div className="relative">
              <div className="w-[5vh] h-[5vh] rounded-full border-[0.55vh] border-yellow-400/30" />

              <div className="absolute inset-0 w-[5vh] h-[5vh] border-[0.55vh] border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>

            <span className="font-special-elite text-yellow-300 text-[2vh] tracking-[0.25em] animate-pulse">
              PROCESSING BET...
            </span>
          </motion.div>
        ) : showItemMenu ? (
          <ItemMenu key="item-menu" />
        ) : isVisible ? (
          <motion.div
            key="action-buttons"
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.96,
              transition: { duration: 0.2 }
            }}
            className="flex gap-[1.5vw] flex-wrap justify-center"
          >
            {isPvP ? (
              otherPlayers.map(p => (
                <motion.button
                  key={p.wallet}
                  whileHover={{
                    scale: 1.06,
                    y: -4,
                    boxShadow: '0 0 35px rgba(255, 50, 50, 0.55)'
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleShootDealer()}
                  className={`
                    ${baseButtonClass}
                    bg-gradient-to-b from-red-500 via-red-700 to-red-950
                    border-red-400/70
                  `}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]" />

                  <div className="relative flex items-center gap-[1vh]">
                    <span className="text-[2.3vh]">🔫</span>

                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[1.2vh] text-red-200 tracking-[0.25em]">
                        ATTACK
                      </span>

                      <span className="text-[2vh]">
                        {p.wallet.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))
            ) : (
              <motion.button
                whileHover={{
                  scale: 1.06,
                  y: -4,
                  boxShadow: '0 0 40px rgba(255, 60, 60, 0.6)'
                }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleShootDealer()}
                className={`
                  ${baseButtonClass}
                  bg-gradient-to-b from-red-500 via-red-700 to-red-950
                  border-red-400/70
                `}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]" />

                <div className="relative flex items-center gap-[1vh]">
                  <span className="text-[2.5vh]">🔫</span>

                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[1.2vh] text-red-200 tracking-[0.25em]">
                      HIGH RISK
                    </span>

                    <span className="text-[2.2vh]">
                      SHOOT DEALER
                    </span>
                  </div>
                </div>
              </motion.button>
            )}

            <motion.button
              whileHover={{
                scale: 1.06,
                y: -4,
                boxShadow: '0 0 35px rgba(255, 180, 40, 0.55)'
              }}
              whileTap={{ scale: 0.96 }}
              onClick={handleShootSelf}
              className={`
                ${baseButtonClass}
                bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950
                border-amber-300/70
              `}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_60%)]" />

              <div className="relative flex items-center gap-[1vh]">
                <span className="text-[2.5vh]">🎯</span>

                <div className="flex flex-col items-start leading-none">
                  <span className="text-[1.2vh] text-amber-100 tracking-[0.25em]">
                    DOUBLE OR NOTHING
                  </span>

                  <span className="text-[2.1vh]">
                    SHOOT YOURSELF
                  </span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.06,
                y: -4,
                boxShadow: '0 0 35px rgba(70, 140, 255, 0.5)'
              }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleItemMenu}
              className={`
                ${baseButtonClass}
                bg-gradient-to-b from-blue-500 via-blue-700 to-blue-950
                border-blue-300/70
              `}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />

              <div className="relative flex items-center gap-[1vh]">
                <span className="text-[2.5vh]">🎒</span>

                <div className="flex flex-col items-start leading-none">
                  <span className="text-[1.2vh] text-blue-100 tracking-[0.25em]">
                    ADVANTAGE
                  </span>

                  <span className="text-[2.1vh]">
                    USE ITEM
                  </span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.06,
                y: -4,
                boxShadow: '0 0 30px rgba(180,180,180,0.35)'
              }}
              whileTap={{ scale: 0.96 }}
              onClick={handleFold}
              className={`
                ${baseButtonClass}
                bg-gradient-to-b from-zinc-500 via-zinc-700 to-black
                border-zinc-300/50
              `}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_60%)]" />

              <div className="relative flex items-center gap-[1vh]">
                <span className="text-[2.5vh]">🏳️</span>

                <div className="flex flex-col items-start leading-none">
                  <span className="text-[1.2vh] text-zinc-200 tracking-[0.25em]">
                    SAFE EXIT
                  </span>

                  <span className="text-[2.1vh]">
                    FOLD
                  </span>
                </div>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="waiting-msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            className="
              font-special-elite
              text-text-cream
              text-[2vh]
              tracking-[0.3em]
              uppercase
              bg-black/30
              border border-white/10
              px-[2vh]
              py-[1vh]
              rounded-[1vh]
              backdrop-blur-md
            "
          >
            {isAnimating || isRevealingShells
              ? 'Loading Chamber...'
              : !myTurn
              ? "Opponent's Turn"
              : ''}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};