import { roomManager } from '../game/RoomManager.js';
import { recordMatchResult } from '../config/db.js';

export function broadcastStats(io) {
  io.emit('onlineStats', {
    onlineCount: io.engine.clientsCount,
    activeRooms: roomManager.rooms.size,
    queueCount: roomManager.getQueueLength(),
  });
}

export function registerRoomHandlers(io, socket) {
  broadcastStats(io);

  // 1. Create a new room
  socket.on('createRoom', ({ username }) => {
    try {
      roomManager.removeFromMatchmaking(socket.id);
      const room = roomManager.createRoom(socket.id, username || 'Player 1');
      socket.join(room.id);

      console.log(`[Room Created] Room ID: ${room.id} by ${username} (${socket.id})`);

      socket.emit('roomCreated', {
        roomId: room.id,
        color: 'w',
        username: room.players.white.username,
        status: 'waiting',
      });

      io.emit('lobbyUpdated', roomManager.getPublicRooms());
      broadcastStats(io);
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error', { message: 'Failed to create room.' });
    }
  });

  // 2. Join an existing room by code
  socket.on('joinRoom', ({ roomId, username }) => {
    try {
      if (!roomId) {
        return socket.emit('error', { message: 'Room code is required.' });
      }

      roomManager.removeFromMatchmaking(socket.id);
      const result = roomManager.joinRoom(roomId, socket.id, username || 'Player 2');

      if (result.error) {
        return socket.emit('error', { message: result.error });
      }

      const { room, role, isGameStart } = result;
      socket.join(room.id);

      console.log(`[Player Joined] ${username} (${socket.id}) joined Room ${room.id} as ${role}`);

      socket.emit('joinedRoom', {
        roomId: room.id,
        role,
        color: role === 'black' ? 'b' : (role === 'white' ? 'w' : null),
        fen: room.chess.fen(),
        whitePlayer: room.players.white?.username,
        blackPlayer: room.players.black?.username,
        status: room.status,
      });

      if (isGameStart) {
        io.to(room.id).emit('gameStart', {
          roomId: room.id,
          whitePlayer: room.players.white.username,
          blackPlayer: room.players.black.username,
          fen: room.chess.fen(),
          turn: room.chess.turn(),
        });
      }

      socket.to(room.id).emit('playerJoined', {
        username,
        role,
        message: `${username} joined as ${role}.`,
      });

      io.emit('lobbyUpdated', roomManager.getPublicRooms());
      broadcastStats(io);
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  // 3. Reconnect to an in-progress game (Milestone 6)
  socket.on('reconnectGame', ({ roomId, username }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.status !== 'in_progress') {
      return socket.emit('reconnectFailed', { message: 'Game is no longer active.' });
    }

    let reconnectedRole = null;
    let reconnectedColor = null;

    if (room.players.white?.username.toLowerCase() === username.toLowerCase()) {
      room.players.white.socketId = socket.id;
      room.players.white.connected = true;
      reconnectedRole = 'white';
      reconnectedColor = 'w';
    } else if (room.players.black?.username.toLowerCase() === username.toLowerCase()) {
      room.players.black.socketId = socket.id;
      room.players.black.connected = true;
      reconnectedRole = 'black';
      reconnectedColor = 'b';
    }

    if (reconnectedRole) {
      // Clear 30s forfeit timeout!
      if (room.disconnectTimeout) {
        clearTimeout(room.disconnectTimeout);
        room.disconnectTimeout = null;
        console.log(`[Reconnection] Cancelled forfeit timer for Room ${room.id}`);
      }

      socket.join(room.id);
      roomManager.socketToRoom.set(socket.id, room.id);

      socket.emit('reconnectSuccess', {
        roomId: room.id,
        role: reconnectedRole,
        color: reconnectedColor,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
        history: room.chess.history({ verbose: true }),
        whitePlayer: room.players.white.username,
        blackPlayer: room.players.black.username,
      });

      socket.to(room.id).emit('playerReconnected', {
        username,
        role: reconnectedRole,
        message: `${username} has reconnected! Resuming game.`,
      });

      console.log(`[Player Reconnected] ${username} successfully rejoined Room ${room.id}`);
    } else {
      socket.emit('reconnectFailed', { message: 'Player seat not found in this room.' });
    }
  });

  // 4. Quick Matchmaking Queue
  socket.on('joinQueue', ({ username }) => {
    try {
      const result = roomManager.addToMatchmaking(socket.id, username || 'Player');

      if (result.matched) {
        const { room, whitePlayer, blackPlayer } = result;

        const whiteSocket = io.sockets.sockets.get(whitePlayer.socketId);
        const blackSocket = io.sockets.sockets.get(blackPlayer.socketId);

        if (whiteSocket) whiteSocket.join(room.id);
        if (blackSocket) blackSocket.join(room.id);

        io.to(room.id).emit('gameStart', {
          roomId: room.id,
          whitePlayer: whitePlayer.username,
          blackPlayer: blackPlayer.username,
          fen: room.chess.fen(),
          turn: room.chess.turn(),
        });

        io.emit('lobbyUpdated', roomManager.getPublicRooms());
      } else {
        socket.emit('queued', {
          message: 'Searching for an opponent...',
          queueLength: result.queueLength,
        });
      }
      broadcastStats(io);
    } catch (err) {
      console.error('Error in matchmaking:', err);
      socket.emit('error', { message: 'Failed to enter matchmaking queue.' });
    }
  });

  socket.on('leaveQueue', () => {
    roomManager.removeFromMatchmaking(socket.id);
    socket.emit('queueLeft');
    broadcastStats(io);
  });

  // 5. In-Game Chat
  socket.on('sendChatMessage', ({ roomId, message, username }) => {
    if (!roomId || !message) return;
    const chatItem = roomManager.addChatMessage(roomId, username || 'Player', message);
    if (chatItem) {
      io.to(roomId).emit('newChatMessage', chatItem);
    }
  });

  // 6. Get active rooms
  socket.on('getRooms', () => {
    socket.emit('lobbyUpdated', roomManager.getPublicRooms());
    broadcastStats(io);
  });

  // 7. Handle Disconnect with 30-Second Forfeit Grace Period (Milestone 6)
  socket.on('disconnect', () => {
    roomManager.removeFromMatchmaking(socket.id);

    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) {
      broadcastStats(io);
      return;
    }

    let disconnectedRole = null;
    let disconnectedName = 'A player';
    let remainingWinnerColor = null;

    if (room.players.white?.socketId === socket.id) {
      disconnectedRole = 'white';
      disconnectedName = room.players.white.username;
      room.players.white.connected = false;
      remainingWinnerColor = 'b';
    } else if (room.players.black?.socketId === socket.id) {
      disconnectedRole = 'black';
      disconnectedName = room.players.black.username;
      room.players.black.connected = false;
      remainingWinnerColor = 'w';
    }

    if (room.status === 'in_progress' && disconnectedRole) {
      console.log(`[Disconnect Grace Period] ${disconnectedName} disconnected from Room ${room.id}. 30s countdown started.`);

      // Notify remaining player that opponent disconnected and 30s countdown began
      socket.to(room.id).emit('playerDisconnected', {
        role: disconnectedRole,
        username: disconnectedName,
        gracePeriodSeconds: 30,
        message: `${disconnectedName} disconnected. They have 30 seconds to reconnect or forfeit.`,
      });

      // Start 30-second timer
      room.disconnectTimeout = setTimeout(() => {
        if (room.status === 'in_progress') {
          console.log(`[Forfeit by Disconnect] 30s timer expired in Room ${room.id}. ${disconnectedName} forfeited.`);
          room.status = 'finished';

          const eloChanges = recordMatchResult(
            room.players.white.username,
            room.players.black.username,
            remainingWinnerColor,
            'abandonment / disconnection timeout'
          );

          io.to(room.id).emit('gameOver', {
            winner: remainingWinnerColor,
            reason: 'disconnection_timeout',
            eloChanges,
            message: `${disconnectedName} failed to reconnect within 30 seconds. ${remainingWinnerColor === 'w' ? 'White' : 'Black'} wins by forfeit!`,
          });
        }
      }, 30000);
    } else {
      roomManager.leaveRoom(socket.id);
      io.emit('lobbyUpdated', roomManager.getPublicRooms());
    }

    broadcastStats(io);
  });
}
