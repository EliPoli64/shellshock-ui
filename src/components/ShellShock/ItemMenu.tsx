import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { soundManager } from '../../utils/soundEffects';

export const ItemMenu: React.FC = () => {
  const items = useShellShockStore((state) => state.items);
  const useItem = useShellShockStore((state) => state.useItem);
  const isAnimating = useShellShockStore((state) => state.isAnimating);
  const isPendingAction = useShellShockStore((state) => state.isPendingAction);
  const setShowItemMenu = useShellShockStore((state) => state.setShowItemMenu);

  const handleUseItem = (key: string) => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    useItem(key);
  };

  const handleClose = () => {
    if (isPendingAction) return;
    soundManager.play('uiClick');
    setShowItemMenu(false);
  };

  const playerItems = [
    {
      key: 'magnifyingGlass',
      name: '🔍',
      count: items.magnifyingGlass,
      label: 'Peek',
      description: 'Reveal the next shell before firing.',
      glow: 'rgba(56,189,248,0.45)',
      bg: 'from-sky-500 via-cyan-700 to-slate-950',
      border: 'border-cyan-300/70'
    },
    {
      key: 'beer',
      name: '🍺',
      count: items.beer,
      label: 'Rack',
      description: 'Eject a shell from the chamber.',
      glow: 'rgba(245,158,11,0.45)',
      bg: 'from-amber-400 via-amber-700 to-amber-950',
      border: 'border-amber-300/70'
    },
    {
      key: 'handcuffs',
      name: '🔗',
      count: items.handcuffs,
      label: 'Skip',
      description: 'Force your opponent to lose a turn.',
      glow: 'rgba(168,85,247,0.45)',
      bg: 'from-violet-500 via-purple-700 to-purple-950',
      border: 'border-purple-300/70'
    },
    {
      key: 'cigarettes',
      name: '🚬',
      count: items.cigarettes,
      label: 'Heal',
      description: 'Recover health before the next shot.',
      glow: 'rgba(34,197,94,0.45)',
      bg: 'from-emerald-400 via-green-700 to-green-950',
      border: 'border-green-300/70'
    },
    {
      key: 'pill',
      name: '💊',
      count: items.pill,
      label: 'Luck',
      description: 'Take a risky gamble with unknown effects.',
      glow: 'rgba(236,72,153,0.45)',
      bg: 'from-pink-500 via-fuchsia-700 to-fuchsia-950',
      border: 'border-pink-300/70'
    },
    {
      key: 'saw',
      name: '🪚',
      count: items.saw,
      label: 'Saw',
      description: 'Increase the damage of the next shot.',
      glow: 'rgba(239,68,68,0.45)',
      bg: 'from-red-500 via-red-700 to-red-950',
      border: 'border-red-300/70'
    }
  ];

  return (
    <div className="flex flex-col items-center gap-[1.5vw] mb-[8vh] min-h-[11vh] justify-end">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ type: 'spring', damping: 35, stiffness: 700 }}
        className="
          relative
          flex items-center gap-[2vh]
          bg-black/45
          border border-white/10
          backdrop-blur-xl
          rounded-[2.2vh]
          p-[2vh]
          shadow-[0_0_40px_rgba(0,0,0,0.45)]
          max-w-[92vw]
          overflow-hidden
        "
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

        <div className="flex gap-[1vw] flex-wrap justify-center flex-1 relative z-10">
          {playerItems.map((item) => {
            const isDisabled =
              item.count <= 0 ||
              isAnimating ||
              isPendingAction;

            return (
              <motion.div
                key={item.key}
                className="relative group"
                whileHover={
                  !isDisabled
                    ? {
                        y: -5,
                        scale: 1.05
                      }
                    : {}
                }
              >
                <motion.button
                  whileTap={
                    !isDisabled
                      ? { scale: 0.96 }
                      : {}
                  }
                  onClick={() => handleUseItem(item.key)}
                  disabled={isDisabled}
                  className={`
                    relative overflow-hidden
                    flex flex-col items-center justify-center
                    rounded-[1.6vh]
                    border-[0.25vh]
                    min-w-[10vh]
                    min-h-[11vh]
                    px-[1.5vh]
                    py-[1.2vh]
                    transition-all duration-300
                    backdrop-blur-md
                    font-special-elite
                    ${item.bg}
                    ${item.border}
                    ${
                      isDisabled
                        ? 'opacity-35 grayscale cursor-not-allowed'
                        : 'cursor-pointer'
                    }
                  `}
                  style={{
                    boxShadow: !isDisabled
                      ? `0 0 25px ${item.glow}`
                      : 'none'
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_65%)]" />

                  <div className="absolute top-0 left-[-120%] w-[120%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:left-[120%]" />

                  <span className="relative text-[3vh] drop-shadow-lg">
                    {item.name}
                  </span>

                  <span className="relative mt-[0.5vh] text-[1.15vh] uppercase tracking-[0.22em] text-white/75">
                    {item.label}
                  </span>

                  <span className="relative mt-[0.6vh] text-[1.45vh] font-bold text-white">
                    ×{item.count}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {!isDisabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0, y: 8 }}
                      whileHover={{ opacity: 1, y: -8 }}
                      className="
                        pointer-events-none
                        absolute
                        left-1/2
                        -translate-x-1/2
                        bottom-[-5.5vh]
                        z-50
                        whitespace-nowrap
                      "
                    >
                      <div
                        className="
                          px-[1.2vh]
                          py-[0.9vh]
                          rounded-[1vh]
                          bg-black/90
                          border border-white/10
                          backdrop-blur-md
                          text-[1.1vh]
                          tracking-[0.08em]
                          text-white/85
                          shadow-[0_0_20px_rgba(0,0,0,0.45)]
                        "
                      >
                        {item.description}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="h-[9vh] w-[0.15vh] bg-white/10 hidden sm:block" />

        <motion.button
          whileHover={{
            scale: 1.08,
            y: -3,
            boxShadow: '0 0 25px rgba(239,68,68,0.45)'
          }}
          whileTap={{ scale: 0.92 }}
          onClick={handleClose}
          className="
            relative overflow-hidden
            flex flex-col items-center justify-center
            gap-[0.5vh]
            min-w-[8vh]
            min-h-[9vh]
            rounded-[1.5vh]
            border-[0.25vh]
            border-red-400/40
            bg-gradient-to-b
            from-zinc-700
            via-zinc-900
            to-black
            text-zinc-200
            transition-all duration-300
            font-special-elite
          "
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_60%)]" />

          <span className="relative text-[2.8vh]">
            ✕
          </span>

          <span className="relative text-[1vh] uppercase tracking-[0.28em]">
            Close
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};