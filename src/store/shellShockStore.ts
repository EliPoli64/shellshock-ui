import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { relayClient } from '../lib/relayClient';
import type { RelayRoomPhase, RelayServerMessage } from '../types/relay';

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
  dealerHandcuffed: boolean;

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

  logicHttpUrl: string;
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
  shootDealer: () => void;
  shootSelf: () => void;
  useItem: (item: string) => void;
  fold: () => void;
  playAgain: () => void;
  leaveTable: () => void;
  setShowItemMenu: (show: boolean) => void;
  resetTurn: () => void;
  dealerTurn: () => void;
  reloadShotgun: () => void;
  decrementTimer: () => void;
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
        dealerHandcuffed: false,

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

        logicHttpUrl: import.meta.env.VITE_LOGIC_HTTP_URL || 'http://localhost:3010',
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
              set({
                roomPubkey: message.room_pubkey,
                roomPhase: message.phase,
                turnWallet: message.turn_wallet,
                roomUpdatedAt: message.updated_at,
                lastSignature: message.last_signature,
                gameStatus: mapPhaseToGameStatus(message.phase),
                isSearching: false,
              });
              break;
            case 'room.event':
              if (message.event_type === 'program_logs') {
                const payload = message.payload as { signature?: string };
                set({ lastSignature: payload.signature || get().lastSignature });
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
            isRevealingShells: true,
          });

          window.setTimeout(() => {
            set({ isRevealingShells: false });
          }, 3000);
        },

        startGame: async (mode, bet) => {
          if (mode === 'pvp') {
            void get().openPvpSetup();
            set({ betAmount: bet });
            return;
          }

          set({
            gameStatus: 'setup',
            betAmount: bet,
            isRevealingShells: true,
          });

          try {
            const res = await fetch(`${get().logicHttpUrl}/match/pve/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: get().wallet || 'offline', bet_lamports: bet })
            });

            if (res.ok) {
              const data = await res.json();
              const state = data.initial_state;
              set({
                gameMode: mode,
                transportMode: 'pve_mock',
                matchId: data.match_id,
                gameStatus: 'playing',
                playerHealth: state.player_health,
                dealerHealth: state.dealer_health,
                shellsRemaining: state.shells_remaining,
                liveShells: state.live_shells,
                blankShells: state.blank_shells,
                currentShell: 'unknown',
                isPlayerTurn: state.is_player_turn,
                turnTimer: 15,
                isSawActive: false,
                dealerHandcuffed: false,
                items: {
                  magnifyingGlass: state.items.magnifyingGlass || 0,
                  beer: state.items.beer || 0,
                  handcuffs: state.items.handcuffs || 0,
                  cigarettes: state.items.cigarettes || 0,
                  saw: state.items.saw || 0,
                  pill: state.items.pill || 0,
                }
              });

              const minLive = state.live_shells;
              const blankCount = state.blank_shells;
              const shells: ('live' | 'blank')[] = [
                ...Array(minLive).fill('live'),
                ...Array(blankCount).fill('blank'),
              ];
              for (let i = shells.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shells[i], shells[j]] = [shells[j], shells[i]];
              }
              set({ chamber: shells });

              window.setTimeout(() => {
                set({ isRevealingShells: false });
              }, 3000);
            }
          } catch(e) {
            console.error(e);
            set({ gameStatus: 'menu' });
          }
        },

        shootDealer: async () => {
          const { transportMode, isPlayerTurn, matchId, isAnimating, logicHttpUrl, wallet } = get();
          if (isRelayMode(transportMode) || !isPlayerTurn || !matchId || isAnimating) {
            return;
          }

          set({ isAnimating: true });

          try {
            const res = await fetch(`${logicHttpUrl}/match/pve/${matchId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ match_id: matchId, player_wallet: wallet || 'offline', action: 'ShootDealer' })
            });

            if (res.ok) {
              const data = await res.json();
              const update = data.state_update;
              const resultData = update.last_action_result;
              const isLive = resultData ? resultData.is_live : false;
              
              set((state) => ({
                lastShotResult: isLive ? 'live' : 'blank',
                lastShotTarget: 'dealer',
                gameStatus: 'shot_animation',
                shellsRemaining: update.state.shells_remaining,
                liveShells: update.state.live_shells,
                blankShells: update.state.blank_shells,
                chamber: state.chamber.slice(1),
                currentShell: 'unknown',
                playerHealth: update.state.player_health,
                dealerHealth: update.state.dealer_health,
                isSawActive: false,
                dealerHandcuffed: false,
              }));

              window.setTimeout(() => {
                set((state) => ({
                  gameStatus: update.game_status as any,
                  isPlayerTurn: update.state.is_player_turn,
                  isAnimating: false,
                  turnTimer: 15,
                }));
                
                if (update.game_status === 'round_end') {
                  set((state) => ({ roundsWon: state.roundsWon + 1, totalWon: state.totalWon + state.betAmount }));
                }

                if (update.game_status === 'playing' && update.state.shells_remaining === 6) {
                  get().reloadShotgun();
                }
              }, 1500);
            } else {
              set({ isAnimating: false });
            }
          } catch(e) {
            console.error(e);
            set({ isAnimating: false });
          }
        },

        shootSelf: async () => {
          const { transportMode, isPlayerTurn, matchId, isAnimating, logicHttpUrl, wallet } = get();
          if (isRelayMode(transportMode) || !isPlayerTurn || !matchId || isAnimating) {
            return;
          }

          set({ isAnimating: true });

          try {
            const res = await fetch(`${logicHttpUrl}/match/pve/${matchId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ match_id: matchId, player_wallet: wallet || 'offline', action: 'ShootSelf' })
            });

            if (res.ok) {
              const data = await res.json();
              const update = data.state_update;
              const resultData = update.last_action_result;
              const isLive = resultData ? resultData.is_live : false;
              
              set((state) => ({
                lastShotResult: isLive ? 'live' : 'blank',
                lastShotTarget: 'player',
                gameStatus: 'shot_animation',
                shellsRemaining: update.state.shells_remaining,
                liveShells: update.state.live_shells,
                blankShells: update.state.blank_shells,
                chamber: state.chamber.slice(1),
                currentShell: 'unknown',
                playerHealth: update.state.player_health,
                dealerHealth: update.state.dealer_health,
                isSawActive: false,
              }));

              window.setTimeout(() => {
                set((state) => ({
                  gameStatus: update.game_status as any,
                  isPlayerTurn: update.state.is_player_turn,
                  isAnimating: false,
                  turnTimer: 15,
                }));
                
                if (update.game_status === 'gameover') {
                  set((state) => ({ roundsLost: state.roundsLost + 1, totalLost: state.totalLost + state.betAmount }));
                }

                if (update.game_status === 'playing' && update.state.shells_remaining === 6) {
                  get().reloadShotgun();
                }
              }, 1500);
            } else {
              set({ isAnimating: false });
            }
          } catch(e) {
            console.error(e);
            set({ isAnimating: false });
          }
        },

        useItem: async (item) => {
          const { transportMode, isPlayerTurn, matchId, isAnimating, logicHttpUrl, wallet } = get();
          if (isRelayMode(transportMode) || !isPlayerTurn || !matchId || isAnimating) {
            return;
          }

          set({ showItemMenu: false });

          try {
            const res = await fetch(`${logicHttpUrl}/match/pve/${matchId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ match_id: matchId, player_wallet: wallet || 'offline', action: 'UseItem', item_type: item })
            });

            if (res.ok) {
              const data = await res.json();
              const update = data.state_update;

              set((state) => ({
                shellsRemaining: update.state.shells_remaining,
                liveShells: update.state.live_shells,
                blankShells: update.state.blank_shells,
                chamber: update.state.shells_remaining < state.chamber.length ? state.chamber.slice(1) : state.chamber,
                currentShell: update.chamber_peek === 'live' ? 'live' : update.chamber_peek === 'blank' ? 'blank' : state.currentShell,
                playerHealth: update.state.player_health,
                dealerHealth: update.state.dealer_health,
                gameStatus: update.game_status as any,
                items: {
                  magnifyingGlass: update.state.items.magnifyingGlass || 0,
                  beer: update.state.items.beer || 0,
                  handcuffs: update.state.items.handcuffs || 0,
                  cigarettes: update.state.cigarettes || 0,
                  saw: update.state.items.saw || 0,
                  pill: update.state.items.pill || 0,
                },
                dealerHandcuffed: update.state.dealer_handcuffed || false,
                isSawActive: item === 'saw' ? true : state.isSawActive,
              }));
              
              if (update.game_status === 'gameover') {
                set((state) => ({ roundsLost: state.roundsLost + 1, totalLost: state.totalLost + state.betAmount }));
              }
              if (update.game_status === 'playing' && update.state.shells_remaining === 6) {
                get().reloadShotgun();
              }
            }
          } catch(e) {
            console.error(e);
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
          const { transportMode, turnTimer, isPlayerTurn, gameStatus, isAnimating, isRevealingShells, playerHealth, roundsLost, totalLost, betAmount } =
            get();
          if (
            isRelayMode(transportMode) ||
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
          set({
            isPlayerTurn: true,
            turnTimer: 15,
          });
        },

        dealerTurn: async () => {
          const { transportMode, isPlayerTurn, matchId, logicHttpUrl, isRevealingShells, isAnimating, gameStatus } =
            get();
          if (isRelayMode(transportMode) || isPlayerTurn || !matchId || isAnimating || isRevealingShells || gameStatus !== 'playing') {
            return;
          }

          set({ isAnimating: true });

          try {
            const res = await fetch(`${logicHttpUrl}/match/pve/${matchId}/dealer-turn`, {
              method: 'POST'
            });

            if (res.ok) {
              const data = await res.json();
              const actions = data.actions;
              const update = data.state_update;

              let delay = 1000;

              for (const act of actions) {
                window.setTimeout(() => {
                  if (act.type === 'ShootSelf' || act.type === 'ShootPlayer') {
                    set((state) => ({
                      lastShotResult: act.is_live ? 'live' : 'blank',
                      lastShotTarget: act.type === 'ShootSelf' ? 'dealer' : 'player',
                      gameStatus: 'shot_animation',
                      chamber: state.chamber.slice(1),
                    }));
                  }
                }, delay);
                delay += 1500;
              }

              window.setTimeout(() => {
                set((state) => ({
                  shellsRemaining: update.state.shells_remaining,
                  liveShells: update.state.live_shells,
                  blankShells: update.state.blank_shells,
                  playerHealth: update.state.player_health,
                  dealerHealth: update.state.dealer_health,
                  gameStatus: update.game_status as any,
                  isPlayerTurn: update.state.is_player_turn,
                  isAnimating: false,
                  turnTimer: 15,
                  dealerHandcuffed: false,
                }));
                
                if (update.game_status === 'round_end') {
                  set((state) => ({ roundsWon: state.roundsWon + 1, totalWon: state.totalWon + state.betAmount }));
                } else if (update.game_status === 'gameover') {
                  set((state) => ({ roundsLost: state.roundsLost + 1, totalLost: state.totalLost + state.betAmount }));
                }

                if (update.game_status === 'playing' && update.state.shells_remaining === 6) {
                  get().reloadShotgun();
                }
              }, delay);

            } else {
               set({ isAnimating: false });
            }
          } catch(e) {
            console.error(e);
            set({ isAnimating: false });
          }
        },
      };
    },
    {
      name: 'shell-shock-storage',
    },
  ),
);
