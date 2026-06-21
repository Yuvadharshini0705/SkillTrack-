import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend folder
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# FIX #12: Import both create_app AND socketio.
# Previously used app.run() which bypasses Flask-SocketIO — WebSockets would NOT work.
# Must use socketio.run() so Socket.IO connections are handled correctly.
from app import create_app, socketio

if __name__ == "__main__":
    app = create_app()

    print("\n" + "="*50)
    print("  SkillTrack Backend")
    print("  http://localhost:5000")
    print("="*50 + "\n")

    # Use socketio.run() — not app.run() — so WebSocket/Socket.IO works correctly
    socketio.run(app, debug=True, port=5000, host="0.0.0.0")