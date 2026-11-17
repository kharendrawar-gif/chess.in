import React, { useMemo } from 'react';
import ChessPiece from './ChessPiece';

export default function ChessBoard({
  game,
  fen,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheckSquare,
  orientation = 'w',
  pendingPromotion,
  onSquareClick,
  onConfirmPromotion,
  onCancelPromotion,
}) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = orientation === 'w' ? files : [...files].reverse();
  const displayRanks = orientation === 'w' ? ranks : [...ranks].reverse();

  // Create lookup map for legal moves: square -> { isCapture, isPromotion }
  const legalMoveMap = useMemo(() => {
    const map = new Map();
    legalMoves.forEach((m) => map.set(m.to, m));
    return map;
  }, [legalMoves]);

  return (
    <div className="relative select-none flex items-center justify-center">
      {/* Board Outer Container */}
      <div
        className="relative shadow-2xl rounded-[4px] overflow-hidden bg-[#21201d]"
        style={{
          width: 'min(90vw, 560px)',
          height: 'min(90vw, 560px)',
          maxWidth: '560px',
          maxHeight: '560px',
          aspectRatio: '1 / 1',
        }}
      >
        {/* Strictly uniform 8x8 CSS Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(8, 1fr)',
            width: '100%',
            height: '100%',
          }}
        >
          {displayRanks.map((rank, rankIdx) =>
            displayFiles.map((file, fileIdx) => {
              const square = `${file}${rank}`;
              const piece = game.get(square);

              const isLightSquare = (file.charCodeAt(0) - 97 + parseInt(rank, 10)) % 2 === 1;
              const isSelected = selectedSquare === square;
              const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
              const isInCheck = inCheckSquare === square;
              const legalTarget = legalMoveMap.get(square);

              // Authentic Chess.com color palette
              let squareBg = isLightSquare ? '#ebecd0' : '#739552';
              if (isSelected) {
                squareBg = isLightSquare ? '#f5f682' : '#baca2b';
              } else if (isLastMoveSquare) {
                squareBg = isLightSquare ? '#f5f682' : '#baca2b';
              }

              return (
                <div
                  key={square}
                  onClick={() => onSquareClick(square)}
                  className="relative flex items-center justify-center cursor-pointer select-none group"
                  style={{
                    backgroundColor: squareBg,
                    width: '100%',
                    height: '100%',
                  }}
                  data-square={square}
                >
                  {/* In-Check Radial Glow (Chess.com style) */}
                  {isInCheck && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.6) 45%, rgba(185,28,28,0) 80%)',
                      }}
                    />
                  )}

                  {/* Rank indicator on first column */}
                  {fileIdx === 0 && (
                    <span
                      className="absolute top-0.5 left-1 text-[10px] sm:text-xs font-bold pointer-events-none select-none leading-none z-10"
                      style={{
                        color: isLightSquare ? '#739552' : '#ebecd0',
                      }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* File indicator on bottom row */}
                  {rankIdx === 7 && (
                    <span
                      className="absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-bold pointer-events-none select-none leading-none z-10"
                      style={{
                        color: isLightSquare ? '#739552' : '#ebecd0',
                      }}
                    >
                      {file}
                    </span>
                  )}

                  {/* Piece Representation */}
                  {piece && (
                    <div
                      className={`w-[86%] h-[86%] flex items-center justify-center transition-transform duration-100 ease-out z-20 ${
                        isSelected ? 'scale-105 -translate-y-0.5' : 'group-hover:scale-102'
                      }`}
                    >
                      <ChessPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Legal Move: Subtle Transparent Center Dot (Chess.com style) */}
                  {legalTarget && !piece && (
                    <div className="absolute w-[32%] h-[32%] rounded-full bg-black/15 pointer-events-none z-10 transition-transform duration-100 group-hover:scale-110" />
                  )}

                  {/* Legal Move: Capture Target Ring around square (Chess.com style) */}
                  {legalTarget && piece && (
                    <div className="absolute inset-[3px] rounded-full border-[5px] sm:border-[6px] border-black/20 pointer-events-none z-30 animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pawn Promotion Modal Overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-[#262522] border border-[#3d3b38] p-5 rounded-lg shadow-2xl text-center max-w-xs w-full">
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">
                Select Promotion Piece
              </h3>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { type: 'q', label: 'Queen' },
                  { type: 'r', label: 'Rook' },
                  { type: 'b', label: 'Bishop' },
                  { type: 'n', label: 'Knight' },
                ].map(({ type, label }) => {
                  const promoColor = pendingPromotion.to.endsWith('8') ? 'w' : 'b';
                  return (
                    <button
                      key={type}
                      onClick={() => onConfirmPromotion(type)}
                      className="flex flex-col items-center p-2 bg-[#302e2b] hover:bg-[#3d3b38] border border-[#484542] rounded-md transition hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <ChessPiece type={type} color={promoColor} />
                      </div>
                      <span className="text-[10px] font-semibold text-[#c3c2c1] mt-1">{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onCancelPromotion}
                className="text-xs text-[#989795] hover:text-white underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
