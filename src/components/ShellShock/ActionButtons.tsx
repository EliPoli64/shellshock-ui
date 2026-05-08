import React from 'react'; 
 import { motion, AnimatePresence } from 'framer-motion'; 
 import { useShellShockStore } from '../../store/shellShockStore'; 
 import { ItemMenu } from './ItemMenu'; 
 import { soundManager } from '../../utils/soundEffects';
 
 export const ActionButtons: React.FC = () => { 
   const { 
     isPlayerTurn, 
     shootDealer, 
     shootSelf, 
     fold, 
     showItemMenu, 
     setShowItemMenu, 
     isAnimating, 
     isRevealingShells, 
     gameMode,
     wallet,
     turnWallet,
     players
   } = useShellShockStore(); 

   const isPvP = gameMode === 'pvp';
   const myTurn = isPvP ? turnWallet === wallet : isPlayerTurn;
   const otherPlayers = isPvP ? players.filter(p => p.wallet !== wallet) : [];
 
   const toggleItemMenu = () => { 
     soundManager.play('uiClick');
     setShowItemMenu(!showItemMenu); 
   }; 

   const handleShootDealer = (targetWallet?: string) => {
     soundManager.play('uiClick');
     if (isPvP) {
       // In PvP, we need to know who we are shooting
       // For now, if there's only one opponent, shoot them. 
       // If multiple, this would need a target selector.
       const target = targetWallet || otherPlayers[0]?.wallet;
       if (target) {
         // This would be a relay message in a real implementation
         console.log(`Shooting player: ${target}`);
       }
     } else {
       shootDealer();
     }
   };

   const handleShootSelf = () => {
     soundManager.play('uiClick');
     shootSelf();
   };

   const handleFold = () => {
     soundManager.play('uiClick');
     fold();
   };
 
   const isVisible = myTurn && !isAnimating && !isRevealingShells && !showItemMenu; 
 
   return ( 
     <div className="flex flex-col items-center gap-[2vh] mb-[2vh] min-h-[12vh] justify-end"> 
       <AnimatePresence mode="wait"> 
         {showItemMenu ? (
           <ItemMenu key="item-menu" />
         ) : (
           isVisible && ( 
             <motion.div 
               key="action-buttons"
               initial={{ opacity: 0, y: 50, scale: 0.9 }} 
               animate={{ opacity: 1, y: 0, scale: 1 }} 
               exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }} 
               className="flex gap-[1.5vw] flex-wrap justify-center" 
             > 
               {isPvP ? (
                 otherPlayers.map(p => (
                   <motion.button 
                     key={p.wallet}
                     whileHover={{ scale: 1.05, y: -2 }} 
                     whileTap={{ scale: 0.95 }} 
                     onClick={() => handleShootDealer(p.wallet)} 
                     className="font-special-elite shadow-lg transition-all border-[0.3vh] bg-gradient-to-b from-danger-red to-red-900 border-red-700 text-text-cream px-[2vh] py-[1.5vh] text-[1.8vh] cursor-pointer"
                   > 
                     🔫 SHOOT {p.wallet.slice(0, 4)} 
                   </motion.button> 
                 ))
               ) : (
                 <motion.button 
                   whileHover={{ scale: 1.05, y: -2 }} 
                   whileTap={{ scale: 0.95 }} 
                   onClick={() => handleShootDealer()} 
                   className="font-special-elite shadow-lg transition-all border-[0.3vh] bg-gradient-to-b from-danger-red to-red-900 border-red-700 text-text-cream px-[3vh] py-[2vh] text-[2.2vh] cursor-pointer"
                 > 
                   🔫 SHOOT DEALER 
                 </motion.button> 
               )}
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -2 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={handleShootSelf} 
                 className="font-special-elite shadow-lg transition-all border-[0.3vh] bg-gradient-to-b from-amber-700 to-amber-900 border-amber-600 text-text-cream px-[3vh] py-[2vh] text-[2.2vh] cursor-pointer"
               > 
                 🎯 SHOOT YOURSELF 
               </motion.button> 
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -2 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={toggleItemMenu} 
                 className="font-special-elite shadow-lg transition-all border-[0.3vh] bg-gradient-to-b from-blue-700 to-blue-900 border-blue-600 text-text-cream px-[3vh] py-[2vh] text-[2.2vh] cursor-pointer"
               > 
                 🎒 USE ITEM 
               </motion.button> 
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -2 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={handleFold} 
                 className="font-special-elite shadow-lg transition-all border-[0.3vh] bg-gradient-to-b from-gray-700 to-gray-900 border-gray-600 text-text-cream px-[3vh] py-[2vh] text-[2.2vh] cursor-pointer"
               > 
                 🏳️ FOLD 
               </motion.button> 
             </motion.div> 
           )
         )} 
       </AnimatePresence> 
     </div> 
   ); 
 }; 
