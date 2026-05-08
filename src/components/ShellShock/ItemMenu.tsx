import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';

export const ItemMenu = () => {
  const { items, useItem, isAnimating } = useShellShockStore();
  
  const itemList = [
    { key: 'magnifyingGlass', name: 'PEEK AT SHELL', icon: '🔍', count: items.magnifyingGlass },
    { key: 'beer', name: 'RACK THE SHELL', icon: '🍺', count: items.beer },
    { key: 'handcuffs', name: 'SKIP THEIR TURN', icon: '🔗', count: items.handcuffs },
    { key: 'cigarettes', name: 'STEADY YOUR NERVES', icon: '🚬', count: items.cigarettes },
    { key: 'pill', name: 'LUCKY PILL', icon: '💊', count: items.pill },
    { key: 'saw', name: 'SAW THE BARREL', icon: '🪚', count: items.saw },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 sm:gap-3 flex-wrap justify-center"
    >
      {itemList.map((item) => (
        <motion.button
          key={item.key}
          whileHover={item.count > 0 && !isAnimating ? { scale: 1.05 } : {}}
          whileTap={item.count > 0 && !isAnimating ? { scale: 0.95 } : {}}
          onClick={() => useItem(item.key)}
          disabled={item.count <= 0 || isAnimating}
          className="font-special-elite shadow-lg transition-all border-2"
          style={{ 
            padding: '1.2vh 1.8vh',
            fontSize: '2vh',
            backgroundColor: item.count > 0 ? 'linear-gradient(to bottom, #7c3aed, #581c87)' : '#1f2937',
            borderColor: item.count > 0 ? '#9333ea' : '#374151',
            color: item.count > 0 ? '#e8e0d4' : '#6b7280',
            cursor: item.count > 0 && !isAnimating ? 'pointer' : 'not-allowed'
          }}
        >
          {item.icon} {item.name} ({item.count})
        </motion.button>
      ))}
    </motion.div>
  );
};
