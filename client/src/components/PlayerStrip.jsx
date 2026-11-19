import React from 'react';
import ChessPiece from './ChessPiece';

export default function PlayerStrip({
  username,
  elo = 1200,
  color = 'w',
  isCurrentTurn = false,
  capturedPieces = [],
  advantage = 0,
  timeRemaining = '10:00',
  isYou = false,
}) {
  const isWhite = color === 'w';

  const isLowTime = isCurrentTurn && timeRemaining && (
    timeRemaining.startsWith('0:0') ||
    (timeRemaining.startsWith('0:') && parseInt(timeRemaining.split(':')[1], 10) < 30)
  );

  return (
    <div className="w-full flex items-center justify-between py-2 px-1 select-none">
      {/* Left: Avatar, Username, Rating & Captured Pieces */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-md bg-[#21201d] border border-[#3d3b38] flex items-center justify-center font-bold text-sm text-[#e2e8f0]">
            {username ? username.charAt(0).toUpperCase() : '?'}
          </div>
          {/* Active Turn Dot */}
          {isCurrentTurn && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#81b64c] border-2 border-[#262522]" />
          )}
        </div>

        {/* Name and Rating */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
              {username}
            </span>
            {isYou && (
              <span className="text-[10px] text-[#81b64c] font-semibold bg-[#81b64c]/10 px-1 rounded">
                YOU
              </span>
            )}
            <span className="text-xs text-[#989795] font-normal">
              ({elo})
            </span>
          </div>

          {/* Captured Pieces & Material Count */}
          <div className="flex items-center gap-1 h-4 mt-0.5">
            <div className="flex -space-x-1.5 overflow-hidden">
              {capturedPieces.map((pieceType, idx) => (
                <div key={idx} className="w-3.5 h-3.5 flex-shrink-0 opacity-80">
                  <ChessPiece type={pieceType} color={isWhite ? 'b' : 'w'} />
                </div>
              ))}
            </div>
            {advantage > 0 && (
              <span className="text-[10px] font-bold text-[#81b64c] font-mono leading-none ml-1">
                +{advantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Chess.com Digital Clock */}
      <div
        className={`px-3 py-1.5 rounded-md font-mono text-sm sm:text-base font-bold tracking-wider transition-colors flex items-center gap-1 ${
          isLowTime
            ? 'bg-red-600 text-white shadow-md animate-pulse'
            : isCurrentTurn
            ? 'bg-[#ffffff] text-[#21201d] shadow-md'
            : 'bg-[#21201d] text-[#989795] border border-[#3d3b38]'
        }`}
      >
        <span>{timeRemaining}</span>
      </div>
    </div>
  );
}
