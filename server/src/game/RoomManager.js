import { Chess } from 'chess.js';
import { recordMatchResult } from '../config/db.js';

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map(); // socketId -> roomId
    this.matchmakingQueue = [];    // array of { socketId, username, joinedAt }
  }

  // Generate a random 6-character room code (e.g. "E4X9K2")
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(hostSocketId, username = 'Player 1') {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const room = {
      id: roomId,
      chess: new Chess(),
      players: {
        white: { socketId: hostSocketId, username, connected: true },
        black: null,
      },
      spectators: [],
      status: 'waiting', // 'waiting' | 'in_progress' | 'finished'
      createdAt: Date.now(),
      moves: [],
      chatMessages: [],
      timers: {
        white: 600,
        black: 600,
        lastTurnTimestamp: null,
      },
      disconnectTimeouts: {},
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(hostSocketId, roomId);

    return room;
  }

  joinRoom(roomId, socketId, username = 'Player 2') {
    const normalizedId = roomId.trim().toUpperCase();
    const room = this.rooms.get(normalizedId);

    if (!room) {
      return { error: `Room "${normalizedId}" does not exist.` };
    }

    // Check if player is already white (e.g. reconnect)
    if (room.players.white?.socketId === socketId) {
      return { room, role: 'white', isGameStart: room.status === 'in_progress' };
    }

    // If black is open, join as black
    if (!room.players.black) {
      room.players.black = { socketId, username, connected: true };
      room.status = 'in_progress';
      room.timers.lastTurnTimestamp = Date.now();
      this.socketToRoom.set(socketId, normalizedId);

      return { room, role: 'black', isGameStart: true };
    }

    // If room is already full, join as spectator
    room.spectators.push({ socketId, username });
    this.socketToRoom.set(socketId, normalizedId);
    return { room, role: 'spectator', isGameStart: false };
  }

  // --- MATCHMAKING QUEUE (Milestone 4) ---
  addToMatchmaking(socketId, username = 'Player') {
    // Remove if already in queue
    this.removeFromMatchmaking(socketId);

    // If someone is waiting in queue, pair immediately!
    if (this.matchmakingQueue.length > 0) {
      const opponent = this.matchmakingQueue.shift();

      // Avoid pairing with self if multi-tab same socket
      if (opponent.socketId === socketId) {
        this.matchmakingQueue.push(opponent);
        return { matched: false };
      }

      // 50% random chance to be White or Black
      const randomFlip = Math.random() < 0.5;
      const whitePlayer = randomFlip
        ? { socketId: opponent.socketId, username: opponent.username }
        : { socketId, username };
      const blackPlayer = randomFlip
        ? { socketId, username }
        : { socketId: opponent.socketId, username: opponent.username };

      const room = this.createRoom(whitePlayer.socketId, whitePlayer.username);
      room.players.black = { socketId: blackPlayer.socketId, username: blackPlayer.username, connected: true };
      room.status = 'in_progress';
      this.socketToRoom.set(blackPlayer.socketId, room.id);

      return {
        matched: true,
        room,
        whitePlayer,
        blackPlayer,
      };
    }

    // Otherwise, place in queue
    this.matchmakingQueue.push({ socketId, username, joinedAt: Date.now() });
    return {
      matched: false,
      queueLength: this.matchmakingQueue.length,
    };
  }

  removeFromMatchmaking(socketId) {
    const prevLen = this.matchmakingQueue.length;
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.socketId !== socketId);
    return this.matchmakingQueue.length < prevLen;
  }

  getQueueLength() {
    return this.matchmakingQueue.length;
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.trim().toUpperCase()) || null;
  }

  getRoomBySocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  startTimer(io, roomId) {
    const room = this.getRoom(roomId);
    if (!room) return;

    this.stopTimer(roomId);

    if (!room.timers) {
      room.timers = { white: 600, black: 600, lastTurnTimestamp: Date.now() };
    } else {
      room.timers.lastTurnTimestamp = Date.now();
    }

    room.timerInterval = setInterval(() => {
      if (room.status !== 'in_progress') {
        this.stopTimer(roomId);
        return;
      }

      const currentTurn = room.chess.turn(); // 'w' | 'b'
      if (currentTurn === 'w') {
        room.timers.white = Math.max(0, room.timers.white - 1);
      } else {
        room.timers.black = Math.max(0, room.timers.black - 1);
      }

      io.to(room.id).emit('timerTick', {
        white: Math.ceil(room.timers.white),
        black: Math.ceil(room.timers.black),
      });

      if (room.timers.white <= 0 || room.timers.black <= 0) {
        this.stopTimer(roomId);
        room.status = 'finished';

        const timedOutColor = room.timers.white <= 0 ? 'w' : 'b';
        const winner = timedOutColor === 'w' ? 'b' : 'w';
        const timedOutPlayer = timedOutColor === 'w' ? room.players.white?.username : room.players.black?.username;
        const winningPlayer = winner === 'w' ? room.players.white?.username : room.players.black?.username;

        const eloChanges = recordMatchResult(
          room.players.white?.username,
          room.players.black?.username,
          winner,
          'timeout'
        );

        io.to(room.id).emit('gameOver', {
          winner,
          reason: 'timeout',
          eloChanges,
          message: `${timedOutPlayer} ran out of time! ${winningPlayer} (${winner === 'w' ? 'White' : 'Black'}) wins on time!`,
        });
      }
    }, 1000);
  }

  stopTimer(roomId) {
    const room = this.getRoom(roomId);
    if (room && room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }

  addChatMessage(roomId, sender, message) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const chatItem = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      sender,
      message: message.trim().slice(0, 200), // sanitize & length limit
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (!room.chatMessages) room.chatMessages = [];
    room.chatMessages.push(chatItem);

    // Keep last 50 messages per room
    if (room.chatMessages.length > 50) room.chatMessages.shift();

    return chatItem;
  }

  leaveRoom(socketId) {
    this.removeFromMatchmaking(socketId);

    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    this.socketToRoom.delete(socketId);

    if (!room) return null;

    let role = null;
    let username = 'A player';

    if (room.players.white?.socketId === socketId) {
      role = 'white';
      username = room.players.white.username;
      room.players.white.connected = false;
    } else if (room.players.black?.socketId === socketId) {
      role = 'black';
      username = room.players.black.username;
      room.players.black.connected = false;
    } else {
      room.spectators = room.spectators.filter(s => s.socketId !== socketId);
      role = 'spectator';
    }

    const whiteAbsent = !room.players.white || !room.players.white.connected;
    const blackAbsent = !room.players.black || !room.players.black.connected;

    if (whiteAbsent && blackAbsent && room.spectators.length === 0) {
      this.stopTimer(roomId);
      this.rooms.delete(roomId);
    }

    return { room, role, username, roomId };
  }

  getPublicRooms() {
    const list = [];
    for (const [id, room] of this.rooms.entries()) {
      list.push({
        id,
        host: room.players.white?.username || 'Unknown',
        status: room.status,
        playerCount: (room.players.white?.connected ? 1 : 0) + (room.players.black?.connected ? 1 : 0),
        spectatorCount: room.spectators.length,
        createdAt: room.createdAt,
      });
    }
    return list;
  }
}

export const roomManager = new RoomManager();
