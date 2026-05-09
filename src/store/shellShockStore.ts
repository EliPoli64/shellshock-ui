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
          magnifyingGlass: 2,
          beer: 2,
          handcuffs: 2,
          cigarettes: 2,
          saw: 2,
          pill: 2,
        },
        dealerItems: {
          magnifyingGlass: 2,
          beer: 2,
          handcuffs: 2,
          cigarettes: 2,
          saw: 2,
          pill: 2,
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
                  magnifyingGlass: 2,
                  beer: 2,
                  handcuffs: 2,
                  cigarettes: 2,
                  saw: 2,
                  pill: 2,
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

        startGame: async (mode, bet) => {
          const { wallet } = get();
          
          // Reset transient flags
          set({ 
            isAnimating: false, 
            isRevealingShells: false, 
            isPendingAction: false,
            dealerActionText: null 
          });

          if (mode === 'pvp') {
            void get().openPvpSetup();
            set({ betAmount: bet });
            return;
          }

          // PvE Game Initialization via Backend
          if (!wallet) return;
          
          set({ isPendingAction: true });
          const res = await backendClient.startPvEGame(wallet, bet);
          
          if (res.success && res.initial_state) {
            const state = res.initial_state;
            set({
              gameMode: 'pve',
              transportMode: 'pve_mock',
              matchId: res.match_id,
              betAmount: bet,
              playerHealth: state.player_health,
              dealerHealth: state.dealer_health,
              shellsRemaining: state.shells_remaining,
              liveShells: state.live_shells,
              blankShells: state.blank_shells,
              items: state.items,
              dealerItems: state.dealer_items,
              isPlayerTurn: state.is_player_turn,
              gameStatus: (state as any).game_status as GameStatus || 'playing',
              isRevealingShells: true,
              isPendingAction: false,
              turnTimer: (state as any).turn_timer ?? 15,
            });

            window.setTimeout(() => {
              set({ isRevealingShells: false });
            }, 3000);
          } else {
            set({ 
              relayError: res.error || 'Failed to start PvE game',
              isPendingAction: false 
            });
          }
        },

        shootDealer: async () => {
          const { transportMode, matchId, wallet, isPendingAction, isPlayerTurn, gameStatus, isAnimating, isRevealingShells } = get();
          
          if (!matchId || !wallet || isPendingAction || !isPlayerTurn || gameStatus !== 'playing' || isAnimating || isRevealingShells) return;

          set({ isPendingAction: true });
          const res = await backendClient.sendAction({
            match_id: matchId,
            player_wallet: wallet,
            action: 'ShootDealer',
          });

          if (res.success && res.state_update) {
            const update = res.state_update;
            const result = update.last_action_result;
            const isLive = result?.is_live;
            
            // Trigger animation and update shell counts immediately
            set(state => ({
              lastShotResult: isLive ? 'live' : 'blank',
              lastShotTarget: 'dealer',
              gameStatus: 'shot_animation',
              isAnimating: true,
              isPendingAction: false,
              liveShells: isLive ? state.liveShells - 1 : state.liveShells,
              blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
              shellsRemaining: state.shellsRemaining - 1,
            }));

            soundManager.play(isLive ? 'shotLive' : 'shotBlank');

            window.setTimeout(() => {
              const wasReloaded = update.last_action_result?.item_effect?.includes("reloaded");
              const isGameOver = update.game_status === 'gameover';
              
              set({
                playerHealth: update.player_health,
                dealerHealth: update.dealer_health,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
                items: update.items,
                dealerItems: update.dealer_items,
                isPlayerTurn: update.is_player_turn,
                gameStatus: update.game_status as GameStatus,
                isAnimating: false,
                isSawActive: update.is_saw_active,
                playerHandcuffed: update.player_handcuffed,
                dealerHandcuffed: update.dealer_handcuffed,
                turnTimer: update.turn_timer ?? 15,
                // Removed isRevealingShells and dealerActionText from here to delay them
              });

              if (isGameOver) {
                const won = update.player_health > 0;
                soundManager.play(won ? 'win' : 'loss');
                if (won) {
                  set(state => ({ 
                    roundsWon: state.roundsWon + 1,
                    totalWon: state.totalWon + state.betAmount 
                  }));
                } else {
                  set(state => ({ 
                    roundsLost: state.roundsLost + 1,
                    totalLost: state.totalLost + state.betAmount 
                  }));
                }
              }

              if (wasReloaded) {
                window.setTimeout(() => {
                  set({ 
                    isRevealingShells: true,
                    dealerActionText: "SHOTGUN RELOADED"
                  });
                  window.setTimeout(() => {
                    set({ 
                      isRevealingShells: false,
                      dealerActionText: null
                    });
                  }, 3000);
                }, 1000);
              }
            }, 1500);
          } else {
            set({ 
              relayError: res.error || 'Failed to shoot dealer',
              isPendingAction: false 
            });
          }
        },

        shootSelf: async () => {
          const { matchId, wallet, isPendingAction, isPlayerTurn, gameStatus, isAnimating, isRevealingShells } = get();
          
          if (!matchId || !wallet || isPendingAction || !isPlayerTurn || gameStatus !== 'playing' || isAnimating || isRevealingShells) return;

          set({ isPendingAction: true });
          const res = await backendClient.sendAction({
            match_id: matchId,
            player_wallet: wallet,
            action: 'ShootSelf',
          });

          if (res.success && res.state_update) {
            const update = res.state_update;
            const result = update.last_action_result;
            const isLive = result?.is_live;
            
            // Trigger animation and update shell counts immediately
            set(state => ({
              lastShotResult: isLive ? 'live' : 'blank',
              lastShotTarget: 'player',
              gameStatus: 'shot_animation',
              isAnimating: true,
              isPendingAction: false,
              liveShells: isLive ? state.liveShells - 1 : state.liveShells,
              blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
              shellsRemaining: state.shellsRemaining - 1,
            }));

            soundManager.play(isLive ? 'shotLive' : 'shotBlank');

            window.setTimeout(() => {
              const wasReloaded = update.last_action_result?.item_effect?.includes("reloaded");
              const isGameOver = update.game_status === 'gameover';

              set({
                playerHealth: update.player_health,
                dealerHealth: update.dealer_health,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
                items: update.items,
                dealerItems: update.dealer_items,
                isPlayerTurn: update.is_player_turn,
                gameStatus: update.game_status as GameStatus,
                isAnimating: false,
                isSawActive: update.is_saw_active,
                playerHandcuffed: update.player_handcuffed,
                dealerHandcuffed: update.dealer_handcuffed,
                turnTimer: update.turn_timer ?? 15,
                // Removed isRevealingShells and dealerActionText from here to delay them
              });

              if (isGameOver) {
                const won = update.player_health > 0;
                soundManager.play(won ? 'win' : 'loss');
                if (won) {
                  set(state => ({ 
                    roundsWon: state.roundsWon + 1,
                    totalWon: state.totalWon + state.betAmount 
                  }));
                } else {
                  set(state => ({ 
                    roundsLost: state.roundsLost + 1,
                    totalLost: state.totalLost + state.betAmount 
                  }));
                }
              }

              if (wasReloaded) {
                window.setTimeout(() => {
                  set({ 
                    isRevealingShells: true,
                    dealerActionText: "SHOTGUN RELOADED"
                  });
                  window.setTimeout(() => {
                    set({ 
                      isRevealingShells: false,
                      dealerActionText: null
                    });
                  }, 3000);
                }, 1000);
              }
            }, 1500);
          } else {
            set({ 
              relayError: res.error || 'Failed to shoot self',
              isPendingAction: false 
            });
          }
        },

        useItem: async (item) => {
          const { matchId, wallet, isPendingAction, isPlayerTurn, gameStatus, isAnimating, isRevealingShells } = get();
          
          if (!matchId || !wallet || isPendingAction || !isPlayerTurn || gameStatus !== 'playing' || isAnimating || isRevealingShells) return;

          set({ isPendingAction: true });
          const res = await backendClient.sendAction({
            match_id: matchId,
            player_wallet: wallet,
            action: 'UseItem',
            item_type: item as ItemType,
          });

          if (res.success && res.state_update) {
            const update = res.state_update;
            soundManager.play('itemUse');

            const itemEffect = update.last_action_result?.item_effect;
            if (itemEffect) {
              set({ dealerActionText: itemEffect.toUpperCase() });
              window.setTimeout(() => set({ dealerActionText: null }), 3000);
            }

            const wasReloaded = itemEffect?.includes("reloaded");

            set({
              playerHealth: update.player_health,
              dealerHealth: update.dealer_health,
              shellsRemaining: update.shells_remaining,
              liveShells: update.live_shells,
              blankShells: update.blank_shells,
              items: update.items,
              dealerItems: update.dealer_items,
              isPlayerTurn: update.is_player_turn,
              currentShell: update.chamber_peek || 'unknown',
              isSawActive: update.is_saw_active,
              playerHandcuffed: update.player_handcuffed,
              dealerHandcuffed: update.dealer_handcuffed,
              turnTimer: update.turn_timer ?? 15,
              isPendingAction: false,
              isRevealingShells: wasReloaded ? true : get().isRevealingShells
            });

            if (wasReloaded) {
              window.setTimeout(() => {
                set({ isRevealingShells: false });
              }, 3000);
            }
          } else {
            set({ 
              relayError: res.error || `Failed to use ${item}`,
              isPendingAction: false 
            });
          }
        },

        fold: async () => {
          const { transportMode, matchId, wallet, isPendingAction, isPlayerTurn, gameStatus, isAnimating, isRevealingShells } = get();
          
          if (isRelayMode(transportMode)) {
            return;
          }

          if (!matchId || !wallet || isPendingAction || !isPlayerTurn || gameStatus !== 'playing' || isAnimating || isRevealingShells) return;

          set({ isPendingAction: true });
          const res = await backendClient.sendAction({
             match_id: matchId,
             player_wallet: wallet,
             action: 'Fold',
           });

          if (res.success && res.state_update) {
            const update = res.state_update;
            set({
              playerHealth: update.player_health,
              dealerHealth: update.dealer_health,
              gameStatus: update.game_status as GameStatus,
              isPendingAction: false,
              roundsLost: get().roundsLost + 1,
              totalLost: get().totalLost + get().betAmount,
              dealerActionText: "PLAYER FOLDED"
            });
            window.setTimeout(() => set({ dealerActionText: null }), 2000);
          } else {
            set({ isPendingAction: false });
          }
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

        decrementTimer: async () => {
          const { transportMode, turnTimer, isPlayerTurn, gameStatus, isAnimating, isRevealingShells, roomUpdatedAt, relayTurnTimeoutSeconds, matchId, wallet } =
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

          if (newTimer === 0 && matchId && wallet) {
            set({ isPendingAction: true });
            const res = await backendClient.sendAction({
               match_id: matchId,
               player_wallet: wallet,
               action: 'Timeout',
             });

            if (res.success && res.state_update) {
              const update = res.state_update;
              set({
                playerHealth: update.player_health,
                dealerHealth: update.dealer_health,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
                items: update.items,
                dealerItems: update.dealer_items,
                isPlayerTurn: update.is_player_turn,
                isSawActive: update.is_saw_active,
                playerHandcuffed: update.player_handcuffed,
                dealerHandcuffed: update.dealer_handcuffed,
                gameStatus: update.game_status as GameStatus,
                isPendingAction: false,
                turnTimer: 15,
                dealerActionText: update.last_action_result?.item_effect || "TIMEOUT!"
              });
              
              window.setTimeout(() => set({ dealerActionText: null }), 2000);
            } else {
              set({ isPendingAction: false });
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
          const { matchId } = get();

          if (!matchId) return;

          set({ isAnimating: true });
          const response = await backendClient.getDealerTurn({
            match_id: matchId
          });

          if (response.success) {
            const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
            
            for (const action of response.actions) {
              if (action.type === 'UseItem') {
                soundManager.play('itemUse');
                
                const displayMessage = action.result 
                  ? `Dealer uses ${action.item}: ${action.result}`
                  : `Dealer uses ${action.item}`;
                
                set({ dealerActionText: displayMessage });
                
                // Instant UI update for better feel
                if (action.item === 'cigarettes') {
                  set(state => ({ dealerHealth: Math.min(state.dealerHealth + 1, 3) }));
                } else if (action.item === 'pill' && action.result) {
                  if (action.result.includes('Healed 2 HP')) {
                    set(state => ({ dealerHealth: Math.min(state.dealerHealth + 2, 3) }));
                  } else if (action.result.includes('Lost 1 HP')) {
                    set(state => ({ dealerHealth: Math.max(state.dealerHealth - 1, 1) }));
                  }
                }
                
                await delay(2000);
                set({ dealerActionText: null });
              } else if (action.type === 'ShootDealer' || action.type === 'ShootPlayer') {
                const target = action.type === 'ShootDealer' ? 'dealer' : 'player';
                const isLive = action.is_live;
                
                // Update shell counts immediately for dealer shots too
                set(state => ({
                  lastShotResult: isLive ? 'live' : 'blank',
                  lastShotTarget: target,
                  gameStatus: 'shot_animation',
                  isAnimating: true,
                  liveShells: isLive ? state.liveShells - 1 : state.liveShells,
                  blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
                  shellsRemaining: state.shellsRemaining - 1,
                }));

                soundManager.play(isLive ? 'shotLive' : 'shotBlank');
                await delay(1500);

                // Basic health update for animation
                if (isLive) {
                  const damage = action.damage || 1;
                  if (target === 'player') {
                    set(state => ({ playerHealth: Math.max(0, state.playerHealth - damage) }));
                  } else {
                    set(state => ({ dealerHealth: Math.max(0, state.dealerHealth - damage) }));
                  }
                }
                
                set({ gameStatus: 'playing' });
                await delay(1000); // Delay after shot animation ends
              } else if (action.type === 'Reload') {
                set({ 
                  isRevealingShells: true,
                  dealerActionText: "SHOTGUN RELOADED"
                });
                
                window.setTimeout(() => {
                  set({ 
                    isRevealingShells: false,
                    dealerActionText: null
                  });
                }, 3000);
                await delay(3000);
              } else if (action.type === 'Info') {
                if (action.result) {
                  set({ dealerActionText: action.result.toUpperCase() });
                  await delay(2000);
                  set({ dealerActionText: null });
                }
              }
            }

            // FINAL SYNC - Trust the backend state update completely
            if (response.state_update) {
              const update = response.state_update;
              set({
                playerHealth: update.player_health,
                dealerHealth: update.dealer_health,
                shellsRemaining: update.shells_remaining,
                liveShells: update.live_shells,
                blankShells: update.blank_shells,
                items: update.items,
                dealerItems: update.dealer_items,
                isPlayerTurn: update.is_player_turn,
                gameStatus: update.game_status as GameStatus,
                isAnimating: false,
                isSawActive: update.is_saw_active,
                playerHandcuffed: update.player_handcuffed,
                dealerHandcuffed: update.dealer_handcuffed,
                turnTimer: update.turn_timer ?? 15
              });
              
              if (update.game_status === 'gameover') {
                const won = update.player_health > 0;
                soundManager.play(won ? 'win' : 'loss');
              } else if (update.is_player_turn) {
                soundManager.play('turnStart');
              }
            } else {
              set({ isAnimating: false });
            }
            return;
          } else {
            console.error('Dealer backend error:', response.error);
            set({ isAnimating: false });
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
