// lib/backendClient.ts
import type { 
  MoveRequest, 
  MoveResponse, 
  DealerTurnResponse,
  DealerItems 
} from '../types/backend';

// Game state stored in memory
interface PvEMatch {
  match_id: string;
  wallet: string;
  bet_lamports: number;
  player_health: number;
  dealer_health: number;
  chamber: ('live' | 'blank')[];
  shells_remaining: number;
  live_shells: number;
  blank_shells: number;
  items: DealerItems;
  dealer_items: DealerItems;
  is_player_turn: boolean;
  is_saw_active: boolean;
  player_handcuffed: boolean;
  game_status: 'playing' | 'round_end' | 'gameover';
  last_action_result?: {
    type: string;
    is_live?: boolean;
    damage?: number;
    item?: string;
  };
}

// In-memory storage for active matches
const activeMatches = new Map<string, PvEMatch>();

// Helper to generate random chamber
function generateChamber(): ('live' | 'blank')[] {
  const chamber: ('live' | 'blank')[] = [];
  // 3 live, 3 blank
  for (let i = 0; i < 3; i++) chamber.push('live');
  for (let i = 0; i < 3; i++) chamber.push('blank');
  // Shuffle
  for (let i = chamber.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chamber[i], chamber[j]] = [chamber[j], chamber[i]];
  }
  return chamber;
}

// Dealer AI logic
function computeDealerActions(match: PvEMatch): DealerTurnResponse['actions'] {
  const actions: DealerTurnResponse['actions'] = [];
  
  // If handcuffed, just end turn
  if (match.player_handcuffed) {
    match.player_handcuffed = false;
    match.is_player_turn = true;
    return actions;
  }

  let knownShell: 'live' | 'blank' | null = null;
  let itemsUsed = 0;
  const MAX_ITEMS_PER_TURN = 3;

  // Helper to use an item
  const useItem = (item: keyof DealerItems, effect: () => void): boolean => {
    if (itemsUsed >= MAX_ITEMS_PER_TURN) return false;
    if (match.dealer_items[item] <= 0) return false;
    
    match.dealer_items[item]--;
    itemsUsed++;
    effect();
    return true;
  };

  // 1. Use cigarettes if damaged
  if (match.dealer_health < 3) {
    useItem('cigarettes', () => {
      match.dealer_health = Math.min(match.dealer_health + 1, 5);
      actions.push({
        type: 'UseItem',
        item: 'cigarettes',
        result: `Dealer healed to ${match.dealer_health} HP`
      });
    });
  }

  // 2. Use magnifying glass to peek
  if (knownShell === null && match.chamber.length > 0) {
    useItem('magnifyingGlass', () => {
      knownShell = match.chamber[0];
      actions.push({
        type: 'UseItem',
        item: 'magnifyingGlass',
        result: 'Dealer peeked at the chamber'
      });
    });
  }

  // 3. Use beer to eject blank shell
  if (knownShell === 'blank' && match.chamber.length > 0) {
    useItem('beer', () => {
      const ejected = match.chamber.shift()!;
      match.shells_remaining--;
      if (ejected === 'live') match.live_shells--;
      else match.blank_shells--;
      knownShell = null;
      actions.push({
        type: 'UseItem',
        item: 'beer',
        result: 'Dealer ejected a shell',
        ejected_shell: ejected
      });
    });
  }

  // 4. Use saw if next shell is live
  if (knownShell === 'live' && !match.is_saw_active) {
    useItem('saw', () => {
      match.is_saw_active = true;
      actions.push({
        type: 'UseItem',
        item: 'saw',
        result: 'Dealer sawed the barrel'
      });
    });
  }

  // 5. Use handcuffs on player
  if (!match.player_handcuffed) {
    useItem('handcuffs', () => {
      match.player_handcuffed = true;
      actions.push({
        type: 'UseItem',
        item: 'handcuffs',
        result: 'Dealer handcuffed the player'
      });
    });
  }

  // 6. Use pill if health is low
  if (match.dealer_health <= 1) {
    useItem('pill', () => {
      const heal = Math.random() < 0.5;
      if (heal) {
        match.dealer_health = Math.min(match.dealer_health + 2, 5);
        actions.push({
          type: 'UseItem',
          item: 'pill',
          result: 'Dealer used pill - Healed!'
        });
      } else {
        match.dealer_health = Math.max(0, match.dealer_health - 1);
        actions.push({
          type: 'UseItem',
          item: 'pill',
          result: 'Dealer used pill - Damaged!'
        });
      }
    });
  }

  // 7. Shoot!
  if (match.chamber.length > 0) {
    const shell = match.chamber[0];
    const isLive = shell === 'live';
    const damage = match.is_saw_active ? 2 : 1;
    
    // Decide whether to shoot self or player
    let shootSelf = false;
    if (knownShell === 'live') shootSelf = false;
    else if (knownShell === 'blank') shootSelf = true;
    else shootSelf = Math.random() < 0.3; // 30% chance to shoot self when unknown
    
    // Remove the shell
    match.chamber.shift();
    match.shells_remaining--;
    if (isLive) match.live_shells--;
    else match.blank_shells--;
    
    match.is_saw_active = false;
    
    if (shootSelf) {
      // Shoot self (dealer)
      actions.push({
        type: 'ShootSelf',
        is_live: isLive,
        damage
      });
      
      if (isLive) {
        match.dealer_health = Math.max(0, match.dealer_health - damage);
        match.is_player_turn = true;
      }
      // Blank: dealer keeps turn
    } else {
      // Shoot player
      actions.push({
        type: 'ShootPlayer',
        is_live: isLive,
        damage
      });
      
      if (isLive) {
        match.player_health = Math.max(0, match.player_health - damage);
      }
      match.is_player_turn = true;
    }
  }

  // Check game end conditions
  if (match.dealer_health <= 0) {
    match.game_status = 'round_end';
  } else if (match.player_health <= 0) {
    match.game_status = 'gameover';
  }

  // Auto-reload if chamber empty and game still playing
  if (match.game_status === 'playing' && match.chamber.length === 0) {
    const newChamber = generateChamber();
    match.chamber = newChamber;
    match.shells_remaining = 6;
    match.live_shells = newChamber.filter(s => s === 'live').length;
    match.blank_shells = newChamber.filter(s => s === 'blank').length;
    actions.push({
      type: 'Reload',
      live: match.live_shells,
      blank: match.blank_shells
    });
  }

  return actions;
}

