import React from 'react';

/**
 * High-fidelity Chess.com style vector pieces (Neo/Staunton style)
 * type: 'p' (Pawn), 'r' (Rook), 'n' (Knight), 'b' (Bishop), 'q' (Queen), 'k' (King)
 * color: 'w' (White) or 'b' (Black)
 */
export default function ChessPiece({ type, color, className = "w-full h-full select-none pointer-events-none" }) {
  const isWhite = color === 'w';
  const fillColor = isWhite ? '#ffffff' : '#2b2927';
  const strokeColor = isWhite ? '#262421' : '#141312';
  const detailColor = isWhite ? '#e2e8f0' : '#45423e';

  const props = {
    viewBox: "0 0 45 45",
    className,
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      filter: isWhite
        ? 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
        : 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
    },
  };

  switch (type?.toLowerCase()) {
    case 'p': // Pawn
      return (
        <svg {...props}>
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'r': // Rook
      return (
        <svg {...props}>
          <g fill={fillColor} stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14L31 31.5H14z" />
            <path d="M14 18h17V14H14v4zm-2-4h21v-4H12v4zm0-4V6h4v3h4.5V6h4v3h4.5V6h4v4H12z" />
          </g>
        </svg>
      );

    case 'n': // Knight
      return (
        <svg {...props}>
          <path
            d="M22 10c-3.5 0-6.5 2.5-7 6-1 0-3 1-3 4 0 2 1.5 3 2.5 3.5-.5 1-.5 2.5 0 3.5 1 2 2.5 2.5 3.5 2.5-.5 1-1 2.5-.5 4.5 1 4 4.5 6 7.5 6.5h10v-3.5c0-2-1-4-2.5-5.5 1-1.5 2.5-3.5 2.5-6.5 0-4-3-8.5-7-10.5-2-1-4-1-6-.5z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="17" r="1.5" fill={isWhite ? strokeColor : '#ffffff'} />
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg {...props}>
          <g fill={fillColor} stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
            <path d="M17.5 26h10M22.5 21v10" stroke={detailColor} />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg {...props}>
          <g fill={fillColor} stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-2a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5 2a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM12 20a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm25 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
            <path d="M9 26c8.5-1.5 21.5-1.5 27 0l2-12-7 11-8.5-15-8.5 15-7-11 2 12zm0 0c0 3 2.5 5 2.5 5h22s2.5-2 2.5-5M11.5 35h22m-20 4h18" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg {...props}>
          <g fill={fillColor} stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" stroke={strokeColor} strokeWidth="2" />
            <path d="M22.5 25s4.5-7.5 3-10.5c-1-2-5-2-6 0-1.5 3 3 10.5 3 10.5M11.5 37c5.5 3.5 16.5 3.5 22 0 0-3-3-5.5-4.5-6.5-4-2.5-1-6.5-6.5-6.5s-2.5 4-6.5 6.5c-1.5 1-4.5 3.5-4.5 6.5z" />
            <path d="M12 37h21v3H12v-3zm3 3h15v2H15v-2z" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
