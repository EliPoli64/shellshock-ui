You are building the frontend for "Shell Shock," a Web3 adaptation of Buckshot Roulette built on Solana. This is a turn-based, high-tension game where a player faces off against The Dealer in a shotgun duel. Real SOL is staked, every action is an on-chain transaction, and LI.FI enables cross-chain deposits. The frontend must feel like a grim, underground nightclub—cigarette smoke, neon flicker, and the weight of every trigger pull.

## Technology Stack
- React 18 with TypeScript
- Build Tool: Vite
- Styling: Tailwind CSS with custom dark theme
- 3D/Atmosphere: Three.js + React Three Fiber for the dealer character and environment
- State Management: Zustand
- Wallet Integration: @solana/wallet-adapter-react + @solana/wallet-adapter-react-ui
- Solana Client: @solana/web3.js
- Cross-Chain: @lifi/widget (React modal)
- Animations: Framer Motion for UI transitions, GSAP for dramatic moments
- Sound: Howler.js for ambient hum, shell loading, shotgun blast
- Icons: Lucide React
- Font: "Special Elite" (typewriter/monospace) for game text, "Inter" for UI

## Core Atmosphere & Visual Design

### Color Palette
- Background: Deep charcoal black (#0a0a0a)
- Table surface: Dark green felt (#1a2f1a) with subtle texture
- Primary accent: Sickly yellow-green neon (#c8ff00) for interactive elements
- Danger: Deep crimson (#8b0000) for the shotgun, health loss, warnings
- Text: Off-white cream (#e8e0d4) like aged paper or smoke
- Dealer: Pallid skin tones, shadow-obscured face

### Environmental Effects (Three.js)
- A single overhead bulb casts a pool of yellow light on the table. It sways subtly.
- Volumetric cigarette smoke drifts across the scene (soft particle system).
- The background fades to complete black. You can't see the walls.
- Occasional flicker in the bulb light when tension peaks (before a shot).
- The Dealer model: a gaunt figure in a worn suit, hands resting on the table, face obscured by shadow. Idle animations: slow breathing, tapping fingers, adjusting cufflinks.

### UI Aesthetic
- CRT scanlines overlay across the entire screen (CSS pseudo-element or canvas).
- Subtle film grain effect.
- Text renders with a slight glow (text-shadow neon effect).
- Health displayed as cracked porcelain masks or tally marks, not boring bars.
- Shell count shown as actual shotgun shells lined up in a wooden rack at the bottom.

## Game States & Screens

### 1. Main Menu (Initial State)
- Black screen. Slow fade-in of the dimly lit table.
- Title "SHELL SHOCK" appears letter by letter with typewriter effect (tick sound per character).
- Below title: flickering neon subtitle "A Game of Chance. A Dance with Death."
- Two buttons, styled as aged brass plates:
  - "PLAYER VS DEALER" — play against AI dealer
  - "PLAYER VS PLAYER" — matchmake against another human
- Each button has a subtle pulse animation.
- Bottom-right: "Connect Wallet" button. If disconnected, game buttons are grayed out.
- Sound: Low, droning ambient hum. Occasional distant, muffled thud.

### 2. Match Setup (Before Round)
- Player selects bet amount from preset tiers: 0.01 SOL, 0.05 SOL, 0.1 SOL, 0.5 SOL.
- Each tier is a tarnished poker chip with a glowing edge.
- "FIND MATCH" button. If PvP, shows searching animation (dealer shuffling cards in background).
- If cross-chain deposit needed: LI.FI widget opens automatically for non-Solana users.
- Sound: Cards being shuffled. Chips clicking together.

### 3. The Duel (Core Gameplay Screen)
This is the heart of the game. Layout:

**Top Area — The Dealer:**
- The Dealer sits opposite you. Three.js rendered model.
- Above the dealer's head: their health displayed as cracked masks (max 4).
- When dealer is hit: mask shatters with glass-breaking particle effect. One fewer mask remains.
- Dealer's current state: calm, grinning, or angry (slight model expression changes).

**Bottom Area — The Player:**
- Your health displayed as porcelain masks at the bottom (max 4).
- When hit: screen shakes violently, red vignette pulses, mask shatters.

**Center — The Table:**
- The shotgun lies in the center. Dark wood stock, long steel barrel.
- Shell rack: shows remaining shells. Live shells glow red, blanks are dull gray.
- If the magnifying glass item was used: the current shell is temporarily revealed (glows or fades).

**Turn Indicator:**
- A spotlight highlights whose turn it is. The active side has a pulsing border.
- Text at center: "YOUR TURN" or "DEALER'S TURN" in typewriter font.

**Action Buttons (Your Turn):**
Four brass-plate buttons arranged in a row:
- **"SHOOT DEALER"** — barrel icon. Red-tinted.
- **"SHOOT YOURSELF"** — target icon. Yellow-tinted.
- **"USE ITEM"** — expands a sub-menu of available items (handcuffs, beer, cigarettes, magnifying glass, saw).
- **"FOLD"** — white flag icon. Forfeit the round. Lose your bet.

On dealer's turn: buttons are disabled. The dealer's hands move (Three.js animation) to perform their action. Camera zooms slightly on the shotgun.

**Item Sub-Menu:**
When "USE ITEM" is clicked, four smaller brass tiles appear above the buttons:
- **Magnifying Glass**: "PEEK AT SHELL" — reveals current shell to you only
- **Beer**: "RACK THE SHELL" — ejects current shell without firing
- **Handcuffs**: "SKIP THEIR TURN" — dealer misses next turn
- **Cigarettes**: "STEADY YOUR NERVES" — heal 1 HP (if below max)
- **Saw**: "WIDEN THE BARREL" — next shot deals 2 damage instead of 1

Each item has limited uses per round (configurable by game state from on-chain).

### 4. The Shot (Climax Moment)
This is the most critical animation in the game. When anyone pulls the trigger:

**Live Shell:**
1. Screen freezes for 400ms of silence.
2. Deafening shotgun blast sound.
3. Screen flashes white for 3 frames.
4. Victim's side: screen shake (GSAP, 10px random displacement, 0.5s duration).
5. Red vignette pulse from edges.
6. Mask shattering particle effect on victim's health indicator.
7. Smoke particles erupt from the shotgun barrel (Three.js).
8. Shell casing ejects and rolls across the table.
9. Room light flickers violently.
10. Dealer reacts: if shot, lurches back briefly. If shooting you, leans forward slightly.

**Blank Shell:**
1. Anemic "click" sound.
2. Room light flickers once, weakly.
3. Subtle exhale sound (relief or disappointment).
4. Dealer: if they shot a blank, they frown. If you shot a blank, they smile slowly.
5. Text appears briefly: "CLICK... Nothing."

### 5. Round Resolution
- Winner's masks glow gold briefly.
- Text: "YOU SURVIVE" or "DEALER WINS" in large, slowly fading typewriter text.
- Prize pot (if Player won) slides across table with chip-stacking sound.
- "PLAY AGAIN" and "LEAVE TABLE" buttons appear.
- Sound: chips stacking. Distant, hollow laughter if dealer wins.

### 6. Game Over
- If player health reaches zero: screen goes completely black for 2 seconds.
- Slow fade-in to dealer's face, now closer, almost filling the screen.
- Text: "The House Always Wins..." in flickering neon.
- Buttons: "DOUBLE OR NOTHING" (if you have funds), "WALK AWAY".
- Walking away shows a summary of rounds played, SOL won/lost.

## Wallet & Blockchain Integration

### Transaction Flow
Every action is a transaction:
1. `start_game` — stake SOL, initialize game PDA
2. `shoot_self` — reveal next shell, apply to player health
3. `shoot_dealer` — reveal next shell, apply to dealer health
4. `use_item` — apply item effect to game state
5. `fold` — forfeit, transfer pot to opponent
6. `claim_winnings` — auto-called on game end

Transaction handling:
```typescript
const sendGameTransaction = async (instruction: TransactionInstruction) => {
  const tx = new Transaction().add(instruction);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
};
```

Show a small brass plaque that reads "CONFIRMING..." during transaction pending, then "CONFIRMED" with a subtle ding.

### LI.FI Widget Integration
```typescript
import { LiFiWidget } from '@lifi/widget';

const CrossChainDeposit: React.FC = () => {
  const [showWidget, setShowWidget] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setShowWidget(true)}
        className="brass-button"
      >
        DEPOSIT FROM ANY CHAIN
      </button>
      
      {showWidget && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <LiFiWidget
            config={{
              fromChain: 1, // Ethereum
              toChain: 7565164, // Solana
              toToken: 'So11111111111111111111111111111111111111112',
              appearance: 'dark',
              theme: {
                palette: {
                  primary: { main: '#c8ff00' },
                  secondary: { main: '#1a1a1a' }
                },
                shape: { borderRadius: 0 },
                typography: { fontFamily: 'Special Elite, monospace' }
              },
              hiddenUI: ['appearance', 'poweredBy']
            }}
            integrator="shell-shock-game"
          />
        </div>
      )}
    </>
  );
};
```

## Sound Design (Howler.js)

```typescript
const sounds = {
  ambient: new Howl({ src: '/sounds/ambient-hum.mp3', loop: true, volume: 0.2 }),
  shotgunBlast: new Howl({ src: '/sounds/shotgun-blast.mp3', volume: 0.8 }),
  shotgunClick: new Howl({ src: '/sounds/empty-click.mp3', volume: 0.5 }),
  shellLoad: new Howl({ src: '/sounds/shell-load.mp3', volume: 0.4 }),
  chipStack: new Howl({ src: '/sounds/chips.mp3', volume: 0.3 }),
  glassBreak: new Howl({ src: '/sounds/glass-shatter.mp3', volume: 0.6 }),
  typewriterTick: new Howl({ src: '/sounds/typewriter-tick.mp3', volume: 0.3 }),
  heartbeat: new Howl({ src: '/sounds/heartbeat.mp3', loop: true, volume: 0.1 }),
  dealerLaugh: new Howl({ src: '/sounds/dealer-laugh.mp3', volume: 0.5 }),
  lightFlicker: new Howl({ src: '/sounds/light-flicker.mp3', volume: 0.2 }),
};
```

Dynamic audio: heartbeat volume increases as health decreases. Ambient hum distorts slightly during tense moments.

## Zustand Store

```typescript
interface ShellShockState {
  // Connection
  wallet: PublicKey | null;
  solBalance: number;
  
  // Matchmaking
  gameMode: 'pve' | 'pvp' | null;
  betAmount: number;
  isSearching: boolean;
  
  // Game State
  gameStatus: 'menu' | 'setup' | 'playing' | 'shot_animation' | 'round_end' | 'gameover';
  playerHealth: number;
  dealerHealth: number;
  shellsRemaining: number;
  liveShells: number;
  blankShells: number;
  currentShell: 'live' | 'blank' | 'unknown';
  isPlayerTurn: boolean;
  
  // Items
  items: {
    magnifyingGlass: number;
    beer: number;
    handcuffs: number;
    cigarettes: number;
    saw: number;
  };
  dealerHandcuffed: boolean;
  
  // Results
  roundsWon: number;
  roundsLost: number;
  totalWon: number;
  totalLost: number;
  
  // UI
  isAnimating: boolean;
  showItemMenu: boolean;
  showLifiWidget: boolean;
  lastShotResult: 'live' | 'blank' | null;
  
  // Actions
  connectWallet: (wallet: PublicKey) => void;
  startGame: (mode: 'pve' | 'pvp', bet: number) => Promise<void>;
  shootDealer: () => Promise<void>;
  shootSelf: () => Promise<void>;
  useItem: (item: string) => Promise<void>;
  fold: () => Promise<void>;
  playAgain: () => void;
  leaveTable: () => void;
}
```

## The Shot Animation Sequence (GSAP Timeline)

```typescript
const animateShot = (result: 'live' | 'blank', victim: 'player' | 'dealer') => {
  const tl = gsap.timeline();
  
  if (result === 'live') {
    tl.to('.screen', { duration: 0.1, opacity: 1 }) // flash white
      .to('.screen', { duration: 0.2, opacity: 0.8 })
      .to('.camera', { 
        duration: 0.5, 
        x: 'random(-10, 10)', 
        y: 'random(-10, 10)',
        ease: 'power2.out'
      }) // shake
      .to('.vignette', { duration: 0.3, opacity: 0.6 }, '<') // red flash
      .to('.vignette', { duration: 0.5, opacity: 0 });
    
    // Shatter mask
    if (victim === 'player') {
      tl.to('.player-mask', { 
        duration: 0.4, 
        scale: 1.5, 
        opacity: 0,
        filter: 'blur(4px)'
      }, '<');
    }
  } else {
    // Blank: subtle
    tl.to('.screen', { duration: 0.1, opacity: 0.3 })
      .to('.screen', { duration: 0.5, opacity: 0 })
      .to('.light-bulb', { duration: 0.2, intensity: 0.3 })
      .to('.light-bulb', { duration: 0.8, intensity: 1 });
  }
};
```

## Project Structure
```
src/
  components/
    MainMenu.tsx          // Title screen with typewriter effect
    GameTable.tsx          // The core game view (Three.js scene + UI overlay)
    Dealer.tsx             // Three.js dealer character
    Shotgun.tsx            // Three.js shotgun model on table
    ShellRack.tsx          // Displays remaining shells as physical objects
    HealthMasks.tsx        // Cracked porcelain health indicators
    ActionButtons.tsx      // Shoot Dealer, Shoot Self, Use Item, Fold
    ItemMenu.tsx           // Sub-menu for items
    CrossChainDeposit.tsx  // LI.FI widget wrapper
    WalletButton.tsx       // Connect/disconnect wallet
    GameOverScreen.tsx     // End state with results
    CRTFilter.tsx          // Scanlines and film grain overlay
    AmbientParticles.tsx   // Smoke and dust particles
  three/
    Scene.tsx             // Main Three.js scene setup
    Lighting.tsx          // The overhead bulb with flicker
    materials/
      Brass.tsx            // Brass plate material for buttons
      Glass.tsx            // Glass material for shattered masks
      Smoke.tsx            // Volumetric smoke shader
  animations/
    shotSequence.ts       // GSAP timeline for shotgun blast
    typewriter.ts         // Typewriter text animation
    dealerAnimations.ts   // Dealer idle and reaction animations
  hooks/
    useGameLoop.ts        // Polls on-chain game state
    useSolanaTransaction.ts
    useSound.ts           // Howler.js wrapper with dynamic volume
  store/
    gameStore.ts          // Zustand store
  utils/
    transactionBuilder.ts
    lifiConfig.ts
    constants.ts
  assets/
    sounds/
    textures/
    fonts/
  App.tsx
  main.tsx
```

## Deliverables
1. A fully atmospheric frontend with the main menu, game table, and game over screen
2. Three.js scene with the dealer, table, shotgun, and dynamic lighting
3. Full sound design integration with Howler.js
4. Solana wallet integration for transactions
5. LI.FI widget for cross-chain deposits
6. All animations: typewriter text, shotgun blast, mask shattering, smoke particles
7. Zustand state management with mock data for testing without wallet
8. README.md with setup instructions and demo mode details
9. The game should be fully testable in "demo mode" with no wallet connected

## Build Order
1. Vite + React + Tailwind setup with the dark theme and CRT overlay
2. Static layout of the game table (ActionButtons, ShellRack, HealthMasks) without Three.js
3. Zustand store with mock game flow (hardcoded sequence of turns for testing)
4. Three.js scene: table, lighting, dealer model (use geometric shapes as placeholders)
5. GSAP shot animation sequence
6. Sound integration
7. Wallet adapter and transaction hooks
8. LI.FI widget
9. Polish: smoke particles, dealer idle animations, typewriter text
10. Mobile responsiveness
```
