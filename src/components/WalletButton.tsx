import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletButton: React.FC = () => {
  return (
    <WalletModalProvider>
      <WalletMultiButton className="!bg-black/50 hover:!bg-black/70 !rounded-xl !px-6 !py-3 !font-bold" />
    </WalletModalProvider>
  );
};
