import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShellShockState {
  wallet: string | null;
  solBalance: number;
  
  gameMode: 'pve' | 'pvp' | null;
  betAmount: number;
  isSearching: boolean;
  
  gameStatus: 'menu' | 'setup' | 'playing' | 'shot_animation' | 'round_end' | 'gameover';
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
  
  connectWallet: (wallet: string) => void;
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

export const useShellShockStore = create<ShellShockState>()(
  persist(
    (set, get) => ({
      wallet: null,
      solBalance: 0,
      
      gameMode: null,
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
      
      connectWallet: (wallet) => set({ wallet, solBalance: 1.0 }),
      
      reloadShotgun: () => {
        const totalShells = 6;
        const minLive = 1;
        const maxLive = totalShells - 1; // at least 1 blank
        const liveCount = Math.floor(Math.random() * (maxLive - minLive + 1)) + minLive;
        const blankCount = totalShells - liveCount;
        
        // Generate chamber array and shuffle it
        const shells: ('live' | 'blank')[] = [
          ...Array(liveCount).fill('live'),
          ...Array(blankCount).fill('blank')
        ];
        
        // Fisher-Yates shuffle
        for (let i = shells.length - 1; i > 0; i--) {
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
        set({
          gameMode: mode,
          betAmount: bet,
          gameStatus: 'playing',
          playerHealth: 3,
          dealerHealth: 3,
          currentShell: 'unknown',
          isPlayerTurn: true,
          isRevealingShells: true,
          turnTimer: 15,
          isSawActive: false,
          items: {
            magnifyingGlass: 1,
            beer: 1,
            handcuffs: 1,
            cigarettes: 1,
            saw: 1,
            pill: 1,
          },
          dealerHandcuffed: false,
        });
        get().reloadShotgun();
        
        // End reveal animation after 3 seconds
        setTimeout(() => {
          set({ isRevealingShells: false });
        }, 3000);
      },
      
      shootDealer: () => {
        const { isPlayerTurn, chamber, dealerHealth, shellsRemaining, isSawActive, dealerHandcuffed } = get();
        if (!isPlayerTurn || chamber.length === 0) return;
        
        const nextShell = chamber[0];
        const result = nextShell;
        const newChamber = chamber.slice(1);
        const newShellsRemaining = shellsRemaining - 1;
        const isLive = result === 'live';
        const damage = isSawActive ? 2 : 1;
        
        set(state => ({
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
        
        setTimeout(() => {
          if (isLive) {
            const newDealerHealth = Math.max(0, dealerHealth - damage);
            if (newDealerHealth <= 0) {
              set(state => ({
                dealerHealth: 0,
                gameStatus: 'round_end',
                roundsWon: state.roundsWon + 1,
                totalWon: state.totalWon + state.betAmount,
                isAnimating: false,
                isSawActive: false,
              }));
            } else {
              const shouldPassTurn = !dealerHandcuffed;
              set(state => ({
                dealerHealth: newDealerHealth,
                isPlayerTurn: !shouldPassTurn,
                dealerHandcuffed: false,
                gameStatus: 'playing',
                isAnimating: false,
                turnTimer: 15,
                isSawActive: false,
              }));
              if (newShellsRemaining <= 0) {
                get().reloadShotgun();
              }
            }
          } else {
            const shouldPassTurn = !dealerHandcuffed;
            set(state => ({
              isPlayerTurn: !shouldPassTurn,
              dealerHandcuffed: false,
              gameStatus: 'playing',
              isAnimating: false,
              turnTimer: 15,
              isSawActive: false,
            }));
            if (newShellsRemaining <= 0) {
              get().reloadShotgun();
            }
          }
        }, 1500);
      },
      
      shootSelf: () => {
        const { isPlayerTurn, chamber, playerHealth, shellsRemaining, isSawActive } = get();
        if (!isPlayerTurn || chamber.length === 0) return;
        
        const nextShell = chamber[0];
        const result = nextShell;
        const newChamber = chamber.slice(1);
        const newShellsRemaining = shellsRemaining - 1;
        const isLive = result === 'live';
        const damage = isSawActive ? 2 : 1;
        
        set(state => ({
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
        
        setTimeout(() => {
          if (isLive) {
            const newPlayerHealth = Math.max(0, playerHealth - damage);
            if (newPlayerHealth <= 0) {
              set(state => ({
                playerHealth: 0,
                gameStatus: 'gameover',
                roundsLost: state.roundsLost + 1,
                totalLost: state.totalLost + state.betAmount,
                isAnimating: false,
                isSawActive: false,
              }));
            } else {
              set(state => ({
                playerHealth: newPlayerHealth,
                isPlayerTurn: false,
                gameStatus: 'playing',
                isAnimating: false,
                turnTimer: 15,
                isSawActive: false,
              }));
              if (newShellsRemaining <= 0) {
                get().reloadShotgun();
              }
            }
          } else {
            // Shooting self with a blank gives another turn
            set(state => ({
              isPlayerTurn: true,
              gameStatus: 'playing',
              isAnimating: false,
              turnTimer: 15,
              isSawActive: false,
            }));
            if (newShellsRemaining <= 0) {
              get().reloadShotgun();
            }
          }
        }, 1500);
      },
      
      useItem: (item) => {
        const state = get();
        const newItems = { ...state.items };
        if (item === 'magnifyingGlass' && newItems.magnifyingGlass > 0) {
          newItems.magnifyingGlass -= 1;
          const nextShell = state.chamber[0];
          set({ 
            items: newItems, 
            currentShell: nextShell,
            showItemMenu: false 
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
            showItemMenu: false 
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
            showItemMenu: false 
          });
        }
        if (item === 'cigarettes' && newItems.cigarettes > 0 && state.playerHealth < 3) {
          newItems.cigarettes -= 1;
          set({ 
            items: newItems, 
            playerHealth: state.playerHealth + 1,
            showItemMenu: false 
          });
        }
        if (item === 'saw' && newItems.saw > 0) {
          newItems.saw -= 1;
          set({ 
            items: newItems, 
            isSawActive: true,
            showItemMenu: false 
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
            showItemMenu: false 
          });
          
          if (newPlayerHealth <= 0) {
            set(state => ({
              gameStatus: 'gameover',
              roundsLost: state.roundsLost + 1,
              totalLost: state.totalLost + state.betAmount,
            }));
          }
        }
      },
      
      fold: () => {
        set(state => ({
          gameStatus: 'round_end',
          roundsLost: state.roundsLost + 1,
          totalLost: state.totalLost + state.betAmount,
        }));
      },
      
      playAgain: () => {
        const { gameMode, betAmount } = get();
        if (gameMode) {
          set({ isRevealingShells: true });
          get().startGame(gameMode, betAmount);
        }
      },
      
      leaveTable: () => {
        set({ gameStatus: 'menu' });
      },
      
      setShowItemMenu: (show) => set({ showItemMenu: show }),
      
      decrementTimer: () => {
        const { turnTimer, isPlayerTurn, gameStatus, isAnimating, isRevealingShells, playerHealth, roundsLost, totalLost, betAmount } = get();
        if (isPlayerTurn && gameStatus === 'playing' && !isAnimating && !isRevealingShells) {
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
        }
      },
      
      resetTurn: () => {
        set(state => ({
          isPlayerTurn: true,
          turnTimer: 15,
        }));
      },
      
      dealerTurn: () => {
        const { isPlayerTurn, chamber, playerHealth, dealerHealth, shellsRemaining, isSawActive } = get();
        if (isPlayerTurn || chamber.length === 0) return;
        
        setTimeout(() => {
          const shootSelf = Math.random() < 0.3; // 30% chance dealer shoots himself
          const nextShell = chamber[0];
          const result = nextShell;
          const newChamber = chamber.slice(1);
          const newShellsRemaining = shellsRemaining - 1;
          const isLive = result === 'live';
          const damage = isSawActive ? 2 : 1;
          
          set(state => ({
            lastShotResult: result,
            lastShotTarget: shootSelf ? 'dealer' : 'player',
            gameStatus: 'shot_animation',
            isAnimating: true,
            shellsRemaining: newShellsRemaining,
            chamber: newChamber,
            liveShells: isLive ? state.liveShells - 1 : state.liveShells,
            blankShells: !isLive ? state.blankShells - 1 : state.blankShells,
            currentShell: 'unknown',
          }));
          
          setTimeout(() => {
            if (shootSelf) {
              if (isLive) {
                const newDealerHealth = Math.max(0, dealerHealth - damage);
                if (newDealerHealth <= 0) {
                  set(state => ({
                    dealerHealth: 0,
                    gameStatus: 'round_end',
                    roundsWon: state.roundsWon + 1,
                    totalWon: state.totalWon + state.betAmount,
                    isAnimating: false,
                    isSawActive: false,
                  }));
                } else {
                  set(state => ({
                    dealerHealth: newDealerHealth,
                    isPlayerTurn: true,
                    gameStatus: 'playing',
                    isAnimating: false,
                    turnTimer: 15,
                    isSawActive: false,
                  }));
                  if (newShellsRemaining <= 0) {
                    get().reloadShotgun();
                  }
                }
              } else {
                // Dealer shoots himself with a blank, stays his turn
                set(state => ({
                  isPlayerTurn: false,
                  gameStatus: 'playing',
                  isAnimating: false,
                  isSawActive: false,
                }));
                if (newShellsRemaining <= 0) {
                  get().reloadShotgun();
                }
              }
            } else {
              if (isLive) {
                const newPlayerHealth = Math.max(0, playerHealth - damage);
                if (newPlayerHealth <= 0) {
                  set(state => ({
                    playerHealth: 0,
                    gameStatus: 'gameover',
                    roundsLost: state.roundsLost + 1,
                    totalLost: state.totalLost + state.betAmount,
                    isAnimating: false,
                    isSawActive: false,
                  }));
                } else {
                  set(state => ({
                    playerHealth: newPlayerHealth,
                    isPlayerTurn: true,
                    gameStatus: 'playing',
                    isAnimating: false,
                    turnTimer: 15,
                    isSawActive: false,
                  }));
                  if (newShellsRemaining <= 0) {
                    get().reloadShotgun();
                  }
                }
              } else {
                set(state => ({
                  isPlayerTurn: true,
                  gameStatus: 'playing',
                  isAnimating: false,
                  turnTimer: 15,
                  isSawActive: false,
                }));
                if (newShellsRemaining <= 0) {
                  get().reloadShotgun();
                }
              }
            }
          }, 1500);
        }, 1000);
      },
    }),
    {
      name: 'shell-shock-storage',
    }
  )
);
