export type GameAction = 'ShootDealer' | 'ShootSelf' | 'UseItem' | 'Reload' | 'Timeout' | 'Fold';

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
  game_status: 'playing' | 'round_end' | 'gameover';
  turn_timer?: number;
  chamber_peek?: 'live' | 'blank';
  last_action_result?: {
    type: GameAction;
    is_live?: boolean;
    damage?: number;
    item_effect?: string;
  };
  is_saw_active: boolean;
  player_handcuffed: boolean;
  dealer_handcuffed: boolean;
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
  | { type: 'Reload', live?: number, blank?: number, result?: string }
  | { type: 'Info', result: string };

export interface DealerTurnRequest {
  match_id: string;
}

export interface DealerTurnResponse {
  success: boolean;
  actions: DealerActionType[];
  error?: string;
  state_update?: GameStateUpdate;
}
