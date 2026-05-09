import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const RPC_PROVIDERS = [
  { name: 'Solana Official', url: clusterApiUrl('devnet') },
  { name: 'Helius', url: 'https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY' },
  { name: 'Alchemy', url: 'https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY' },
  { name: 'QuickNode', url: 'https://devnet.quiknode.pro/YOUR_API_KEY' },
];

interface WalletState {
  wallet: PublicKey | null;
  solBalance: number;
  pendingTx: boolean;
  rpcUrl: string;
  setWallet: (wallet: PublicKey | null) => void;
  setSolBalance: (balance: number) => void;
  setPendingTx: (pending: boolean) => void;
  setRpcUrl: (url: string) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      wallet: null,
      solBalance: 0,
      pendingTx: false,
      rpcUrl: import.meta.env.VITE_SOLANA_RPC_HTTP_URL || clusterApiUrl('devnet'),
      setWallet: (wallet) => set({ wallet }),
      setSolBalance: (solBalance) => set({ solBalance }),
      setPendingTx: (pendingTx) => set({ pendingTx }),
      setRpcUrl: (rpcUrl) => set({ rpcUrl }),
    }),
    {
      name: 'shell-shock-wallet-storage',
      partialize: (state) => ({ rpcUrl: state.rpcUrl }),
    }
  )
);
