import requests
import json

BASE_URL = "http://localhost:3030"

def test_backend():
    print("Testing ShellShock Backend...")
    
    # 1. Start a game
    print("\n1. Starting PvE Game...")
    start_resp = requests.post(f"{BASE_URL}/match/pve/start", json={
        "wallet": "TestWallet123",
        "bet_lamports": 100000000
    })
    if start_resp.status_code != 200:
        print(f"Failed to start game: {start_resp.text}")
        return
    
    data = start_resp.json()
    match_id = data["match_id"]
    print(f"Game started! Match ID: {match_id}")
    print(f"Initial State: {json.dumps(data['initial_state'], indent=2)}")

    # 2. Perform an action (Shoot Dealer)
    print("\n2. Shooting Dealer...")
    action_resp = requests.post(f"{BASE_URL}/match/{match_id}/action", json={
        "match_id": match_id,
        "player_wallet": "TestWallet123",
        "action": "ShootDealer"
    })
    if action_resp.status_code == 200:
        res = action_resp.json()
        print(f"Action Success: {res['success']}")
        print(f"State Update: {json.dumps(res['state_update'], indent=2)}")
    else:
        print(f"Action failed: {action_resp.text}")

    # 3. Get Stats
    print("\n3. Fetching Player Stats...")
    stats_resp = requests.get(f"{BASE_URL}/player/TestWallet123/stats")
    print(f"Stats: {stats_resp.json()}")

    # 4. Get History
    print("\n4. Fetching Match History...")
    history_resp = requests.get(f"{BASE_URL}/player/TestWallet123/history")
    print(f"History: {history_resp.json()}")

if __name__ == "__main__":
    test_backend()
