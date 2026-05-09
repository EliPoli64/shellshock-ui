import { motion } from 'framer-motion';

interface HealthMasksProps {
  health: number;
  isPlayer: boolean;
}

export const HealthMasks = ({
  health,
  isPlayer
}: HealthMasksProps) => {
  const maxHealth = 3;
  const heartImage = '/src/assets/heart.png';

  return (
    <div className="flex gap-[1.2vh] justify-center">
      {Array.from({ length: maxHealth }).map((_, i) => {
        const active = i < health;

        return (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -90 }}
            animate={{
              scale: active ? 1 : 0.82,
              opacity: active ? 1 : 0.3,
              rotate: 0
            }}
            transition={{
              delay: i * 0.08,
              type: 'spring',
              stiffness: 500
            }}
            whileHover={{
              scale: active ? 1.08 : 0.9,
              y: -2
            }}
            className={`
              relative overflow-hidden
              rounded-full
              flex items-center justify-center
              border-[0.25vh]
              backdrop-blur-md
            `}
            style={{
              width: '6.8vh',
              height: '6.8vh',
              background: active
                ? isPlayer
                  ? 'linear-gradient(to bottom, #f8fafc, #cbd5e1)'
                  : 'linear-gradient(to bottom, #fde68a, #ca8a04)'
                : 'linear-gradient(to bottom, #1f2937, #111827)',
              borderColor: active
                ? isPlayer
                  ? '#ffffff99'
                  : '#fde68a99'
                : '#374151',
              boxShadow: active
                ? isPlayer
                  ? '0 0 25px rgba(255,255,255,0.22)'
                  : '0 0 25px rgba(250,204,21,0.25)'
                : 'none'
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_60%)]" />

            <img
              src={heartImage}
              alt="heart"
              className="relative z-10"
              style={{
                width: '92%',
                height: '92%',
                objectFit: 'contain',
                filter: active
                  ? 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
                  : 'grayscale(100%) brightness(0.55)'
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
};