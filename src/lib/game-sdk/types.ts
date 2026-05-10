import { PublicKey } from '@solana/web3.js'
import type { BN } from '@coral-xyz/anchor'

export const GameState = {
  WaitingToStart: 'waitingToStart',
  PlayerTurn: 'playerTurn',
  DealerTurn: 'dealerTurn',
  Finished: 'finished',
} as const

export const ItemType = {
  Beer: 'beer',
  MagnifyingGlass: 'magnifyingGlass',
  Cigarettes: 'cigarettes',
  HandSaw: 'handSaw',
  Handcuffs: 'handcuffs',
  Pills: 'pills',
  Inverter: 'inverter',
  BurnerPhone: 'burnerPhone',
} as const

export type ItemTypeValue = (typeof ItemType)[keyof typeof ItemType]

export interface GameRoom {
  player: PublicKey
  betAmount: BN
  state: any
  currentTurn: number
  hpPlayer: number
  hpDealer: number
  maxHp: number
  shells: boolean[]
  shellsTotal: number
  shellsLive: number
  itemsPlayer: ItemTypeValue[]
  itemsDealer: ItemTypeValue[]
  sawActive: boolean
  playerCuffed: boolean
  dealerCuffed: boolean
  pillsBitmask: number
  pillsIndex: number
  round: number
  lastActionTs: BN
  bump: number
}

export interface ItemsCount {
  magnifyingGlass: number
  beer: number
  handcuffs: number
  cigarettes: number
  saw: number
  pill: number
}

const ITEM_TYPE_TO_KEY: Record<string, keyof ItemsCount> = {
  beer: 'beer',
  magnifyingGlass: 'magnifyingGlass',
  cigarettes: 'cigarettes',
  handSaw: 'saw',
  handcuffs: 'handcuffs',
  pills: 'pill',
}

export function itemsVecToCounts(vec: ItemTypeValue[]): ItemsCount {
  const counts: ItemsCount = {
    magnifyingGlass: 0,
    beer: 0,
    handcuffs: 0,
    cigarettes: 0,
    saw: 0,
    pill: 0,
  }
  for (const item of vec) {
    const key = ITEM_TYPE_TO_KEY[item]
    if (key) counts[key]++
  }
  return counts
}

export function gameStateToString(state: any): string {
  if (typeof state === 'object') {
    if (state.waitingToStart !== undefined) return 'waitingToStart'
    if (state.playerTurn !== undefined) return 'playerTurn'
    if (state.dealerTurn !== undefined) return 'dealerTurn'
    if (state.finished !== undefined) return 'finished'
  }
  return String(state)
}
