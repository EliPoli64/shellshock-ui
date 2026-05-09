export type GameAction = 'ShootDealer' | 'ShootSelf' | 'UseItem' | 'Reload';

export type ItemType =
  | 'magnifyingGlass'
  | 'beer'
  | 'handcuffs'
  | 'cigarettes'
  | 'saw'
  | 'pill';

export interface GameStateUpdate {
  player_health: number;
  dealer_health: number;
  shells_remaining: number;
  live_shells: number;
  blank_shells: number;
  items: DealerItems;
  dealer_items: DealerItems;
  is_player_turn: boolean;
  /** Mirrors the Rust GameState.is_saw_active field. Cleared after every shot and on Reload. */
  is_saw_active: boolean;
  game_status: 'playing' | 'round_end' | 'gameover';
  /**
   * Full ordered chamber array returned by the server. Present on every response so the
   * client array stays in sync (e.g. Beer ejects chamber[0] in Rust; the client must
   * update its local copy rather than derive it).
   */
  chamber?: ('live' | 'blank')[];
  /** Set only when the player used a MagnifyingGlass; reveals the next shell type. */
  chamber_peek?: 'live' | 'blank';
  /** Populated only when the action triggered an automatic Reload (chamber ran empty). */
  reload_info?: {
    live_shells: number;
    blank_shells: number;
    shells_remaining: number;
  };
  /**
   * Summary of the action the server just processed. Matches the Rust ActionResult fields:
   * description, is_live, damage, reload. There is no item_effect field in Rust.
   */
  last_action_result?: {
    type: GameAction;
    is_live?: boolean;
    damage?: number;
  };
}

export interface MoveRequest {
  match_id: string;
  player_wallet: string;
  action: GameAction;
  item_type?: ItemType;
  signature?: string;
}

export interface MoveResponse {
  success: boolean;
  signature?: string;
  error?: string;
  state_update?: GameStateUpdate;
}

export interface MatchHistoryEntry {
  match_id: string;
  opponent_wallet: string;
  winner_wallet: string;
  bet_lamports: number;
  created_at: string;
  ended_at: string;
  total_rounds: number;
}

export interface PlayerStats {
  wallet: string;
  total_matches: number;
  wins: number;
  losses: number;
  total_sol_won: number;
  total_sol_lost: number;
}

// Dealer PvE Types
export interface DealerItems {
  magnifyingGlass: number;
  beer: number;
  handcuffs: number;
  cigarettes: number;
  saw: number;
  pill: number;
}

export type DealerActionType = 
  | { type: 'UseItem', item: ItemType, result?: string }
  | { type: 'ShootDealer', is_live: boolean, damage: number }
  | { type: 'ShootPlayer', is_live: boolean, damage: number }
  | { type: 'Reload', live: number, blank: number };

export interface DealerTurnResponse {
  success: boolean;
  actions: DealerActionType[];
  error?: string;
}