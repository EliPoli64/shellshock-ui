import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { WalletButton } from '../WalletButton';
import { soundManager } from '../../utils/soundEffects';
import { MatchHistory } from './MatchHistory';

export const MainMenu = () => {
  const {
    startGame,
    wallet,
    relayReady,
    relayConnectionState,
    openPvpSetup,
    refreshRelayStatus
  } = useShellShockStore();

  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [toast, setToast] = useState({
    message: '',
    visible: false
  });

  const [toastTimeout, setToastTimeout] =
    useState<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    setToast({
      message,
      visible: true
    });

    const newTimeout = setTimeout(() => {
      setToast(prev => ({
        ...prev,
        visible: false
      }));
    }, 4000);

    setToastTimeout(newTimeout);
  };

  useEffect(() => {
    void refreshRelayStatus();
  }, [refreshRelayStatus]);

  const title = 'SHELL SHOCK';
  const subtitle =
    'Russian Roulette with a 12-Gauge... and SOL, of course.';

  const canEnterPvp = Boolean(wallet) && relayReady;

  const handleStartGame = () => {
    soundManager.play('uiClick');

    if (!wallet) {
      showToast('Connect a wallet first!');
      return;
    }

    if (document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .catch(err => {
          console.warn(
            `Error attempting to enable full-screen mode: ${err.message}`
          );
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
    {
      title: 'THE BASICS',
      content:
        'A shotgun is loaded with a random mix of Live and Blank shells. You and the Dealer take turns shooting. Shoot the dealer to deal damage. Shoot yourself with a blank to get an extra turn.'
    },
    {
      title: 'POWER-UPS',
      content:
        'Use items to gain an advantage. You and the dealer both start with a random stash of tools.'
    }
  ];

  const itemsHelp = [
    {
      icon: '🔍',
      name: 'MAGNIFYING GLASS',
      desc: 'Peek at the current shell in the chamber.'
    },
    {
      icon: '🍺',
      name: 'BEER',
      desc: 'Rack the shotgun to eject the current shell.'
    },
    {
      icon: '🔗',
      name: 'HANDCUFFS',
      desc: "Skip your opponent's next turn."
    },
    {
      icon: '🚬',
      name: 'CIGARETTES',
      desc: 'Restore 1 unit of health.'
    },
    {
      icon: '🪚',
      name: 'SAW',
      desc: 'Saw the barrel to deal double damage.'
    },
    {
      icon: '💊',
      name: 'LUCKY PILL',
      desc: '50% chance to heal. 50% chance to suffer.'
    }
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 overflow-hidden p-[4vh]">
      <div className="crt-overlay" />

      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.08),transparent_60%)]" />

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
              ease: 'linear',
              delay: Math.random() * -20
            }}
            className="absolute text-[2.2vh] opacity-20"
          >
            {
              ['🔫', '🎯', '🪚', '🔗', '🍺', '🚬'][
                Math.floor(Math.random() * 6)
              ]
            }
          </motion.div>
        ))}
      </div>

      {/* TOAST */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            className="
              absolute
              top-[4vh]
              left-[4vh]
              z-[300]
              rounded-[1.5vh]
              border
              border-red-400/30
              bg-black/80
              backdrop-blur-xl
              px-[2.5vh]
              py-[1.8vh]
              shadow-[0_0_25px_rgba(255,50,50,0.18)]
            "
          >
            <p className="font-special-elite text-[1.8vh] text-red-300 tracking-[0.15em] uppercase">
              {toast.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TITLE */}
      <div className="relative z-10 mb-[6vh] text-center">
        <motion.h1
          initial={{
            opacity: 0,
            filter: 'blur(12px)',
            scale: 0.9
          }}
          animate={{
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1
          }}
          transition={{
            duration: 1.2
          }}
          className="
            font-special-elite
            text-[9vh]
            md:text-[11vh]
            lg:text-[13vh]
            uppercase
            tracking-[0.08em]
            text-red-400
            drop-shadow-[0_0_35px_rgba(255,50,50,0.45)]
            leading-none
          "
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1 }}
          className="
            mt-[1vh]
            font-special-elite
            text-[1.7vh]
            md:text-[2vh]
            text-zinc-400
            tracking-[0.35em]
            uppercase
          "
        >
          {subtitle}
        </motion.p>
      </div>

      {/* BUTTONS */}
      <div className="flex flex-col gap-[2vh] w-full max-w-[44vh] z-10">
        {/* ENTER TABLE */}
        <motion.button
          whileHover={{
            scale: 1.04,
            y: -4,
            boxShadow: '0 0 40px rgba(255,50,50,0.45)'
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStartGame}
          className="
            group
            relative
            overflow-hidden
            w-full
            rounded-[2vh]
            border-[0.25vh]
            border-red-400/60
            bg-gradient-to-b
            from-red-500
            via-red-700
            to-red-950
            px-[3vh]
            py-[2.2vh]
            text-left
            shadow-[0_0_30px_rgba(255,50,50,0.18)]
          "
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]" />

          <div className="absolute top-0 left-[-120%] w-[120%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:left-[120%]" />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-special-elite text-[1.1vh] tracking-[0.3em] uppercase text-red-200">
                Singleplayer
              </div>

              <div className="mt-[0.5vh] font-special-elite text-[2.6vh] uppercase text-white">
                ENTER THE TABLE
              </div>

              <div className="mt-[0.6vh] font-special-elite text-[1.2vh] uppercase tracking-[0.12em] text-red-100/70">
                Face the dealer in a deadly wager.
              </div>
            </div>

            <div className="text-[4vh]">
              🔫
            </div>
          </div>
        </motion.button>

        {/* HOW TO PLAY */}
        <motion.button
          whileHover={{
            scale: 1.03,
            y: -3,
            boxShadow: '0 0 25px rgba(180,180,255,0.15)'
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleShowHelp}
          className="
            group
            relative
            overflow-hidden
            w-full
            rounded-[2vh]
            border-[0.25vh]
            border-blue-300/20
            bg-gradient-to-b
            from-zinc-800
            via-zinc-900
            to-black
            px-[3vh]
            py-[2vh]
            text-left
          "
        >
          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-special-elite text-[1.1vh] tracking-[0.3em] uppercase text-blue-200/70">
                Learn
              </div>

              <div className="mt-[0.5vh] font-special-elite text-[2.3vh] uppercase text-white">
                HOW TO PLAY
              </div>

              <div className="mt-[0.6vh] font-special-elite text-[1.2vh] uppercase tracking-[0.12em] text-zinc-400">
                Rules, items and survival tips.
              </div>
            </div>

            <div className="text-[3.8vh]">
              📜
            </div>
          </div>
        </motion.button>

        {/* HISTORY */}
        {wallet && (
          <motion.button
            whileHover={{
              scale: 1.03,
              y: -3,
              boxShadow: '0 0 25px rgba(255,255,255,0.12)'
            }}
            whileTap={{ scale: 0.96 }}
            onClick={handleShowHistory}
            className="
              relative
              overflow-hidden
              w-full
              rounded-[2vh]
              border-[0.25vh]
              border-zinc-400/20
              bg-gradient-to-b
              from-zinc-800
              via-zinc-900
              to-black
              px-[3vh]
              py-[2vh]
              text-left
            "
          >
            <div className="relative flex items-center justify-between">
              <div>
                <div className="font-special-elite text-[1.1vh] tracking-[0.3em] uppercase text-zinc-300/70">
                  Stats
                </div>

                <div className="mt-[0.5vh] font-special-elite text-[2.3vh] uppercase text-white">
                  BATTLE LOGS
                </div>

                <div className="mt-[0.6vh] font-special-elite text-[1.2vh] uppercase tracking-[0.12em] text-zinc-400">
                  Review previous matches and outcomes.
                </div>
              </div>

              <div className="text-[3.8vh]">
                📊
              </div>
            </div>
          </motion.button>
        )}

        {/* PVP */}
        <motion.button
          whileHover={
            canEnterPvp
              ? {
                  scale: 1.04,
                  y: -4,
                  boxShadow: '0 0 40px rgba(250,204,21,0.35)'
                }
              : {}
          }
          whileTap={
            canEnterPvp
              ? { scale: 0.96 }
              : {}
          }
          onClick={handlePvpClick}
          disabled={!canEnterPvp}
          className={`
            relative
            overflow-hidden
            w-full
            rounded-[2vh]
            border-[0.25vh]
            px-[3vh]
            py-[2.2vh]
            text-left
            transition-all
            ${
              canEnterPvp
                ? `
                  border-yellow-300/50
                  bg-gradient-to-b
                  from-yellow-300
                  via-yellow-500
                  to-yellow-700
                  text-black
                `
                : `
                  cursor-not-allowed
                  border-zinc-700
                  bg-gradient-to-b
                  from-zinc-800
                  to-black
                  text-zinc-500
                `
            }
          `}
        >
          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-special-elite text-[1.1vh] tracking-[0.3em] uppercase opacity-70">
                Multiplayer
              </div>

              <div className="mt-[0.5vh] font-special-elite text-[2.5vh] uppercase">
                PLAYER VS PLAYER
              </div>

              <div className="mt-[0.6vh] font-special-elite text-[1.2vh] uppercase tracking-[0.12em] opacity-70">
                High stakes matchmaking on Solana.
              </div>
            </div>

            <div className="text-[4vh]">
              🎯
            </div>
          </div>
        </motion.button>

        {/* STATUS */}
        <div className="mt-[1vh] text-center">
          <p className="font-special-elite text-[1.2vh] uppercase tracking-[0.2em] text-zinc-500">
            Relay: {relayConnectionState} {relayReady ? '• ready' : '• waiting'}
          </p>

          {!wallet && (
            <p className="mt-[1vh] font-special-elite text-[1.1vh] uppercase tracking-[0.18em] text-zinc-600">
              Connect a wallet to unlock PvP matchmaking.
            </p>
          )}
        </div>
      </div>

      {/* WALLET */}
      <div className="absolute top-[3vh] right-[3vh] z-20">
        <WalletButton />
      </div>

      {/* HELP MODAL */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              absolute inset-0 z-[200]
              flex items-center justify-center
              bg-black/90
              backdrop-blur-md
              p-[4vh]
            "
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="
                relative
                w-full
                max-w-[80vh]
                max-h-[85vh]
                overflow-y-auto
                rounded-[3vh]
                border
                border-white/10
                bg-black/60
                backdrop-blur-xl
                p-[4vh]
              "
            >
              <div className="flex justify-between items-center mb-[4vh]">
                <h2 className="font-special-elite text-[4vh] uppercase tracking-[0.15em] text-yellow-300">
                  Instructions
                </h2>

                <button
                  onClick={handleCloseHelp}
                  className="text-[3vh] text-zinc-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-[4vh]">
                {instructions.map((inst, i) => (
                  <div key={i}>
                    <h3 className="font-special-elite text-[2vh] uppercase tracking-[0.25em] text-red-300">
                      {inst.title}
                    </h3>

                    <p className="mt-[1vh] font-special-elite text-[1.6vh] leading-relaxed text-zinc-300">
                      {inst.content}
                    </p>
                  </div>
                ))}

                <div>
                  <h3 className="font-special-elite text-[2vh] uppercase tracking-[0.25em] text-yellow-300 mb-[2vh]">
                    The Toolkit
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2vh]">
                    {itemsHelp.map((item, i) => (
                      <div
                        key={i}
                        className="
                          rounded-[1.5vh]
                          border
                          border-white/10
                          bg-white/5
                          p-[2vh]
                          flex gap-[2vh]
                          items-start
                        "
                      >
                        <div className="text-[3vh]">
                          {item.icon}
                        </div>

                        <div>
                          <div className="font-special-elite text-[1.5vh] uppercase tracking-[0.15em] text-white">
                            {item.name}
                          </div>

                          <div className="mt-[0.5vh] font-special-elite text-[1.3vh] text-zinc-400">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{
                  scale: 1.03,
                  y: -2
                }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCloseHelp}
                className="
                  mt-[4vh]
                  w-full
                  rounded-[1.8vh]
                  border-[0.25vh]
                  border-yellow-300/50
                  bg-gradient-to-b
                  from-yellow-300
                  via-yellow-500
                  to-yellow-700
                  py-[2vh]
                  font-special-elite
                  text-[2vh]
                  uppercase
                  tracking-[0.18em]
                  text-black
                "
              >
                GOT IT
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              absolute inset-0 z-[200]
              flex items-center justify-center
              bg-black/90
              backdrop-blur-md
              p-[4vh]
            "
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="
                w-full
                max-w-[65vh]
                max-h-[85vh]
                overflow-hidden
                rounded-[3vh]
                border
                border-white/10
                bg-black/60
                backdrop-blur-xl
                p-[3vh]
              "
            >
              <MatchHistory onClose={handleCloseHistory} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};