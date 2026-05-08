export type GameAction = 'ShootDealer' | 'ShootSelf' | 'UseItem' | 'Reload';

export type ItemType =
  | 'magnifyingGlass'
  | 'beer'
  | 'handcuffs'
  | 'cigarettes'
  | 'saw'
  | 'pill';

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
