import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program, BN, BorshCoder } from '@coral-xyz/anchor'
import { IDL, PROGRAM_ID, FEE_WALLET } from './idl'
import type { GameRoom } from './types'

export function getGameRoomPda(wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), wallet.toBuffer()],
    PROGRAM_ID,
  )
  return pda
}

export function getEscrowVaultPda(gameRoom: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), gameRoom.toBuffer()],
    PROGRAM_ID,
  )
  return pda
}

export function getProvider(connection: Connection, wallet: WalletContextState): AnchorProvider {
  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey!,
      signTransaction: (tx) => wallet.signTransaction!(tx),
      signAllTransactions: (txs) => wallet.signAllTransactions!(txs),
    },
    { commitment: 'confirmed' },
  )
}

export function getProgram(connection: Connection, wallet: WalletContextState): Program {
  const provider = getProvider(connection, wallet)
  return new Program(IDL as any, provider)
}

export function parseAnchorError(error: any): string {
  const code = error?.error?.errorCode?.code
  const messages: Record<string, string> = {
    NotYourTurn: 'No es tu turno',
    GameNotActive: 'El juego no está activo',
    ItemNotOwned: 'No tenés ese item',
    MaxHealthReached: 'Ya tenés HP máximo',
    CannotCuffCuffed: 'El dealer ya está esposado',
    InvalidBetAmount: 'Apuesta inválida (0.01–10 SOL)',
    InsufficientFunds: 'SOL insuficiente',
    GameAlreadyStarted: 'El juego ya avanzó más allá de la ronda 1',
  }
  return messages[code] ?? 'Error desconocido'
}

export async function createRoom(
  connection: Connection,
  wallet: WalletContextState,
  betLamports: number,
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .createRoom(new BN(betLamports))
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function shoot(
  connection: Connection,
  wallet: WalletContextState,
  target: { self: {} } | { opponent: {} },
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .shoot(target as any)
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      feeWallet: FEE_WALLET,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function useItem(
  connection: Connection,
  wallet: WalletContextState,
  itemType: any,
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .useItem(itemType)
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      feeWallet: FEE_WALLET,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function executeDealerTurn(
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .executeDealerTurn()
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      feeWallet: FEE_WALLET,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function cancelRoom(
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .cancelRoom()
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function claimTimeout(
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> {
  const program = getProgram(connection, wallet)
  const gameRoom = getGameRoomPda(wallet.publicKey!)
  const escrowVault = getEscrowVaultPda(gameRoom)

  const sig = await program.methods
    .claimTimeout()
    .accounts({
      player: wallet.publicKey!,
      gameRoom,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return sig
}

export async function fetchGameState(
  connection: Connection,
  wallet: PublicKey,
): Promise<GameRoom | null> {
  try {
    const provider = new AnchorProvider(
      connection,
      { publicKey: wallet } as any,
      { commitment: 'confirmed' },
    )
    const program = new Program(IDL as any, provider)
    const gameRoom = getGameRoomPda(wallet)
    const account = await (program.account as any).gameRoom.fetch(gameRoom) as unknown as GameRoom
    return account
  } catch {
    return null
  }
}

export function listenForEvents(
  connection: Connection,
  wallet: PublicKey,
  onEvent: (event: any) => void,
): () => void {
  const gameRoom = getGameRoomPda(wallet)

  const subId = connection.onLogs(
    gameRoom,
    (logs) => {
      if (!logs.logs || logs.err) return

      for (const log of logs.logs) {
        if (!log.startsWith('Program data:')) continue
        try {
          const coder = new BorshCoder(IDL as any)
          const event = coder.events.decode(log.replace('Program data: ', ''))
          if (event) onEvent(event)
        } catch {
          // skip unparseable logs
        }
      }
    },
    'confirmed',
  )

  return () => {
    connection.removeOnLogsListener(subId)
  }
}
