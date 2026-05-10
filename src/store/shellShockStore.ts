import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Buffer } from 'buffer';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SendTransactionError
} from '@solana/web3.js';
import { soundManager } from '../utils/soundEffects';
import { relayClient } from '../lib/relayClient';
import { backendClient } from '../lib/backendClient';
import type { RelayRoomPhase, RelayServerMessage } from '../types/relay';
import type { ItemType } from '../types/backend';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GameMode = 'pve' | 'pvp' | null;
type GameStatus = 'menu' | 'setup' | 'playing' | 'shot_animation' | 'round_end' | 'gameover';
type TransportMode = 'pve_mock' | 'pvp_relay' | null;
type RelayConnectionState = 'idle' | 'connecting' | 'connected' | 'closed';

interface Items {
  magnifyingGlass: number;
  beer: number;
  handcuffs: number;
  cigarettes: number;
  saw: number;
  pill: number;
}

interface ShellShockState {
  wallet: string | null;
  solBalance: number;

  gameMode: GameMode;
  transportMode: TransportMode;
  betAmount: number;
  isSearching: boolean;

  gameStatus: GameStatus;
  playerHealth: number;
  dealerHealth: number;
  maxHealth: number;        // max HP for this round (3 or 4 or 5)
  shellsRemaining: number;
  liveShells: number;
  blankShells: number;
  chamber: ('live' | 'blank')[]; // full ordered chamber (client-authoritative in PvE)
  currentShell: 'live' | 'blank' | 'unknown'; // result of magnifying glass peek
  isPlayerTurn: boolean;
  turnTimer: number;
  isSawActive: boolean;     // next shot deals 2 damage
  dealerHandcuffSkipped: boolean; // dealer's next turn is skipped (handcuffs on dealer)

  items: Items;
  dealerItems: Items;
  dealerHandcuffed: boolean;   // dealer loses their next turn
  playerHandcuffed: boolean;   // player loses their next turn

  roundsWon: number;
  roundsLost: number;
  totalWon: number;
  totalLost: number;

  isAnimating: boolean;
  isRevealingShells: boolean;
  showItemMenu: boolean;
  showLifiWidget: boolean;
  lastShotResult: 'live' | 'blank' | null;
  lastShotTarget: 'player' | 'dealer' | null;
  dealerActionText: string | null;

  // PvP / relay state
  relayHttpUrl: string;
  relayWsUrl: string;
  relayReady: boolean;
  relayConnectionState: RelayConnectionState;
  relayError: string | null;
  relayProgramId: string | null;
  relayTurnTimeoutSeconds: number;
  queueAheadCount: number;
  sameBetCount: number;
  ticketId: string | null;
  matchId: string | null;
  pvpRole: 'creator' | 'joiner' | null;
  opponentWallet: string | null;
  roomPubkey: string | null;
  roomPhase: RelayRoomPhase | null;
  turnWallet: string | null;
  roomUpdatedAt: string | null;
  lastSignature: string | null;
  isPendingAction: boolean;

  players: {
    wallet: string;
    health: number;
    items: Items;
    handcuffed: boolean;
  }[];

