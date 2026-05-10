import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SendTransactionError
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { soundManager } from '../utils/soundEffects';
import { relayClient } from '../lib/relayClient';
import { backendClient } from '../lib/backendClient';
import type { RelayRoomPhase, RelayServerMessage } from '../types/relay';
import type { ItemType } from '../types/backend';
import * as gameSdk from '../lib/game-sdk';
import type { GameRoom, ItemsCount } from '../lib/game-sdk/types';
import { itemsVecToCounts, gameStateToString } from '../lib/game-sdk/types';

type GameMode = 'pve' | 'pvp' | null;
type GameStatus = 'menu' | 'setup' | 'playing' | 'shot_animation' | 'round_end' | 'gameover';
type TransportMode = 'pve_solana' | 'pvp_relay' | null;
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
  maxHealth: number;
  shellsRemaining: number;
  liveShells: number;
  blankShells: number;
  currentShell: 'live' | 'blank' | 'unknown';
  isPlayerTurn: boolean;
  turnTimer: number;
  isSawActive: boolean;

  items: ItemsCount;
  dealerItems: ItemsCount;
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
    items: ItemsCount;
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
  decrementTimer: () => void;
  resetPeek: () => void;
  createRoom: (connection: Connection, wallet: any) => Promise<void>;
  initSolana: (connection: Connection, wallet: WalletContextState) => void;
}

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

function applyGameRoomToState(room: GameRoom): Partial<ShellShockState> {
  const stateStr = gameStateToString(room.state);
  const isPlayerTurn = stateStr === 'playerTurn';
  const isDealerTurn = stateStr === 'dealerTurn';
  const isFinished = stateStr === 'finished';
  const isWaiting = stateStr === 'waitingToStart';

  let gameStatus: GameStatus = 'playing';
  if (isFinished) {
    gameStatus = room.hpPlayer <= 0 ? 'gameover' : 'round_end';
  } else if (isWaiting) {
    gameStatus = 'setup';
  }

  const blankShells = room.shellsTotal - room.shellsLive;

  return {
    playerHealth: room.hpPlayer,
    dealerHealth: room.hpDealer,
    maxHealth: room.maxHp,
    shellsRemaining: room.shellsTotal,
    liveShells: room.shellsLive,
    blankShells,
    currentShell: 'unknown',
    isPlayerTurn: isPlayerTurn || (isDealerTurn ? false : isPlayerTurn),
    isSawActive: room.sawActive,
    dealerHandcuffed: room.dealerCuffed,
    playerHandcuffed: room.playerCuffed,
    items: itemsVecToCounts(room.itemsPlayer),
    dealerItems: itemsVecToCounts(room.itemsDealer),
    gameStatus,
    isPendingAction: false,
  };
}

let _connection: Connection | null = null;
let _wallet: WalletContextState | null = null;
let _unsubEvents: (() => void) | null = null;

