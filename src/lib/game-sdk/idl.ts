import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'FVi3CE8X75fAZ5x1MPnwJ2UikDUe6go4unT7iQiCxzok'
)

export const FEE_WALLET = new PublicKey(
  import.meta.env.VITE_FEE_WALLET || '14SX39WGJcte3LoFscbapt487FNXPhy5oRNho6fYC56D'
)

export const IDL = {
  version: '0.1.0',
  name: 'shellshock',
  address: PROGRAM_ID.toBase58(),
  instructions: [
    {
      name: 'createRoom',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'betAmount', type: 'u64' },
      ],
    },
    {
      name: 'cancelRoom',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'claimTimeout',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'shoot',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'feeWallet', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'target', type: { defined: 'Target' } },
      ],
    },
    {
      name: 'executeDealerTurn',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'feeWallet', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'useItem',
      accounts: [
        { name: 'player', isMut: true, isSigner: true },
        { name: 'gameRoom', isMut: true, isSigner: false },
        { name: 'escrowVault', isMut: true, isSigner: false },
        { name: 'feeWallet', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'itemType', type: { defined: 'ItemType' } },
      ],
    },
  ],
  accounts: [
    {
      name: 'GameRoom',
      type: {
        kind: 'struct',
        fields: [
          { name: 'player', type: 'publicKey' },
          { name: 'betAmount', type: 'u64' },
          { name: 'state', type: { defined: 'GameState' } },
          { name: 'currentTurn', type: 'u8' },
          { name: 'hpPlayer', type: 'u8' },
          { name: 'hpDealer', type: 'u8' },
          { name: 'maxHp', type: 'u8' },
          { name: 'shells', type: { vec: 'bool' } },
          { name: 'shellsTotal', type: 'u8' },
          { name: 'shellsLive', type: 'u8' },
          { name: 'itemsPlayer', type: { vec: { defined: 'ItemType' } } },
          { name: 'itemsDealer', type: { vec: { defined: 'ItemType' } } },
          { name: 'sawActive', type: 'bool' },
          { name: 'playerCuffed', type: 'bool' },
          { name: 'dealerCuffed', type: 'bool' },
          { name: 'pillsBitmask', type: 'u8' },
          { name: 'pillsIndex', type: 'u8' },
          { name: 'round', type: 'u8' },
          { name: 'lastActionTs', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
  events: [
    {
      name: 'GameCreated',
      fields: [
        { name: 'room', type: 'publicKey' },
        { name: 'bet', type: 'u64' },
      ],
    },
    {
      name: 'GameStarted',
      fields: [
        { name: 'firstTurn', type: 'u8' },
        { name: 'totalShells', type: 'u8' },
        { name: 'liveCount', type: 'u8' },
      ],
    },
    {
      name: 'ShellFired',
      fields: [
        { name: 'shooter', type: 'u8' },
        { name: 'target', type: 'u8' },
        { name: 'wasLive', type: 'bool' },
        { name: 'dmg', type: 'u8' },
      ],
    },
    {
      name: 'ItemUsed',
      fields: [
        { name: 'player', type: 'u8' },
        { name: 'item', type: { defined: 'ItemType' } },
      ],
    },
    {
      name: 'TurnChanged',
      fields: [
        { name: 'newTurn', type: 'u8' },
      ],
    },
    {
      name: 'RoundReloaded',
      fields: [
        { name: 'round', type: 'u8' },
        { name: 'totalShells', type: 'u8' },
        { name: 'liveCount', type: 'u8' },
      ],
    },
    {
      name: 'GameFinished',
      fields: [
        { name: 'winner', type: 'u8' },
        { name: 'payout', type: 'u64' },
      ],
    },
    {
      name: 'MagnifyingGlassReveal',
      fields: [
        { name: 'isLive', type: 'bool' },
      ],
    },
    {
      name: 'BurnerPhoneReveal',
      fields: [
        { name: 'position', type: 'u8' },
        { name: 'isLive', type: 'bool' },
      ],
    },
    {
      name: 'DealerAction',
      fields: [
        { name: 'action', type: { defined: 'DealerActionType' } },
        { name: 'result', type: 'bool' },
      ],
    },
  ],
  types: [
    {
      name: 'GameState',
      type: {
        kind: 'enum',
        variants: [
          { name: 'WaitingToStart' },
          { name: 'PlayerTurn' },
          { name: 'DealerTurn' },
          { name: 'Finished' },
        ],
      },
    },
    {
      name: 'ItemType',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Beer' },
          { name: 'MagnifyingGlass' },
          { name: 'Cigarettes' },
          { name: 'HandSaw' },
          { name: 'Handcuffs' },
          { name: 'Pills' },
          { name: 'Inverter' },
          { name: 'BurnerPhone' },
        ],
      },
    },
    {
      name: 'Target',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Self' },
          { name: 'Opponent' },
        ],
      },
    },
    {
      name: 'DealerActionType',
      type: {
        kind: 'enum',
        variants: [
          { name: 'ShootPlayer' },
          { name: 'ShootSelf' },
          { name: 'UseItem' },
          { name: 'Reload' },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'NotYourTurn', msg: 'Not your turn' },
    { code: 6001, name: 'GameNotActive', msg: 'Game is not active' },
    { code: 6002, name: 'ItemNotOwned', msg: 'You do not have that item' },
    { code: 6003, name: 'MaxHealthReached', msg: 'Already at max HP' },
    { code: 6004, name: 'CannotCuffCuffed', msg: 'Target is already cuffed' },
    { code: 6005, name: 'InvalidBetAmount', msg: 'Invalid bet amount (0.01-10 SOL)' },
    { code: 6006, name: 'InsufficientFunds', msg: 'Insufficient SOL' },
    { code: 6007, name: 'GameAlreadyStarted', msg: 'Game has already progressed past round 1' },
  ],
} as const
