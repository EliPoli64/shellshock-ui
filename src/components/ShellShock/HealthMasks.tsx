import React from 'react';
import { motion } from 'framer-motion';

interface HealthMasksProps {
  health: number;
  isPlayer: boolean;
}

export const HealthMasks: React.FC<HealthMasksProps> = ({ health, isPlayer }) => {
  const maxHealth = 3;
  const heartImage = '/src/assets/heart.png'; // or you can import it: import heartImage from '../assets/heart.png'
  
  return (
    <div className="flex gap-1 sm:gap-2 justify-center">
      {Array.from({ length: maxHealth }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: i < health ? 1 : 0.3, opacity: i < health ? 1 : 0.3 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-full border-2 flex items-center justify-center overflow-hidden"
          style={{ 
            width: '6vh', 
            height: '6vh', 
            fontSize: '3.5vh',
            backgroundColor: i < health ? '#e5e7eb' : '#1f2937',
            borderColor: i < health ? '#9ca3af' : '#374151'
          }}
        >
          <img 
            src={heartImage} 
            alt="heart"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              filter: i < health ? 'none' : 'grayscale(100%)'
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};