export const useShellShockStore = create<ShellShockState>()(
  persist(
    (set, get) => {

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

      const handleEvent = (event: any) => {
        if (!event) return;
        const name = event.name;
        const data = event.data;

        switch (name) {
          case 'ShellFired': {
            const isLive = data.wasLive;
            const target = data.target === 0 ? 'player' : 'dealer';
            set({
              lastShotResult: isLive ? 'live' : 'blank',
              lastShotTarget: target,
              gameStatus: 'shot_animation',
              isAnimating: true,
            });
            soundManager.play(isLive ? 'shotLive' : 'shotBlank');
            window.setTimeout(() => {
              set({ gameStatus: 'playing', isAnimating: false });
            }, 1500);
            break;
          }
          case 'ItemUsed': {
            soundManager.play('itemUse');
            if (data.player !== 0) {
              set({ dealerActionText: `Dealer uses ${data.item}` });
              window.setTimeout(() => set({ dealerActionText: null }), 1500);
            }
            break;
          }
          case 'GameFinished': {
            const winner = data.winner;
            const isPlayerWin = winner === 0;
            set(s => ({
              gameStatus: isPlayerWin ? 'round_end' : 'gameover',
              roundsWon: isPlayerWin ? s.roundsWon + 1 : s.roundsWon,
              roundsLost: isPlayerWin ? s.roundsLost : s.roundsLost + 1,
              totalWon: isPlayerWin ? s.totalWon + s.betAmount : s.totalWon,
              totalLost: isPlayerWin ? s.totalLost : s.totalLost + s.betAmount,
            }));
            soundManager.play(isPlayerWin ? 'win' : 'loss');
            break;
          }
          case 'RoundReloaded': {
            set({ isRevealingShells: true });
            window.setTimeout(() => set({ isRevealingShells: false }), 2500);
            break;
          }
          case 'MagnifyingGlassReveal': {
            set({ currentShell: data.isLive ? 'live' : 'blank' });
            break;
          }
          case 'DealerAction': {
            set({ dealerActionText: `Dealer ${data.action}` });
            window.setTimeout(() => set({ dealerActionText: null }), 1500);
            break;
          }
          case 'TurnChanged': {
            set({ isPlayerTurn: data.newTurn === 0 });
            if (data.newTurn === 0) {
              soundManager.play('turnStart');
            }
            break;
          }
        }
      };

      const refetchAndSync = async () => {
        if (!_connection || !_wallet?.publicKey) return;
        const room = await gameSdk.solana.fetchGameState(_connection, _wallet.publicKey);
        if (room) {
          set(applyGameRoomToState(room));
        }
      };

      const executeDealerLoop = async () => {
        if (!_connection || !_wallet?.publicKey) return;

        let safety = 0;
        while (safety < 10) {
          safety++;
          const state = get();

          if (state.gameStatus !== 'playing') break;

          try {
            const sig = await gameSdk.solana.executeDealerTurn(_connection, _wallet);
            set({ lastSignature: sig });

            const room = await gameSdk.solana.fetchGameState(_connection, _wallet.publicKey);
            if (!room) break;

            set(applyGameRoomToState(room));

            const stateStr = gameStateToString(room.state);
            if (stateStr === 'playerTurn' || stateStr === 'finished') break;

            await new Promise(r => setTimeout(r, 1000));
          } catch (err) {
            console.error('Dealer turn error:', err);
            break;
          }
        }
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
        maxHealth: 5,
        shellsRemaining: 0,
        liveShells: 0,
        blankShells: 0,
        currentShell: 'unknown',
        isPlayerTurn: true,
        turnTimer: 30,
        isSawActive: false,

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

        connectWallet: (wallet, solBalance = 0) => set({ wallet, solBalance }),

        initSolana: (connection, wallet) => {
          _connection = connection;
          _wallet = wallet;

          if (_unsubEvents) {
            _unsubEvents();
            _unsubEvents = null;
          }

          if (wallet.publicKey) {
            _unsubEvents = gameSdk.listenForEvents(
              connection,
              wallet.publicKey,
              handleEvent,
            );
          }
        },

        // ---- Relay / PvP ----
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
          if (_unsubEvents) { _unsubEvents(); _unsubEvents = null; }
          set({
            gameMode: null, transportMode: null, gameStatus: 'menu',
            isSearching: false, ticketId: null, matchId: null, pvpRole: null,
            opponentWallet: null, roomPubkey: null, roomPhase: null, turnWallet: null,
            roomUpdatedAt: null, lastSignature: null, queueAheadCount: 0, sameBetCount: 0,
            relayConnectionState: 'idle', relayError: null, showItemMenu: false,
            isPendingAction: false,
          });
        },

        // ---- startGame ----
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

          if (!_connection || !_wallet?.publicKey) {
            set({ relayError: 'Wallet not connected' });
            return;
          }

          set({
            gameMode: 'pve',
            transportMode: 'pve_solana',
            matchId: `pve_${Date.now()}`,
            betAmount: bet,
            isPendingAction: true,
          });

          try {
            const betLamports = lamportsFromSol(bet);
            const sig = await gameSdk.solana.createRoom(_connection, _wallet, betLamports);
            set({ lastSignature: sig });

            const room = await gameSdk.solana.fetchGameState(_connection, _wallet.publicKey);
            if (room) {
              set({
                ...applyGameRoomToState(room),
                gameStatus: 'playing',
                isPendingAction: false,
              });
            }
          } catch (error: any) {
            set({ isPendingAction: false, relayError: gameSdk.parseAnchorError(error) });
          }
        },

        // ---- shootDealer ----
        shootDealer: async () => {
          const state = get();

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

          if (!_connection || !_wallet?.publicKey) return;
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;

          set({ isPendingAction: true, showItemMenu: false });

          try {
            const sig = await gameSdk.solana.shoot(_connection, _wallet, { opponent: {} });
            set({ lastSignature: sig });
            await refetchAndSync();
            set({ isPendingAction: false, turnTimer: 30 });

            const ns = get();
            if (ns.gameStatus === 'playing' && !ns.isPlayerTurn) {
              setTimeout(() => executeDealerLoop(), 500);
            }
          } catch (error: any) {
            set({ isPendingAction: false, relayError: gameSdk.parseAnchorError(error) });
          }
        },

        // ---- shootSelf ----
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

          if (!_connection || !_wallet?.publicKey) return;
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;

          set({ isPendingAction: true, showItemMenu: false });

          try {
            const sig = await gameSdk.solana.shoot(_connection, _wallet, { self: {} });
            set({ lastSignature: sig });
            await refetchAndSync();
            set({ isPendingAction: false, turnTimer: 30 });

            const ns = get();
            if (ns.gameStatus === 'playing' && !ns.isPlayerTurn) {
              setTimeout(() => executeDealerLoop(), 500);
            }
          } catch (error: any) {
            set({ isPendingAction: false, relayError: gameSdk.parseAnchorError(error) });
          }
        },

        // ---- useItem ----
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

          if (!_connection || !_wallet?.publicKey) return;
          if (state.isPendingAction || !state.isPlayerTurn || state.gameStatus !== 'playing' || state.isAnimating) return;

          const anchorItemType = mapItemToAnchor(itemKey);
          if (!anchorItemType) return;

          set({ isPendingAction: true });

          try {
            const sig = await gameSdk.solana.useItem(_connection, _wallet, anchorItemType);
            set({ lastSignature: sig });
            await refetchAndSync();
            set({ isPendingAction: false, turnTimer: 30 });

            const ns = get();
            if (ns.gameStatus === 'playing' && !ns.isPlayerTurn) {
              setTimeout(() => executeDealerLoop(), 500);
            }
          } catch (error: any) {
            set({ isPendingAction: false, relayError: gameSdk.parseAnchorError(error) });
          }
        },

        // ---- fold ----
        fold: () => {
          if (isRelayMode(get().transportMode)) return;
          set(s => ({
            gameStatus: 'round_end',
            roundsLost: s.roundsLost + 1,
            totalLost: s.totalLost + s.betAmount,
          }));
        },

        // ---- playAgain / leaveTable ----
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
          if (_unsubEvents) { _unsubEvents(); _unsubEvents = null; }
          set({ gameStatus: 'menu' });
        },

        setShowItemMenu: (show) => set({ showItemMenu: show }),

        // ---- decrementTimer ----
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
            const newHealth = playerHealth - 1;
            if (newHealth <= 0) {
              set({
                playerHealth: 0, gameStatus: 'gameover',
                roundsLost: roundsLost + 1, totalLost: totalLost + betAmount,
              });
            } else {
              set({ playerHealth: newHealth, isPlayerTurn: false, turnTimer: 30 });
              setTimeout(() => {
                if (get().gameStatus === 'playing' && !get().isPlayerTurn) executeDealerLoop();
              }, 500);
            }
          }
        },

        resetTurn: () => {
          soundManager.play('turnStart');
          set({ isPlayerTurn: true, turnTimer: 30 });
        },

        resetPeek: () => set({ currentShell: 'unknown' }),

        // ---- dealerTurn (PvP relay only) ----
        dealerTurn: async () => {
          const state = get();
          if (!isRelayMode(state.transportMode)) return;
          if (state.isPlayerTurn || state.gameStatus !== 'playing' || state.isPendingAction) return;

          set({ isPendingAction: true, isAnimating: true });

          try {
            const res = await backendClient.getDealerTurn({
              match_id: state.matchId!,
              player_health: state.playerHealth,
              dealer_health: state.dealerHealth,
              shells_remaining: state.shellsRemaining,
              live_shells: state.liveShells,
              blank_shells: state.blankShells,
              items: state.items,
              player_handcuffed: state.playerHandcuffed,
            });

            if (res.success) {
              for (const action of res.actions) {
                switch (action.type) {
                  case 'UseItem':
                    soundManager.play('itemUse');
                    set({ dealerActionText: `Dealer uses ${action.item}` });
                    await new Promise(r => setTimeout(r, 1200));
                    break;
                  case 'ShootSelf':
                  case 'ShootPlayer': {
                    const isLive = action.is_live!;
                    set({
                      lastShotResult: isLive ? 'live' : 'blank',
                      lastShotTarget: action.type === 'ShootSelf' ? 'dealer' : 'player',
                      gameStatus: 'shot_animation',
                      isAnimating: true,
                    });
                    soundManager.play(isLive ? 'shotLive' : 'shotBlank');
                    await new Promise(r => setTimeout(r, 1500));
                    break;
                  }
                }
              }

              await refetchAndSync();
            }
          } catch {
            // fall through
          }

          set({ isAnimating: false, isPendingAction: false, dealerActionText: null });
        },

        // ---- PvP createRoom (relay flow) ----
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

function mapItemToAnchor(itemKey: string): any {
  const map: Record<string, any> = {
    magnifyingGlass: { magnifyingGlass: {} },
    beer: { beer: {} },
    handcuffs: { handcuffs: {} },
    cigarettes: { cigarettes: {} },
    saw: { handSaw: {} },
    pill: { pills: {} },
  };
  return map[itemKey] || null;
}
