import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/config/db.js';
import { roomManager } from './src/game/RoomManager.js';
import { registerRoomHandlers } from './src/sockets/roomHandler.js';
import { registerGameHandlers } from './src/sockets/gameHandler.js';
import authRoutes from './src/routes/authRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../client/dist');

const app = express();
const server = http.createServer(app);

// Allow Cross-Origin Requests
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

// Serve compiled React frontend in production
app.use(express.static(distPath));

// SPA Fallback for any client route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
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
      console.log(`  Chess.in Server running on port ${PORT}`);
      console.log(`  Serving WebSockets, API & React Frontend`);
      console.log(`=========================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize SQLite database:', err);
    process.exit(1);
  });
