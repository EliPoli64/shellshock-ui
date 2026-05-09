import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletStore, RPC_PROVIDERS } from '../store/walletStore';
import { motion, AnimatePresence } from 'framer-motion';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletButton = () => {
  const { rpcUrl, setRpcUrl } = useWalletStore();

  const {
    publicKey,
    wallet,
    disconnect,
    connected
  } = useWallet();

  const { setVisible } = useWalletModal();

  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const currentProviderName =
    RPC_PROVIDERS.find(p => p.url === rpcUrl)?.name ||
    'Custom RPC';

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, []);

  return (
    <div
      className="relative z-[300]"
      ref={menuRef}
    >
      {/* MAIN BUTTON */}
      <motion.button
        whileHover={{
          scale: 1.03,
          y: -2,
          boxShadow:
            connected
              ? '0 0 35px rgba(250,204,21,0.28)'
              : '0 0 25px rgba(255,50,50,0.18)'
        }}
        whileTap={{ scale: 0.97 }}
        onClick={() =>
          setShowMenu(!showMenu)
        }
        className="
          group
          relative
          overflow-hidden
          rounded-[1.8vh]
          border-[0.22vh]
          border-yellow-300/30
          bg-black/65
          backdrop-blur-xl
          px-[2vh]
          py-[1.2vh]
          shadow-[0_0_25px_rgba(0,0,0,0.35)]
          transition-all duration-300
        "
      >
        {/* SHINE */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_65%)]" />

        <div className="absolute top-0 left-[-120%] w-[120%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-all duration-700 group-hover:left-[120%]" />

        <div className="relative flex items-center gap-[1.6vh]">
          {/* STATUS LIGHT */}
          <div className="relative">
            <div
              className={`
                absolute
                inset-0
                rounded-full
                blur-[0.8vh]
                scale-150
                ${
                  connected
                    ? 'bg-green-400/60'
                    : 'bg-red-500/50'
                }
              `}
            />

            <div
              className={`
                relative
                w-[1.2vh]
                h-[1.2vh]
                rounded-full
                ${
                  connected
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-red-500'
                }
              `}
            />
          </div>

          {/* TEXT */}
          <div className="text-right">
            <p
              className="
                font-special-elite
                text-[0.95vh]
                uppercase
                tracking-[0.28em]
                text-yellow-200/70
              "
            >
              {currentProviderName}
            </p>

            <p
              className="
                mt-[0.2vh]
                font-special-elite
                text-[1.5vh]
                uppercase
                tracking-[0.08em]
                text-white
              "
            >
              {connected &&
              publicKey
                ? shortenAddress(
                    publicKey.toBase58()
                  )
                : 'Connect Wallet'}
            </p>
          </div>

          {/* ICON */}
          <div className="text-[2vh]">
            {connected
              ? '💰'
              : '🔌'}
          </div>
        </div>
      </motion.button>

      {/* DROPDOWN */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{
              opacity: 0,
              y: 14,
              scale: 0.94
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: 14,
              scale: 0.94
            }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 24
            }}
            className="
              absolute
              top-full
              right-0
              mt-[1.4vh]
              w-[36vh]
              overflow-hidden
              rounded-[2.2vh]
              border
              border-white/10
              bg-black/70
              backdrop-blur-2xl
              shadow-[0_0_45px_rgba(0,0,0,0.55)]
            "
          >
            {/* PANEL SHINE */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

            <div className="relative p-[2.2vh]">
              {/* WALLET SECTION */}
              <div>
                <div className="flex items-center justify-between mb-[1.6vh]">
                  <h3
                    className="
                      font-special-elite
                      text-[1.1vh]
                      uppercase
                      tracking-[0.32em]
                      text-yellow-300
                    "
                  >
                    Wallet
                  </h3>

                  <div
                    className={`
                      px-[0.9vh]
                      py-[0.3vh]
                      rounded-full
                      border
                      text-[0.9vh]
                      uppercase
                      tracking-[0.15em]
                      font-special-elite
                      ${
                        connected
                          ? `
                            border-green-400/30
                            bg-green-400/10
                            text-green-300
                          `
                          : `
                            border-red-400/20
                            bg-red-400/10
                            text-red-300
                          `
                      }
                    `}
                  >
                    {connected
                      ? 'Connected'
                      : 'Offline'}
                  </div>
                </div>

                {!connected ? (
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      y: -2,
                      boxShadow:
                        '0 0 25px rgba(250,204,21,0.35)'
                    }}
                    whileTap={{
                      scale: 0.97
                    }}
                    onClick={() => {
                      setVisible(true);
                      setShowMenu(false);
                    }}
                    className="
                      relative
                      overflow-hidden
                      w-full
                      rounded-[1.5vh]
                      border-[0.22vh]
                      border-yellow-300/50
                      bg-gradient-to-b
                      from-yellow-300
                      via-yellow-500
                      to-yellow-700
                      py-[1.6vh]
                      font-special-elite
                      text-[1.5vh]
                      uppercase
                      tracking-[0.18em]
                      text-black
                    "
                  >
                    SELECT WALLET
                  </motion.button>
                ) : (
                  <div className="space-y-[1.2vh]">
                    {/* WALLET CARD */}
                    <div
                      className="
                        rounded-[1.5vh]
                        border
                        border-white/10
                        bg-white/5
                        p-[1.4vh]
                        flex items-center gap-[1.2vh]
                      "
                    >
                      {wallet?.adapter.icon && (
                        <img
                          src={
                            wallet.adapter.icon
                          }
                          alt="wallet"
                          className="
                            w-[3.4vh]
                            h-[3.4vh]
                            rounded-full
                          "
                        />
                      )}

                      <div className="flex-1">
                        <p
                          className="
                            font-special-elite
                            text-[1vh]
                            uppercase
                            tracking-[0.22em]
                            text-zinc-400
                          "
                        >
                          Active Wallet
                        </p>

                        <p
                          className="
                            mt-[0.2vh]
                            font-special-elite
                            text-[1.4vh]
                            text-white
                          "
                        >
                          {shortenAddress(
                            publicKey?.toBase58() ||
                              ''
                          )}
                        </p>
                      </div>
                    </div>

                    {/* DISCONNECT */}
                    <motion.button
                      whileHover={{
                        scale: 1.02,
                        y: -2,
                        boxShadow:
                          '0 0 20px rgba(255,50,50,0.25)'
                      }}
                      whileTap={{
                        scale: 0.97
                      }}
                      onClick={() => {
                        disconnect();
                        setShowMenu(false);
                      }}
                      className="
                        w-full
                        rounded-[1.3vh]
                        border-[0.2vh]
                        border-red-400/30
                        bg-gradient-to-b
                        from-red-500/20
                        to-red-900/30
                        py-[1.2vh]
                        font-special-elite
                        text-[1.2vh]
                        uppercase
                        tracking-[0.22em]
                        text-red-300
                      "
                    >
                      Disconnect
                    </motion.button>
                  </div>
                )}
              </div>

              {/* DIVIDER */}
              <div className="my-[2.4vh] h-[0.1vh] bg-white/10" />

              {/* RPC SECTION */}
              <div>
                <h3
                  className="
                    font-special-elite
                    text-[1.1vh]
                    uppercase
                    tracking-[0.32em]
                    text-cyan-300
                    mb-[1.6vh]
                  "
                >
                  RPC Provider
                </h3>

                <div className="flex flex-col gap-[1vh]">
                  {RPC_PROVIDERS.map(
                    provider => {
                      const active =
                        rpcUrl ===
                        provider.url;

                      return (
                        <motion.button
                          key={
                            provider.name
                          }
                          whileHover={{
                            scale: 1.01,
                            x: 2
                          }}
                          whileTap={{
                            scale: 0.98
                          }}
                          onClick={() => {
                            setRpcUrl(
                              provider.url
                            );
                          }}
                          className={`
                            relative
                            overflow-hidden
                            rounded-[1.3vh]
                            border
                            p-[1.3vh]
                            text-left
                            transition-all
                            ${
                              active
                                ? `
                                  border-cyan-300/40
                                  bg-cyan-400/10
                                  shadow-[0_0_20px_rgba(34,211,238,0.15)]
                                `
                                : `
                                  border-white/5
                                  bg-white/[0.03]
                                  hover:bg-white/[0.06]
                                `
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p
                                className={`
                                  font-special-elite
                                  text-[1.25vh]
                                  uppercase
                                  tracking-[0.16em]
                                  ${
                                    active
                                      ? 'text-cyan-200'
                                      : 'text-zinc-300'
                                  }
                                `}
                              >
                                {
                                  provider.name
                                }
                              </p>
                            </div>

                            {active && (
                              <div
                                className="
                                  px-[0.7vh]
                                  py-[0.2vh]
                                  rounded-full
                                  border
                                  border-cyan-300/30
                                  bg-cyan-400/10
                                  font-special-elite
                                  text-[0.8vh]
                                  uppercase
                                  tracking-[0.15em]
                                  text-cyan-200
                                "
                              >
                                Active
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    }
                  )}
                </div>

                {/* CUSTOM RPC */}
                <div className="mt-[2vh]">
                  <p
                    className="
                      mb-[0.8vh]
                      font-special-elite
                      text-[1vh]
                      uppercase
                      tracking-[0.22em]
                      text-zinc-500
                    "
                  >
                    Custom RPC
                  </p>

                  <input
                    type="text"
                    value={rpcUrl}
                    onChange={e =>
                      setRpcUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    className="
                      w-full
                      rounded-[1.2vh]
                      border
                      border-white/10
                      bg-black/60
                      px-[1.4vh]
                      py-[1.2vh]
                      text-[1.15vh]
                      text-white
                      font-mono
                      outline-none
                      transition-all
                      focus:border-cyan-300/40
                      focus:shadow-[0_0_20px_rgba(34,211,238,0.12)]
                    "
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div
                className="
                  mt-[2.4vh]
                  rounded-[1.2vh]
                  border
                  border-red-400/10
                  bg-red-400/[0.04]
                  p-[1.2vh]
                  text-center
                "
              >
                <p
                  className="
                    font-special-elite
                    text-[0.9vh]
                    uppercase
                    tracking-[0.18em]
                    text-red-300/60
                    leading-relaxed
                  "
                >
                  Changing providers reloads
                  the connection session.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};