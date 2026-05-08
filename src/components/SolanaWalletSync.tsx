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

  useEffect(() => {
    void refreshRelayStatus();
  }, [refreshRelayStatus]);

  useEffect(() => {
    let cancelled = false;

    const syncWallet = async () => {
      if (!publicKey) {
        connectWallet(null, 0);
        return;
      }

      const lamports = await connection.getBalance(publicKey);
      if (!cancelled) {
        connectWallet(publicKey.toBase58(), lamports / 1_000_000_000);
        void refreshRelayStatus();
      }
    };

    void syncWallet();

    return () => {
      cancelled = true;
    };
  }, [connectWallet, connection, publicKey, refreshRelayStatus]);

  useEffect(() => {
    if (publicKey && relayConnectionState === 'connected') {
      void resumeRelaySession();
    }
  }, [publicKey, relayConnectionState, resumeRelaySession]);

  return null;
};
