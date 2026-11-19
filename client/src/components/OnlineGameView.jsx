import React, { useState } from 'react';
import ChessBoard from './ChessBoard';
import PlayerStrip from './PlayerStrip';
import ChatBox from './ChatBox';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import {
  Flag,
  Handshake,
  RotateCcw,
  LogOut,
  Trophy,
  AlertCircle,
  Check,
  X,
  Swords,
  Timer,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ListOrdered,
  Info,
  Copy
} from 'lucide-react';

export default function OnlineGameView({ activeGame, socket, onLeaveGame }) {
  const {
    game,
    fen,
    turn,
    myColor,
    timers,
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
  } = useMultiplayerGame({ activeGame, socket, onLeaveGame });

  const [activeTab, setActiveTab] = useState('moves'); // 'moves' | 'chat' | 'info'
  const [copiedFen, setCopiedFen] = useState(false);

  const opponentColor = myColor === 'w' ? 'b' : 'w';
  const opponentName = myColor === 'w' ? activeGame.blackPlayer : activeGame.whitePlayer;
  const myName = myColor === 'w' ? activeGame.whitePlayer : activeGame.blackPlayer;

  const isWinner = winner === myColor;
  const isLoser = winner === opponentColor;

  const myEloDelta = myColor === 'w' ? eloChanges?.whiteEloDelta : eloChanges?.blackEloDelta;
  const myNewElo = myColor === 'w' ? eloChanges?.newWhiteElo : eloChanges?.newBlackElo;
  const oppEloDelta = myColor === 'w' ? eloChanges?.blackEloDelta : eloChanges?.whiteEloDelta;
  const oppNewElo = myColor === 'w' ? eloChanges?.newBlackElo : eloChanges?.newWhiteElo;

  // Group move history into pairs: [{ num: 1, white: 'e4', black: 'e5' }]
  const movePairs = React.useMemo(() => {
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: history[i]?.san || '',
        black: history[i + 1]?.san || '',
      });
    }
    return pairs;
  }, [history]);

  const formatTime = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds === null) return '10:00';
    const s = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 py-2 px-2">
      {/* LEFT COLUMN: Opponent Strip + Chessboard + Player Strip */}
      <div className="flex flex-col items-center w-full max-w-[560px]">
        {/* Opponent Player Strip (Top) */}
        <PlayerStrip
          username={opponentName}
          color={opponentColor}
          isCurrentTurn={turn === opponentColor}
          capturedPieces={opponentColor === 'w' ? captured.capturedByWhite : captured.capturedByBlack}
          advantage={opponentColor === 'w' ? Math.max(0, captured.advantage) : Math.max(0, -captured.advantage)}
          timeRemaining={formatTime(opponentColor === 'w' ? timers?.white : timers?.black)}
          isYou={false}
        />

        {/* 8x8 Board Container */}
        <div className="my-1 w-full flex justify-center">
          <ChessBoard
            game={game}
            fen={fen}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            inCheckSquare={inCheckSquare}
            orientation={myColor}
            pendingPromotion={pendingPromotion}
            onSquareClick={handleSquareClick}
            onConfirmPromotion={confirmPromotion}
            onCancelPromotion={cancelPromotion}
          />
        </div>

        {/* Your Player Strip (Bottom) */}
        <PlayerStrip
          username={myName}
          color={myColor}
          isCurrentTurn={turn === myColor}
          capturedPieces={myColor === 'w' ? captured.capturedByWhite : captured.capturedByBlack}
          advantage={myColor === 'w' ? Math.max(0, captured.advantage) : Math.max(0, -captured.advantage)}
          timeRemaining={formatTime(myColor === 'w' ? timers?.white : timers?.black)}
          isYou={true}
        />

        {/* Disconnect Warning Banner */}
        {disconnectTimer !== null && disconnectTimer > 0 && (
          <div className="w-full mt-2 p-2.5 bg-[#b45309]/30 border border-[#f59e0b] rounded text-[#fbbf24] text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 animate-spin" />
              <span>Opponent disconnected. Forfeiting in:</span>
            </div>
            <span className="font-mono text-sm font-bold bg-[#78350f] px-2 py-0.5 rounded">
              {disconnectTimer}s
            </span>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Chess.com Game Console (Tabs, History, Chat, Actions) */}
      <div className="w-full lg:w-[380px] bg-[#262522] border border-[#3d3b38] rounded-lg shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Console Navigation Tabs */}
        <div className="flex items-center border-b border-[#3d3b38] bg-[#21201d]">
          <button
            onClick={() => setActiveTab('moves')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 ${
              activeTab === 'moves'
                ? 'border-[#81b64c] text-white bg-[#262522]'
                : 'border-transparent text-[#989795] hover:text-white'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Moves</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 ${
              activeTab === 'chat'
                ? 'border-[#81b64c] text-white bg-[#262522]'
                : 'border-transparent text-[#989795] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 ${
              activeTab === 'info'
                ? 'border-[#81b64c] text-white bg-[#262522]'
                : 'border-transparent text-[#989795] hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Game Info</span>
          </button>
        </div>

        {/* Tab 1: Algebraic Move History Table */}
        {activeTab === 'moves' && (
          <div className="flex-1 overflow-y-auto p-2 bg-[#262522] text-xs font-mono">
            {movePairs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#989795] italic text-xs">
                White to move. Click any piece!
              </div>
            ) : (
              <table className="w-full text-left">
                <tbody>
                  {movePairs.map((pair, idx) => {
                    const isLastWhite = idx === movePairs.length - 1 && !pair.black;
                    const isLastBlack = idx === movePairs.length - 1 && !!pair.black;

                    return (
                      <tr
                        key={pair.num}
                        className={idx % 2 === 0 ? 'bg-[#2b2926]' : 'bg-[#262522]'}
                      >
                        <td className="py-1 px-2.5 text-[#989795] w-12 text-xs">
                          {pair.num}.
                        </td>
                        <td
                          className={`py-1 px-2.5 rounded font-semibold text-xs ${
                            isLastWhite ? 'bg-[#363431] text-[#81b64c]' : 'text-white'
                          }`}
                        >
                          {pair.white}
                        </td>
                        <td
                          className={`py-1 px-2.5 rounded font-semibold text-xs ${
                            isLastBlack ? 'bg-[#363431] text-[#81b64c]' : 'text-[#c3c2c1]'
                          }`}
                        >
                          {pair.black}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: In-Game Chat Box */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-[#262522]">
            <ChatBox socket={socket} roomId={activeGame.roomId} username={myName} />
          </div>
        )}

        {/* Tab 3: Game Info & State FEN */}
        {activeTab === 'info' && (
          <div className="flex-1 p-4 bg-[#262522] text-xs space-y-4 overflow-y-auto">
            <div>
              <span className="text-[#989795] block mb-1 font-semibold uppercase text-[10px]">
                Match Code
              </span>
              <span className="font-mono text-sm font-bold text-white bg-[#21201d] px-2.5 py-1 rounded border border-[#3d3b38]">
                {activeGame.roomId}
              </span>
            </div>

            <div>
              <span className="text-[#989795] block mb-1 font-semibold uppercase text-[10px]">
                Turn Status
              </span>
              <div className="flex items-center gap-2 text-white font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c]" />
                <span>{turn === 'w' ? 'White to move' : 'Black to move'}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#989795] font-semibold uppercase text-[10px]">
                  Board FEN (State)
                </span>
                <button
                  onClick={handleCopyFen}
                  className="text-[#81b64c] hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  {copiedFen ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="p-2 bg-[#21201d] rounded font-mono text-[11px] text-[#989795] break-all border border-[#3d3b38]">
                {fen}
              </div>
            </div>
          </div>
        )}

        {/* Draw Offer Banner in Console */}
        {drawOfferReceived && (
          <div className="p-3 bg-[#2b2926] border-t border-[#3d3b38] flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              {opponentName} offered a draw.
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={acceptDraw}
                className="px-2.5 py-1 bg-[#81b64c] hover:bg-[#a3d160] text-white rounded font-bold transition cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={declineDraw}
                className="px-2.5 py-1 bg-[#3d3b38] hover:bg-[#4b4844] text-[#c3c2c1] rounded font-semibold transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Status Notification Toast */}
        {statusNotification && (
          <div className="px-3 py-1.5 bg-[#302e2b] border-t border-[#3d3b38] text-[11px] text-[#c3c2c1] flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-[#81b64c]" />
            <span>{statusNotification}</span>
          </div>
        )}

        {/* Bottom Action Footer (Chess.com Signature Controls) */}
        <div className="p-3 bg-[#21201d] border-t border-[#3d3b38] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={offerDraw}
              disabled={isGameOver}
              className="btn-chess-secondary px-3 py-2 rounded text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Offer Draw"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>

            <button
              onClick={resign}
              disabled={isGameOver}
              className="btn-chess-secondary px-3 py-2 rounded text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 hover:text-red-400"
              title="Resign Match"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Resign</span>
            </button>
          </div>

          <button
            onClick={onLeaveGame}
            className="btn-chess-secondary px-3 py-2 rounded text-xs text-[#989795] hover:text-white flex items-center gap-1.5 cursor-pointer"
            title="Leave Match & Return to Lobby"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* GAME OVER & REMATCH MODAL (Chess.com Style) */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-[#262522] border border-[#3d3b38] p-6 sm:p-8 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
            {/* Crown / Trophy Icon */}
            <div className="w-14 h-14 rounded-full bg-[#302e2b] border border-[#3d3b38] flex items-center justify-center mb-3">
              <Trophy className="w-7 h-7 text-[#eab308]" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {isWinner ? 'You Won!' : isLoser ? 'You Lost' : 'Game Drawn'}
            </h2>
            <p className="text-xs text-[#989795] mb-5">
              by {drawReason || (winner ? 'Checkmate' : 'Agreement')}
            </p>

            {/* Elo Rating Changes */}
            {myEloDelta !== undefined && (
              <div className="w-full bg-[#21201d] border border-[#3d3b38] p-3 rounded-lg mb-6 flex items-center justify-around">
                <div className="text-center">
                  <div className="text-xs font-bold text-white">{myName}</div>
                  <div className="text-xs text-[#989795] font-mono mt-0.5">
                    {myNewElo}{' '}
                    <span className={myEloDelta >= 0 ? 'text-[#81b64c] font-bold' : 'text-red-400 font-bold'}>
                      ({myEloDelta >= 0 ? `+${myEloDelta}` : myEloDelta})
                    </span>
                  </div>
                </div>

                <div className="text-[#484542] font-bold">vs</div>

                <div className="text-center">
                  <div className="text-xs font-bold text-white">{opponentName}</div>
                  <div className="text-xs text-[#989795] font-mono mt-0.5">
                    {oppNewElo}{' '}
                    <span className={oppEloDelta >= 0 ? 'text-[#81b64c] font-bold' : 'text-red-400 font-bold'}>
                      ({oppEloDelta >= 0 ? `+${oppEloDelta}` : oppEloDelta})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rematch CTA Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              {rematchRequestedByOpponent ? (
                <button
                  onClick={requestRematch}
                  className="btn-chess-green w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Swords className="w-4 h-4" />
                  Accept Rematch (Swap Colors)
                </button>
              ) : (
                <button
                  onClick={requestRematch}
                  disabled={rematchSent}
                  className="btn-chess-green w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {rematchSent ? 'Rematch Requested...' : 'Rematch'}
                </button>
              )}

              <button
                onClick={onLeaveGame}
                className="btn-chess-secondary w-full py-2.5 px-4 rounded-lg text-xs cursor-pointer"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
