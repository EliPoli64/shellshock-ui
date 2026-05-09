import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const RoundEnd = () => {
  const {
    playerHealth,
    dealerHealth,
    playAgain,
    leaveTable,
    roundsWon,
    roundsLost,
    totalWon,
    totalLost
  } = useShellShockStore();

  const isPlayerWinner = playerHealth > dealerHealth;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-[4vh]">
      <div className="crt-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="
          relative
          w-full
          max-w-[72vh]
          rounded-[3vh]
          border
          border-white/10
          bg-black/55
          backdrop-blur-xl
          overflow-hidden
          shadow-[0_0_50px_rgba(0,0,0,0.45)]
          p-[4vh]
        "
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

        <div className="relative z-10 text-center">
          <h1
            className={`
              font-special-elite
              text-[6vh]
              uppercase
              tracking-[0.18em]
              ${
                isPlayerWinner
                  ? 'text-yellow-300 drop-shadow-[0_0_25px_rgba(250,204,21,0.45)]'
                  : 'text-red-400 drop-shadow-[0_0_25px_rgba(255,50,50,0.45)]'
              }
            `}
          >
            {isPlayerWinner
              ? 'YOU SURVIVE'
              : 'DEALER WINS'}
          </h1>

          <p className="mt-[1vh] text-zinc-400 font-special-elite tracking-[0.2em] uppercase text-[1.5vh]">
            {isPlayerWinner
              ? 'The crowd goes wild.'
              : 'The dealer claims another victim.'}
          </p>

          <div className="grid grid-cols-2 gap-[2vh] mt-[5vh]">
            {[
              { label: 'Rounds Won', value: roundsWon },
              { label: 'Rounds Lost', value: roundsLost },
              { label: 'Total Won', value: `${totalWon.toFixed(3)} SOL` },
              { label: 'Total Lost', value: `${totalLost.toFixed(3)} SOL` }
            ].map((stat, i) => (
              <div
                key={i}
                className="
                  rounded-[2vh]
                  border border-white/10
                  bg-white/5
                  p-[2vh]
                "
              >
                <div className="font-special-elite text-[1.1vh] uppercase tracking-[0.25em] text-zinc-500">
                  {stat.label}
                </div>

                <div className="mt-[1vh] font-special-elite text-[2.8vh] text-white">
                  {stat.value}
                </div>
              </div>
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
                text-[2.1vh]
                tracking-[0.15em]
                uppercase
              "
            >
              PLAY AGAIN
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
                text-[2.1vh]
                tracking-[0.15em]
                uppercase
              "
            >
              LEAVE TABLE
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};