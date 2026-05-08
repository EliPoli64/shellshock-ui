import React from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const ShellRack: React.FC = () => {
  const { liveShells, blankShells, isRevealingShells } = useShellShockStore();
  
  return (
    <div className="flex gap-[0.5vh] items-center justify-center flex-wrap w-full">
      <span className="font-special-elite text-[3vh] text-text-cream mr-[1vh] shrink-0">SHELLS:</span>
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
          className="rounded-full border-[0.2vh] border-red-900 shadow-md shrink-0"
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
          className="rounded-full border-[0.2vh] border-gray-800 shadow-md shrink-0"
          style={{ width: '3vh', height: '5vh', backgroundColor: '#4b5563' }}
        />
      ))}
    </div>
  );
};
