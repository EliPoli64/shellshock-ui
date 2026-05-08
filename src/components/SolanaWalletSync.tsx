import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { useShellShockStore } from '../store/shellShockStore';

export const SolanaWalletSync = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const connectWallet = useShellShockStore((state) => state.connectWallet);
  const refreshRelayStatus = useShellShockStore((state) => state.refreshRelayStatus);
  const relayConnectionState = useShellShockStore((state) => state.relayConnectionState);
  const resumeRelaySession = useShellShockStore((state) => state.resumeRelaySession);
  const currentWallet = useShellShockStore((state) => state.wallet);
  const currentBalance = useShellShockStore((state) => state.solBalance);

  const walletAddress = publicKey?.toBase58() || null;

  useEffect(() => {
    let cancelled = false;

    const syncWallet = async () => {
      if (!walletAddress) {
        if (currentWallet !== null) {
          connectWallet(null, 0);
        }
        return;
      }

      try {
        const lamports = await connection.getBalance(publicKey!);
        const sol = lamports / 1_000_000_000;

        if (!cancelled) {
          if (currentWallet !== walletAddress || Math.abs(currentBalance - sol) > 0.000001) {
            connectWallet(walletAddress, sol);
            void refreshRelayStatus();
          }
        }
      } catch (err) {
        console.error('Failed to sync wallet balance:', err);
      }
    };

    void syncWallet();

    return () => {
      cancelled = true;
    };
  }, [
    connection,
    walletAddress,
    connectWallet,
    refreshRelayStatus,
    currentWallet,
    currentBalance,
    publicKey,
  ]);

  useEffect(() => {
    if (walletAddress && relayConnectionState === 'connected') {
      void resumeRelaySession();
    }
  }, [walletAddress, relayConnectionState, resumeRelaySession]);

  return null;
};
