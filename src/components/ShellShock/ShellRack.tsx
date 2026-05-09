import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const ShellRack = () => {
  const {
    liveShells,
    blankShells,
    isRevealingShells
  } = useShellShockStore();

  const totalShells = liveShells + blankShells;

  return (
    <div
      className="
        relative
        flex
        flex-wrap
        items-center
        justify-center
        gap-[0.9vh]
        w-full
      "
    >
      {/* SHELL COUNTER PANEL */}
      <div
        className="
          relative
          overflow-hidden
          flex
          items-center
          gap-[1.2vh]
          rounded-[1.6vh]
          border
          border-white/10
          bg-black/45
          backdrop-blur-xl
          px-[1.8vh]
          py-[1vh]
          shadow-[0_0_25px_rgba(0,0,0,0.35)]
          mr-[1vh]
        "
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_65%)]" />

        <span
          className="
            relative
            font-special-elite
            text-[1.8vh]
            uppercase
            tracking-[0.28em]
            text-zinc-300
          "
        >
          Chamber
        </span>

        <div
          className="
            relative
            flex
            items-center
            justify-center
            min-w-[4vh]
            h-[4vh]
            rounded-full
            border
            border-red-400/20
            bg-red-500/10
            shadow-[0_0_15px_rgba(255,50,50,0.18)]
          "
        >
          <span
            className="
              font-special-elite
              text-[1.7vh]
              text-red-300
            "
          >
            {totalShells}
          </span>
        </div>
      </div>

      {/* LIVE SHELLS */}
      {Array.from({ length: liveShells }).map((_, i) => (
        <motion.div
          key={`live-${i}`}
          initial={{
            y: 30,
            opacity: 0,
            rotate: -12,
            scale: 0.8
          }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: 0,
            scale: 1
          }}
          transition={{
            delay: isRevealingShells
              ? i * 0.16
              : 0,
            type: 'spring',
            stiffness: 320,
            damping: 18
          }}
          whileHover={{
            y: -5,
            scale: 1.08,
            rotate: -2
          }}
          className="
            group
            relative
            shrink-0
            cursor-default
          "
        >
          {/* GLOW */}
          <div
            className="
              absolute
              inset-0
              rounded-[1vh]
              blur-[0.8vh]
              bg-red-500/40
              opacity-70
              scale-110
            "
          />

          {/* SHELL BODY */}
          <div
            className="
              relative
              flex
              items-end
              justify-center
              overflow-hidden
              rounded-[0.8vh]
              border-[0.22vh]
              border-red-300/40
              bg-gradient-to-b
              from-red-400
              via-red-700
              to-red-950
              shadow-[0_0_18px_rgba(255,50,50,0.28)]
            "
            style={{
              width: '3.6vh',
              height: '6.2vh'
            }}
          >
            {/* TOP SHINE */}
            <div className="absolute top-0 left-0 w-full h-[35%] bg-gradient-to-b from-white/30 to-transparent" />

            {/* METAL BASE */}
            <div
              className="
                relative
                w-full
                h-[1.2vh]
                border-t
                border-yellow-100/30
                bg-gradient-to-b
                from-yellow-400
                via-amber-600
                to-amber-900
              "
            />

            {/* REFLECTION */}
            <div className="absolute top-0 left-[-40%] w-[40%] h-full bg-white/15 rotate-[18deg] transition-all duration-500 group-hover:left-[120%]" />
          </div>
        </motion.div>
      ))}

      {/* BLANK SHELLS */}
      {Array.from({ length: blankShells }).map((_, i) => (
        <motion.div
          key={`blank-${i}`}
          initial={{
            y: 30,
            opacity: 0,
            rotate: 12,
            scale: 0.8
          }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: 0,
            scale: 1
          }}
          transition={{
            delay: isRevealingShells
              ? (liveShells + i) * 0.16
              : 0,
            type: 'spring',
            stiffness: 320,
            damping: 18
          }}
          whileHover={{
            y: -5,
            scale: 1.08,
            rotate: 2
          }}
          className="
            group
            relative
            shrink-0
            cursor-default
          "
        >
          {/* GLOW */}
          <div
            className="
              absolute
              inset-0
              rounded-[1vh]
              blur-[0.8vh]
              bg-zinc-400/20
              opacity-60
              scale-110
            "
          />

          {/* SHELL BODY */}
          <div
            className="
              relative
              flex
              items-end
              justify-center
              overflow-hidden
              rounded-[0.8vh]
              border-[0.22vh]
              border-zinc-300/20
              bg-gradient-to-b
              from-zinc-400
              via-zinc-600
              to-zinc-900
              shadow-[0_0_16px_rgba(255,255,255,0.08)]
            "
            style={{
              width: '3.6vh',
              height: '6.2vh'
            }}
          >
            {/* TOP SHINE */}
            <div className="absolute top-0 left-0 w-full h-[35%] bg-gradient-to-b from-white/20 to-transparent" />

            {/* METAL BASE */}
            <div
              className="
                relative
                w-full
                h-[1.2vh]
                border-t
                border-zinc-100/20
                bg-gradient-to-b
                from-zinc-300
                via-zinc-500
                to-zinc-800
              "
            />

            {/* REFLECTION */}
            <div className="absolute top-0 left-[-40%] w-[40%] h-full bg-white/10 rotate-[18deg] transition-all duration-500 group-hover:left-[120%]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};