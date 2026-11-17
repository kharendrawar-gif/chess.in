import React, { useRef, useEffect } from 'react';
import ChessPiece from './ChessPiece';
import { RotateCcw, RefreshCw, ArrowLeftRight, Trophy, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function GameInfo({
  turn,
  isGameOver,
  isCheckmate,
  isDraw,
  drawReason,
  inCheckSquare,
  history,
  captured,
  orientation,
  onReset,
  onUndo,
  onToggleOrientation,
  fen,
}) {
  const historyEndRef = useRef(null);

  // Auto-scroll move history to bottom
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Group history into rounds: [{ num: 1, white: 'e4', black: 'e5' }]
  const moveRounds = React.useMemo(() => {
    const rounds = [];
    for (let i = 0; i < history.length; i += 2) {
      rounds.push({
        num: Math.floor(i / 2) + 1,
        white: history[i]?.san || '',
        black: history[i + 1]?.san || '',
      });
    }
    return rounds;
  }, [history]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100">
      {/* Turn & Status Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full border-2 border-slate-600 shadow-sm flex items-center justify-center ${
              turn === 'w' ? 'bg-white' : 'bg-slate-900'
            }`}
          />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Current Move
            </div>
            <div className="text-base font-bold text-white">
              {turn === 'w' ? 'White to Move' : 'Black to Move'}
            </div>
          </div>
        </div>

        {/* Orientation badge */}
        <div className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-medium">
          Perspective: {orientation === 'w' ? 'White' : 'Black'}
        </div>
      </div>

      {/* Game State Badges (Check, Mate, Draw) */}
      {isCheckmate && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
          <Trophy className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Checkmate!</span> {turn === 'w' ? 'Black' : 'White'} wins the game!
          </div>
        </div>
      )}

      {isDraw && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Draw!</span> {drawReason || 'Game ended in a tie.'}
          </div>
        </div>
      )}

      {!isGameOver && inCheckSquare && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
          <div className="text-xs font-semibold">
            {turn === 'w' ? 'White' : 'Black'} King is in Check!
          </div>
        </div>
      )}

      {/* Captured Pieces Section */}
      <div className="space-y-2 py-2 border-b border-slate-800 text-xs">
        {/* Captured by White (Black pieces lost) */}
        <div className="flex items-center justify-between min-h-[26px]">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
            White captures:
          </span>
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1 overflow-hidden">
              {captured.capturedByWhite.map((type, idx) => (
                <div key={idx} className="w-5 h-5">
                  <ChessPiece type={type} color="b" />
                </div>
              ))}
            </div>
            {captured.advantage > 0 && (
              <span className="ml-2 font-bold text-emerald-400 text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                +{captured.advantage}
              </span>
            )}
          </div>
        </div>

        {/* Captured by Black (White pieces lost) */}
        <div className="flex items-center justify-between min-h-[26px]">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-600 inline-block"></span>
            Black captures:
          </span>
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1 overflow-hidden">
              {captured.capturedByBlack.map((type, idx) => (
                <div key={idx} className="w-5 h-5">
                  <ChessPiece type={type} color="w" />
                </div>
              ))}
            </div>
            {captured.advantage < 0 && (
              <span className="ml-2 font-bold text-emerald-400 text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                +{Math.abs(captured.advantage)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Move History Table */}
      <div className="flex flex-col flex-1">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
          Move History ({history.length} moves)
        </div>
        <div className="h-40 overflow-y-auto bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80 font-mono text-xs">
          {moveRounds.length === 0 ? (
            <div className="text-slate-500 italic text-center py-6">
              No moves played yet. Click any piece to see legal moves!
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800/60 pb-1">
                  <th className="w-12 py-1">#</th>
                  <th className="py-1">White</th>
                  <th className="py-1">Black</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {moveRounds.map(round => (
                  <tr key={round.num} className="hover:bg-slate-800/30">
                    <td className="py-1 text-slate-500">{round.num}.</td>
                    <td className="py-1 font-semibold text-slate-200">{round.white}</td>
                    <td className="py-1 font-semibold text-slate-400">{round.black}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div ref={historyEndRef} />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={onUndo}
          disabled={history.length === 0 || isGameOver}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
        </button>
        <button
          onClick={onToggleOrientation}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Flip Board
        </button>
      </div>

      {/* FEN String Inspector (Great for CS viva!) */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span className="font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> State FEN
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(fen)}
            className="text-indigo-400 hover:underline cursor-pointer"
          >
            Copy
          </button>
        </div>
        <div className="p-2 bg-slate-950 rounded font-mono text-[10px] text-slate-400 break-all select-all border border-slate-800">
          {fen}
        </div>
      </div>
    </div>
  );
}
