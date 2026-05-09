import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useShellShockStore } from '../../store/shellShockStore';
import { backendClient } from '../../lib/backendClient';
import type { MatchHistoryEntry } from '../../types/backend';

interface MatchHistoryProps {
  onClose: () => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onClose }) => {
  const { wallet } = useShellShockStore();
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      void backendClient.getMatchHistory(wallet).then((data) => {
        setHistory(data);
        setLoading(false);
      });
    }
  }, [wallet]);

  const formatSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(2);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-[4vh]">
        <h2 className="font-special-elite text-[4vh] text-neon-yellow neon-text">MATCH HISTORY</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-white text-[3vh] transition-colors"
        >✕</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-[2vh]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center font-special-elite text-gray-500 mt-[10vh]">
            No battles recorded yet...
          </div>
        ) : (
          <div className="space-y-[2vh]">
            {history.map((match) => {
              const isWinner = match.winner_wallet === wallet;
              return (
                <div 
                  key={match.match_id}
                  className={`p-[2vh] rounded-[1vh] border ${
                    isWinner ? 'border-green-900/50 bg-green-900/10' : 'border-red-900/50 bg-red-900/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-[1vh]">
                    <div className="font-special-elite text-[2vh] text-text-cream">
                      {isWinner ? '🏆 VICTORY' : '💀 DEFEAT'}
                    </div>
                    <div className="font-special-elite text-[1.4vh] text-gray-500 uppercase">
                      {new Date(match.ended_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-[2vh] font-special-elite text-[1.6vh]">
                    <div>
                      <div className="text-gray-500 uppercase text-[1.2vh]">Opponent</div>
                      <div className="text-text-cream truncate">
                        {match.opponent_wallet.slice(0, 6)}...{match.opponent_wallet.slice(-4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 uppercase text-[1.2vh]">Stake</div>
                      <div className={`${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {isWinner ? '+' : '-'}{formatSol(match.bet_lamports)} SOL
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClose}
        className="w-full mt-[4vh] py-[2vh] bg-gray-800/40 border border-gray-700 text-gray-400 font-special-elite text-[2vh] rounded-[1vh] hover:bg-gray-700/40 transition-all"
      >
        BACK TO MENU
      </motion.button>
    </div>
  );
};
