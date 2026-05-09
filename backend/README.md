# ShellShock Python Backend

This is a FastAPI-based backend for the ShellShock game, a Buckshot Roulette-style game.

## Features
- **PvE Match Management**: Start and track game sessions.
- **Game Logic**: Server-side validation of actions, shell management, and item effects.
- **Dealer AI**: Intelligent decision-making for the computer opponent.
- **Player Stats & History**: Persistent tracking of match results and earnings.

## Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   python -m backend.main
   ```
   The server will start on `http://localhost:3030`.

## API Endpoints

- `POST /match/pve/start`: Start a new PvE match.
- `POST /match/{match_id}/action`: Send a player action (ShootDealer, ShootSelf, UseItem).
- `POST /match/{match_id}/dealer-turn`: Get AI-generated actions for the dealer.
- `GET /player/{wallet}/history`: Get match history for a specific wallet.
- `GET /player/{wallet}/stats`: Get player statistics.

## Testing
Run the test script to verify the backend:
```bash
python backend/test_backend.py
```
