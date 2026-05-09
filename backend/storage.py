import uuid
from datetime import datetime
from typing import Dict, List, Optional
from models import GameStateUpdate, DealerItems, MatchHistoryEntry, PlayerStats

class Match:
    def __init__(self, match_id: str, player_wallet: str, bet_lamports: int):
        self.match_id = match_id
        self.player_wallet = player_wallet
        self.bet_lamports = bet_lamports
        self.created_at = datetime.utcnow().isoformat()
        
        # Game State
        self.player_health = 3
        self.dealer_health = 3
        self.chamber: List[str] = []
        self.live_shells = 0
        self.blank_shells = 0
        self.chamber_peek: Optional[str] = None
        
        # Initial items: Start with 0 items, they should be earned or given randomly
        # According to Buckshot Roulette, items are earned between rounds
        initial_items = {
            "magnifyingGlass": 0,
            "beer": 0,
            "handcuffs": 0,
            "cigarettes": 0,
            "saw": 0,
            "pill": 0
        }
        self.player_items = DealerItems(**initial_items)
        self.dealer_items = DealerItems(**initial_items)
        
        self.is_player_turn = True
        self.is_saw_active = False
        self.player_handcuffed = False
        self.dealer_handcuffed = False
        self.game_status = "playing"
        self.last_action_result = None
        self.turn_start_time = datetime.utcnow().isoformat()
        self.turn_timeout_seconds = 15

    def check_timeout(self) -> bool:
        if not self.is_player_turn or self.game_status != "playing":
            return False
        
        now = datetime.utcnow()
        start = datetime.fromisoformat(self.turn_start_time)
        elapsed = (now - start).total_seconds()
        
        if elapsed >= self.turn_timeout_seconds:
            # Apply timeout penalty
            self.player_health -= 1
            self.is_player_turn = False
            if self.player_health <= 0:
                self.game_status = "gameover"
            return True
        return False

    def reset_turn_timer(self):
        self.turn_start_time = datetime.utcnow().isoformat()

    def get_state_update(self) -> GameStateUpdate:
        now = datetime.utcnow()
        start = datetime.fromisoformat(self.turn_start_time)
        elapsed = (now - start).total_seconds()
        remaining = max(0, self.turn_timeout_seconds - int(elapsed))

        return GameStateUpdate(
            player_health=self.player_health,
            dealer_health=self.dealer_health,
            shells_remaining=len(self.chamber),
            live_shells=self.live_shells,
            blank_shells=self.blank_shells,
            items=self.player_items,
            dealer_items=self.dealer_items,
            is_player_turn=self.is_player_turn,
            game_status=self.game_status,  # type: ignore
            last_action_result=self.last_action_result,
            turn_timer=remaining,
            chamber_peek=self.chamber_peek,  # type: ignore
            is_saw_active=self.is_saw_active,
            player_handcuffed=self.player_handcuffed,
            dealer_handcuffed=self.dealer_handcuffed
        )

class Storage:
    def __init__(self):
        self.matches: Dict[str, Match] = {}
        self.history: List[MatchHistoryEntry] = []
        self.player_stats: Dict[str, PlayerStats] = {}

    def create_match(self, player_wallet: str, bet_lamports: int) -> Match:
        match_id = str(uuid.uuid4())
        match = Match(match_id, player_wallet, bet_lamports)
        self.matches[match_id] = match
        return match

    def get_match(self, match_id: str) -> Optional[Match]:
        return self.matches.get(match_id)

    def save_history(self, match: Match, winner_wallet: str):
        entry = MatchHistoryEntry(
            match_id=match.match_id,
            opponent_wallet="Dealer",
            winner_wallet=winner_wallet,
            bet_lamports=match.bet_lamports,
            created_at=match.created_at,
            ended_at=datetime.utcnow().isoformat(),
            total_rounds=1 # Simplified
        )
        self.history.append(entry)
        
        # Update Stats
        self.update_stats(match.player_wallet, winner_wallet == match.player_wallet, match.bet_lamports)

    def update_stats(self, wallet: str, won: bool, bet_lamports: int):
        if wallet not in self.player_stats:
            self.player_stats[wallet] = PlayerStats(
                wallet=wallet,
                total_matches=0,
                wins=0,
                losses=0,
                total_sol_won=0,
                total_sol_lost=0
            )
        
        stats = self.player_stats[wallet]
        stats.total_matches += 1
        sol_amount = bet_lamports / 1_000_000_000
        
        if won:
            stats.wins += 1
            stats.total_sol_won += sol_amount
        else:
            stats.losses += 1
            stats.total_sol_lost += sol_amount

storage = Storage()
