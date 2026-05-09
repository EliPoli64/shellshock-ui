import random
from typing import List, Optional, Tuple
from models import GameStateUpdate, DealerItems, GameAction, LastActionResult, ItemType

class GameLogic:
    @staticmethod
    def generate_chamber(total_shells: int) -> Tuple[List[str], int, int]:
        """Generates a random sequence of live and blank shells."""
        if total_shells <= 0:
            return [], 0, 0
        
        # For Buckshot Roulette style, sometimes all shells can be live or blank
        # But we'll keep it balanced with at least 1 of each if total >= 2
        if total_shells >= 2:
            live_count = random.randint(1, total_shells - 1)
        else:
            live_count = random.randint(0, total_shells)
        
        blank_count = total_shells - live_count
        
        chamber = (["live"] * live_count) + (["blank"] * blank_count)
        random.shuffle(chamber)
        
        return chamber, live_count, blank_count

    @staticmethod
    def reload_shotgun() -> Tuple[List[str], int, int]:
        """Reload the shotgun with a new set of shells (6 shells in Buckshot Roulette)."""
        return GameLogic.generate_chamber(6)

    @staticmethod
    def handle_shot(chamber: List[str], target_is_self: bool) -> Tuple[bool, bool, int]:
        """
        Handles a shot.
        Returns: (is_live, should_continue_turn, damage)
        """
        if not chamber:
            return False, False, 0
            
        shell = chamber.pop(0)
        is_live = shell == "live"
        damage = 1 if is_live else 0
        
        # Turn continues ONLY if: shooting self with a BLANK
        # Turn ends if: shooting dealer OR shooting self with LIVE
        should_continue_turn = target_is_self and not is_live
            
        return is_live, should_continue_turn, damage

    @staticmethod
    def apply_item(item_type: ItemType, state: GameStateUpdate, chamber: List[str]) -> Tuple[GameStateUpdate, List[str], Optional[str]]:
        """Applies item effects and returns updated state and chamber."""
        effect = None
        
        if item_type == ItemType.MAGNIFYING_GLASS:
            if chamber:
                effect = f"Current shell is {chamber[0]}"
                state.chamber_peek = chamber[0]  # type: ignore
            else:
                effect = "Chamber is empty!"
        
        elif item_type == ItemType.BEER:
            if chamber:
                shell = chamber.pop(0)
                effect = f"Ejected {shell} shell"
                if shell == "live":
                    state.live_shells -= 1
                else:
                    state.blank_shells -= 1
                state.shells_remaining -= 1
                # Reset peek since top shell changed
                state.chamber_peek = None
            else:
                effect = "Chamber is empty! No shell to eject."

        elif item_type == ItemType.CIGARETTES:
            # Heals 1 health, max 3
            if state.is_player_turn:
                state.player_health = min(state.player_health + 1, 3)
            else:
                state.dealer_health = min(state.dealer_health + 1, 3)
            effect = "Healed 1 HP"

        elif item_type == ItemType.SAW:
            effect = "Saw activated - Double damage next live shot"
            # Flag will be set in the caller
        
        elif item_type == ItemType.HANDCUFFS:
            effect = "Opponent handcuffed - They skip their next turn"
            # Flag will be set in the caller
            
        elif item_type == ItemType.PILL:
            # 50/50 chance: heal 2 to max, or take 1 damage (can kill)
            is_good = random.random() < 0.5
            if is_good:
                if state.is_player_turn:
                    state.player_health = min(state.player_health + 2, 3)
                else:
                    state.dealer_health = min(state.dealer_health + 2, 3)
                effect = "Pill worked! Healed 2 HP"
            else:
                if state.is_player_turn:
                    state.player_health -= 1
                else:
                    state.dealer_health -= 1
                effect = "Bad pill! Lost 1 HP"
            
        return state, chamber, effect