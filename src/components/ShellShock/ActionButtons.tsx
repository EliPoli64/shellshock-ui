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
   } = useShellShockStore(); 
 
   const toggleItemMenu = () => { 
     soundManager.play('uiClick');
     setShowItemMenu(!showItemMenu); 
   }; 

   const handleShootDealer = () => {
     soundManager.play('uiClick');
     shootDealer();
   };

   const handleShootSelf = () => {
     soundManager.play('uiClick');
     shootSelf();
   };

   const handleFold = () => {
     soundManager.play('uiClick');
     fold();
   };
 
   const isVisible = isPlayerTurn && !isAnimating && !isRevealingShells && !showItemMenu; 
   const isDisabled = !isPlayerTurn || isAnimating || isRevealingShells || showItemMenu; 
 
   return ( 
     <div className="flex flex-col items-center gap-[2vh] mb-[4vh] min-h-[15vh] justify-end"> 
       <AnimatePresence mode="wait"> 
         {showItemMenu ? (
           <ItemMenu key="item-menu" />
         ) : (
           isVisible && ( 
             <motion.div 
               key="action-buttons"
               initial={{ opacity: 0, y: 100, scale: 0.8 }} 
               animate={{ opacity: 1, y: 0, scale: 1 }} 
               exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }} 
               transition={{ 
                 type: "spring", 
                 damping: 40, 
                 stiffness: 800, 
               }} 
               className="flex gap-[2vw] flex-wrap justify-center" 
             > 
               <motion.button 
                 whileHover={{ scale: 1.05, y: -5 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={handleShootDealer} 
                 className="font-special-elite shadow-lg transition-all border-[0.4vh]" 
                 style={{ 
                   padding: '2vh 3vh', 
                   fontSize: '2.5vh', 
                   backgroundColor: 'linear-gradient(to bottom, #b91c1c, #7f1d1d)', 
                   borderColor: '#dc2626', 
                   color: '#e8e0d4', 
                   cursor: 'pointer' 
                 }} 
               > 
                 🔫 SHOOT DEALER 
               </motion.button> 
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -5 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={handleShootSelf} 
                 className="font-special-elite shadow-lg transition-all border-[0.4vh]" 
                 style={{ 
                   padding: '2vh 3vh', 
                   fontSize: '2.5vh', 
                   backgroundColor: 'linear-gradient(to bottom, #a16207, #78350f)', 
                   borderColor: '#ca8a04', 
                   color: '#e8e0d4', 
                   cursor: 'pointer' 
                 }} 
               > 
                 🎯 SHOOT YOURSELF 
               </motion.button> 
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -5 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={toggleItemMenu} 
                 className="font-special-elite shadow-lg transition-all border-[0.4vh]" 
                 style={{ 
                   padding: '2vh 3vh', 
                   fontSize: '2.5vh', 
                   backgroundColor: 'linear-gradient(to bottom, #1d4ed8, #1e3a8a)', 
                   borderColor: '#2563eb', 
                   color: '#e8e0d4', 
                   cursor: 'pointer' 
                 }} 
               > 
                 🎒 USE ITEM 
               </motion.button> 
   
               <motion.button 
                 whileHover={{ scale: 1.05, y: -5 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={handleFold} 
                 className="font-special-elite shadow-lg transition-all border-[0.4vh]" 
                 style={{ 
                   padding: '2vh 3vh', 
                   fontSize: '2.5vh', 
                   backgroundColor: 'linear-gradient(to bottom, #4b5563, #1f2937)', 
                   borderColor: '#6b7280', 
                   color: '#e8e0d4', 
                   cursor: 'pointer' 
                 }} 
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
