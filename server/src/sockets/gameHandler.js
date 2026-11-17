import { Chess } from 'chess.js';
import { roomManager } from '../game/RoomManager.js';
import { recordMatchResult } from '../config/db.js';

// Helper to compute captured pieces from a Chess instance
function getCapturedPieces(chess) {
  const starting = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1 },
  };
  const current = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type !== 'k') {
        current[piece.color][piece.type]++;
      }
    }
  }

  const capturedByWhite = [];
  const capturedByBlack = [];

  for (const [type, count] of Object.entries(starting.w)) {
    const lost = count - current.w[type];
    for (let i = 0; i < lost; i++) capturedByBlack.push(type);
  }
  for (const [type, count] of Object.entries(starting.b)) {
    const lost = count - current.b[type];
    for (let i = 0; i < lost; i++) capturedByWhite.push(type);
  }

  const whiteScore = capturedByWhite.reduce((acc, t) => acc + values[t], 0);
  const blackScore = capturedByBlack.reduce((acc, t) => acc + values[t], 0);

  return {
    capturedByWhite,
    capturedByBlack,
    advantage: whiteScore - blackScore,
  };
}

export function registerGameHandlers(io, socket) {
  // 1. Player submits a move
  socket.on('makeMove', ({ roomId, from, to, promotion }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      return socket.emit('moveRejected', { reason: 'Room does not exist.' });
    }

    if (room.status !== 'in_progress') {
      return socket.emit('moveRejected', { reason: 'Game is not currently active.' });
    }

    const currentTurn = room.chess.turn(); // 'w' | 'b'

    // Authoritative Turn Verification (Viva concept!)
    const isWhiteTurn = currentTurn === 'w' && room.players.white?.socketId === socket.id;
    const isBlackTurn = currentTurn === 'b' && room.players.black?.socketId === socket.id;

    if (!isWhiteTurn && !isBlackTurn) {
      return socket.emit('moveRejected', { reason: "It is not your turn to move!" });
    }

    // Server-side move validation via chess.js
    let moveResult = null;
    try {
      moveResult = room.chess.move({
        from,
        to,
        promotion: promotion || 'q',
      });
    } catch (err) {
      return socket.emit('moveRejected', { reason: 'Illegal chess move.' });
    }

    if (!moveResult) {
      return socket.emit('moveRejected', { reason: 'Illegal move rejected by server engine.' });
    }

    room.moves.push(moveResult);

    const isCheckmate = room.chess.isCheckmate();
    const isDraw = room.chess.isDraw();
    const isCheck = room.chess.inCheck();
    let winner = null;
    let endReason = null;
    let eloChanges = null;

    if (isCheckmate) {
      winner = currentTurn;
      room.status = 'finished';
      endReason = 'checkmate';
      eloChanges = recordMatchResult(
        room.players.white.username,
        room.players.black.username,
        winner,
        endReason
      );
    } else if (isDraw) {
      room.status = 'finished';
      if (room.chess.isStalemate()) endReason = 'stalemate';
      else if (room.chess.isThreefoldRepetition()) endReason = 'threefold repetition';
      else if (room.chess.isInsufficientMaterial()) endReason = 'insufficient material';
      else endReason = '50-move rule';

      eloChanges = recordMatchResult(
        room.players.white.username,
        room.players.black.username,
        'draw',
        endReason
      );
    }

    // Broadcast validated move state to both players
    io.to(room.id).emit('moveMade', {
      fen: room.chess.fen(),
      lastMove: { from, to, san: moveResult.san, piece: moveResult.piece },
      turn: room.chess.turn(),
      history: room.chess.history({ verbose: true }),
      captured: getCapturedPieces(room.chess),
      isCheck,
      isCheckmate,
      isDraw,
      winner,
      endReason,
      eloChanges,
    });

    console.log(`[Move in Room ${room.id}] ${moveResult.san} (Turn now: ${room.chess.turn()})`);
  });

  // 2. Resign Match
  socket.on('resign', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.status !== 'in_progress') return;

    let winner = null;
    let resigningColor = null;

    if (room.players.white?.socketId === socket.id) {
      winner = 'b';
      resigningColor = 'White';
    } else if (room.players.black?.socketId === socket.id) {
      winner = 'w';
      resigningColor = 'Black';
    } else {
      return;
    }

    room.status = 'finished';
    const eloChanges = recordMatchResult(
      room.players.white.username,
      room.players.black.username,
      winner,
      'resignation'
    );

    io.to(room.id).emit('gameOver', {
      winner,
      reason: 'resignation',
      eloChanges,
      message: `${resigningColor} resigned. ${winner === 'w' ? 'White' : 'Black'} wins!`,
    });
  });

  // 3. Offer Draw
  socket.on('offerDraw', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.status !== 'in_progress') return;

    const fromColor = room.players.white?.socketId === socket.id ? 'White' : 'Black';
    socket.to(room.id).emit('drawOffered', {
      fromColor,
      message: `${fromColor} has offered a draw. Do you accept?`,
    });
  });

  // 4. Respond to Draw Offer
  socket.on('respondDraw', ({ roomId, accept }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.status !== 'in_progress') return;

    if (accept) {
      room.status = 'finished';
      const eloChanges = recordMatchResult(
        room.players.white.username,
        room.players.black.username,
        'draw',
        'mutual agreement'
      );

      io.to(room.id).emit('gameOver', {
        winner: null,
        reason: 'draw_agreement',
        eloChanges,
        message: 'Game drawn by mutual agreement.',
      });
    } else {
      socket.to(room.id).emit('drawDeclined', {
        message: 'Draw offer was declined.',
      });
    }
  });

  // 5. Rematch Flow
  socket.on('requestRematch', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (!room.rematchRequests) room.rematchRequests = new Set();
    room.rematchRequests.add(socket.id);

    const whiteSocket = room.players.white?.socketId;
    const blackSocket = room.players.black?.socketId;

    if (room.rematchRequests.has(whiteSocket) && room.rematchRequests.has(blackSocket)) {
      const oldWhite = room.players.white;
      const oldBlack = room.players.black;
      room.players.white = oldBlack;
      room.players.black = oldWhite;

      room.chess = new Chess();
      room.status = 'in_progress';
      room.moves = [];
      room.rematchRequests.clear();

      io.to(room.id).emit('rematchStarted', {
        roomId: room.id,
        whitePlayer: room.players.white.username,
        blackPlayer: room.players.black.username,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
      });
    } else {
      socket.to(room.id).emit('rematchRequested', {
        message: 'Opponent requested a rematch! Click Rematch to accept.',
      });
    }
  });
}
