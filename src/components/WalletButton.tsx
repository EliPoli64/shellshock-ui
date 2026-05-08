import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletButton = () => {
  return <WalletMultiButton className="!rounded-none !bg-black/50 !px-6 !py-3 !font-bold hover:!bg-black/70" />;
};
