import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useShellShockStore } from '../../store/shellShockStore';

const BET_TIERS = [0.01, 0.05, 0.1, 0.5];

const shortenWallet = (wallet: string | null) => {
  if (!wallet) {
    return 'Unknown';
  }

  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

export const MatchSetup = () => {
  const { connection } = useConnection();
  const walletAdapter = useWallet();
  const {
    wallet,
    betAmount,
    relayReady,
    relayError,
    relayConnectionState,
    relayProgramId,
    relayTurnTimeoutSeconds,
    isSearching,
    queueAheadCount,
    sameBetCount,
    pvpRole,
    opponentWallet,
    matchId,
    roomPubkey,
    roomPhase,
    roomUpdatedAt,
    lastSignature,
    isPendingAction,
    queueForPvp,
    cancelQueue,
    returnToMenu,
    subscribeToRoom,
    createRoom,
  } = useShellShockStore();

  const [selectedBet, setSelectedBet] = useState(betAmount || BET_TIERS[0]);

  useEffect(() => {
    if (roomPubkey) {
      subscribeToRoom();
    }
  }, [roomPubkey, subscribeToRoom]);

  const canQueue = Boolean(wallet) && relayReady && !isSearching && !matchId;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg-black z-50 p-4">
      <div className="crt-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl border-4 border-yellow-900 bg-black/90 p-6 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <h1 className="font-special-elite text-4xl text-neon-yellow neon-text">
            PLAYER VS PLAYER
          </h1>
          <p className="mt-3 font-special-elite text-lg text-text-cream opacity-80">
            Matchmaking relay for the Solana room flow. PvE mock remains available from the main
            menu.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="border border-gray-700 p-4">
              <h2 className="font-special-elite text-xl text-text-cream">Relay Status</h2>
              <p className="mt-2 font-special-elite text-sm text-text-cream">
                Connection: {relayConnectionState}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Ready: {relayReady ? 'yes' : 'no'}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Wallet: {wallet ? shortenWallet(wallet) : 'connect first'}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Timeout: {relayTurnTimeoutSeconds}s
              </p>
              <p className="mt-2 break-all font-special-elite text-xs text-gray-400">
                Program ID: {relayProgramId || 'not reported'}
              </p>
              {relayError && (
                <p className="mt-3 font-special-elite text-sm text-danger-red">{relayError}</p>
              )}
            </div>

            <div className="border border-gray-700 p-4">
              <h2 className="font-special-elite text-xl text-text-cream">Bet Tier</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {BET_TIERS.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedBet(tier)}
                    className={`border-2 px-4 py-3 font-special-elite text-lg transition-all ${
                      selectedBet === tier
                        ? 'border-neon-yellow bg-neon-yellow text-bg-black'
                        : 'border-gray-700 bg-black text-text-cream'
                    }`}
                  >
                    {tier} SOL
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-700 p-4">
              <h2 className="font-special-elite text-xl text-text-cream">Queue</h2>
              <p className="mt-2 font-special-elite text-sm text-text-cream">
                Players ahead: {queueAheadCount}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Same bet tier: {sameBetCount}
              </p>
              {isSearching && (
                <p className="mt-3 font-special-elite text-neon-yellow animate-pulse-slow">
                  Searching for an opponent...
                </p>
              )}
            </div>

            <div className="border border-gray-700 p-4">
              <h2 className="font-special-elite text-xl text-text-cream">Match State</h2>
              <p className="mt-2 font-special-elite text-sm text-text-cream">
                Role: {pvpRole || 'not assigned'}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Opponent: {shortenWallet(opponentWallet)}
              </p>
              <p className="break-all font-special-elite text-sm text-text-cream">
                Match ID: {matchId || 'waiting'}
              </p>
              <p className="break-all font-special-elite text-sm text-text-cream">
                Room: {roomPubkey || 'creator still needs to publish create_room'}
              </p>
              <p className="font-special-elite text-sm text-text-cream">
                Phase: {roomPhase || 'idle'}
              </p>
              {roomUpdatedAt && (
                <p className="font-special-elite text-xs text-gray-400">
                  Updated: {new Date(roomUpdatedAt).toLocaleString()}
                </p>
              )}
              {lastSignature && (
                <p className="mt-2 break-all font-special-elite text-xs text-gray-400">
                  Last signature: {lastSignature}
                </p>
              )}
              {pvpRole === 'creator' && matchId && !roomPubkey && (
                <div className="mt-4 space-y-3">
                  <p className="font-special-elite text-sm text-neon-yellow animate-pulse">
                    MATCH FOUND! As the creator, you must initialize the room on Solana.
                  </p>
                  <button
                    onClick={() => createRoom(connection, walletAdapter)}
                    disabled={isPendingAction}
                    className="w-full border-2 border-neon-yellow bg-neon-yellow py-3 font-special-elite text-lg text-bg-black transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isPendingAction ? 'INITIALIZING...' : 'CREATE SOLANA ROOM'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              void queueForPvp(selectedBet);
            }}
            disabled={!canQueue}
            className={`px-6 py-3 font-special-elite text-lg transition-all ${
              canQueue
                ? 'bg-neon-yellow text-bg-black hover:bg-yellow-300'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            ENTER QUEUE
          </button>

          <button
            onClick={cancelQueue}
            disabled={!isSearching}
            className={`px-6 py-3 font-special-elite text-lg transition-all ${
              isSearching
                ? 'bg-danger-red text-text-cream hover:bg-red-700'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            LEAVE QUEUE
          </button>

          <button
            onClick={returnToMenu}
            className="bg-gray-800 px-6 py-3 font-special-elite text-lg text-text-cream transition-all hover:bg-gray-700"
          >
            BACK
          </button>
        </div>
      </motion.div>
    </div>
  );
};
