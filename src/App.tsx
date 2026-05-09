import { useEffect } from 'react';
import { WalletProvider } from './components/WalletProvider';
import { SolanaWalletSync } from './components/SolanaWalletSync';
import { MainMenu } from './components/ShellShock/MainMenu';
import { GameTable } from './components/ShellShock/GameTable';
import { RoundEnd } from './components/ShellShock/RoundEnd';
import { GameOverScreen } from './components/ShellShock/GameOverScreen';
import { MatchSetup } from './components/ShellShock/MatchSetup';
import { useShellShockStore } from './store/shellShockStore';
import { soundManager } from './utils/soundEffects';

function App() {
  const gameStatus = useShellShockStore((state) => state.gameStatus);

  useEffect(() => {
    const handleKeyDown = () => {
      soundManager.play('keyPress');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.log('Fullscreen request failed:', err);
      }
    };
    
    enterFullscreen();
  }, []);

  return (
    <WalletProvider>
      <SolanaWalletSync />
      <div className="min-h-screen bg-bg-black flex items-center justify-center p-4">
        <div className="relative w-full h-screen">
          {gameStatus === 'menu' && <MainMenu />}

          {gameStatus === 'setup' && <MatchSetup />}
          
          {(gameStatus === 'playing' || gameStatus === 'shot_animation') && <GameTable />}
          
          {gameStatus === 'round_end' && <RoundEnd />}
          
          {gameStatus === 'gameover' && <GameOverScreen />}
        </div>
      </div>
    </WalletProvider>
  );
}

export default App;