  // Actions
  connectWallet: (wallet: string | null, solBalance?: number) => void;
  refreshRelayStatus: () => Promise<void>;
  openPvpSetup: () => Promise<void>;
  queueForPvp: (bet: number) => Promise<void>;
  cancelQueue: () => void;
  subscribeToRoom: () => void;
  resumeRelaySession: () => Promise<void>;
  handleRelayMessage: (message: RelayServerMessage) => void;
  handleRelayOpen: () => void;
  handleRelayClose: () => void;
  handleRelayError: (message: string) => void;
  returnToMenu: () => void;
  startGame: (mode: 'pve' | 'pvp', bet: number) => Promise<void>;
  shootDealer: () => Promise<void>;
  shootSelf: () => Promise<void>;
  useItem: (item: string) => Promise<void>;
  fold: () => void;
  playAgain: () => void;
  leaveTable: () => void;
  setShowItemMenu: (show: boolean) => void;
  resetTurn: () => void;
  dealerTurn: () => Promise<void>;
  reloadShotgun: () => void;
  decrementTimer: () => void;
  resetPeek: () => void;
  createRoom: (connection: Connection, wallet: any) => Promise<void>;
  executeDealerAction: (action: any) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_RELAY_HTTP_URL = import.meta.env.VITE_RELAY_HTTP_URL || 'http://localhost:8080';
const DEFAULT_RELAY_WS_URL =
  import.meta.env.VITE_RELAY_WS_URL ||
  `${DEFAULT_RELAY_HTTP_URL.replace(
    /^http/,
    DEFAULT_RELAY_HTTP_URL.startsWith('https') ? 'wss' : 'ws'
  )}/ws`;

const lamportsFromSol = (amount: number) => Math.round(amount * 1_000_000_000);

const mapPhaseToGameStatus = (phase: RelayRoomPhase): GameStatus => {
  switch (phase) {
    case 'playing': return 'playing';
    case 'round_end':
    case 'finished': return 'round_end';
    default: return 'setup';
  }
};

const isRelayMode = (transportMode: TransportMode) => transportMode === 'pvp_relay';

// ---------------------------------------------------------------------------
// Buckshot Roulette helpers
// ---------------------------------------------------------------------------

/** Shuffle an array in-place (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a new chamber following Buckshot Roulette rules:
 * - Total shells: 2–8 (biased toward 4–6 for pacing)
 * - At least 1 live and 1 blank
 */
function generateChamber(): { chamber: ('live' | 'blank')[]; liveShells: number; blankShells: number } {
  const total = Math.floor(Math.random() * 5) + 2; // 2–6
  // At least 1 live and 1 blank; distribute rest randomly
  const live = Math.max(1, Math.min(total - 1, Math.floor(Math.random() * total)));
  const blank = total - live;
  const shells: ('live' | 'blank')[] = [
    ...Array(live).fill('live'),
    ...Array(blank).fill('blank'),
  ];
  shuffle(shells);
  return { chamber: shells, liveShells: live, blankShells: blank };
}

/**
 * Generate a random item pool for a player at the start of a round,
 * following Buckshot Roulette's progression (later rounds give more items).
 */
function generateItems(round: number): Items {
  const pool: (keyof Items)[] = [
    'magnifyingGlass', 'beer', 'handcuffs', 'cigarettes', 'saw', 'pill'
  ];
  const count = Math.min(8, 2 + round); // 3–8 items
  const items: Items = {
    magnifyingGlass: 0, beer: 0, handcuffs: 0,
    cigarettes: 0, saw: 0, pill: 0,
  };
  for (let i = 0; i < count; i++) {
    const key = pool[Math.floor(Math.random() * pool.length)];
    items[key] = Math.min(items[key] + 1, 4); // max 4 of any item
  }
  return items;
}

// ---------------------------------------------------------------------------
// Dealer AI (Buckshot Roulette-accurate strategy)
// ---------------------------------------------------------------------------

type DealerAction =
  | { type: 'UseItem'; item: keyof Items; result?: string; ejected_shell?: 'live' | 'blank' }
  | { type: 'ShootSelf'; is_live: boolean; damage: number }
  | { type: 'ShootPlayer'; is_live: boolean; damage: number };

/**
 * Decide what the dealer does this turn, using Buckshot Roulette strategy:
 *
 * Priority order:
 *  1. Saw if a live shell is certain (liveShells === shellsRemaining) — maximise damage
 *  2. Handcuffs if not handcuffed and player has >1 HP (skip player's next turn)
 *  3. MagnifyingGlass if unknown and ≥2 shells remain
 *  4. Cigarettes / Pill if health low (≤1)
 *  5. Beer to eject if only blanks remain (free extra turn) or shell count is high
 *  6. Shoot Self if current shell is blank (free extra turn in Buckshot rules!)
 *  7. Shoot Player if current shell is live (or unknown)
 */
function decideDealerAction(
  chamber: ('live' | 'blank')[],
  dealerHealth: number,
  playerHealth: number,
  dealerItems: Items,
  isSawActive: boolean,
  knownShell: 'live' | 'blank' | 'unknown'
): DealerAction {
  const shellsRemaining = chamber.length;
  const liveCount = chamber.filter(s => s === 'live').length;
  const blankCount = chamber.filter(s => s === 'blank').length;
  const nextShell = chamber[0]; // dealer can see the chamber in this impl
  // In PvE the dealer "knows" the chamber (like the original game).
  // We reveal it as a known shell so strategy is accurate.

  // 1. Saw when certain the next shot is live — double damage
  if (
    !isSawActive &&
    dealerItems.saw > 0 &&
    nextShell === 'live' &&
    playerHealth > 0
  ) {
    return { type: 'UseItem', item: 'saw' };
  }

  // 2. Handcuffs: use to skip player turn when advantageous
  if (
    dealerItems.handcuffs > 0 &&
    playerHealth > 1 &&
    nextShell === 'live' // about to shoot player, lock them down
  ) {
    return { type: 'UseItem', item: 'handcuffs' };
  }

  // 3. Heal if very low health (cigarettes restore 1, pill is random ±2/1)
  if (dealerHealth <= 1) {
    if (dealerItems.cigarettes > 0) {
      return { type: 'UseItem', item: 'cigarettes' };
    }
    if (dealerItems.pill > 0) {
      return { type: 'UseItem', item: 'pill' };
    }
  }

  // 4. Beer to eject when all remaining shells are blank (free turn chaining)
  //    OR if shell is unknown and there are many blanks
  if (dealerItems.beer > 0 && blankCount > 0 && liveCount === 0) {
    return { type: 'UseItem', item: 'beer' };
  }

  // 5. MagnifyingGlass when shell is truly unknown and multiple shells remain
  if (dealerItems.magnifyingGlass > 0 && shellsRemaining >= 2 && knownShell === 'unknown') {
    return { type: 'UseItem', item: 'magnifyingGlass' };
  }

  // 6. Shoot Self if next shell is blank — blank self-shots give dealer an extra turn
  if (nextShell === 'blank') {
    return { type: 'ShootSelf', is_live: false, damage: 0 };
  }

  // 7. Shoot Player (next shell is live or unknown)
  return {
    type: 'ShootPlayer',
    is_live: nextShell === 'live',
    damage: isSawActive ? 2 : 1,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useShellShockStore = create<ShellShockState>()(
  persist(
    (set, get) => {

      // -----------------------------------------------------------------------
      // Internal relay connect helper
      // -----------------------------------------------------------------------
      const connectRelay = async () => {
        if (relayClient.isOpen()) return;
        set({ relayConnectionState: 'connecting', relayError: null });
        await relayClient.connect(get().relayWsUrl, {
          onOpen: get().handleRelayOpen,
          onClose: get().handleRelayClose,
          onError: get().handleRelayError,
          onMessage: get().handleRelayMessage,
        });
      };

      // -----------------------------------------------------------------------
      // PvE: fire the next shell from the local chamber
      // -----------------------------------------------------------------------
      const pveFireShell = (
        target: 'player' | 'dealer'
      ): { shell: 'live' | 'blank'; newChamber: ('live' | 'blank')[] } => {
        const { chamber } = get();
        if (chamber.length === 0) throw new Error('Empty chamber');
        const [shell, ...rest] = chamber;
        return { shell, newChamber: rest };
      };

      // -----------------------------------------------------------------------
      // PvE: check if round is over (health ≤ 0)
      // -----------------------------------------------------------------------
      const pveCheckRoundEnd = (
        playerHealth: number,
        dealerHealth: number,
        betAmount: number,
        roundsWon: number,
        roundsLost: number,
        totalWon: number,
        totalLost: number
      ): Partial<ShellShockState> | null => {
        if (playerHealth <= 0) {
          return {
            gameStatus: 'gameover',
            roundsLost: roundsLost + 1,
            totalLost: totalLost + betAmount,
          };
        }
        if (dealerHealth <= 0) {
          return {
            gameStatus: 'round_end',
            roundsWon: roundsWon + 1,
            totalWon: totalWon + betAmount,
          };
        }
        return null;
      };

      // -----------------------------------------------------------------------
      // PvE: reload shotgun when chamber is empty (start new sub-round)
      // -----------------------------------------------------------------------
      const pveReloadIfEmpty = () => {
        const state = get();
        if (state.chamber.length === 0 && state.gameStatus === 'playing') {
          const { chamber, liveShells, blankShells } = generateChamber();
          set({
            chamber,
            liveShells,
            blankShells,
            shellsRemaining: chamber.length,
            currentShell: 'unknown',
            isSawActive: false,
            isRevealingShells: true,
          });
          window.setTimeout(() => set({ isRevealingShells: false }), 2500);
        }
      };

      return {
        // -----------------------------------------------------------------------
        // Initial state
        // -----------------------------------------------------------------------
        wallet: null,
        solBalance: 0,

        gameMode: null,
        transportMode: null,
        betAmount: 0,
        isSearching: false,

        gameStatus: 'menu',
        playerHealth: 3,
        dealerHealth: 3,
        maxHealth: 3,
        shellsRemaining: 0,
        liveShells: 0,
        blankShells: 0,
        chamber: [],
        currentShell: 'unknown',
        isPlayerTurn: true,
        turnTimer: 30,
        isSawActive: false,
        dealerHandcuffSkipped: false,

        items: { magnifyingGlass: 0, beer: 0, handcuffs: 0, cigarettes: 0, saw: 0, pill: 0 },
        dealerItems: { magnifyingGlass: 0, beer: 0, handcuffs: 0, cigarettes: 0, saw: 0, pill: 0 },
        dealerHandcuffed: false,
        playerHandcuffed: false,

        roundsWon: 0,
        roundsLost: 0,
        totalWon: 0,
        totalLost: 0,

        isAnimating: false,
        isRevealingShells: false,
        showItemMenu: false,
        showLifiWidget: false,
        lastShotResult: null,
        lastShotTarget: null,
        dealerActionText: null,

        relayHttpUrl: DEFAULT_RELAY_HTTP_URL,
        relayWsUrl: DEFAULT_RELAY_WS_URL,
        relayReady: false,
        relayConnectionState: 'idle',
        relayError: null,
        relayProgramId: null,
        relayTurnTimeoutSeconds: 90,
        queueAheadCount: 0,
        sameBetCount: 0,
        ticketId: null,
        matchId: null,
        pvpRole: null,
        opponentWallet: null,
        roomPubkey: null,
        roomPhase: null,
        turnWallet: null,
        roomUpdatedAt: null,
        lastSignature: null,
        isPendingAction: false,

        players: [],

        // -----------------------------------------------------------------------
        // Wallet
        // -----------------------------------------------------------------------
        connectWallet: (wallet, solBalance = 0) => set({ wallet, solBalance }),

        // -----------------------------------------------------------------------
        // Relay / PvP helpers (unchanged from original)
        // -----------------------------------------------------------------------
        refreshRelayStatus: async () => {
          try {
            const [readyResponse, configResponse] = await Promise.all([
              fetch(`${get().relayHttpUrl}/readyz`),
              fetch(`${get().relayHttpUrl}/config`),
            ]);
            const readyPayload = (await readyResponse.json()) as { status?: string };
            const configPayload = (await configResponse.json()) as {
              program_id?: string;
              turn_timeout_seconds?: number;
              websocket_path?: string;
            };
            const relayReady = readyResponse.ok && readyPayload.status === 'ok';
            const websocketPath = configPayload.websocket_path || '/ws';
            const relayWsUrl =
              import.meta.env.VITE_RELAY_WS_URL ||
              `${get().relayHttpUrl.replace(
                /^http/,
                get().relayHttpUrl.startsWith('https') ? 'wss' : 'ws'
              )}${websocketPath}`;
            set({
              relayReady,
              relayWsUrl,
              relayProgramId: configPayload.program_id || null,
              relayTurnTimeoutSeconds: configPayload.turn_timeout_seconds || 90,
              relayError: relayReady ? null : 'Relay is not ready yet.',
            });
          } catch {
            set({ relayReady: false, relayError: 'Could not reach relay HTTP endpoints.' });
          }
        },

        openPvpSetup: async () => {
          set({ gameMode: 'pvp', transportMode: 'pvp_relay', gameStatus: 'setup', relayError: null });
          await get().refreshRelayStatus();
        },

        queueForPvp: async (bet) => {
          const { wallet } = get();
          if (!wallet) { set({ relayError: 'Connect a wallet before entering PvP queue.' }); return; }
          await get().refreshRelayStatus();
          if (!get().relayReady) return;
          try {
            await connectRelay();
            relayClient.send({ type: 'queue.join', wallet, bet_lamports: lamportsFromSol(bet) });
            set({
              gameMode: 'pvp', transportMode: 'pvp_relay', gameStatus: 'setup',
              betAmount: bet, isSearching: true, relayError: null,
              queueAheadCount: 0, sameBetCount: 0, ticketId: null, matchId: null,
              pvpRole: null, opponentWallet: null, roomPubkey: null, roomPhase: null,
              turnWallet: null, roomUpdatedAt: null, lastSignature: null,
            });
          } catch {
            set({ relayError: 'Could not open websocket connection to relay.' });
          }
        },

        cancelQueue: () => {
          const { ticketId } = get();
          if (ticketId && relayClient.isOpen()) relayClient.send({ type: 'queue.leave', ticket_id: ticketId });
          set({ isSearching: false, ticketId: null, queueAheadCount: 0, sameBetCount: 0 });
        },

        subscribeToRoom: () => {
          const { roomPubkey } = get();
          if (roomPubkey && relayClient.isOpen()) relayClient.send({ type: 'room.subscribe', room_pubkey: roomPubkey });
        },

        resumeRelaySession: async () => {
          const { wallet, roomPubkey, matchId } = get();
          if (!wallet) return;
          try {
            await connectRelay();
            relayClient.send({ type: 'session.resume', wallet, room_pubkey: roomPubkey, match_id: matchId });
          } catch {
            set({ relayError: 'Could not resume relay session.' });
          }
        },

        handleRelayMessage: (message) => {
          switch (message.type) {
            case 'queue.joined':
              set({ ticketId: message.ticket_id, isSearching: true, relayError: null });
              break;
            case 'queue.status':
              set({ queueAheadCount: message.ahead_count, sameBetCount: message.same_bet_count });
              break;
            case 'match.found':
              set({ isSearching: false, matchId: message.match_id, pvpRole: message.role, opponentWallet: message.opponent_wallet });
              break;
            case 'match.room_ready':
              set({ roomPubkey: message.room_pubkey, roomPhase: 'waiting_for_player' });
              get().subscribeToRoom();
              break;
            case 'room.state': {
              const pvpPlayers = (message.players || []).map((p: any) => ({
                wallet: p.wallet,
                health: p.health,
                items: p.items || { magnifyingGlass: 0, beer: 0, handcuffs: 0, cigarettes: 0, saw: 0, pill: 0 },
                handcuffed: p.handcuffed || false,
              }));
              if (get().gameStatus !== 'shot_animation') {
                set({
                  roomPubkey: message.room_pubkey,
                  roomPhase: message.phase,
                  turnWallet: message.turn_wallet,
                  roomUpdatedAt: message.updated_at,
                  lastSignature: message.last_signature,
                  gameStatus: mapPhaseToGameStatus(message.phase),
                  isSearching: false,
                  players: pvpPlayers,
                  isPendingAction: false,
                });
              }
              break;
            }
            case 'room.event':
              if (message.event_type === 'program_logs') {
                const payload = message.payload as { signature?: string };
                set({ lastSignature: payload.signature || get().lastSignature });
              } else if (message.event_type === 'shot_fired') {
                const payload = message.payload as { shooter: string; target: string; is_live: boolean; damage: number; new_health: number };
                const isLive = payload.is_live;
                set({
                  lastShotResult: isLive ? 'live' : 'blank',
                  lastShotTarget: payload.target === get().wallet ? 'player' : 'dealer',
                  gameStatus: 'shot_animation',
                  isAnimating: true,
                  isPendingAction: false,
                });
                soundManager.play(isLive ? 'shotLive' : 'shotBlank');
                window.setTimeout(() => set({ gameStatus: 'playing', isAnimating: false }), 1500);
              } else if (message.event_type === 'item_used') {
                const payload = message.payload as { player: string; item_type: ItemType };
                soundManager.play('itemUse');
                if (payload.player !== get().wallet) {
                  set({ dealerActionText: `Opponent uses ${payload.item_type}` });
                  window.setTimeout(() => set({ dealerActionText: null }), 1500);
                }
              }
              break;
            case 'system.error':
              set({
                relayError: message.message,
                isSearching: false,
                relayConnectionState: message.code === 'match_expired' ? 'connected' : get().relayConnectionState,
              });
              if (message.code === 'match_expired') {
                set({ ticketId: null, matchId: null, roomPubkey: null, roomPhase: null, gameStatus: 'setup' });
              }
              break;
          }
        },

        handleRelayOpen: () => set({ relayConnectionState: 'connected', relayError: null }),
        handleRelayClose: () => set({ relayConnectionState: 'closed' }),
        handleRelayError: (message) => set({ relayConnectionState: 'closed', relayError: message }),

        returnToMenu: () => {
          const { ticketId } = get();
          if (ticketId && relayClient.isOpen()) relayClient.send({ type: 'queue.leave', ticket_id: ticketId });
          relayClient.close();
          set({
            gameMode: null, transportMode: null, gameStatus: 'menu',
            isSearching: false, ticketId: null, matchId: null, pvpRole: null,
            opponentWallet: null, roomPubkey: null, roomPhase: null, turnWallet: null,
            roomUpdatedAt: null, lastSignature: null, queueAheadCount: 0, sameBetCount: 0,
            relayConnectionState: 'idle', relayError: null, showItemMenu: false,
          });
        },

        // -----------------------------------------------------------------------
        // startGame — PvE uses fully client-side Buckshot Roulette logic
        // -----------------------------------------------------------------------
        startGame: async (mode, bet) => {
          set({
            isAnimating: false,
            isRevealingShells: false,
            isPendingAction: false,
            dealerActionText: null,
            showItemMenu: false,
          });

          if (mode === 'pvp') {
            await get().openPvpSetup();
            set({ betAmount: bet });
            return;
          }

          // ---- PvE: client-authoritative Buckshot Roulette round setup ----
          const { roundsWon } = get();

          // Buckshot Roulette: HP is 2–5 and resets each round (both start same)
          const maxHealth = Math.min(5, 2 + Math.floor(roundsWon / 2));

          const { chamber, liveShells, blankShells } = generateChamber();
          const playerItems = generateItems(roundsWon);
          const dealerItemsGen = generateItems(roundsWon);

          set({
            gameMode: 'pve',
            transportMode: 'pve_mock',
            matchId: `pve_${Date.now()}`,
            betAmount: bet,
            gameStatus: 'playing',
            playerHealth: maxHealth,
            dealerHealth: maxHealth,
            maxHealth,
            chamber,
            shellsRemaining: chamber.length,
            liveShells,
            blankShells,
            currentShell: 'unknown',
            items: playerItems,
            dealerItems: dealerItemsGen,
            isPlayerTurn: true,
            isSawActive: false,
            dealerHandcuffed: false,
            playerHandcuffed: false,
            dealerHandcuffSkipped: false,
            lastShotResult: null,
            lastShotTarget: null,
            isRevealingShells: true,
            isPendingAction: false,
            turnTimer: 30,
          });

          window.setTimeout(() => set({ isRevealingShells: false }), 3000);
        },

        // -----------------------------------------------------------------------
        // shootDealer — player shoots the dealer
        // Buckshot rules:
        //   - Live: dealer takes 1 dmg (or 2 if saw active). Turn passes to dealer.
        //   - Blank: nothing happens, turn passes to dealer.
        // -----------------------------------------------------------------------
        shootDealer: async () => {
          const state = get();

          // PvP: delegate to relay backend
          if (isRelayMode(state.transportMode)) {
            if (!state.matchId || !state.wallet || state.isPendingAction || state.gameStatus !== 'playing' || state.isAnimating) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: state.matchId,
              player_wallet: state.wallet,
              action: 'ShootDealer',
            });
            if (res.success && res.state_update) {
              const update = res.state_update;
              const isLive = update.last_action_result?.is_live === true;
              set({
                lastShotResult: isLive ? 'live' : 'blank',
                lastShotTarget: 'dealer',
                gameStatus: 'shot_animation',
                isAnimating: true,
                isPendingAction: false,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
              });
              soundManager.play(isLive ? 'shotLive' : 'shotBlank');
              window.setTimeout(() => {
                set({
                  playerHealth: update.player_health,
                  dealerHealth: update.dealer_health,
                  items: update.items,
                  dealerItems: update.dealer_items,
                  isPlayerTurn: update.is_player_turn,
                  gameStatus: update.game_status as GameStatus,
                  isAnimating: false,
                  isSawActive: false,
                  turnTimer: 30,
                });
                const ns = get();
                if (ns.gameStatus === 'playing' && !ns.isPlayerTurn) setTimeout(() => get().dealerTurn(), 800);
              }, 1500);
            } else {
              set({ relayError: res.error || 'Failed to shoot dealer', isPendingAction: false });
            }
            return;
          }

          // ---- PvE client-side ----
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;
          if (state.chamber.length === 0) return;

          set({ isPendingAction: true, isAnimating: true, showItemMenu: false });

          const { shell, newChamber } = pveFireShell('dealer');
          const isLive = shell === 'live';
          const damage = state.isSawActive ? 2 : 1;
          const newLive = isLive ? state.liveShells - 1 : state.liveShells;
          const newBlank = !isLive ? state.blankShells - 1 : state.blankShells;

          set({
            lastShotResult: shell,
            lastShotTarget: 'dealer',
            gameStatus: 'shot_animation',
            chamber: newChamber,
            shellsRemaining: newChamber.length,
            liveShells: newLive,
            blankShells: newBlank,
            currentShell: 'unknown',
            isSawActive: false,
          });
          soundManager.play(isLive ? 'shotLive' : 'shotBlank');

          window.setTimeout(() => {
            const s = get();
            const newDealerHealth = isLive ? Math.max(0, s.dealerHealth - damage) : s.dealerHealth;

            // Check end state
            const end = pveCheckRoundEnd(
              s.playerHealth, newDealerHealth,
              s.betAmount, s.roundsWon, s.roundsLost, s.totalWon, s.totalLost
            );

            if (end) {
              set({ ...end, dealerHealth: newDealerHealth, isAnimating: false, isPendingAction: false });
              return;
            }

            set({
              dealerHealth: newDealerHealth,
              isPlayerTurn: false,
              isPendingAction: false,
              turnTimer: 30,
              gameStatus: 'playing',
            });
            // isAnimating stays true so "WAITING..." never flashes
            // between the shot ending and the dealer thinking overlay

            // If chamber empty, reload before dealer acts
            if (newChamber.length === 0) {
              const { chamber: nc, liveShells: nl, blankShells: nb } = generateChamber();
              set({
                chamber: nc, liveShells: nl, blankShells: nb,
                shellsRemaining: nc.length, isRevealingShells: true,
              });
              window.setTimeout(() => set({ isRevealingShells: false }), 2500);
            }

            if (get().gameStatus === 'playing' && !get().isPlayerTurn) get().dealerTurn();
          }, 1500);
        },

        // -----------------------------------------------------------------------
        // shootSelf — player shoots themselves
        // Buckshot rules:
        //   - Live: player takes 1 dmg (or 2 if saw was used against them). Turn passes.
        //   - Blank: player gets to keep their turn! (the defining mechanic)
        // -----------------------------------------------------------------------
        shootSelf: async () => {
          const state = get();

          if (isRelayMode(state.transportMode)) {
            if (!state.matchId || !state.wallet || state.isPendingAction || state.gameStatus !== 'playing' || state.isAnimating) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: state.matchId,
              player_wallet: state.wallet,
              action: 'ShootSelf',
            });
            if (res.success && res.state_update) {
              const update = res.state_update;
              const isLive = update.last_action_result?.is_live === true;
              set({
                lastShotResult: isLive ? 'live' : 'blank',
                lastShotTarget: 'player',
                gameStatus: 'shot_animation',
                isAnimating: true,
                isPendingAction: false,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
              });
              soundManager.play(isLive ? 'shotLive' : 'shotBlank');
              window.setTimeout(() => {
                set({
                  playerHealth: update.player_health,
                  dealerHealth: update.dealer_health,
                  items: update.items,
                  dealerItems: update.dealer_items,
                  isPlayerTurn: update.is_player_turn,
                  gameStatus: update.game_status as GameStatus,
                  isAnimating: false,
                  isSawActive: false,
                  turnTimer: 30,
                });
                const ns = get();
                if (ns.gameStatus === 'playing' && !ns.isPlayerTurn) setTimeout(() => get().dealerTurn(), 800);
              }, 1500);
            } else {
              set({ relayError: res.error || 'Failed to shoot self', isPendingAction: false });
            }
            return;
          }

          // ---- PvE client-side ----
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;
          if (state.chamber.length === 0) return;

          set({ isPendingAction: true, isAnimating: true, showItemMenu: false });

          const { shell, newChamber } = pveFireShell('player');
          const isLive = shell === 'live';
          const damage = state.isSawActive ? 2 : 1;
          const newLive = isLive ? state.liveShells - 1 : state.liveShells;
          const newBlank = !isLive ? state.blankShells - 1 : state.blankShells;

          set({
            lastShotResult: shell,
            lastShotTarget: 'player',
            gameStatus: 'shot_animation',
            chamber: newChamber,
            shellsRemaining: newChamber.length,
            liveShells: newLive,
            blankShells: newBlank,
            currentShell: 'unknown',
            isSawActive: false,
          });
          soundManager.play(isLive ? 'shotLive' : 'shotBlank');

          window.setTimeout(() => {
            const s = get();
            const newPlayerHealth = isLive ? Math.max(0, s.playerHealth - damage) : s.playerHealth;

            // Check end state
            const end = pveCheckRoundEnd(
              newPlayerHealth, s.dealerHealth,
              s.betAmount, s.roundsWon, s.roundsLost, s.totalWon, s.totalLost
            );

            if (end) {
              set({ ...end, playerHealth: newPlayerHealth, isAnimating: false, isPendingAction: false });
              return;
            }

            if (isLive) {
              // Live self-shot: turn passes to dealer
              set({
                playerHealth: newPlayerHealth,
                isPlayerTurn: false,
                isPendingAction: false,
                turnTimer: 30,
                gameStatus: 'playing',
              });
              // isAnimating stays true so "WAITING..." never flashes
              if (newChamber.length === 0) {
                const { chamber: nc, liveShells: nl, blankShells: nb } = generateChamber();
                set({ chamber: nc, liveShells: nl, blankShells: nb, shellsRemaining: nc.length, isRevealingShells: true });
                window.setTimeout(() => set({ isRevealingShells: false }), 2500);
              }
              if (get().gameStatus === 'playing' && !get().isPlayerTurn) get().dealerTurn();
            } else {
              // *** Blank self-shot: player KEEPS their turn ***
              // Reload if chamber empty
              if (newChamber.length === 0) {
                const { chamber: nc, liveShells: nl, blankShells: nb } = generateChamber();
                set({
                  chamber: nc, liveShells: nl, blankShells: nb, shellsRemaining: nc.length,
                  isRevealingShells: true, isPlayerTurn: true, isAnimating: false, isPendingAction: false,
                  gameStatus: 'playing',
                });
                window.setTimeout(() => set({ isRevealingShells: false }), 2500);
              } else {
                set({
                  isPlayerTurn: true,   // keep turn!
                  isAnimating: false,
                  isPendingAction: false,
                  turnTimer: 30,
                  gameStatus: 'playing',
                });
              }
            }
          }, 1500);
        },

        // -----------------------------------------------------------------------
        // useItem — Buckshot Roulette item logic, client-side for PvE
        // -----------------------------------------------------------------------
        useItem: async (itemKey) => {
          const state = get();

          if (isRelayMode(state.transportMode)) {
            if (!state.matchId || !state.wallet || state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: state.matchId,
              player_wallet: state.wallet,
              action: 'UseItem',
              item_type: itemKey as ItemType,
            });
            if (res.success && res.state_update) {
              const update = res.state_update;
              soundManager.play('itemUse');
              set({
                playerHealth: update.player_health,
                dealerHealth: update.dealer_health,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
                items: update.items,
                dealerItems: update.dealer_items,
                isPlayerTurn: update.is_player_turn,
                currentShell: update.last_action_result?.peek || 'unknown',
                isSawActive: update.last_action_result?.item === 'saw' ? true : state.isSawActive,
                gameStatus: update.game_status as GameStatus,
                isPendingAction: false,
              });
              if (!update.is_player_turn && update.game_status === 'playing') {
                setTimeout(() => get().dealerTurn(), 500);
              }
            } else {
              set({ relayError: res.error || `Failed to use ${itemKey}`, isPendingAction: false });
            }
            return;
          }

          // ---- PvE client-side item effects ----
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;

          const item = itemKey as keyof Items;
          if (state.items[item] <= 0) return;

          soundManager.play('itemUse');
          set({ isPendingAction: true });

          // Deduct item
          const newItems: Items = { ...state.items, [item]: state.items[item] - 1 };

          switch (item) {
            // ------------------------------------------------------------------
            // Magnifying Glass: peek at the current (top) shell without firing
            // ------------------------------------------------------------------
            case 'magnifyingGlass': {
              const peeked = state.chamber[0] ?? 'unknown';
              set({ items: newItems, currentShell: peeked, isPendingAction: false });
              break;
            }

            // ------------------------------------------------------------------
            // Beer: eject (rack) the current shell without firing it.
            //       The shell is discarded and the turn continues.
            // ------------------------------------------------------------------
            case 'beer': {
              if (state.chamber.length === 0) { set({ isPendingAction: false }); break; }
              const [ejected, ...rest] = state.chamber;
              const newLive = ejected === 'live' ? state.liveShells - 1 : state.liveShells;
              const newBlank = ejected === 'blank' ? state.blankShells - 1 : state.blankShells;
              set({
                items: newItems,
                chamber: rest,
                shellsRemaining: rest.length,
                liveShells: newLive,
                blankShells: newBlank,
                currentShell: 'unknown',
                isPendingAction: false,
              });
              // Reload if now empty
              if (rest.length === 0) pveReloadIfEmpty();
              break;
            }

            // ------------------------------------------------------------------
            // Handcuffs: dealer skips their next turn
            // ------------------------------------------------------------------
            case 'handcuffs': {
              set({ items: newItems, dealerHandcuffed: true, isPendingAction: false });
              break;
            }

            // ------------------------------------------------------------------
            // Cigarettes: restore 1 HP (cannot exceed maxHealth)
            // ------------------------------------------------------------------
            case 'cigarettes': {
              const healed = Math.min(state.maxHealth, state.playerHealth + 1);
              set({ items: newItems, playerHealth: healed, isPendingAction: false });
              break;
            }

            // ------------------------------------------------------------------
            // Saw: next shot deals double damage
            // ------------------------------------------------------------------
            case 'saw': {
              set({ items: newItems, isSawActive: true, isPendingAction: false });
              break;
            }

            // ------------------------------------------------------------------
            // Pill (adrenaline in original): 50% chance +2 HP, 50% chance -1 HP
            // If HP drops to 0 from pill, it's a loss.
            // ------------------------------------------------------------------
            case 'pill': {
              const lucky = Math.random() < 0.5;
              let newHealth: number;
              if (lucky) {
                newHealth = Math.min(state.maxHealth, state.playerHealth + 2);
              } else {
                newHealth = Math.max(0, state.playerHealth - 1);
              }
              set({ items: newItems, playerHealth: newHealth, isPendingAction: false });

              if (newHealth <= 0) {
                const s = get();
                set({
                  gameStatus: 'gameover',
                  roundsLost: s.roundsLost + 1,
                  totalLost: s.totalLost + s.betAmount,
                });
              }
              break;
            }

            default:
              set({ isPendingAction: false });
          }
        },

        // -----------------------------------------------------------------------
        // fold — concede the round (PvE only)
        // -----------------------------------------------------------------------
        fold: () => {
          if (isRelayMode(get().transportMode)) return;
          set(s => ({
            gameStatus: 'round_end',
            roundsLost: s.roundsLost + 1,
            totalLost: s.totalLost + s.betAmount,
          }));
        },

        // -----------------------------------------------------------------------
        // playAgain / leaveTable
        // -----------------------------------------------------------------------
        playAgain: () => {
          const { gameMode, betAmount } = get();
          if (gameMode === 'pvp') {
            set({
              gameStatus: 'setup', isSearching: false,
              ticketId: null, matchId: null, roomPubkey: null,
              roomPhase: null, turnWallet: null, lastSignature: null,
            });
            return;
          }
          if (gameMode) get().startGame(gameMode, betAmount);
        },

        leaveTable: () => {
          if (get().gameMode === 'pvp') { get().returnToMenu(); return; }
          set({ gameStatus: 'menu' });
        },

        setShowItemMenu: (show) => set({ showItemMenu: show }),

        // -----------------------------------------------------------------------
        // decrementTimer
        // -----------------------------------------------------------------------
        decrementTimer: () => {
          const {
            transportMode, turnTimer, isPlayerTurn, gameStatus,
            isAnimating, isRevealingShells, playerHealth,
            roundsLost, totalLost, betAmount, roomUpdatedAt, relayTurnTimeoutSeconds
          } = get();

          if (isRelayMode(transportMode)) {
            if (!roomUpdatedAt || gameStatus !== 'playing' || isAnimating) return;
            const elapsed = Math.floor((Date.now() - new Date(roomUpdatedAt).getTime()) / 1000);
            const remaining = Math.max(0, relayTurnTimeoutSeconds - elapsed);
            if (remaining !== turnTimer) set({ turnTimer: remaining });
            return;
          }

          if (!isPlayerTurn || gameStatus !== 'playing' || isAnimating || isRevealingShells) return;

          const newTimer = Math.max(0, turnTimer - 1);
          set({ turnTimer: newTimer });

          if (newTimer === 0) {
            // Time up — penalise player 1 HP, pass turn
            const newHealth = playerHealth - 1;
            if (newHealth <= 0) {
              set({
                playerHealth: 0, gameStatus: 'gameover',
                roundsLost: roundsLost + 1, totalLost: totalLost + betAmount,
              });
            } else {
              set({ playerHealth: newHealth, isPlayerTurn: false, turnTimer: 30 });
              setTimeout(() => {
                if (get().gameStatus === 'playing' && !get().isPlayerTurn) get().dealerTurn();
              }, 500);
            }
          }
        },

        resetTurn: () => {
          soundManager.play('turnStart');
          set({ isPlayerTurn: true, turnTimer: 30 });
        },

        // -----------------------------------------------------------------------
        // reloadShotgun — manual reload trigger (chamber empty, PvE)
        // -----------------------------------------------------------------------
        reloadShotgun: () => {
          const { gameStatus, isAnimating, isPendingAction, transportMode } = get();
          if (isRelayMode(transportMode)) return;
          if (isPendingAction || gameStatus !== 'playing' || isAnimating) return;
          pveReloadIfEmpty();
        },

        resetPeek: () => set({ currentShell: 'unknown' }),

        // -----------------------------------------------------------------------
        // dealerTurn — PvE AI using Buckshot Roulette strategy
        // -----------------------------------------------------------------------
        dealerTurn: async () => {
          const state = get();

          if (isRelayMode(state.transportMode)) return; // PvP: server drives dealer
          if (state.isPlayerTurn || state.gameStatus !== 'playing' || state.isPendingAction) return;

          set({ isPendingAction: true, isAnimating: true });

          // Small thinking delay
          await new Promise(r => setTimeout(r, 900));

          // Check if dealer's turn is skipped due to handcuffs
          if (state.dealerHandcuffed) {
            set({
              dealerHandcuffed: false,
              isPlayerTurn: true,
              isAnimating: false,
              isPendingAction: false,
              turnTimer: 30,
              dealerActionText: 'Dealer is handcuffed — turn skipped!',
            });
            soundManager.play('turnStart');
            await new Promise(r => setTimeout(r, 1200));
            set({ dealerActionText: null });
            return;
          }

          // Reload if empty (shouldn't normally happen but safety check)
          if (state.chamber.length === 0) {
            const { chamber: nc, liveShells: nl, blankShells: nb } = generateChamber();
            set({
              chamber: nc, liveShells: nl, blankShells: nb, shellsRemaining: nc.length,
              isRevealingShells: true,
            });
            await new Promise(r => setTimeout(r, 2500));
            set({ isRevealingShells: false });
          }

          // Dealer takes multiple actions per turn (just like Buckshot Roulette)
          let keepGoing = true;
          let firstAction = true;

          while (keepGoing) {
            const cur = get();
            if (cur.gameStatus !== 'playing') break;
            if (cur.chamber.length === 0) break;

            const action = decideDealerAction(
              cur.chamber,
              cur.dealerHealth,
              cur.playerHealth,
              cur.dealerItems,
              cur.isSawActive,
              cur.currentShell,
            );

            await get().executeDealerAction(action);

            const after = get();
            if (after.gameStatus !== 'playing') break;

            // Dealer keeps turn only if they shot themselves with a blank
            if (action.type === 'ShootSelf' && !action.is_live) {
              // extra turn — loop
              await new Promise(r => setTimeout(r, 500));
            } else if (action.type === 'UseItem') {
              // Item use doesn't end the turn; loop to pick next action
              await new Promise(r => setTimeout(r, 600));
            } else {
              // Shot fired at player or live self-shot — turn ends
              keepGoing = false;
            }

            firstAction = false;
          }

          const final = get();
          if (final.gameStatus === 'playing') {
            // Reload if chamber empty after dealer's turn
            if (final.chamber.length === 0) {
              const { chamber: nc, liveShells: nl, blankShells: nb } = generateChamber();
              set({
                chamber: nc, liveShells: nl, blankShells: nb, shellsRemaining: nc.length,
                isRevealingShells: true,
              });
              await new Promise(r => setTimeout(r, 2500));
              set({ isRevealingShells: false });
            }

            // Pass turn back to player
            set({
              isPlayerTurn: true,
              isAnimating: false,
              isPendingAction: false,
              turnTimer: 30,
              dealerActionText: null,
            });
            soundManager.play('turnStart');
          } else {
            set({ isAnimating: false, isPendingAction: false, dealerActionText: null });
          }
        },

        // -----------------------------------------------------------------------
        // executeDealerAction — applies a single dealer action to PvE state
        // -----------------------------------------------------------------------
        executeDealerAction: async (action: DealerAction) => {
          const s = get();

          switch (action.type) {
            // ---------- Items ----------
            case 'UseItem': {
              const item = action.item;
              soundManager.play('itemUse');
              set({ dealerActionText: `Dealer uses ${item}` });

              const newDealerItems: Items = {
                ...s.dealerItems,
                [item]: Math.max(0, s.dealerItems[item] - 1),
              };

              switch (item) {
                case 'magnifyingGlass': {
                  // Dealer peeks — we update their internal known shell (no UI reveal to player)
                  set({ dealerItems: newDealerItems });
                  break;
                }
                case 'beer': {
                  const [ejected, ...rest] = s.chamber;
                  const newLive = ejected === 'live' ? s.liveShells - 1 : s.liveShells;
                  const newBlank = ejected === 'blank' ? s.blankShells - 1 : s.blankShells;
                  set({
                    dealerItems: newDealerItems,
                    chamber: rest,
                    shellsRemaining: rest.length,
                    liveShells: newLive,
                    blankShells: newBlank,
                    currentShell: 'unknown',
                  });
                  break;
                }
                case 'handcuffs': {
                  set({ dealerItems: newDealerItems, playerHandcuffed: true });
                  break;
                }
                case 'cigarettes': {
                  const healed = Math.min(s.maxHealth, s.dealerHealth + 1);
                  set({ dealerItems: newDealerItems, dealerHealth: healed });
                  break;
                }
                case 'saw': {
                  set({ dealerItems: newDealerItems, isSawActive: true });
                  break;
                }
                case 'pill': {
                  const lucky = Math.random() < 0.5;
                  const newDealerHealth = lucky
                    ? Math.min(s.maxHealth, s.dealerHealth + 2)
                    : Math.max(0, s.dealerHealth - 1);
                  set({ dealerItems: newDealerItems, dealerHealth: newDealerHealth });
                  break;
                }
                default:
                  set({ dealerItems: newDealerItems });
              }

              await new Promise(r => setTimeout(r, 1400));
              set({ dealerActionText: null });
              break;
            }

            // ---------- Shoot Self ----------
            case 'ShootSelf': {
              const cur = get();
              const [shell, ...rest] = cur.chamber;
              const isLive = shell === 'live';
              const damage = cur.isSawActive ? 2 : 1;
              const newLive = isLive ? cur.liveShells - 1 : cur.liveShells;
              const newBlank = !isLive ? cur.blankShells - 1 : cur.blankShells;

              set({
                lastShotResult: shell,
                lastShotTarget: 'dealer',
                gameStatus: 'shot_animation',
                chamber: rest,
                shellsRemaining: rest.length,
                liveShells: newLive,
                blankShells: newBlank,
                currentShell: 'unknown',
                isSawActive: false,
              });
              soundManager.play(isLive ? 'shotLive' : 'shotBlank');

              await new Promise(r => setTimeout(r, 1500));

              const newDealerHealth = isLive ? Math.max(0, cur.dealerHealth - damage) : cur.dealerHealth;
              const end = pveCheckRoundEnd(
                cur.playerHealth, newDealerHealth,
                cur.betAmount, cur.roundsWon, cur.roundsLost, cur.totalWon, cur.totalLost
              );

              if (end) {
                set({ ...end, dealerHealth: newDealerHealth });
              } else {
                set({ dealerHealth: newDealerHealth, gameStatus: 'playing' });
              }
              break;
            }

            // ---------- Shoot Player ----------
            case 'ShootPlayer': {
              const cur = get();
              const [shell, ...rest] = cur.chamber;
              const isLive = shell === 'live';
              const damage = cur.isSawActive ? 2 : 1;
              const newLive = isLive ? cur.liveShells - 1 : cur.liveShells;
              const newBlank = !isLive ? cur.blankShells - 1 : cur.blankShells;

              set({
                lastShotResult: shell,
                lastShotTarget: 'player',
                gameStatus: 'shot_animation',
                chamber: rest,
                shellsRemaining: rest.length,
                liveShells: newLive,
                blankShells: newBlank,
                currentShell: 'unknown',
                isSawActive: false,
              });
              soundManager.play(isLive ? 'shotLive' : 'shotBlank');

              await new Promise(r => setTimeout(r, 1500));

              const newPlayerHealth = isLive ? Math.max(0, cur.playerHealth - damage) : cur.playerHealth;
              const end = pveCheckRoundEnd(
                newPlayerHealth, cur.dealerHealth,
                cur.betAmount, cur.roundsWon, cur.roundsLost, cur.totalWon, cur.totalLost
              );

              if (end) {
                set({ ...end, playerHealth: newPlayerHealth });
              } else {
                set({ playerHealth: newPlayerHealth, gameStatus: 'playing' });
              }
              break;
            }
          }
        },

        // -----------------------------------------------------------------------
        // createRoom (on-chain PvP room — unchanged)
        // -----------------------------------------------------------------------
        createRoom: async (connection, wallet) => {
          const { matchId, betAmount, relayProgramId, opponentWallet } = get();
          if (!matchId || !relayProgramId || !wallet.publicKey || !opponentWallet) return;

          set({ isPendingAction: true, relayError: null });
          try {
            const programId = new PublicKey(relayProgramId);
            const matchIdSeed = new TextEncoder().encode(matchId).slice(0, 32);
            const [roomPubkey] = PublicKey.findProgramAddressSync(
              [new TextEncoder().encode('room'), matchIdSeed],
              programId
            );
            const instruction = new TransactionInstruction({
              keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(opponentWallet), isSigner: false, isWritable: false },
                { pubkey: roomPubkey, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              programId,
              data: Buffer.from([
                0,
                ...new TextEncoder().encode(matchId),
                ...new Uint8Array(new BigUint64Array([BigInt(lamportsFromSol(betAmount))]).buffer),
              ]),
            });
            const tx = new Transaction().add(instruction);
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            const signed = await wallet.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature, 'confirmed');
            relayClient.send({ type: 'match.room_created', match_id: matchId, room_pubkey: roomPubkey.toBase58(), signature });
            set({ roomPubkey: roomPubkey.toBase58(), lastSignature: signature, isPendingAction: false });
            soundManager.play('uiClick');
          } catch (error) {
            let errorMessage = 'Failed to create room on-chain';
            if (error instanceof SendTransactionError) {
              const logs = error.logs;
              if (logs?.length) {
                const progErr = logs.find(l => l.includes('Program log: Error:'));
                if (progErr) errorMessage = `Program Error: ${progErr.split('Error: ')[1]}`;
                else if (logs.some(l => l.includes('insufficient funds'))) errorMessage = 'Insufficient SOL to create room and pay entry fee.';
              }
              if (error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
                errorMessage = 'Your wallet is empty or not initialized. Please airdrop some Devnet SOL.';
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }
            set({ relayError: errorMessage, isPendingAction: false });
          }
        },
      };
    },
    { name: 'shell-shock-storage' }
  )
);