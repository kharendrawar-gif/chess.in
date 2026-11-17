# Real-Time Multiplayer Chess Platform

A full-stack, real-time multiplayer chess platform featuring authoritative server validation, WebSocket synchronization, matchmaking queues, user authentication, persistent SQLite storage, and an official Elo rating system.

Built as an independent Computer Science undergraduate project.

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (React)                                    |
|                                                                                   |
|  [ Interactive 8x8 Board ]   [ Game State Hook ]    [ Room Lobby & Matchmaking ]   |
|            |                          |                          |                |
|            +--------------------------+--------------------------+                |
|                                       | (Socket.IO Client)                        |
+---------------------------------------|-------------------------------------------+
                                        |  Full-Duplex WebSockets
                                        v
+-----------------------------------------------------------------------------------+
|                            NODE.JS + EXPRESS BACKEND                              |
|                                                                                   |
|  +------------------------+  +-----------------------+  +----------------------+  |
|  |   RoomManager (FIFO)   |  |   Authoritative FEN   |  |   REST Auth & Elo    |  |
|  | - 1-Click Matchmaking  |  | - Strict Rule Engine  |  | - JWT Authentication |  |
|  | - Isolated Rooms       |  | - Turn Enforcement    |  | - Password Hashing   |  |
|  | - 30s Grace Period     |  | - Draw / Resign Flow  |  | - Leaderboard API    |  |
|  +------------------------+  +-----------------------+  +----------------------+  |
|                                       |                                           |
+---------------------------------------|-------------------------------------------+
                                        | (SQL.js WebAssembly / ACID)
                                        v
+-----------------------------------------------------------------------------------+
|                             SQLITE DATABASE (Disk)                                |
|                                                                                   |
|  [ users Table ] : id, username, password_hash, elo, wins, losses, draws          |
|  [ matches Table ] : id, white_user, black_user, winner, end_reason, created_at   |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Key Features

1. **Authoritative Server Validation**: Clients only emit an intent to move (`from` and `to`). The server verifies active player turns, runs rule validation through `chess.js`, computes the canonical Forsyth–Edwards Notation (FEN), and broadcasts the state.
2. **1-Click Auto-Matchmaking**: First-In, First-Out (FIFO) queue pairs random online players in $\mathcal{O}(1)$ time with random color allocation.
3. **Room Code System**: Private 6-character room codes (e.g. `K9P2X4`) with 1-click clipboard copying.
4. **Disconnect & Reconnect Grace Period**: When a player drops connection, the server maintains the room and triggers a 30-second countdown. If the player reconnects, state is restored; if the timer expires, the opponent wins by forfeit.
5. **FIDE-Compliant Elo Rating System**:
   $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}, \quad R'_A = R_A + K \cdot (S_A - E_A) \quad (K=32)$$
6. **In-Game Chat**: Real-time room messaging with unread counters and message history.
7. **Synthesized Web Audio**: Built-in audio synthesizer using standard HTML5 `AudioContext` for wooden piece taps, capture strikes, check chimes, and victory fanfares (zero external audio files required).

---

## 📦 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, Lucide Icons, Socket.IO Client.
- **Backend:** Node.js, Express, Socket.IO, `chess.js` (rule engine).
- **Database:** SQLite (`sql.js` WebAssembly engine, zero native compilation flags, persistent disk storage).
- **Security:** JSON Web Tokens (JWT), `bcryptjs` password hashing.

---



, displaying a live countdown. If the player reconnects with `reconnectGame`, the timer is cancelled and the board re-syncs. If 30 seconds elapse, the server awards the win by forfeit and adjusts Elo accordingly."*