class BackendClient {
  private baseUrl: string;
  private useMock: boolean;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    // Set to true to use mock implementation, false to use real backend
    this.useMock = true; // Change to false when backend is available
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
    if (this.useMock) {
      // Mock implementation
      const match = activeMatches.get(data.match_id);
      if (!match) {
        return { success: false, actions: [], error: 'Match not found' };
      }
      
      const actions = computeDealerActions(match);
      
      // Save updated match state
      activeMatches.set(data.match_id, match);
      
      return {
        success: true,
        actions,
        error: undefined
      };
    }
    
    // Real backend call
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
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendAction(request: MoveRequest): Promise<MoveResponse> {
    if (this.useMock) {
      // Mock implementation
      const match = activeMatches.get(request.match_id);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }
      
      // Check if it's player's turn
      if (!match.is_player_turn) {
        return { success: false, error: "Not your turn" };
      }
      
      // Check if game is still playing
      if (match.game_status !== 'playing') {
        return { success: false, error: "Game is over" };
      }
      
      let lastActionResult: any = null;
      
      switch (request.action) {
        case 'ShootDealer':
          if (match.chamber.length === 0) {
            return { success: false, error: "No shells in chamber" };
          }
          const shellToDealer = match.chamber.shift()!;
          const isLiveDealer = shellToDealer === 'live';
          match.shells_remaining--;
          if (isLiveDealer) match.live_shells--;
          else match.blank_shells--;
          
          const dealerDamage = match.is_saw_active ? 2 : 1;
          
          if (isLiveDealer) {
            match.dealer_health = Math.max(0, match.dealer_health - dealerDamage);
          }
          match.is_player_turn = false;
          match.is_saw_active = false;
          
          lastActionResult = {
            type: 'ShootDealer',
            is_live: isLiveDealer,
            damage: isLiveDealer ? dealerDamage : 0
          };
          break;
          
        case 'ShootSelf':
          if (match.chamber.length === 0) {
            return { success: false, error: "No shells in chamber" };
          }
          const shellToSelf = match.chamber.shift()!;
          const isLiveSelf = shellToSelf === 'live';
          match.shells_remaining--;
          if (isLiveSelf) match.live_shells--;
          else match.blank_shells--;
          
          const selfDamage = match.is_saw_active ? 2 : 1;
          
          if (isLiveSelf) {
            match.player_health = Math.max(0, match.player_health - selfDamage);
            match.is_player_turn = false;
          }
          // Blank: player keeps turn
          match.is_saw_active = false;
          
          lastActionResult = {
            type: 'ShootSelf',
            is_live: isLiveSelf,
            damage: isLiveSelf ? selfDamage : 0
          };
          break;
          
        case 'UseItem':
          if (!request.item_type) {
            return { success: false, error: "Item type required" };
          }
          const item = request.item_type;
          if (match.items[item as keyof DealerItems] <= 0) {
            return { success: false, error: `No ${item} left` };
          }
          
          match.items[item as keyof DealerItems]--;
          
          switch (item) {
            case 'magnifyingGlass':
              lastActionResult = { type: 'UseItem', item, peek: match.chamber[0] };
              break;
            case 'beer':
              if (match.chamber.length > 0) {
                const ejected = match.chamber.shift()!;
                match.shells_remaining--;
                if (ejected === 'live') match.live_shells--;
                else match.blank_shells--;
                lastActionResult = { type: 'UseItem', item, ejected_shell: ejected };
              }
              break;
            case 'handcuffs':
              // Handcuffs dealer for next turn
              match.player_handcuffed = true;
              lastActionResult = { type: 'UseItem', item };
              break;
            case 'cigarettes':
              match.player_health = Math.min(match.player_health + 1, 5);
              lastActionResult = { type: 'UseItem', item };
              break;
            case 'saw':
              match.is_saw_active = true;
              lastActionResult = { type: 'UseItem', item };
              break;
            case 'pill':
              const heal = Math.random() < 0.5;
              if (heal) {
                match.player_health = Math.min(match.player_health + 2, 5);
                lastActionResult = { type: 'UseItem', item, result: 'Healed!' };
              } else {
                match.player_health = Math.max(0, match.player_health - 1);
                lastActionResult = { type: 'UseItem', item, result: 'Damaged!' };
              }
              break;
          }
          break;
          
        case 'Reload':
          if (match.chamber.length > 0) {
            return { success: false, error: "Can only reload when chamber is empty" };
          }
          const newChamber = generateChamber();
          match.chamber = newChamber;
          match.shells_remaining = 6;
          match.live_shells = newChamber.filter(s => s === 'live').length;
          match.blank_shells = newChamber.filter(s => s === 'blank').length;
          lastActionResult = { type: 'Reload' };
          break;
          
        case 'Fold':
          match.game_status = 'gameover';
          lastActionResult = { type: 'Fold' };
          break;
      }
      
      // Check win/loss conditions
      if (match.dealer_health <= 0) {
        match.game_status = 'round_end';
      } else if (match.player_health <= 0) {
        match.game_status = 'gameover';
      }
      
      // Auto-reload after shooting if chamber empty
      if (match.game_status === 'playing' && match.chamber.length === 0) {
        const newChamber = generateChamber();
        match.chamber = newChamber;
        match.shells_remaining = 6;
        match.live_shells = newChamber.filter(s => s === 'live').length;
        match.blank_shells = newChamber.filter(s => s === 'blank').length;
      }
      
      match.last_action_result = lastActionResult;
      activeMatches.set(request.match_id, match);
      
      const state_update = {
        player_health: match.player_health,
        dealer_health: match.dealer_health,
        shells_remaining: match.shells_remaining,
        live_shells: match.live_shells,
        blank_shells: match.blank_shells,
        items: match.items,
        dealer_items: match.dealer_items,
        is_player_turn: match.is_player_turn,
        game_status: match.game_status,
        last_action_result: match.last_action_result
      };
      
      return { success: true, state_update, error: undefined };
    }
    
