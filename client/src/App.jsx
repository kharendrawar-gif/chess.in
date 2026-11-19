import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChessBoard from './components/ChessBoard';
import PlayerStrip from './components/PlayerStrip';
import RoomLobby from './components/RoomLobby';
import OnlineGameView from './components/OnlineGameView';
import AuthModal from './components/AuthModal';
import LeaderboardModal from './components/LeaderboardModal';
import { useChessGame } from './hooks/useChessGame';
import {
  Trophy,
  LogIn,
  LogOut,
  RotateCcw,
  RefreshCw,
  Swords,
  User,
  Globe,
  Radio
} from 'lucide-react';

function ChessApp() {
  const { socket, isConnected } = useSocket();
  const { user, isLoggedIn, logout } = useAuth();

  // Mode: 'online' | 'local'
  const [mode, setMode] = useState('online');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Online Room State
  const [currentRoom, setCurrentRoom] = useState(null);
  const [activeGame, setActiveGame] = useState(null);

  // Local Game Engine hook (from M1)
  const localGame = useChessGame();

  const handleGameStart = (gameData) => {
    let myColor = 'w';
    if (gameData.whiteSocketId && socket?.id) {
      myColor = gameData.whiteSocketId === socket.id ? 'w' : 'b';
    } else if (gameData.blackSocketId && socket?.id) {
      myColor = gameData.blackSocketId === socket.id ? 'b' : 'w';
    } else if (currentRoom?.color) {
      myColor = currentRoom.color;
    } else {
      const savedName = user?.username || localStorage.getItem('chess_username');
      if (savedName) {
        myColor = gameData.whitePlayer?.toLowerCase() === savedName.toLowerCase() ? 'w' : 'b';
      } else {
        myColor = 'w';
      }
    }

    setActiveGame({
      ...gameData,
      myColor,
    });
  };

  const handleLeaveGame = () => {
    if (socket && activeGame?.roomId) {
      socket.emit('leaveRoom', { roomId: activeGame.roomId });
    }
    setActiveGame(null);
    setCurrentRoom(null);
  };

  return (
    <div className="min-h-screen bg-[#302e2b] text-[#ffffff] flex flex-col md:flex-row">
      {/* LEFT NAVIGATION SIDEBAR (Chess.in Signature Sidebar) */}
      <aside className="w-full md:w-56 bg-[#21201d] border-b md:border-b-0 md:border-r border-[#3d3b38] flex flex-row md:flex-col justify-between p-3 md:p-4 z-40 flex-shrink-0">
        {/* Brand / Logo */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 px-2 py-1">
            {/* Green Chess Pawn Badge */}
            <div className="w-8 h-8 rounded-md bg-[#81b64c] flex items-center justify-center font-black text-white text-base shadow-sm">
              ♟
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg text-white tracking-wide">
                Chess<span className="text-[#81b64c]">.in</span>
              </span>
              <span className="text-[10px] text-[#989795] font-semibold">
                Play Live Chess
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex flex-col gap-1 mt-2">
            <button
              onClick={() => {
                setMode('online');
                if (activeGame) handleLeaveGame();
              }}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center gap-3 transition cursor-pointer text-left ${
                mode === 'online'
                  ? 'bg-[#302e2b] text-white border-l-4 border-[#81b64c]'
                  : 'text-[#c3c2c1] hover:bg-[#2b2926] hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4 text-[#81b64c]" />
              <span>Play Online</span>
            </button>

            <button
              onClick={() => {
                setMode('local');
                if (activeGame) handleLeaveGame();
              }}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center gap-3 transition cursor-pointer text-left ${
                mode === 'local'
                  ? 'bg-[#302e2b] text-white border-l-4 border-[#81b64c]'
                  : 'text-[#c3c2c1] hover:bg-[#2b2926] hover:text-white'
              }`}
            >
              <User className="w-4 h-4 text-[#81b64c]" />
              <span>Local Practice</span>
            </button>

            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center gap-3 text-[#c3c2c1] hover:bg-[#2b2926] hover:text-white transition cursor-pointer text-left"
            >
              <Trophy className="w-4 h-4 text-[#eab308]" />
              <span>Leaderboard</span>
            </button>
          </nav>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => {
              setMode('online');
              if (activeGame) handleLeaveGame();
            }}
            className={`py-1.5 px-2.5 rounded text-xs font-bold ${
              mode === 'online' ? 'bg-[#302e2b] text-[#81b64c]' : 'text-[#989795]'
            }`}
          >
            Play
          </button>
          <button
            onClick={() => {
              setMode('local');
              if (activeGame) handleLeaveGame();
            }}
            className={`py-1.5 px-2.5 rounded text-xs font-bold ${
              mode === 'local' ? 'bg-[#302e2b] text-[#81b64c]' : 'text-[#989795]'
            }`}
          >
            Pass & Play
          </button>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="py-1.5 px-2 text-xs font-bold text-[#eab308]"
          >
            <Trophy className="w-4 h-4" />
          </button>
        </div>

        {/* User Account / Profile Box (Bottom of Sidebar) */}
        <div className="pt-3 border-t border-[#3d3b38]">
          {isLoggedIn ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#262522] border border-[#3d3b38]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#302e2b] flex items-center justify-center font-bold text-xs text-[#81b64c]">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="font-bold text-xs text-white truncate max-w-[100px]">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-[#989795] font-mono">
                    {user.elo} Elo
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-[#989795] hover:text-red-400 p-1 cursor-pointer transition"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="btn-chess-green w-full py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN GAME VIEWPORT */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        {mode === 'online' ? (
          !activeGame ? (
            /* Online Lobby */
            <RoomLobby
              onGameStart={handleGameStart}
              currentRoom={currentRoom}
              setCurrentRoom={setCurrentRoom}
            />
          ) : (
            /* Two-Player Synchronized Online Game */
            <OnlineGameView
              activeGame={activeGame}
              socket={socket}
              onLeaveGame={handleLeaveGame}
            />
          )
        ) : (
          /* Local Pass-and-Play Practice View */
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 py-2 px-2">
            <div className="flex flex-col items-center w-full max-w-[560px]">
              {/* Black Strip */}
              <PlayerStrip
                username="Black"
                color="b"
                isCurrentTurn={localGame.turn === 'b'}
                capturedPieces={localGame.captured.capturedByBlack}
                advantage={Math.max(0, -localGame.captured.advantage)}
              />

              <div className="my-1">
                <ChessBoard
                  game={localGame.game}
                  fen={localGame.fen}
                  selectedSquare={localGame.selectedSquare}
                  legalMoves={localGame.legalMoves}
                  lastMove={localGame.lastMove}
                  inCheckSquare={localGame.inCheckSquare}
                  orientation={localGame.orientation}
                  pendingPromotion={localGame.pendingPromotion}
                  onSquareClick={localGame.handleSquareClick}
                  onConfirmPromotion={localGame.confirmPromotion}
                  onCancelPromotion={localGame.cancelPromotion}
                />
              </div>

              {/* White Strip */}
              <PlayerStrip
                username="White"
                color="w"
                isCurrentTurn={localGame.turn === 'w'}
                capturedPieces={localGame.captured.capturedByWhite}
                advantage={Math.max(0, localGame.captured.advantage)}
              />
            </div>

            {/* Local Controls Panel */}
            <div className="w-full lg:w-[360px] bg-[#262522] border border-[#3d3b38] rounded-lg p-4 flex flex-col gap-4 shadow-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-[#3d3b38]">
                Pass & Play Mode
              </h2>
              <p className="text-xs text-[#989795]">
                Practice moves locally on a single device with rule validation and check detection.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={localGame.resetGame}
                  className="btn-chess-secondary py-2 px-3 rounded text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={localGame.undoMove}
                  disabled={localGame.history.length === 0}
                  className="btn-chess-secondary py-2 px-3 rounded text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  onClick={localGame.toggleOrientation}
                  className="btn-chess-secondary py-2 px-3 rounded text-xs cursor-pointer"
                >
                  Flip
                </button>
              </div>

              {/* Move History Table */}
              <div className="mt-2 flex-1">
                <span className="text-[11px] font-bold text-[#989795] uppercase block mb-1">
                  Moves ({localGame.history.length})
                </span>
                <div className="h-44 overflow-y-auto bg-[#21201d] rounded p-2 text-xs font-mono border border-[#3d3b38]">
                  {localGame.history.length === 0 ? (
                    <div className="text-[#989795] italic text-center py-6">
                      No moves played.
                    </div>
                  ) : (
                    localGame.history.map((m, idx) => (
                      <span key={idx} className="inline-block mr-2 text-white">
                        {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                        <strong>{m.san}</strong>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUsername={user?.username || localStorage.getItem('chess_username')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChessApp />
      </SocketProvider>
    </AuthProvider>
  );
}
