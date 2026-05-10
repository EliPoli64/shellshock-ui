import type {
  MoveRequest,
  MoveResponse,
  DealerTurnResponse,
  DealerItems,
} from '../types/backend';

class BackendClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  }

  async getDealerTurn(data: {
    match_id: string;
    player_health: number;
    dealer_health: number;
    shells_remaining: number;
    live_shells: number;
    blank_shells: number;
    items: DealerItems;
    player_handcuffed: boolean;
  }): Promise<DealerTurnResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/match/pve/${data.match_id}/dealer-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: data.match_id }),
      });
      if (!response.ok) throw new Error('Failed to fetch dealer turn');
      return await response.json();
    } catch (error) {
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendAction(request: MoveRequest): Promise<MoveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/match/pve/${request.match_id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send action');
      }
      return await response.json();
    } catch (error) {
      console.error('Backend action error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getMatchHistory(wallet: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/player/${wallet}/history`);
      if (!response.ok) throw new Error('Failed to fetch match history');
      return await response.json();
    } catch (error) {
      console.error('Fetch history error:', error);
      return [];
    }
  }

  async getPlayerStats(wallet: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/player/${wallet}/stats`);
      if (!response.ok) throw new Error('Failed to fetch player stats');
      return await response.json();
    } catch (error) {
      console.error('Fetch stats error:', error);
      return null;
    }
  }
}

export const backendClient = new BackendClient();