    // Real backend call
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

  async startPvEGame(wallet: string, bet: number): Promise<{
    success: boolean;
    match_id?: string;
    initial_state?: {
      player_health: number;
      dealer_health: number;
      shells_remaining: number;
      live_shells: number;
      blank_shells: number;
      items: DealerItems;
      dealer_items: DealerItems;
      is_player_turn: boolean;
    };
    error?: string;
  }> {
    if (this.useMock) {
      // Mock implementation
      const match_id = crypto.randomUUID();
      const chamber = generateChamber();
      
      const initialItems: DealerItems = {
        magnifyingGlass: 1,
        beer: 1,
        handcuffs: 1,
        cigarettes: 1,
        saw: 1,
        pill: 1,
      };
      
      const match: PvEMatch = {
        match_id,
        wallet,
        bet_lamports: Math.round(bet * 1_000_000_000),
        player_health: 3,
        dealer_health: 3,
        chamber,
        shells_remaining: 6,
        live_shells: chamber.filter(s => s === 'live').length,
        blank_shells: chamber.filter(s => s === 'blank').length,
        items: { ...initialItems },
        dealer_items: { ...initialItems },
        is_player_turn: true,
        is_saw_active: false,
        player_handcuffed: false,
        game_status: 'playing',
      };
      
      activeMatches.set(match_id, match);
      
      return {
        success: true,
        match_id,
        initial_state: {
          player_health: 3,
          dealer_health: 3,
          shells_remaining: 6,
          live_shells: 3,
          blank_shells: 3,
          items: initialItems,
          dealer_items: initialItems,
          is_player_turn: true,
        },
      };
    }
    
    // Real backend call
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

  async getMatchHistory(wallet: string): Promise<any[]> {
    if (this.useMock) {
      return []; // Return empty array for mock
    }
    
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
    if (this.useMock) {
      return {
        wallet,
        total_wins: 0,
        total_losses: 0,
        total_won: 0,
        total_lost: 0,
        win_rate: 0
      };
    }
    
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