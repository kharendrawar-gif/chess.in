import { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { sounds } from '../services/soundEffects';

export function useMultiplayerGame({ activeGame, socket, onLeaveGame }) {
  const [game, setGame] = useState(() => new Chess(activeGame.fen));
  const [fen, setFen] = useState(activeGame.fen);
  const [turn, setTurn] = useState(activeGame.turn || 'w');
  const [myColor, setMyColor] = useState(activeGame.myColor);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Status & Game Over state
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [isDraw, setIsDraw] = useState(false);
  const [drawReason, setDrawReason] = useState(null);
  const [winner, setWinner] = useState(null);
  const [eloChanges, setEloChanges] = useState(null);
  const [statusNotification, setStatusNotification] = useState(null);

  // Disconnect Grace Period State (Milestone 6)
  const [disconnectTimer, setDisconnectTimer] = useState(null);
  const [disconnectedOpponent, setDisconnectedOpponent] = useState(null);

  // History & Captured
  const [history, setHistory] = useState([]);
  const [captured, setCaptured] = useState({
    capturedByWhite: [],
    capturedByBlack: [],
    advantage: 0,
  });

  // Dialogs & Offers
  const [drawOfferReceived, setDrawOfferReceived] = useState(null);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);

  const isMyTurn = turn === myColor;

  // Disconnect countdown interval
  useEffect(() => {
    let interval = null;
    if (disconnectTimer && disconnectTimer > 0) {
      interval = setInterval(() => {
        setDisconnectTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [disconnectTimer]);

  // Sync game with incoming server events
  useEffect(() => {
    if (!socket) return;

    // 1. Authoritative move from server
    const handleMoveMade = (data) => {
      console.log('[Multiplayer] Move received from server:', data);
      const newChess = new Chess(data.fen);
      setGame(newChess);
      setFen(data.fen);
      setTurn(data.turn);
      setLastMove(data.lastMove);
      setHistory(data.history || []);
      if (data.captured) setCaptured(data.captured);

      setSelectedSquare(null);
      setPendingPromotion(null);

      // Play audio feedback
      if (data.isCheckmate || data.isCheck) {
        sounds.playCheck();
      } else if (data.lastMove?.piece && data.history.length > 0 && data.history[data.history.length - 1].captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }

      if (data.isCheckmate) {
        setIsGameOver(true);
        setIsCheckmate(true);
        setWinner(data.winner);
        setEloChanges(data.eloChanges);
        setStatusNotification(`Checkmate! ${data.winner === 'w' ? 'White' : 'Black'} wins!`);
        sounds.playVictory();
      } else if (data.isDraw) {
        setIsGameOver(true);
        setIsDraw(true);
        setDrawReason(data.endReason);
        setEloChanges(data.eloChanges);
        setStatusNotification(`Draw: ${data.endReason}`);
      } else if (data.isCheck) {
        setStatusNotification(data.turn === myColor ? 'You are in check!' : 'Opponent is in check!');
      } else {
        setStatusNotification(null);
      }
    };

    // 2. Server rejected move
    const handleMoveRejected = (data) => {
      console.warn('[Multiplayer] Move rejected:', data.reason);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setStatusNotification(data.reason || 'Illegal move rejected by server.');
      setTimeout(() => setStatusNotification(null), 3500);
    };

    // 3. Resignation or Agreement Game Over
    const handleGameOver = (data) => {
      setIsGameOver(true);
      setWinner(data.winner);
      setEloChanges(data.eloChanges);
      setStatusNotification(data.message);
      setDisconnectTimer(null);
      setDisconnectedOpponent(null);
      if (data.winner === myColor) {
        sounds.playVictory();
      }
    };

    // 4. Opponent Disconnected with 30s Grace Period (Milestone 6)
    const handlePlayerDisconnected = (data) => {
      setDisconnectedOpponent(data.username);
      setDisconnectTimer(data.gracePeriodSeconds || 30);
      setStatusNotification(`${data.username} disconnected. 30s to reconnect or forfeit.`);
    };

    const handlePlayerReconnected = (data) => {
      setDisconnectedOpponent(null);
      setDisconnectTimer(null);
      setStatusNotification(`${data.username} reconnected! Game resuming.`);
      setTimeout(() => setStatusNotification(null), 3500);
    };

    // 5. Draw offered by opponent
    const handleDrawOffered = (data) => {
      setDrawOfferReceived(data);
    };

    const handleDrawDeclined = (data) => {
      setStatusNotification(data.message);
      setTimeout(() => setStatusNotification(null), 3000);
    };

    // 6. Rematch events
    const handleRematchRequested = () => {
      setRematchRequestedByOpponent(true);
    };

    const handleRematchStarted = (data) => {
      console.log('[Multiplayer] Rematch started! New data:', data);
      const newChess = new Chess(data.fen);
      setGame(newChess);
      setFen(data.fen);
      setTurn(data.turn);

      let newColor;
      if (data.whiteSocketId && socket?.id) {
        newColor = data.whiteSocketId === socket.id ? 'w' : 'b';
      } else if (data.blackSocketId && socket?.id) {
        newColor = data.blackSocketId === socket.id ? 'b' : 'w';
      } else {
        newColor = myColor === 'w' ? 'b' : 'w';
      }
      setMyColor(newColor);

      setSelectedSquare(null);
      setLastMove(null);
      setPendingPromotion(null);
      setIsGameOver(false);
      setIsCheckmate(false);
      setIsDraw(false);
      setDrawReason(null);
      setWinner(null);
      setEloChanges(null);
      setHistory([]);
      setCaptured({ capturedByWhite: [], capturedByBlack: [], advantage: 0 });
      setDrawOfferReceived(null);
      setRematchRequestedByOpponent(false);
      setRematchSent(false);
      setDisconnectTimer(null);
      setDisconnectedOpponent(null);
      setStatusNotification(`Rematch started! You are now playing as ${newColor === 'w' ? 'White' : 'Black'}.`);
      setTimeout(() => setStatusNotification(null), 4000);
    };

    const handlePlayerLeft = (data) => {
      setStatusNotification(data.message || 'Opponent left the match.');
    };

    const handleReconnectSuccess = (data) => {
      console.log('[Multiplayer] Reconnected to game:', data);
      const newChess = new Chess(data.fen);
      setGame(newChess);
      setFen(data.fen);
      setTurn(data.turn);
      if (data.color) setMyColor(data.color);
      if (data.history) setHistory(data.history);
      setDisconnectTimer(null);
      setDisconnectedOpponent(null);
      setStatusNotification('Reconnected to game successfully!');
      setTimeout(() => setStatusNotification(null), 3000);
    };

    socket.on('moveMade', handleMoveMade);
    socket.on('moveRejected', handleMoveRejected);
    socket.on('gameOver', handleGameOver);
    socket.on('playerDisconnected', handlePlayerDisconnected);
    socket.on('playerReconnected', handlePlayerReconnected);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('reconnectSuccess', handleReconnectSuccess);
    socket.on('drawOffered', handleDrawOffered);
    socket.on('drawDeclined', handleDrawDeclined);
    socket.on('rematchRequested', handleRematchRequested);
    socket.on('rematchStarted', handleRematchStarted);

    return () => {
      socket.off('moveMade', handleMoveMade);
      socket.off('moveRejected', handleMoveRejected);
      socket.off('gameOver', handleGameOver);
      socket.off('playerDisconnected', handlePlayerDisconnected);
      socket.off('playerReconnected', handlePlayerReconnected);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('reconnectSuccess', handleReconnectSuccess);
      socket.off('drawOffered', handleDrawOffered);
      socket.off('drawDeclined', handleDrawDeclined);
      socket.off('rematchRequested', handleRematchRequested);
      socket.off('rematchStarted', handleRematchStarted);
    };
  }, [socket, myColor]);

  // Compute legal moves on client for highlighting
  const legalMoves = useMemo(() => {
    if (!selectedSquare || !isMyTurn || isGameOver) return [];
    try {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      return moves.map((m) => ({
        to: m.to,
        isCapture: m.captured !== undefined,
        isPromotion: m.promotion !== undefined || (m.piece === 'p' && (m.to.endsWith('8') || m.to.endsWith('1'))),
      }));
    } catch {
      return [];
    }
  }, [selectedSquare, game, isMyTurn, isGameOver]);

  // King in check square
  const inCheckSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          return `${files[c]}${8 - r}`;
        }
      }
    }
    return null;
  }, [game, turn]);

  // User click handling
  const handleSquareClick = useCallback((square) => {
    if (isGameOver || pendingPromotion) return;

    if (!isMyTurn) {
      setStatusNotification("Wait for your turn!");
      setTimeout(() => setStatusNotification(null), 2000);
      return;
    }

    const piece = game.get(square);

    // If selecting piece of our own color
    if (piece && piece.color === myColor) {
      setSelectedSquare(selectedSquare === square ? null : square);
      return;
    }

    // If a piece was selected and clicking target square
    if (selectedSquare) {
      const isLegal = legalMoves.some((m) => m.to === square);
      if (isLegal) {
        const selectedPiece = game.get(selectedSquare);
        const isPromotion =
          selectedPiece &&
          selectedPiece.type === 'p' &&
          (square.endsWith('8') || square.endsWith('1'));

        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        socket.emit('makeMove', {
          roomId: activeGame.roomId,
          from: selectedSquare,
          to: square,
        });

        setSelectedSquare(null);
      } else {
        setSelectedSquare(null);
      }
    }
  }, [game, isGameOver, pendingPromotion, isMyTurn, myColor, selectedSquare, legalMoves, socket, activeGame.roomId]);

  // Confirm pawn promotion
  const confirmPromotion = useCallback((promoPiece = 'q') => {
    if (!pendingPromotion || !socket) return;
    socket.emit('makeMove', {
      roomId: activeGame.roomId,
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
  }, [pendingPromotion, socket, activeGame.roomId]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelectedSquare(null);
  }, []);

  // Action methods
  const resign = useCallback(() => {
    if (window.confirm("Are you sure you want to resign this match?")) {
      socket?.emit('resign', { roomId: activeGame.roomId });
    }
  }, [socket, activeGame.roomId]);

  const offerDraw = useCallback(() => {
    socket?.emit('offerDraw', { roomId: activeGame.roomId });
    setStatusNotification("Draw offer sent to opponent.");
    setTimeout(() => setStatusNotification(null), 3000);
  }, [socket, activeGame.roomId]);

  const acceptDraw = useCallback(() => {
    socket?.emit('respondDraw', { roomId: activeGame.roomId, accept: true });
    setDrawOfferReceived(null);
  }, [socket, activeGame.roomId]);

  const declineDraw = useCallback(() => {
    socket?.emit('respondDraw', { roomId: activeGame.roomId, accept: false });
    setDrawOfferReceived(null);
  }, [socket, activeGame.roomId]);

  const requestRematch = useCallback(() => {
    socket?.emit('requestRematch', { roomId: activeGame.roomId });
    setRematchSent(true);
    setStatusNotification("Rematch request sent!");
  }, [socket, activeGame.roomId]);

  return {
    game,
    fen,
    turn,
    myColor,
    isMyTurn,
    selectedSquare,
    legalMoves,
    lastMove,
    inCheckSquare,
    isGameOver,
    isCheckmate,
    isDraw,
    drawReason,
    winner,
    eloChanges,
    statusNotification,
    disconnectTimer,
    disconnectedOpponent,
    history,
    captured,
    pendingPromotion,
    drawOfferReceived,
    rematchRequestedByOpponent,
    rematchSent,
    handleSquareClick,
    confirmPromotion,
    cancelPromotion,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
  };
}
