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

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Run Both Server & Client Concurrently
```bash
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

---

## 📡 WebSocket Event Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `createRoom` | Client $\to$ Server | `{ username }` | Creates a new isolated game room |
| `joinRoom` | Client $\to$ Server | `{ roomId, username }` | Joins an existing 6-char room code |
| `joinQueue` | Client $\to$ Server | `{ username }` | Enters the FIFO matchmaking pool |
| `gameStart` | Server $\to$ Client | `{ roomId, whitePlayer, blackPlayer, fen, turn }` | Both players connected; initiates match |
| `makeMove` | Client $\to$ Server | `{ roomId, from, to, promotion? }` | Proposes a move to the server |
| `moveMade` | Server $\to$ Client | `{ fen, lastMove, turn, history, captured, isCheck, isCheckmate }` | Broadcasts validated state to room |
| `moveRejected`| Server $\to$ Client | `{ reason }` | Sent if move is illegal or out of turn |
| `playerDisconnected`| Server $\to$ Client | `{ username, gracePeriodSeconds: 30 }` | Starts 30s reconnection timer |
| `reconnectGame`| Client $\to$ Server | `{ roomId, username }` | Reclaims player seat during disconnect |
| `sendChatMessage`| Client $\to$ Server | `{ roomId, message, username }` | Transmits in-game chat message |

---

## 🌐 Production Deployment Guide

### Deploying to Render.com / Railway

1. **Backend (Node.js Web Service)**:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment Variables:
     - `PORT=5000`
     - `JWT_SECRET=your_production_secret_key`

2. **Frontend (Static Site / Web Service)**:
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_BACKEND_URL=https://your-backend-service.onrender.com`

---

## 🎓 Viva & Technical Interview Cheat Sheet

### Q1: Why use WebSockets instead of standard HTTP REST APIs?
> **Answer:** *"HTTP is a stateless, unidirectional request-response protocol. For a turn-based game, clients would have to continuously poll the server (`GET /api/game/status`) every few hundred milliseconds, causing massive network overhead, header repetition, and high turn latency.
> WebSockets establish a single persistent, full-duplex TCP connection via an HTTP handshake. Once connected, messages are transmitted as binary/UTF-8 frames with only 2–6 bytes of header overhead, allowing near-zero latency state synchronization."*

### Q2: What is an Authoritative Server and why is it essential?
> **Answer:** *"An authoritative server treats all connected clients as untrusted. If clients evaluated moves locally and emitted messages like 'I moved bishop to c4', a player could tamper with client-side JavaScript to move twice in a row or move through pieces.
> In our architecture, the client only emits an **intent** (`{ from, to }`). The server validates that it is that player's turn, executes the move through `chess.js`, checks for checkmate/draw, and broadcasts the canonical FEN string."*

### Q3: How do Socket.IO Rooms work under the hood?
> **Answer:** *"Rooms are server-side virtual channels created with `socket.join(roomId)`. Socket.IO maintains an internal dictionary mapping `roomId -> Set<socketId>`. When broadcasting move updates, `io.to(roomId).emit(...)` traverses only the sockets subscribed to that specific room, ensuring complete match isolation and $\mathcal{O}(1)$ message routing."*

### Q4: Explain the Forsyth–Edwards Notation (FEN) format.
> **Answer:** *"FEN is a 1-line ASCII standard that completely describes a chess position without requiring move history:
> 1. Piece placement rank-by-rank from rank 8 to 1 (`rnbqkbnr/...`)
> 2. Active player turn (`w` or `b`)
> 3. Castling availability (`KQkq`)
> 4. En passant target square (e.g. `e3` or `-`)
> 5. Halfmove clock (moves since last capture/pawn push for the 50-move rule)
> 6. Fullmove number.
> Transmitting FEN allows any client to instantaneously reconstruct the entire board state."*

### Q5: How does your Elo rating system work?
> **Answer:** *"The Elo algorithm calculates the probability of winning based on the difference in ratings:
> $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
> The rating delta is:
> $$R'_A = R_A + K \cdot (S_A - E_A)$$
> Where $K=32$, and $S_A$ is the actual score ($1$ for win, $0.5$ for draw, $0$ for loss). When a 1200 player defeats an 1800 player, $E_A \approx 0.03$, yielding a huge reward ($\approx +31$ Elo). When two equally rated players play, the winner gains $+16$ Elo and the loser drops $-16$ Elo."*

### Q6: How are disconnects handled?
> **Answer:** *"Instead of immediately forfeiting when a TCP connection drops, the server marks the player as temporarily disconnected and starts a 30-second timer (`setTimeout`). It emits `playerDisconnected` to the remaining opponent, displaying a live countdown. If the player reconnects with `reconnectGame`, the timer is cancelled and the board re-syncs. If 30 seconds elapse, the server awards the win by forfeit and adjusts Elo accordingly."*
