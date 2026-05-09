import type { 
  MoveRequest, 
  MoveResponse, 
  MatchHistoryEntry, 
  PlayerStats,
  DealerTurnResponse,
  DealerItems
} from '../types/backend';

class BackendClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  }

  async getDealerTurn(data: {
    match_id: string;
  }): Promise<DealerTurnResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/match/${data.match_id}/dealer-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to fetch dealer turn');
      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        actions: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendAction(request: MoveRequest): Promise<MoveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/match/${request.match_id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send action to backend');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Backend action error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async startPvEGame(wallet: string, bet: number): Promise<{ success: boolean; match_id?: string; initial_state?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/match/pve/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, bet_lamports: Math.round(bet * 1_000_000_000) }),
      });

      if (!response.ok) throw new Error('Failed to start PvE game');
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMatchHistory(wallet: string): Promise<MatchHistoryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/player/${wallet}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch match history');
      }
      return await response.json();
    } catch (error) {
      console.error('Fetch history error:', error);
      return [];
    }
  }

  async getPlayerStats(wallet: string): Promise<PlayerStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/player/${wallet}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Fetch stats error:', error);
      return null;
    }
  }
}

export const backendClient = new BackendClient();
