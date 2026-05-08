import React from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const ShellRack: React.FC = () => {
  const { liveShells, blankShells, isRevealingShells } = useShellShockStore();
  
  return (
    <div className="flex gap-1 items-center justify-center flex-wrap w-full">
      <span className="font-special-elite text-[2vh] sm:text-[2.5vh] md:text-[3vh] text-text-cream mr-0.5 sm:mr-1 shrink-0">SHELLS:</span>
      {Array.from({ length: liveShells }).map((_, i) => (
        <motion.div 
          key={`live-${i}`} 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: isRevealingShells ? i * 0.2 : 0,
            type: "spring",
            stiffness: 260,
            damping: 20 
          }}
          className="rounded-full border border-red-900 sm:border-2 shadow-md shrink-0"
          style={{ width: '3vh', height: '5vh', backgroundColor: '#8b0000' }}
        />
      ))}
      {Array.from({ length: blankShells }).map((_, i) => (
        <motion.div 
          key={`blank-${i}`} 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: isRevealingShells ? (liveShells + i) * 0.2 : 0,
            type: "spring",
            stiffness: 260,
            damping: 20 
          }}
          className="rounded-full border border-gray-800 sm:border-2 shadow-md shrink-0"
          style={{ width: '3vh', height: '5vh', backgroundColor: '#4b5563' }}
        />
      ))}
    </div>
  );
};
