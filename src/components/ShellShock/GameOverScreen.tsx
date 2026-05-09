import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const GameOverScreen = () => {
  const {
    playAgain,
    leaveTable,
    roundsWon,
    roundsLost,
    totalWon,
    totalLost
  } = useShellShockStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-[4vh] overflow-hidden">
      <div className="crt-overlay" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.12),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          relative
          w-full
          max-w-[70vh]
          rounded-[3vh]
          border
          border-red-500/20
          bg-black/55
          backdrop-blur-xl
          overflow-hidden
          shadow-[0_0_50px_rgba(255,0,0,0.15)]
          p-[4vh]
        "
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              font-special-elite
              text-[5vh]
              md:text-[7vh]
              text-red-400
              uppercase
              tracking-[0.18em]
              drop-shadow-[0_0_25px_rgba(255,50,50,0.45)]
            "
          >
            The House Always Wins
          </motion.h1>

          <p className="mt-[1vh] font-special-elite text-[1.8vh] text-zinc-400 tracking-[0.2em] uppercase">
            Better luck next round.
          </p>

          <div className="grid grid-cols-2 gap-[2vh] mt-[5vh]">
            {[
              { label: 'Rounds Won', value: roundsWon, glow: 'yellow' },
              { label: 'Rounds Lost', value: roundsLost, glow: 'red' },
              { label: 'Total Won', value: `${totalWon.toFixed(3)} SOL`, glow: 'green' },
              { label: 'Total Lost', value: `${totalLost.toFixed(3)} SOL`, glow: 'red' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className="
                  rounded-[2vh]
                  border
                  border-white/10
                  bg-white/5
                  backdrop-blur-md
                  p-[2vh]
                "
              >
                <div className="font-special-elite text-[1.2vh] tracking-[0.25em] uppercase text-zinc-500">
                  {stat.label}
                </div>

                <div
                  className={`
                    mt-[1vh]
                    font-special-elite
                    text-[3vh]
                    ${
                      stat.glow === 'yellow'
                        ? 'text-yellow-300'
                        : stat.glow === 'green'
                        ? 'text-green-300'
                        : 'text-red-300'
                    }
                  `}
                >
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-[2vh] mt-[5vh]">
            <motion.button
              whileHover={{
                scale: 1.05,
                y: -3,
                boxShadow: '0 0 35px rgba(250,204,21,0.45)'
              }}
              whileTap={{ scale: 0.96 }}
              onClick={playAgain}
              className="
                relative overflow-hidden
                px-[4vh]
                py-[2vh]
                rounded-[1.8vh]
                border-[0.25vh]
                border-yellow-300/60
                bg-gradient-to-b
                from-yellow-300
                via-yellow-500
                to-yellow-700
                text-black
                font-special-elite
                text-[2.2vh]
                tracking-[0.15em]
                uppercase
              "
            >
              DOUBLE OR NOTHING
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.05,
                y: -3,
                boxShadow: '0 0 30px rgba(255,255,255,0.12)'
              }}
              whileTap={{ scale: 0.96 }}
              onClick={leaveTable}
              className="
                relative overflow-hidden
                px-[4vh]
                py-[2vh]
                rounded-[1.8vh]
                border-[0.25vh]
                border-zinc-500/50
                bg-gradient-to-b
                from-zinc-700
                via-zinc-900
                to-black
                text-zinc-100
                font-special-elite
                text-[2.2vh]
                tracking-[0.15em]
                uppercase
              "
            >
              WALK AWAY
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};