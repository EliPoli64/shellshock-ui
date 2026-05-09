from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    StartPvERequest, MoveRequest, MoveResponse, 
    DealerTurnRequest, DealerTurnResponse, DealerAction,
    MatchHistoryEntry, PlayerStats,
    GameStateUpdate, LastActionResult, GameAction, ItemType
)
from storage import storage, Match
from game_logic import GameLogic
from dealer_ai import DealerAI
from typing import List
import random

app = FastAPI(title="ShellShock Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def reload_match(match: Match, award_items: bool = True):
    """Reload the shotgun with new shells and optionally award items."""
    chamber, live, blank = GameLogic.reload_shotgun()
    match.chamber = chamber
    match.live_shells = live
    match.blank_shells = blank
    match.chamber_peek = None
    
    # Award 2 random items to both player and dealer after reload (Buckshot Roulette style)
    if award_items:
        for _ in range(2):
            item_to_add = random.choice(list(ItemType))
            attr = item_to_add.value
            setattr(match.player_items, attr, getattr(match.player_items, attr) + 1)
            
            item_to_add = random.choice(list(ItemType))
            attr = item_to_add.value
            setattr(match.dealer_items, attr, getattr(match.dealer_items, attr) + 1)

@app.post("/match/pve/start")
async def start_pve_game(request: StartPvERequest):
    match = storage.create_match(request.wallet, request.bet_lamports)
    reload_match(match, award_items=True)
    match.reset_turn_timer()
    
    return {
        "success": True,
        "match_id": match.match_id,
        "initial_state": match.get_state_update()
    }

@app.post("/match/{match_id}/action")
async def player_action(match_id: str, request: MoveRequest):
    match = storage.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check for automatic timeout before processing any action
    if match.check_timeout():
        return MoveResponse(
            success=True,
            state_update=match.get_state_update(),
            error="Turn timed out"
        )

    if not match.is_player_turn:
        raise HTTPException(status_code=400, detail="Not player's turn")

    result_type = request.action
    is_live = False
    damage = 0
    item_effect = None
    should_continue_turn = False
    reload_occurred = False

    if request.action == GameAction.SHOOT_DEALER or request.action == GameAction.SHOOT_SELF:
        target_is_self = request.action == GameAction.SHOOT_SELF
        is_live, should_continue_turn, base_damage = GameLogic.handle_shot(match.chamber, target_is_self)
        
        damage = base_damage
        if match.is_saw_active and is_live:
            damage *= 2
            match.is_saw_active = False
            
        if is_live:
            match.live_shells -= 1
            if target_is_self:
                match.player_health -= damage
                item_effect = f"Shot yourself! {'Critical hit! ' if damage > 1 else ''}Took {damage} damage"
            else:
                match.dealer_health -= damage
                item_effect = f"Shot dealer! {'Critical hit! ' if damage > 1 else ''}Dealt {damage} damage"
        else:
            match.blank_shells -= 1
            if target_is_self:
                item_effect = "Shot yourself with a blank! Turn continues"
            else:
                item_effect = "Shot dealer with a blank!"
        
        # Check if chamber became empty after this shot
        if not match.chamber and match.game_status == "playing":
            reload_match(match, award_items=True)
            reload_occurred = True
            if item_effect:
                item_effect += " (Shotgun reloaded! New items awarded!)"
            else:
                item_effect = "Shotgun reloaded! New items awarded!"
        
        # Handle turn flow
        if should_continue_turn and not reload_occurred:
            # Player shot self with blank - continue their turn
            match.reset_turn_timer()
        else:
            # Turn ends - check for handcuffs
            if match.dealer_handcuffed:
                match.dealer_handcuffed = False
                match.is_player_turn = True  # Player gets another turn
                match.reset_turn_timer()
                item_effect += " (Dealer was handcuffed!)"
            else:
                match.is_player_turn = False
                # Don't reset timer - dealer's turn will start with its own timer
            
    elif request.action == GameAction.USE_ITEM:
        if not request.item_type:
            raise HTTPException(status_code=400, detail="Item type required")
            
        # Check if player has item
        item_attr = request.item_type.value
        count = getattr(match.player_items, item_attr)
        if count <= 0:
            raise HTTPException(status_code=400, detail="Item not available")
            
        setattr(match.player_items, item_attr, count - 1)
        
        # Apply effect
        state = match.get_state_update()
        new_state, new_chamber, effect = GameLogic.apply_item(request.item_type, state, match.chamber)
        
        match.chamber = new_chamber
        match.player_health = new_state.player_health
        match.dealer_health = new_state.dealer_health
        match.live_shells = new_state.live_shells
        match.blank_shells = new_state.blank_shells
        match.chamber_peek = new_state.chamber_peek
        item_effect = effect
        
        if request.item_type == ItemType.SAW:
            match.is_saw_active = True
        elif request.item_type == ItemType.HANDCUFFS:
            match.dealer_handcuffed = True
        
        # Check if item (like Beer) emptied the chamber
        if not match.chamber and match.game_status == "playing":
            reload_match(match, award_items=True)
            if item_effect: 
                item_effect += " (Shotgun reloaded! New items awarded!)"
            else: 
                item_effect = "Shotgun reloaded! New items awarded!"

        match.reset_turn_timer()
        
    elif request.action == GameAction.TIMEOUT:
        # Player lost their turn and takes 1 damage
        match.player_health -= 1
        match.is_player_turn = False
        item_effect = "Turn timeout! Lost 1 HP"
        
        # Check if player died from timeout
        if match.player_health <= 0:
            match.game_status = "gameover"
        
    elif request.action == GameAction.FOLD:
        # Player surrendered
        match.player_health = 0
        match.game_status = "gameover"
        item_effect = "Player folded"

    # Check for game over
    if match.player_health <= 0:
        match.game_status = "gameover"
        winner = "Dealer"
        storage.save_history(match, winner)
    elif match.dealer_health <= 0:
        match.game_status = "gameover"
        winner = match.player_wallet
        storage.save_history(match, winner)
        
    match.last_action_result = LastActionResult(
        type=result_type,
        is_live=is_live if result_type in [GameAction.SHOOT_DEALER, GameAction.SHOOT_SELF] else None,
        damage=damage if result_type in [GameAction.SHOOT_DEALER, GameAction.SHOOT_SELF] else None,
        item_effect=item_effect
    )

    return MoveResponse(
        success=True,
        state_update=match.get_state_update()
    )

@app.post("/match/{match_id}/dealer-turn")
async def dealer_turn(match_id: str, request: DealerTurnRequest):
    match = storage.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    actions = []
    
    # Dealer keeps taking actions as long as it's their turn and game is playing
    while not match.is_player_turn and match.game_status == "playing":
        raw_actions = DealerAI.decide_turn(
            items=match.dealer_items,
            dealer_health=match.dealer_health,
            player_health=match.player_health,
            player_handcuffed=match.player_handcuffed,
            chamber=match.chamber,
            live_shells=match.live_shells,
            blank_shells=match.blank_shells
        )
        
        if not raw_actions:
            # No actions to take, end dealer turn
            match.is_player_turn = True
            match.reset_turn_timer()
            break
            
        for action in raw_actions:
            if action.type == "ShootPlayer" or action.type == "ShootDealer":
                target_is_self = action.type == "ShootDealer"
                is_live, should_continue_turn, base_damage = GameLogic.handle_shot(match.chamber, target_is_self)
                
                damage = base_damage
                if match.is_saw_active and is_live:
                    damage *= 2
                    match.is_saw_active = False
                    
                if is_live:
                    match.live_shells -= 1
                    if target_is_self:
                        match.dealer_health -= damage
                    else:
                        match.player_health -= damage
                else:
                    match.blank_shells -= 1
                
                actions.append(DealerAction(
                    type=action.type,
                    is_live=is_live,
                    damage=damage
                ))
                
                # Check if chamber became empty after this shot
                if not match.chamber and match.game_status == "playing":
                    reload_match(match, award_items=True)
                    actions.append(DealerAction(
                        type="Reload", 
                        live=match.live_shells, 
                        blank=match.blank_shells,
                        result="Shotgun reloaded! New items awarded!"
                    ))
                
                # Handle turn flow
                if should_continue_turn:
                    # Dealer shot self with blank - continue their turn
                    continue
                else:
                    # Turn ends - check if player is handcuffed
                    if match.player_handcuffed:
                        match.player_handcuffed = False
                        # Dealer gets another turn
                        actions.append(DealerAction(type="Info", result="Player was handcuffed! Dealer continues"))
                        break  # Break to continue loop for dealer's next turn
                    else:
                        match.is_player_turn = True
                        match.reset_turn_timer()
                        break  # Break out of action loop entirely
                    
            elif action.type == "UseItem":
                item_type = action.item
                if item_type:
                    item_attr = item_type.value
                    count = getattr(match.dealer_items, item_attr)
                    if count <= 0: 
                        continue
                    
                    setattr(match.dealer_items, item_attr, count - 1)
                    state = match.get_state_update()
                    new_state, new_chamber, effect = GameLogic.apply_item(item_type, state, match.chamber)
                    
                    match.chamber = new_chamber
                    match.player_health = new_state.player_health
                    match.dealer_health = new_state.dealer_health
                    match.live_shells = new_state.live_shells
                    match.blank_shells = new_state.blank_shells
                    match.chamber_peek = new_state.chamber_peek
                    
                    if item_type == ItemType.SAW:
                        match.is_saw_active = True
                    elif item_type == ItemType.HANDCUFFS:
                        match.player_handcuffed = True
                    
                    actions.append(DealerAction(type="UseItem", item=item_type, result=effect))
                    
                    # Check for reload after item use
                    if not match.chamber and match.game_status == "playing":
                        reload_match(match, award_items=True)
                        actions.append(DealerAction(
                            type="Reload", 
                            live=match.live_shells, 
                            blank=match.blank_shells,
                            result="Shotgun reloaded! New items awarded!"
                        ))

        # Check for game over after each action
        if match.player_health <= 0:
            match.game_status = "gameover"
            winner = "Dealer"
            storage.save_history(match, winner)
            break
        elif match.dealer_health <= 0:
            match.game_status = "gameover"
            winner = match.player_wallet
            storage.save_history(match, winner)
            break

    return DealerTurnResponse(
        success=True, 
        actions=actions,
        state_update=match.get_state_update()
    )

@app.get("/player/{wallet}/history", response_model=List[MatchHistoryEntry])
async def get_history(wallet: str):
    return [h for h in storage.history if h.opponent_wallet == "Dealer"]  # Simplified filter

@app.get("/player/{wallet}/stats", response_model=PlayerStats)
async def get_stats(wallet: str):
    stats = storage.player_stats.get(wallet)
    if not stats:
        return PlayerStats(wallet=wallet, total_matches=0, wins=0, losses=0, total_sol_won=0, total_sol_lost=0)
    return stats

if __name__ == "__main__":
    print()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3040)