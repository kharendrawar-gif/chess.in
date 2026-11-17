import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './src/config/db.js';
import { roomManager } from './src/game/RoomManager.js';
import { registerRoomHandlers } from './src/sockets/roomHandler.js';
import { registerGameHandlers } from './src/sockets/gameHandler.js';
import authRoutes from './src/routes/authRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow Cross-Origin Requests from frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: roomManager.rooms.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getPublicRooms());
});

// Initialize Socket.IO with WebSocket + polling transports
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] Socket ID: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket Disconnected] Socket ID: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 5000;

// Initialize SQLite database, then start listening
initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`  Chess Game Server running on port ${PORT}`);
      console.log(`  SQLite Database & Leaderboard Active`);
      console.log(`  Socket.IO active for real-time play`);
      console.log(`=========================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize SQLite database:', err);
    process.exit(1);
  });
