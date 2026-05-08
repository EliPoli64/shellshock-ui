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

type GameMode = 'pve' | 'pvp' | null;
type GameStatus = 'menu' | 'setup' | 'playing' | 'shot_animation' | 'round_end' | 'gameover';
type TransportMode = 'pve_mock' | 'pvp_relay' | null;
type RelayConnectionState = 'idle' | 'connecting' | 'connected' | 'closed';

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
  shellsRemaining: number;
  liveShells: number;
  blankShells: number;
  chamber: ('live' | 'blank')[];
  currentShell: 'live' | 'blank' | 'unknown';
  isPlayerTurn: boolean;
  turnTimer: number;
  isSawActive: boolean;

  items: {
    magnifyingGlass: number;
    beer: number;
    handcuffs: number;
    cigarettes: number;
    saw: number;
    pill: number;
  };
  dealerItems: {
    magnifyingGlass: number;
    beer: number;
    handcuffs: number;
    cigarettes: number;
    saw: number;
    pill: number;
  };
  dealerHandcuffed: boolean;
  playerHandcuffed: boolean;

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
    items: {
      magnifyingGlass: number;
      beer: number;
      handcuffs: number;
      cigarettes: number;
      saw: number;
      pill: number;
    };
    handcuffed: boolean;
  }[];

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
  startGame: (mode: 'pve' | 'pvp', bet: number) => void;
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
  createRoom: (connection: any, wallet: any) => Promise<void>;
}

const DEFAULT_RELAY_HTTP_URL = import.meta.env.VITE_RELAY_HTTP_URL || 'http://localhost:8080';
const DEFAULT_RELAY_WS_URL =
  import.meta.env.VITE_RELAY_WS_URL ||
  `${DEFAULT_RELAY_HTTP_URL.replace(/^http/, DEFAULT_RELAY_HTTP_URL.startsWith('https') ? 'wss' : 'ws')}/ws`;

const lamportsFromSol = (amount: number) => Math.round(amount * 1_000_000_000);

const mapPhaseToGameStatus = (phase: RelayRoomPhase): GameStatus => {
  switch (phase) {
    case 'playing':
      return 'playing';
    case 'round_end':
    case 'finished':
      return 'round_end';
    case 'waiting_for_player':
    case 'waiting_for_vrf':
    default:
      return 'setup';
  }
};

const isRelayMode = (transportMode: TransportMode) => transportMode === 'pvp_relay';

