from pydantic import BaseModel
from typing import List, Optional, Literal, Dict
from enum import Enum

class ItemType(str, Enum):
    MAGNIFYING_GLASS = "magnifyingGlass"
    BEER = "beer"
    HANDCUFFS = "handcuffs"
    CIGARETTES = "cigarettes"
    SAW = "saw"
    PILL = "pill"

class GameAction(str, Enum):
    SHOOT_DEALER = "ShootDealer"
    SHOOT_SELF = "ShootSelf"
    USE_ITEM = "UseItem"
    RELOAD = "Reload"
    TIMEOUT = "Timeout"
    FOLD = "Fold"

class DealerItems(BaseModel):
    magnifyingGlass: int = 0
    beer: int = 0
    handcuffs: int = 0
    cigarettes: int = 0
    saw: int = 0
    pill: int = 0

class LastActionResult(BaseModel):
    type: GameAction
    is_live: Optional[bool] = None
    damage: Optional[int] = None
    item_effect: Optional[str] = None

class GameStateUpdate(BaseModel):
    player_health: int
    dealer_health: int
    shells_remaining: int
    live_shells: int
    blank_shells: int
    items: DealerItems
    dealer_items: DealerItems
    is_player_turn: bool
    game_status: Literal["playing", "round_end", "gameover"]
    turn_timer: int = 15
    chamber_peek: Optional[Literal["live", "blank"]] = None
    last_action_result: Optional[LastActionResult] = None
    is_saw_active: bool = False
    player_handcuffed: bool = False
    dealer_handcuffed: bool = False

class MoveRequest(BaseModel):
    match_id: str
    player_wallet: str
    action: GameAction
    item_type: Optional[ItemType] = None
    signature: Optional[str] = None

class MoveResponse(BaseModel):
    success: bool
    signature: Optional[str] = None
    error: Optional[str] = None
    state_update: Optional[GameStateUpdate] = None

class StartPvERequest(BaseModel):
    wallet: str
    bet_lamports: int

class DealerTurnRequest(BaseModel):
    match_id: str

class DealerAction(BaseModel):
    type: str # 'UseItem', 'ShootDealer', 'ShootPlayer', 'Reload'
    item: Optional[ItemType] = None
    result: Optional[str] = None
    is_live: Optional[bool] = None
    damage: Optional[int] = None
    live: Optional[int] = None
    blank: Optional[int] = None

class DealerTurnResponse(BaseModel):
    success: bool
    actions: List[DealerAction]
    error: Optional[str] = None
    state_update: Optional[GameStateUpdate] = None

class MatchHistoryEntry(BaseModel):
    match_id: str
    opponent_wallet: str
    winner_wallet: str
    bet_lamports: int
    created_at: str
    ended_at: str
    total_rounds: int

class PlayerStats(BaseModel):
    wallet: str
    total_matches: int
    wins: int
    losses: int
    total_sol_won: float
    total_sol_lost: float
