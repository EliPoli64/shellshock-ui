// types/backend.ts
export type ItemType = 
  | 'magnifyingGlass'
  | 'beer'
  | 'handcuffs'
  | 'cigarettes'
  | 'saw'
  | 'pill';
export interface DealerItems {
  magnifyingGlass: number;
  beer: number;
  handcuffs: number;
  cigarettes: number;
  saw: number;
  pill: number;
}

export interface MoveRequest {
  match_id: string;
  player_wallet: string;
  action: 'ShootDealer' | 'ShootSelf' | 'UseItem' | 'Reload' | 'Fold';
  item_type?: 'magnifyingGlass' | 'beer' | 'handcuffs' | 'cigarettes' | 'saw' | 'pill';
  signature?: string;
}

export interface MoveResponse {
  success: boolean;
  state_update?: {
    player_health: number;
    dealer_health: number;
    shells_remaining: number;
    live_shells: number;
    blank_shells: number;
    items: DealerItems;
    dealer_items: DealerItems;
    is_player_turn: boolean;
    game_status: string;
    last_action_result?: {
      type: string;
      is_live?: boolean;
      damage?: number;
      item?: string;
      peek?: 'live' | 'blank';
      ejected_shell?: 'live' | 'blank';
      result?: string;
    };
  };
  error?: string;
}

export interface DealerTurnResponse {
  success: boolean;
  actions: Array<{
    type: 'UseItem' | 'ShootSelf' | 'ShootPlayer' | 'Reload';
    item?: string;
    result?: string;
    is_live?: boolean;
    damage?: number;
    ejected_shell?: 'live' | 'blank';
    live?: number;
    blank?: number;
  }>;
  error?: string;
}

export interface MatchHistoryEntry {
  id: string;
  player1: string;
  player2: string;
  winner: string | null;
  total_bet: number;
  started_at: string;
  ended_at: string | null;
}

export interface PlayerStats {
  wallet: string;
  total_wins: number;
  total_losses: number;
  total_won: number;
  total_lost: number;
  win_rate: number;
}