import type { MoveRequest, MoveResponse, MatchHistoryEntry, PlayerStats } from '../types/backend';

class BackendClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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

      return await response.json();
    } catch (error) {
      console.error('Backend action error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
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
