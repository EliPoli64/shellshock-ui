import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletStore, RPC_PROVIDERS } from '../store/walletStore';
import { motion, AnimatePresence } from 'framer-motion';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletButton = () => {
  const { rpcUrl, setRpcUrl } = useWalletStore();
  const { publicKey, wallet, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const currentProviderName = RPC_PROVIDERS.find(p => p.url === rpcUrl)?.name || 'Custom RPC';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="font-special-elite flex flex-col items-end border-2 border-yellow-900 bg-black/80 px-4 py-2 transition-all hover:bg-black/90 hover:border-neon-yellow group"
      >
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-neon-yellow opacity-70 uppercase tracking-tighter">
              {currentProviderName}
            </p>
            <p className="text-sm text-text-cream font-bold">
              {connected && publicKey ? shortenAddress(publicKey.toBase58()) : 'CONNECT WALLET'}
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-danger-red'}`} />
        </div>
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 bg-bg-black border-2 border-yellow-900 p-4 shadow-2xl z-[100]"
          >
            {/* Wallet Actions */}
            <div className="mb-6">
              <h3 className="font-special-elite text-neon-yellow mb-3 text-xs tracking-widest">WALLET</h3>
              {!connected ? (
                <button
                  onClick={() => {
                    setVisible(true);
                    setShowMenu(false);
                  }}
                  className="w-full bg-neon-yellow/10 border border-neon-yellow text-neon-yellow p-3 font-special-elite text-sm hover:bg-neon-yellow hover:text-bg-black transition-all"
                >
                  SELECT WALLET
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-white/5 p-3 flex items-center gap-3 border border-white/10">
                    {wallet?.adapter.icon && (
                      <img src={wallet.adapter.icon} alt="wallet" className="w-5 h-5" />
                    )}
                    <span className="font-special-elite text-xs text-text-cream">
                      {shortenAddress(publicKey?.toBase58() || '')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      disconnect();
                      setShowMenu(false);
                    }}
                    className="w-full bg-danger-red/10 border border-danger-red text-danger-red p-2 font-special-elite text-xs hover:bg-danger-red hover:text-white transition-all"
                  >
                    DISCONNECT
                  </button>
                </div>
              )}
            </div>

            {/* RPC Provider Actions */}
            <div>
              <h3 className="font-special-elite text-neon-yellow mb-3 text-xs tracking-widest">RPC PROVIDER</h3>
              <div className="flex flex-col gap-1">
                {RPC_PROVIDERS.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => {
                      setRpcUrl(provider.url);
                    }}
                    className={`text-left p-2 text-[11px] font-special-elite transition-all border ${
                      rpcUrl === provider.url
                        ? 'border-neon-yellow bg-neon-yellow/20 text-neon-yellow'
                        : 'border-transparent text-text-cream/60 hover:text-text-cream hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{provider.name}</span>
                      {rpcUrl === provider.url && <span className="text-[8px]">ACTIVE</span>}
                    </div>
                  </button>
                ))}

                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[10px] text-gray-500 font-special-elite mb-1">CUSTOM RPC URL</p>
                  <input
                    type="text"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    className="w-full bg-black border border-gray-700 p-2 text-[10px] text-text-cream font-mono focus:border-neon-yellow outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-[9px] text-danger-red font-special-elite opacity-40 leading-tight text-center uppercase">
              Changing provider reloads connection
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