export const useShellShockStore = create<ShellShockState>()(
  persist(
    (set, get) => {
      const connectRelay = async () => {
        if (relayClient.isOpen()) {
          return;
        }

        set({ relayConnectionState: 'connecting', relayError: null });
        await relayClient.connect(get().relayWsUrl, {
          onOpen: get().handleRelayOpen,
          onClose: get().handleRelayClose,
          onError: get().handleRelayError,
          onMessage: get().handleRelayMessage,
        });
      };

      return {
        wallet: null,
        solBalance: 0,

        gameMode: null,
        transportMode: null,
        betAmount: 0,
        isSearching: false,

        gameStatus: 'menu',
        playerHealth: 3,
        dealerHealth: 3,
        shellsRemaining: 6,
        liveShells: 3,
        blankShells: 3,
        chamber: [],
        currentShell: 'unknown',
        isPlayerTurn: true,
        turnTimer: 15,
        isSawActive: false,

        items: {
          magnifyingGlass: 1,
          beer: 1,
          handcuffs: 1,
          cigarettes: 1,
          saw: 0,
          pill: 1,
        },
        dealerItems: {
          magnifyingGlass: 1,
          beer: 1,
          handcuffs: 1,
          cigarettes: 1,
          saw: 1,
          pill: 1,
        },
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

        connectWallet: (wallet, solBalance = 0) => set({ wallet, solBalance }),

        refreshRelayStatus: async () => {
          try {
            const [readyResponse, configResponse] = await Promise.all([
              fetch(`${get().relayHttpUrl}/readyz`),
              fetch(`${get().relayHttpUrl}/config`),
            ]);

            const readyPayload = (await readyResponse.json()) as {
              status?: string;
            };
            const configPayload = (await configResponse.json()) as {
              program_id?: string;
              turn_timeout_seconds?: number;
              websocket_path?: string;
            };

            const relayReady = readyResponse.ok && readyPayload.status === 'ok';
            const websocketPath = configPayload.websocket_path || '/ws';
            const relayWsUrl =
              import.meta.env.VITE_RELAY_WS_URL ||
              `${get()
                .relayHttpUrl.replace(/^http/, get().relayHttpUrl.startsWith('https') ? 'wss' : 'ws')}${websocketPath}`;

            set({
              relayReady,
              relayWsUrl,
              relayProgramId: configPayload.program_id || null,
              relayTurnTimeoutSeconds: configPayload.turn_timeout_seconds || 90,
              relayError: relayReady ? null : 'Relay is not ready yet.',
            });
          } catch {
            set({
              relayReady: false,
              relayError: 'Could not reach relay HTTP endpoints.',
            });
          }
        },

        openPvpSetup: async () => {
          set({
            gameMode: 'pvp',
            transportMode: 'pvp_relay',
            gameStatus: 'setup',
            relayError: null,
          });
          await get().refreshRelayStatus();
        },

        queueForPvp: async (bet) => {
          const { wallet } = get();
          if (!wallet) {
            set({ relayError: 'Connect a wallet before entering PvP queue.' });
            return;
          }

          await get().refreshRelayStatus();
          if (!get().relayReady) {
            return;
          }

          try {
            await connectRelay();
            relayClient.send({
              type: 'queue.join',
              wallet,
              bet_lamports: lamportsFromSol(bet),
            });

            set({
              gameMode: 'pvp',
              transportMode: 'pvp_relay',
              gameStatus: 'setup',
              betAmount: bet,
              isSearching: true,
              relayError: null,
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
            });
          } catch {
            set({ relayError: 'Could not open websocket connection to relay.' });
          }
        },

        cancelQueue: () => {
          const { ticketId } = get();
          if (ticketId && relayClient.isOpen()) {
            relayClient.send({ type: 'queue.leave', ticket_id: ticketId });
          }

          set({
            isSearching: false,
            ticketId: null,
            queueAheadCount: 0,
            sameBetCount: 0,
          });
        },

        subscribeToRoom: () => {
          const { roomPubkey } = get();
          if (roomPubkey && relayClient.isOpen()) {
            relayClient.send({ type: 'room.subscribe', room_pubkey: roomPubkey });
          }
        },

        resumeRelaySession: async () => {
          const { wallet, roomPubkey, matchId } = get();
          if (!wallet) {
            return;
          }

          try {
            await connectRelay();
            relayClient.send({
              type: 'session.resume',
              wallet,
              room_pubkey: roomPubkey,
              match_id: matchId,
            });
          } catch {
            set({ relayError: 'Could not resume relay session.' });
          }
        },

        handleRelayMessage: (message) => {
          switch (message.type) {
            case 'queue.joined':
              set({
                ticketId: message.ticket_id,
                isSearching: true,
                relayError: null,
              });
              break;
            case 'queue.status':
              set({
                queueAheadCount: message.ahead_count,
                sameBetCount: message.same_bet_count,
              });
              break;
            case 'match.found':
              set({
                isSearching: false,
                matchId: message.match_id,
                pvpRole: message.role,
                opponentWallet: message.opponent_wallet,
              });
              break;
            case 'match.room_ready':
              set({
                roomPubkey: message.room_pubkey,
                roomPhase: 'waiting_for_player',
              });
              get().subscribeToRoom();
              break;
            case 'room.state':
              const pvpPlayers = (message.players || []).map((p: any) => ({
                wallet: p.wallet,
                health: p.health,
                items: p.items || {
                  magnifyingGlass: 0,
                  beer: 0,
                  handcuffs: 0,
                  cigarettes: 0,
                  saw: 0,
                  pill: 0,
                },
                handcuffed: p.handcuffed || false,
              }));

              // Only update state if not currently animating a shot
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
                  isPendingAction: false, // Clear pending when state update arrives
                });
              }
              break;
            case 'room.event':
              if (message.event_type === 'program_logs') {
                const payload = message.payload as { signature?: string };
                set({ lastSignature: payload.signature || get().lastSignature });
              } else if (message.event_type === 'shot_fired') {
                const payload = message.payload as {
                  shooter: string;
                  target: string;
                  is_live: boolean;
                  damage: number;
                  new_health: number;
                };

                const isLive = payload.is_live;
                set({
                  lastShotResult: isLive ? 'live' : 'blank',
                  lastShotTarget: payload.target === get().wallet ? 'player' : 'dealer',
                  gameStatus: 'shot_animation',
                  isAnimating: true,
                  isPendingAction: false,
                });

                soundManager.play(isLive ? 'shotLive' : 'shotBlank');

                // After animation, we expect the next room.state to settle everything
                window.setTimeout(() => {
                  set({
                    gameStatus: 'playing',
                    isAnimating: false,
                  });
                }, 1500);
              } else if (message.event_type === 'item_used') {
                const payload = message.payload as {
                  player: string;
                  item_type: ItemType;
                };
                
                soundManager.play('itemUse');
                if (payload.player !== get().wallet) {
                  set({
                    dealerActionText: `Opponent uses ${payload.item_type}`,
                  });
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
                set({
                  ticketId: null,
                  matchId: null,
                  roomPubkey: null,
                  roomPhase: null,
                  gameStatus: 'setup',
                });
              }
              break;
          }
        },

        handleRelayOpen: () => {
          set({ relayConnectionState: 'connected', relayError: null });
        },

        handleRelayClose: () => {
          set({ relayConnectionState: 'closed' });
        },

        handleRelayError: (message) => {
          set({ relayConnectionState: 'closed', relayError: message });
        },

        returnToMenu: () => {
          const { ticketId } = get();
          if (ticketId && relayClient.isOpen()) {
            relayClient.send({ type: 'queue.leave', ticket_id: ticketId });
          }
          relayClient.close();

          set({
            gameMode: null,
            transportMode: null,
            gameStatus: 'menu',
            isSearching: false,
            ticketId: null,
            matchId: null,
            pvpRole: null,
            opponentWallet: null,
            roomPubkey: null,
            roomPhase: null,
            turnWallet: null,
            roomUpdatedAt: null,
            lastSignature: null,
            queueAheadCount: 0,
            sameBetCount: 0,
            relayConnectionState: 'idle',
            relayError: null,
            showItemMenu: false,
          });
        },

        reloadShotgun: () => {
          soundManager.play('reload');
          const totalShells = 6;
          const minLive = 1;
          const maxLive = totalShells - 1;
          const liveCount = Math.floor(Math.random() * (maxLive - minLive + 1)) + minLive;
          const blankCount = totalShells - liveCount;
          const shells: ('live' | 'blank')[] = [
            ...Array(liveCount).fill('live'),
            ...Array(blankCount).fill('blank'),
          ];

          for (let i = shells.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [shells[i], shells[j]] = [shells[j], shells[i]];
          }

          set({
            shellsRemaining: totalShells,
            liveShells: liveCount,
            blankShells: blankCount,
            chamber: shells,
            currentShell: 'unknown',
            isSawActive: false,
          });
        },

        startGame: (mode, bet) => {
          if (mode === 'pvp') {
            void get().openPvpSetup();
            set({ betAmount: bet });
            return;
          }

          soundManager.play('turnStart');
          const generateRandomItems = () => ({
            magnifyingGlass: Math.floor(Math.random() * 3),
            beer: Math.floor(Math.random() * 3),
            handcuffs: Math.floor(Math.random() * 2),
            cigarettes: Math.floor(Math.random() * 3),
            saw: Math.floor(Math.random() * 2),
            pill: Math.floor(Math.random() * 2),
          });

          const startingItems = generateRandomItems();

          set({
            gameMode: mode,
            transportMode: 'pve_mock',
            betAmount: bet,
            gameStatus: 'playing',
            playerHealth: 3,
            dealerHealth: 3,
            currentShell: 'unknown',
            isPlayerTurn: true,
            isRevealingShells: true,
            turnTimer: 15,
            isSawActive: false,
            items: startingItems,
            dealerItems: { ...startingItems },
            dealerHandcuffed: false,
            playerHandcuffed: false,
          });
          get().reloadShotgun();

          window.setTimeout(() => {
            set({ isRevealingShells: false });
          }, 3000);
        },

        shootDealer: async () => {
          const { transportMode, isPlayerTurn, chamber, dealerHealth, shellsRemaining, isSawActive, dealerHandcuffed, matchId, wallet, isPendingAction } =
            get();
          
          if (isRelayMode(transportMode)) {
            if (!matchId || !wallet || isPendingAction) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: matchId,
              player_wallet: wallet,
              action: 'ShootDealer',
            });
            if (!res.success) {
              set({ 
                relayError: res.error || 'Failed to shoot dealer',
                isPendingAction: false 
              });
            }
            return;
          }

          if (!isPlayerTurn || chamber.length === 0) {
            return;
          }

          const result = chamber[0];
          const newChamber = chamber.slice(1);
          const newShellsRemaining = shellsRemaining - 1;
          const isLive = result === 'live';
          const damage = isSawActive ? 2 : 1;

          set((state) => ({
            lastShotResult: result,
            lastShotTarget: 'dealer',
            gameStatus: 'shot_animation',
            isAnimating: true,
            shellsRemaining: newShellsRemaining,
            chamber: newChamber,
            liveShells: isLive ? state.liveShells - 1 : state.liveShells,
            blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
            currentShell: 'unknown',
          }));

          soundManager.play(isLive ? 'shotLive' : 'shotBlank');

          window.setTimeout(() => {
            if (isLive) {
              const newDealerHealth = Math.max(0, dealerHealth - damage);
              if (newDealerHealth <= 0) {
                soundManager.play('win');
                set((state) => ({
                  dealerHealth: 0,
                  gameStatus: 'round_end',
                  roundsWon: state.roundsWon + 1,
                  totalWon: state.totalWon + state.betAmount,
                  isAnimating: false,
                  isSawActive: false,
                }));
              } else {
                const shouldPassTurn = !dealerHandcuffed;
                if (!shouldPassTurn) soundManager.play('turnStart');
                set({
                  dealerHealth: newDealerHealth,
                  isPlayerTurn: !shouldPassTurn,
                  dealerHandcuffed: false,
                  gameStatus: 'playing',
                  isAnimating: false,
                  turnTimer: 15,
                  isSawActive: false,
                });
                if (newShellsRemaining <= 0) {
                  get().reloadShotgun();
                }
              }
            } else {
              const shouldPassTurn = !dealerHandcuffed;
              if (!shouldPassTurn) soundManager.play('turnStart');
              set({
                isPlayerTurn: !shouldPassTurn,
                dealerHandcuffed: false,
                gameStatus: 'playing',
                isAnimating: false,
                turnTimer: 15,
                isSawActive: false,
              });
              if (newShellsRemaining <= 0) {
                get().reloadShotgun();
              }
            }
          }, 1500);
        },

        shootSelf: async () => {
          const { transportMode, isPlayerTurn, chamber, playerHealth, shellsRemaining, isSawActive, matchId, wallet, isPendingAction } = get();
          
          if (isRelayMode(transportMode)) {
            if (!matchId || !wallet || isPendingAction) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: matchId,
              player_wallet: wallet,
              action: 'ShootSelf',
            });
            if (!res.success) {
              set({ 
                relayError: res.error || 'Failed to shoot self',
                isPendingAction: false 
              });
            }
            return;
          }

          if (!isPlayerTurn || chamber.length === 0) {
            return;
          }

          const result = chamber[0];
          const newChamber = chamber.slice(1);
          const newShellsRemaining = shellsRemaining - 1;
          const isLive = result === 'live';
          const damage = isSawActive ? 2 : 1;

          set((state) => ({
            lastShotResult: result,
            lastShotTarget: 'player',
            gameStatus: 'shot_animation',
            isAnimating: true,
            shellsRemaining: newShellsRemaining,
            chamber: newChamber,
            liveShells: isLive ? state.liveShells - 1 : state.liveShells,
            blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
            currentShell: 'unknown',
          }));

          soundManager.play(isLive ? 'shotLive' : 'shotBlank');

          window.setTimeout(() => {
            if (isLive) {
              const newPlayerHealth = Math.max(0, playerHealth - damage);
              if (newPlayerHealth <= 0) {
                soundManager.play('loss');
                set((state) => ({
                  playerHealth: 0,
                  gameStatus: 'gameover',
                  roundsLost: state.roundsLost + 1,
                  totalLost: state.totalLost + state.betAmount,
                  isAnimating: false,
                  isSawActive: false,
                }));
              } else {
                set({
                  playerHealth: newPlayerHealth,
                  isPlayerTurn: false,
                  gameStatus: 'playing',
                  isAnimating: false,
                  turnTimer: 15,
                  isSawActive: false,
                });
                if (newShellsRemaining <= 0) {
                  get().reloadShotgun();
                }
              }
            } else {
              soundManager.play('turnStart');
              set({
                isPlayerTurn: true,
                gameStatus: 'playing',
                isAnimating: false,
                turnTimer: 15,
                isSawActive: false,
              });
              if (newShellsRemaining <= 0) {
                get().reloadShotgun();
              }
            }
          }, 1500);
        },

        useItem: async (item) => {
          const state = get();
          if (isRelayMode(state.transportMode)) {
            const { matchId, wallet, isPendingAction } = state;
            if (!matchId || !wallet || isPendingAction) return;
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
              match_id: matchId,
              player_wallet: wallet,
              action: 'UseItem',
              item_type: item as ItemType,
            });
            if (!res.success) {
              set({ 
                relayError: res.error || `Failed to use ${item}`,
                isPendingAction: false 
              });
            }
            return;
          }

          soundManager.play('itemUse');
          const newItems = { ...state.items };
          if (item === 'magnifyingGlass' && newItems.magnifyingGlass > 0) {
            newItems.magnifyingGlass -= 1;
            set({
              items: newItems,
              currentShell: state.chamber[0],
              showItemMenu: false,
            });
          }
          if (item === 'beer' && newItems.beer > 0) {
            newItems.beer -= 1;
            const nextShell = state.chamber[0];
            const newChamber = state.chamber.slice(1);
            const newShellsRemaining = state.shellsRemaining - 1;
            const isLive = nextShell === 'live';

            set({
              items: newItems,
              shellsRemaining: newShellsRemaining,
              chamber: newChamber,
              liveShells: isLive ? state.liveShells - 1 : state.liveShells,
              blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
              showItemMenu: false,
            });
            if (newShellsRemaining <= 0) {
              get().reloadShotgun();
            }
          }
          if (item === 'handcuffs' && newItems.handcuffs > 0) {
            newItems.handcuffs -= 1;
            set({
              items: newItems,
              dealerHandcuffed: true,
              showItemMenu: false,
            });
          }
          if (item === 'cigarettes' && newItems.cigarettes > 0 && state.playerHealth < 3) {
            newItems.cigarettes -= 1;
            set({
              items: newItems,
              playerHealth: state.playerHealth + 1,
              showItemMenu: false,
            });
          }
          if (item === 'saw' && newItems.saw > 0) {
            newItems.saw -= 1;
            set({
              items: newItems,
              isSawActive: true,
              showItemMenu: false,
            });
          }
          if (item === 'pill' && newItems.pill > 0) {
            newItems.pill -= 1;
            const heal = Math.random() < 0.5;
            const newPlayerHealth = heal
              ? Math.min(state.playerHealth + 2, 3)
              : Math.max(state.playerHealth - 1, 0);

            set({
              items: newItems,
              playerHealth: newPlayerHealth,
              showItemMenu: false,
            });

            if (newPlayerHealth <= 0) {
              set((current) => ({
                gameStatus: 'gameover',
                roundsLost: current.roundsLost + 1,
                totalLost: current.totalLost + current.betAmount,
              }));
            }
          }
        },

        fold: () => {
          if (isRelayMode(get().transportMode)) {
            return;
          }

          set((state) => ({
            gameStatus: 'round_end',
            roundsLost: state.roundsLost + 1,
            totalLost: state.totalLost + state.betAmount,
          }));
        },

        playAgain: () => {
          const { gameMode, betAmount } = get();
          if (gameMode === 'pvp') {
            set({
              gameStatus: 'setup',
              isSearching: false,
              ticketId: null,
              matchId: null,
              roomPubkey: null,
              roomPhase: null,
              turnWallet: null,
              lastSignature: null,
            });
            return;
          }

          if (gameMode) {
            set({ isRevealingShells: true });
            get().startGame(gameMode, betAmount);
          }
        },

        leaveTable: () => {
          if (get().gameMode === 'pvp') {
            get().returnToMenu();
            return;
          }
          set({ gameStatus: 'menu' });
        },

        setShowItemMenu: (show) => set({ showItemMenu: show }),

        decrementTimer: () => {
          const { transportMode, turnTimer, isPlayerTurn, gameStatus, isAnimating, isRevealingShells, playerHealth, roundsLost, totalLost, betAmount, roomUpdatedAt, relayTurnTimeoutSeconds } =
            get();
          
          if (isRelayMode(transportMode)) {
            if (!roomUpdatedAt || gameStatus !== 'playing' || isAnimating) return;
            
            const lastUpdate = new Date(roomUpdatedAt).getTime();
            const now = new Date().getTime();
            const elapsedSeconds = Math.floor((now - lastUpdate) / 1000);
            const remaining = Math.max(0, relayTurnTimeoutSeconds - elapsedSeconds);
            
            if (remaining !== turnTimer) {
              set({ turnTimer: remaining });
            }
            return;
          }

          if (
            !isPlayerTurn ||
            gameStatus !== 'playing' ||
            isAnimating ||
            isRevealingShells
          ) {
            return;
          }

          const newTimer = Math.max(0, turnTimer - 1);
          set({ turnTimer: newTimer });
          if (newTimer === 0) {
            const newPlayerHealth = playerHealth - 1;
            if (newPlayerHealth <= 0) {
              set({
                playerHealth: 0,
                gameStatus: 'gameover',
                roundsLost: roundsLost + 1,
                totalLost: totalLost + betAmount,
              });
            } else {
              set({
                playerHealth: newPlayerHealth,
                isPlayerTurn: false,
                turnTimer: 15,
              });
            }
          }
        },

        resetTurn: () => {
          soundManager.play('turnStart');
          set({
            isPlayerTurn: true,
            turnTimer: 15,
          });
        },

        dealerTurn: async () => {
          const { transportMode, isPlayerTurn, chamber, dealerItems, playerHandcuffed, isSawActive } = get();
          if (isRelayMode(transportMode) || isPlayerTurn || chamber.length === 0 || get().gameStatus !== 'playing') {
            return;
          }

          set({ isAnimating: true });

          const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
          await delay(1000);

          const currentDealerItems = { ...dealerItems };
          let knownShell: 'live' | 'blank' | 'unknown' = 'unknown';
          let sawUsed = isSawActive;

          const useItems = async () => {
            let itemsUsedThisTurn = 0;
            const maxItemsPerTurn = 2;

            let actionTaken = true;
            while (actionTaken && itemsUsedThisTurn < maxItemsPerTurn) {
              actionTaken = false;
              if (itemsUsedThisTurn > 0 && Math.random() < 0.4) break;

              if (currentDealerItems.cigarettes > 0 && get().dealerHealth < 3) {
                currentDealerItems.cigarettes -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                set({
                  dealerItems: { ...currentDealerItems },
                  dealerHealth: Math.min(get().dealerHealth + 1, 3),
                  dealerActionText: 'Dealer uses Cigarettes',
                });
                await delay(1500);
                set({ dealerActionText: null });
                actionTaken = true;
                continue;
              }

              if (currentDealerItems.magnifyingGlass > 0 && knownShell === 'unknown') {
                currentDealerItems.magnifyingGlass -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                knownShell = get().chamber[0];
                set({
                  dealerItems: { ...currentDealerItems },
                  dealerActionText: 'Dealer uses Magnifying Glass',
                });
                await delay(1500);
                set({ dealerActionText: null });
                actionTaken = true;
                continue;
              }

              if (currentDealerItems.beer > 0 && knownShell === 'blank') {
                currentDealerItems.beer -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                const ejectedShell = get().chamber[0];
                const isLive = ejectedShell === 'live';
                set((state) => ({
                  dealerItems: { ...currentDealerItems },
                  chamber: state.chamber.slice(1),
                  shellsRemaining: state.shellsRemaining - 1,
                  liveShells: isLive ? state.liveShells - 1 : state.liveShells,
                  blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
                  dealerActionText: 'Dealer uses Beer (Ejected a shell)',
                }));
                knownShell = 'unknown';
                await delay(1500);
                set({ dealerActionText: null });
                if (get().shellsRemaining <= 0) get().reloadShotgun();
                actionTaken = true;
                continue;
              }

              if (currentDealerItems.saw > 0 && knownShell === 'live' && !sawUsed) {
                currentDealerItems.saw -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                sawUsed = true;
                set({
                  dealerItems: { ...currentDealerItems },
                  isSawActive: true,
                  dealerActionText: 'Dealer uses Saw',
                });
                await delay(1500);
                set({ dealerActionText: null });
                actionTaken = true;
                continue;
              }

              if (currentDealerItems.handcuffs > 0 && !get().playerHandcuffed) {
                currentDealerItems.handcuffs -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                set({
                  dealerItems: { ...currentDealerItems },
                  playerHandcuffed: true,
                  dealerActionText: 'Dealer uses Handcuffs',
                });
                await delay(1500);
                set({ dealerActionText: null });
                actionTaken = true;
                continue;
              }

              if (currentDealerItems.pill > 0 && get().dealerHealth <= 1) {
                currentDealerItems.pill -= 1;
                itemsUsedThisTurn += 1;
                soundManager.play('itemUse');
                const heal = Math.random() < 0.5;
                const newHealth = heal ? Math.min(get().dealerHealth + 2, 3) : Math.max(get().dealerHealth - 1, 0);

                set({
                  dealerItems: { ...currentDealerItems },
                  dealerHealth: newHealth,
                  dealerActionText: heal ? 'Dealer uses Pill (Healed!)' : 'Dealer uses Pill (Damaged!)',
                });
                await delay(1500);
                set({ dealerActionText: null });

                if (newHealth <= 0) {
                  set((state) => ({
                    gameStatus: 'round_end',
                    roundsWon: state.roundsWon + 1,
                    totalWon: state.totalWon + state.betAmount,
                    isAnimating: false,
                  }));
                  return false;
                }
                actionTaken = true;
                continue;
              }
            }
            return true;
          };

          const continueTurn = await useItems();
          if (!continueTurn) return;

          const chamberArray = get().chamber;
          const nextShell = chamberArray[0];
          const isLive = nextShell === 'live';
          const damage = get().isSawActive ? 2 : 1;

          let shootSelf = false;
          if (knownShell === 'live' as any) {
            shootSelf = false;
          } else if (knownShell === 'blank' as any) {
            shootSelf = true;
          } else {
            const liveProb = get().liveShells / get().shellsRemaining;
            shootSelf = liveProb < 0.25;
          }

          set((state) => ({
            lastShotResult: nextShell,
            lastShotTarget: shootSelf ? 'dealer' : 'player',
            gameStatus: 'shot_animation',
            shellsRemaining: state.shellsRemaining - 1,
            chamber: state.chamber.slice(1),
            liveShells: isLive ? state.liveShells - 1 : state.liveShells,
            blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
            currentShell: 'unknown',
          }));

          soundManager.play(isLive ? 'shotLive' : 'shotBlank');

          await delay(1500);

          if (shootSelf) {
            if (isLive) {
              const newDealerHealth = Math.max(0, get().dealerHealth - damage);
              if (newDealerHealth <= 0) {
                set((state) => ({
                  dealerHealth: 0,
                  gameStatus: 'round_end',
                  roundsWon: state.roundsWon + 1,
                  totalWon: state.totalWon + state.betAmount,
                  isAnimating: false,
                  isSawActive: false,
                }));
              } else {
                const shouldPassTurn = !playerHandcuffed;
                if (shouldPassTurn) soundManager.play('turnStart');
                set({
                  dealerHealth: newDealerHealth,
                  isPlayerTurn: shouldPassTurn,
                  playerHandcuffed: false,
                  gameStatus: 'playing',
                  isAnimating: false,
                  turnTimer: 15,
                  isSawActive: false,
                });
                if (get().shellsRemaining <= 0) get().reloadShotgun();
              }
            } else {
              set({
                isPlayerTurn: false,
                gameStatus: 'playing',
                isAnimating: false,
                isSawActive: false,
              });
              if (get().shellsRemaining <= 0) get().reloadShotgun();
            }
          } else if (isLive) {
            const newPlayerHealth = Math.max(0, get().playerHealth - damage);
            if (newPlayerHealth <= 0) {
              set((state) => ({
                playerHealth: 0,
                gameStatus: 'gameover',
                roundsLost: state.roundsLost + 1,
                totalLost: state.totalLost + state.betAmount,
                isAnimating: false,
                isSawActive: false,
              }));
            } else {
              const shouldPassTurn = !playerHandcuffed;
              if (shouldPassTurn) soundManager.play('turnStart');
              set({
                playerHealth: newPlayerHealth,
                isPlayerTurn: shouldPassTurn,
                playerHandcuffed: false,
                gameStatus: 'playing',
                isAnimating: false,
                turnTimer: 15,
                isSawActive: false,
              });
              if (get().shellsRemaining <= 0) get().reloadShotgun();
            }
          } else {
            const shouldPassTurn = !playerHandcuffed;
            if (shouldPassTurn) soundManager.play('turnStart');
            set({
              isPlayerTurn: shouldPassTurn,
              playerHandcuffed: false,
              gameStatus: 'playing',
              isAnimating: false,
              turnTimer: 15,
              isSawActive: false,
            });
            if (get().shellsRemaining <= 0) get().reloadShotgun();
          }
        },
        resetPeek: () => set({ currentShell: 'unknown' }),

        createRoom: async (connection: Connection, wallet: any) => {
          const { matchId, betAmount, relayProgramId, opponentWallet } = get();
          if (!matchId || !relayProgramId || !wallet.publicKey || !opponentWallet) return;

          set({ isPendingAction: true, relayError: null });

          try {
            const programId = new PublicKey(relayProgramId);
            
            // Derive Room PDA using a 32-byte version of matchId to avoid "Max seed length exceeded"
            // We use the matchId string, but ensure it doesn't exceed 32 bytes for the seed.
            const matchIdSeed = new TextEncoder().encode(matchId).slice(0, 32);
            
            const [roomPubkey] = PublicKey.findProgramAddressSync(
              [
                new TextEncoder().encode('room'), 
                matchIdSeed
              ],
              programId
            );

            // Construct instruction
            const instruction = new TransactionInstruction({
              keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(opponentWallet), isSigner: false, isWritable: false },
                { pubkey: roomPubkey, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              programId,
              data: Buffer.from([
                0, // instruction index for create_room
                ...new TextEncoder().encode(matchId), // Data can still contain full ID
                ...new Uint8Array(new BigUint64Array([BigInt(lamportsFromSol(betAmount))]).buffer),
              ]),
            });

            const tx = new Transaction().add(instruction);
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signed = await wallet.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signed.serialize());
            
            await connection.confirmTransaction(signature, 'confirmed');

            // Notify relay
            relayClient.send({
              type: 'match.room_created',
              match_id: matchId,
              room_pubkey: roomPubkey.toBase58(),
              signature,
            });

            set({ 
              roomPubkey: roomPubkey.toBase58(),
              lastSignature: signature,
              isPendingAction: false 
            });
            
            soundManager.play('uiClick');
          } catch (error) {
            console.error('Failed to create room:', error);
            
            let errorMessage = 'Failed to create room on-chain';
            
            if (error instanceof SendTransactionError) {
              const logs = error.logs; // It's usually an array, not a promise
              console.log('Transaction Logs:', logs);
              
              if (logs && logs.length > 0) {
                // Try to find a specific program error in logs
                const programError = logs.find(l => l.includes('Program log: Error:'));
                if (programError) {
                  errorMessage = `Program Error: ${programError.split('Error: ')[1]}`;
                } else if (logs.some(l => l.includes('insufficient funds'))) {
                  errorMessage = 'Insufficient SOL to create room and pay entry fee.';
                }
              }
              
              if (error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
                errorMessage = 'Your wallet is empty or not initialized. Please airdrop some Devnet SOL.';
              } else if (!errorMessage.startsWith('Program Error') && !errorMessage.startsWith('Insufficient')) {
                errorMessage = `Solana Error: ${error.message}`;
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }

            set({ 
              relayError: errorMessage,
              isPendingAction: false 
            });
          }
        },
      };
    },
    {
      name: 'shell-shock-storage',
    },
  ),
);
