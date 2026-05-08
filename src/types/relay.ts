export type RelayRoomPhase =
  | 'waiting_for_player'
  | 'waiting_for_vrf'
  | 'playing'
  | 'round_end'
  | 'finished';

export type RelayServerMessage =
  | {
      type: 'queue.joined';
      ticket_id: string;
      bet_lamports: number;
      queued_at: string;
    }
  | {
      type: 'queue.status';
      ahead_count: number;
      same_bet_count: number;
    }
  | {
      type: 'match.found';
      match_id: string;
      role: 'creator' | 'joiner';
      opponent_wallet: string;
    }
  | {
      type: 'match.room_ready';
      match_id: string;
      room_pubkey: string;
    }
  | {
      type: 'room.state';
      room_pubkey: string;
      phase: RelayRoomPhase;
      turn_wallet: string | null;
      updated_at: string;
      last_signature: string | null;
    }
  | {
      type: 'room.event';
      room_pubkey: string;
      event_type: string;
      payload: Record<string, unknown>;
    }
  | {
      type: 'system.error';
      code: string;
      message: string;
    };

export type RelayClientMessage =
  | {
      type: 'queue.join';
      wallet: string;
      bet_lamports: number;
    }
  | {
      type: 'queue.leave';
      ticket_id: string;
    }
  | {
      type: 'match.room_created';
      match_id: string;
      room_pubkey: string;
      signature: string;
    }
  | {
      type: 'room.subscribe';
      room_pubkey: string;
    }
  | {
      type: 'session.resume';
      wallet: string;
      room_pubkey?: string | null;
      match_id?: string | null;
    };
