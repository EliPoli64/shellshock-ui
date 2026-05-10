import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'A1cLw2yCfawSVF7LSD2rZWR8yBWg3DVCPLVbHLJqePkC'
);

export function uuidToBytes(uuid: string): Uint8Array {
  return new Uint8Array(
    uuid.replace(/-/g, '').match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
}

export async function payForRound(
  connection: Connection,
  wallet: WalletContextState,
  gameId: string,
  authorityPubkey: PublicKey
): Promise<{ signature: string; sessionPda: PublicKey }> {
  const gameIdBytes = uuidToBytes(gameId);

  const [feeCollectorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_collector'), authorityPubkey.toBuffer()],
    PROGRAM_ID
  );

  const [sessionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('session'), wallet.publicKey!.toBuffer(), Buffer.from(gameIdBytes)],
    PROGRAM_ID
  );

  const discriminator = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('global:pay_for_round'))
  ).slice(0, 8);

  const data = new Uint8Array([...discriminator, ...gameIdBytes]);

  const instruction = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
      { pubkey: feeCollectorPda, isSigner: false, isWritable: true },
      { pubkey: authorityPubkey, isSigner: false, isWritable: false },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  };

  const tx = new Transaction().add(instruction);
  tx.feePayer = wallet.publicKey!;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const signed = await wallet.signTransaction!(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature, 'confirmed');

  return { signature, sessionPda };
}
