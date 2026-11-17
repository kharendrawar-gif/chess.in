import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';

export function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [orientation, setOrientation] = useState('w'); // 'w' = White at bottom, 'b' = Black at bottom

  // Extract piece values for material calculation
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  // Calculate captured pieces by comparing starting pieces to current board
  const captured = useMemo(() => {
    const startingCounts = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1 },
    };

    const currentCounts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    };

    const board = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type !== 'k') {
          currentCounts[piece.color][piece.type]++;
        }
      }
    }

    const capturedW = []; // White pieces captured by Black
    const capturedB = []; // Black pieces captured by White

    for (const [type, count] of Object.entries(startingCounts.w)) {
      const lost = count - currentCounts.w[type];
      for (let i = 0; i < lost; i++) capturedW.push(type);
    }

    for (const [type, count] of Object.entries(startingCounts.b)) {
      const lost = count - currentCounts.b[type];
      for (let i = 0; i < lost; i++) capturedB.push(type);
    }

    // Material difference
    const whiteScore = capturedB.reduce((acc, t) => acc + pieceValues[t], 0);
    const blackScore = capturedW.reduce((acc, t) => acc + pieceValues[t], 0);

    return {
      capturedByWhite: capturedB,
      capturedByBlack: capturedW,
      advantage: whiteScore - blackScore,
    };
  }, [fen, game]);

  // Compute legal moves for current selected square
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      return moves.map(m => ({
        to: m.to,
        isCapture: m.captured !== undefined,
        isPromotion: m.promotion !== undefined || (m.piece === 'p' && (m.to.endsWith('8') || m.to.endsWith('1'))),
      }));
    } catch {
      return [];
    }
  }, [selectedSquare, game, fen]);

  // Find king square if in check
  const inCheckSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const board = game.board();
    const currentTurn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === currentTurn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          return `${files[c]}${8 - r}`;
        }
      }
    }
    return null;
  }, [game, fen]);

  // Game over state
  const isGameOver = game.isGameOver();
  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const turn = game.turn(); // 'w' | 'b'

  let drawReason = null;
  if (isDraw) {
    if (game.isStalemate()) drawReason = 'Stalemate (no legal moves)';
    else if (game.isThreefoldRepetition()) drawReason = 'Threefold Repetition';
    else if (game.isInsufficientMaterial()) drawReason = 'Insufficient Material';
    else drawReason = '50-Move Rule';
  }

  // Handle square clicks
  const handleSquareClick = useCallback((square) => {
    if (isGameOver || pendingPromotion) return;

    const piece = game.get(square);

    // If clicking a square with our own piece, select it
    if (piece && piece.color === game.turn()) {
      if (selectedSquare === square) {
        setSelectedSquare(null); // Toggle off if clicked again
      } else {
        setSelectedSquare(square);
      }
      return;
    }

    // If we have a selected piece and clicked a destination
    if (selectedSquare) {
      const moveCandidate = legalMoves.find(m => m.to === square);

      if (moveCandidate) {
        const selectedPiece = game.get(selectedSquare);
        const isPawnPromotion =
          selectedPiece &&
          selectedPiece.type === 'p' &&
          (square.endsWith('8') || square.endsWith('1'));

        if (isPawnPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        // Execute move
        try {
          const moveResult = game.move({ from: selectedSquare, to: square });
          if (moveResult) {
            setFen(game.fen());
            setLastMove({ from: selectedSquare, to: square });
            setSelectedSquare(null);
          }
        } catch (err) {
          console.error('Invalid move:', err);
          setSelectedSquare(null);
        }
      } else {
        // Clicked invalid destination
        setSelectedSquare(null);
      }
    }
  }, [game, selectedSquare, legalMoves, isGameOver, pendingPromotion]);

  // Execute promotion move
  const confirmPromotion = useCallback((promoPiece = 'q') => {
    if (!pendingPromotion) return;
    try {
      const moveResult = game.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: promoPiece,
      });
      if (moveResult) {
        setFen(game.fen());
        setLastMove({ from: pendingPromotion.from, to: pendingPromotion.to });
        setSelectedSquare(null);
      }
    } catch (err) {
      console.error('Promotion error:', err);
    } finally {
      setPendingPromotion(null);
    }
  }, [game, pendingPromotion]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelectedSquare(null);
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const newG = new Chess();
    setGame(newG);
    setFen(newG.fen());
    setSelectedSquare(null);
    setLastMove(null);
    setPendingPromotion(null);
  }, []);

  // Undo move
  const undoMove = useCallback(() => {
    if (game.history().length === 0) return;
    game.undo();
    setFen(game.fen());
    setSelectedSquare(null);
    setPendingPromotion(null);
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  }, [game]);

  // Flip board perspective
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => (prev === 'w' ? 'b' : 'w'));
  }, []);

  return {
    game,
    fen,
    turn,
    selectedSquare,
    legalMoves,
    lastMove,
    inCheckSquare,
    isGameOver,
    isCheckmate,
    isDraw,
    drawReason,
    history: game.history({ verbose: true }),
    captured,
    pendingPromotion,
    orientation,
    handleSquareClick,
    confirmPromotion,
    cancelPromotion,
    resetGame,
    undoMove,
    toggleOrientation,
  };
}
