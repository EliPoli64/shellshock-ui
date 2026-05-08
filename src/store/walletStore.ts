import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

interface WalletState {
  wallet: PublicKey | null;
  solBalance: number;
  pendingTx: boolean;
  setWallet: (wallet: PublicKey | null) => void;
  setSolBalance: (balance: number) => void;
  setPendingTx: (pending: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  solBalance: 0,
  pendingTx: false,
  setWallet: (wallet) => set({ wallet }),
  setSolBalance: (solBalance) => set({ solBalance }),
  setPendingTx: (pendingTx) => set({ pendingTx }),
}));
