import React from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const ItemMenu: React.FC = () => { 
  const items = useShellShockStore((state) => state.items); 
  const useItem = useShellShockStore((state) => state.useItem); 
  const isAnimating = useShellShockStore((state) => state.isAnimating); 
  const setShowItemMenu = useShellShockStore((state) => state.setShowItemMenu); 
  
  const playerItems = [ 
    { key: 'magnifyingGlass', name: '🔍', count: items.magnifyingGlass, label: 'Peek' }, 
    { key: 'beer', name: '🍺', count: items.beer, label: 'Rack' }, 
    { key: 'handcuffs', name: '🔗', count: items.handcuffs, label: 'Skip' }, 
    { key: 'cigarettes', name: '🚬', count: items.cigarettes, label: 'Heal' }, 
    { key: 'pill', name: '💊', count: items.pill, label: 'Luck' }, 
    { key: 'saw', name: '🪚', count: items.saw, label: 'Saw' }, 
  ]; 
  
  return ( 
    <div className="flex flex-col gap-[2vh] items-center"> 
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 20, scale: 0.95 }} 
        transition={{ type: "spring", damping: 20, stiffness: 300 }} 
        className="flex items-center gap-[2vh] bg-black/60 p-[2vh] rounded-[2vh] border-[0.3vh] border-purple-900/50 backdrop-blur-sm relative max-w-[90vw]" 
      > 
        <div className="flex gap-[1vh] flex-wrap justify-center flex-1"> 
          {playerItems.map((item) => ( 
            <motion.button 
              key={item.key} 
              whileHover={item.count > 0 && !isAnimating ? { scale: 1.05, y: -2 } : {}} 
              whileTap={item.count > 0 && !isAnimating ? { scale: 0.95 } : {}} 
              onClick={() => useItem(item.key)} 
              disabled={item.count <= 0 || isAnimating} 
              className="font-special-elite shadow-lg transition-all border-[0.2vh] flex flex-col items-center gap-[0.5vh] rounded-[1vh]" 
              style={{ 
                padding: '1vh 1.2vh', 
                minWidth: '8vh', 
                backgroundColor: item.count > 0 ? '#581c87' : '#1f2937', 
                borderColor: item.count > 0 ? '#9333ea' : '#374151', 
                color: item.count > 0 ? '#e8e0d4' : '#6b7280', 
                cursor: item.count > 0 && !isAnimating ? 'pointer' : 'not-allowed', 
                boxShadow: item.count > 0 ? '0 0 1.5vh rgba(147, 51, 234, 0.3)' : 'none' 
              }} 
            > 
              <span style={{ fontSize: '2.5vh' }}>{item.name}</span> 
              <span className="uppercase tracking-tighter" style={{ fontSize: '1vh' }}>{item.label}</span> 
              <span style={{ fontSize: '1.2vh', fontWeight: 'bold' }}>({item.count})</span> 
            </motion.button> 
          ))} 
        </div> 

        <div className="h-[8vh] w-[0.2vh] bg-purple-900/30 self-center hidden sm:block" />

        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#b91c1c', borderColor: '#ef4444' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowItemMenu(false)}
          className="font-special-elite flex flex-col items-center justify-center gap-1 p-[1.5vh] border-[0.2vh] border-gray-600 text-gray-400 rounded-[1.5vh] hover:text-white transition-all group"
          title="Close Backpack"
        >
          <span style={{ fontSize: '2.5vh' }}>✕</span>
          <span className="uppercase tracking-widest font-bold hidden md:block" style={{ fontSize: '1vh' }}>CLOSE</span>
        </motion.button>
      </motion.div> 
    </div> 
  ); 
};
