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
     players,
     isPendingAction
   } = useShellShockStore(); 

   const isPvP = gameMode === 'pvp';
   const myTurn = isPvP ? turnWallet === wallet : isPlayerTurn;
   const otherPlayers = isPvP ? players.filter(p => p.wallet !== wallet) : [];
 
   const toggleItemMenu = () => { 
     if (isPendingAction) return;
     soundManager.play('uiClick');
     setShowItemMenu(!showItemMenu); 
   }; 

   const handleShootDealer = (targetWallet?: string) => {
     if (isPendingAction) return;
     soundManager.play('uiClick');
     // In current implementation, shootDealer() in store handles the backend call
     shootDealer();
   };

   const handleShootSelf = () => {
     if (isPendingAction) return;
     soundManager.play('uiClick');
     shootSelf();
   };

   const handleFold = () => {
     if (isPendingAction) return;
     soundManager.play('uiClick');
     fold();
   };
 
   const isVisible = myTurn && !isAnimating && !isRevealingShells && !showItemMenu; 
 
   return ( 
     <div className="flex flex-col items-center gap-[2vh] mb-[2vh] min-h-[12vh] justify-end"> 
       <AnimatePresence mode="wait"> 
         {isPendingAction ? (
           <motion.div
             key="pending-action"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 1.2 }}
             className="flex flex-col items-center gap-[1vh]"
           >
             <div className="w-[4vh] h-[4vh] border-[0.5vh] border-neon-yellow border-t-transparent rounded-full animate-spin" />
             <span className="font-special-elite text-neon-yellow text-[2vh] animate-pulse">PROCESSING ACTION...</span>
           </motion.div>
         ) : showItemMenu ? (
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
