import random
from typing import List
from models import DealerAction, DealerItems, ItemType

class DealerAI:
    @staticmethod
    def decide_turn(
        items: DealerItems, 
        dealer_health: int, 
        player_health: int,
        player_handcuffed: bool,
        chamber: List[str],
        live_shells: int,
        blank_shells: int
    ) -> List[DealerAction]:
        actions = []
        # Create copies for decision making
        current_items = DealerItems(**items.dict())
        current_dealer_health = dealer_health
        current_chamber = list(chamber)
        current_live = live_shells
        current_blank = blank_shells
        
        known_shell = "unknown"
        saw_active = False
        
        # Dealer can take multiple actions per turn (items then one shot)
        max_actions = 5
        actions_taken = 0

        while actions_taken < max_actions:
            actions_taken += 1
            
            # 1. PRIORITY: Use items before shooting
            
            # HEAL: If health is low (1 or 2) and we have cigarettes
            if current_items.cigarettes > 0 and current_dealer_health <= 2:
                actions.append(DealerAction(type="UseItem", item=ItemType.CIGARETTES, result="healed"))
                current_items.cigarettes -= 1
                current_dealer_health = min(current_dealer_health + 1, 3)
                continue

            # PILL: Use if health is 1 (desperate) or if health is 2 and we have no cigarettes
            if current_items.pill > 0 and (current_dealer_health == 1 or (current_dealer_health == 2 and current_items.cigarettes == 0)):
                actions.append(DealerAction(type="UseItem", item=ItemType.PILL, result="took_pill"))
                current_items.pill -= 1
                # Note: The actual effect is random, AI just takes the chance
                break  # Pill ends the turn in Buckshot Roulette

            # PEEK: If we don't know the shell and have a magnifying glass
            if current_items.magnifyingGlass > 0 and known_shell == "unknown" and current_chamber:
                known_shell = current_chamber[0]
                actions.append(DealerAction(type="UseItem", item=ItemType.MAGNIFYING_GLASS, result=f"peeked_{known_shell}"))
                current_items.magnifyingGlass -= 1
                continue

            # RACK (BEER): Use if we know it's a blank, or if chamber is dangerous
            if current_items.beer > 0 and current_chamber:
                should_rack = (known_shell == "blank") or (known_shell == "unknown" and current_live > current_blank)
                if should_rack:
                    shell_ejected = current_chamber.pop(0)
                    actions.append(DealerAction(type="UseItem", item=ItemType.BEER, result=f"ejected_{shell_ejected}"))
                    current_items.beer -= 1
                    if shell_ejected == "live": 
                        current_live -= 1
                    else: 
                        current_blank -= 1
                    known_shell = "unknown"  # New shell at top
                    continue

            # SAW: Use if we know it's live, or if risk is high
            if current_items.saw > 0 and not saw_active:
                use_saw = (known_shell == "live") or (known_shell == "unknown" and current_live / max(1, current_live + current_blank) > 0.4)
                if use_saw:
                    actions.append(DealerAction(type="UseItem", item=ItemType.SAW, result="sawed"))
                    current_items.saw -= 1
                    saw_active = True
                    continue

            # HANDCUFFS: Use if player is not already handcuffed
            if current_items.handcuffs > 0 and not player_handcuffed:
                actions.append(DealerAction(type="UseItem", item=ItemType.HANDCUFFS, result="handcuffed"))
                current_items.handcuffs -= 1
                # Player will be handcuffed for their next turn
                continue

            # 2. SHOOTING STRATEGY
            if not current_chamber:
                # Chamber empty - turn ends naturally
                break

            # If we KNOW the shell
            if known_shell == "live":
                actions.append(DealerAction(type="ShootPlayer", is_live=True, damage=2 if saw_active else 1))
                break
            elif known_shell == "blank":
                # Shoot self with blank to keep turn
                actions.append(DealerAction(type="ShootDealer", is_live=False, damage=0))
                break
            
            # If we DON'T know the shell, calculate risk
            total = current_live + current_blank
            if total > 0:
                live_prob = current_live / total
                # Only shoot player if survival probability is low
                # Dealer is more conservative
                if live_prob > 0.66:  # High chance of live, shoot player
                    actions.append(DealerAction(type="ShootPlayer", is_live=None, damage=None))
                elif live_prob < 0.33 and current_dealer_health > 1:  # Low chance, shoot self to keep turn
                    actions.append(DealerAction(type="ShootDealer", is_live=None, damage=None))
                else:
                    # Medium risk - use beer if available, otherwise shoot player
                    if current_items.beer > 0:
                        # Will handle in next iteration
                        continue
                    else:
                        actions.append(DealerAction(type="ShootPlayer", is_live=None, damage=None))
            else:
                actions.append(DealerAction(type="ShootPlayer", is_live=None, damage=None))
            
            break

        return actions