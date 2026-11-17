import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  RefreshCw,
  Radio,
  Zap,
  Activity,
  Search,
  XCircle,
  AlertCircle,
  Swords,
  Clock,
  ShieldAlert
} from 'lucide-react';

export default function RoomLobby({ onGameStart, currentRoom, setCurrentRoom }) {
  const { socket, isConnected, connectionError } = useSocket();

  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chess_username') || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [joinCode, setJoinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Matchmaking Queue State
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Online Stats
  const [stats, setStats] = useState({ onlineCount: 1, activeRooms: 0, queueCount: 0 });

  const handleUsernameChange = (val) => {
    setUsername(val);
    localStorage.setItem('chess_username', val);
  };

  useEffect(() => {
    let timer = null;
    if (isSearchingMatch) {
      setSearchTime(0);
      timer = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearchingMatch]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setIsCreating(false);
      setIsSearchingMatch(false);
      setCurrentRoom({
        id: data.roomId,
        role: 'white',
        color: 'w',
        status: 'waiting',
        whitePlayer: data.username,
        blackPlayer: null,
      });
      setErrorMsg(null);
    };

    const handleJoinedRoom = (data) => {
      setIsSearchingMatch(false);
      setCurrentRoom({
        id: data.roomId,
        role: data.role,
        color: data.color,
        status: data.status,
        whitePlayer: data.whitePlayer,
        blackPlayer: data.blackPlayer,
      });
      setErrorMsg(null);
    };

    const handleGameStart = (gameData) => {
      setIsSearchingMatch(false);
      onGameStart(gameData);
    };

    const handleLobbyUpdated = (rooms) => {
      setPublicRooms(rooms || []);
    };

    const handleOnlineStats = (data) => {
      setStats(data);
    };

    const handleQueued = () => {
      setIsSearchingMatch(true);
    };

    const handleQueueLeft = () => {
      setIsSearchingMatch(false);
    };

    const handleError = (data) => {
      setErrorMsg(data.message || 'An error occurred.');
      setIsCreating(false);
      setIsSearchingMatch(false);
    };

    socket.on('roomCreated', handleRoomCreated);
    socket.on('joinedRoom', handleJoinedRoom);
    socket.on('gameStart', handleGameStart);
    socket.on('lobbyUpdated', handleLobbyUpdated);
    socket.on('onlineStats', handleOnlineStats);
    socket.on('queued', handleQueued);
    socket.on('queueLeft', handleQueueLeft);
    socket.on('error', handleError);

    socket.emit('getRooms');

    return () => {
      socket.off('roomCreated', handleRoomCreated);
      socket.off('joinedRoom', handleJoinedRoom);
      socket.off('gameStart', handleGameStart);
      socket.off('lobbyUpdated', handleLobbyUpdated);
      socket.off('onlineStats', handleOnlineStats);
      socket.off('queued', handleQueued);
      socket.off('queueLeft', handleQueueLeft);
      socket.off('error', handleError);
    };
  }, [socket, onGameStart, setCurrentRoom]);

  const handleQuickMatch = () => {
    if (!socket || !isConnected) return;
    setErrorMsg(null);
    setIsSearchingMatch(true);
    socket.emit('joinQueue', { username });
  };

  const handleCancelQuickMatch = () => {
    if (!socket) return;
    socket.emit('leaveQueue');
    setIsSearchingMatch(false);
  };

  const handleCreateRoom = () => {
    if (!socket || !isConnected) return;
    setErrorMsg(null);
    setIsCreating(true);
    socket.emit('createRoom', { username });
  };

  const handleJoinRoom = (codeToJoin) => {
    const code = (codeToJoin || joinCode).trim().toUpperCase();
    if (!code) {
      setErrorMsg('Please enter a 6-character room code.');
      return;
    }
    if (!socket || !isConnected) return;
    setErrorMsg(null);
    socket.emit('joinRoom', { roomId: code, username });
  };

  const handleCopyCode = () => {
    if (!currentRoom?.id) return;
    navigator.clipboard.writeText(currentRoom.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelRoom = () => {
    setCurrentRoom(null);
    setErrorMsg(null);
  };

  const filteredRooms = publicRooms.filter(
    (r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl flex flex-col gap-5 py-2">
      {/* Top Presence Strip */}
      <div className="w-full flex items-center justify-between py-2 px-4 bg-[#262522] border border-[#3d3b38] rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          <span className="text-[#c3c2c1]">
            <strong className="text-white">{stats.onlineCount}</strong> Players Online
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#989795]">Name:</span>
          <input
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            maxLength={16}
            className="bg-[#21201d] border border-[#3d3b38] px-2.5 py-1 rounded text-white font-semibold text-xs focus:outline-none focus:border-[#81b64c] w-36"
          />
        </div>
      </div>

      {/* Error Alert */}
      {(errorMsg || connectionError) && (
        <div className="p-3 bg-red-950/40 border border-red-800 rounded text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg || connectionError}</span>
        </div>
      )}

      {/* Host Room Waiting Screen */}
      {currentRoom && currentRoom.status === 'waiting' ? (
        <div className="p-8 bg-[#262522] border border-[#3d3b38] rounded-xl text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#302e2b] border border-[#3d3b38] flex items-center justify-center text-[#81b64c] mb-3">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Challenge Created!</h2>
          <p className="text-xs text-[#989795] mb-5">
            Share this 6-character code with your opponent:
          </p>

          <div className="flex items-center gap-2 bg-[#21201d] border border-[#3d3b38] py-2.5 px-6 rounded-lg mb-6">
            <span className="font-mono text-3xl font-black tracking-widest text-[#81b64c]">
              {currentRoom.id}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 bg-[#3d3b38] hover:bg-[#4b4844] text-white rounded transition cursor-pointer ml-2"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-[#81b64c]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#989795] mb-5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#81b64c]" />
            <span>Waiting for opponent to connect...</span>
          </div>

          <button
            onClick={handleCancelRoom}
            className="text-xs text-[#989795] hover:text-white underline cursor-pointer"
          >
            Cancel Challenge
          </button>
        </div>
      ) : (
        /* Main Chess.com Play Interface */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Action: Big Green Play Online Button (Chess.com Style) */}
          <div className="md:col-span-2 bg-[#262522] border border-[#3d3b38] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
                <Swords className="w-5 h-5 text-[#81b64c]" />
                <span>Play Live Chess</span>
              </div>
              <p className="text-xs text-[#989795] mb-6">
                10 min • Rated • Random Matchmaking
              </p>
            </div>

            {isSearchingMatch ? (
              <div className="p-6 bg-[#21201d] border border-[#3d3b38] rounded-lg flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2 text-[#81b64c] font-bold text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching for opponent... ({searchTime}s)</span>
                </div>
                <button
                  onClick={handleCancelQuickMatch}
                  className="btn-chess-secondary px-4 py-1.5 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleQuickMatch}
                disabled={!isConnected}
                className="btn-chess-green w-full py-4 px-6 rounded-lg text-lg flex items-center justify-center gap-3 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Zap className="w-6 h-6 fill-white" />
                <span>Play Online</span>
              </button>
            )}
          </div>

          {/* Side Column: Custom Game & Join by Code */}
          <div className="bg-[#262522] border border-[#3d3b38] rounded-xl p-5 flex flex-col justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                Play a Friend
              </span>
              <button
                onClick={handleCreateRoom}
                disabled={!isConnected || isCreating}
                className="btn-chess-secondary w-full py-2.5 px-3 rounded text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mb-4"
              >
                <PlusCircle className="w-4 h-4 text-[#81b64c]" />
                <span>Create Challenge</span>
              </button>

              <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                Join by Code
              </span>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. K9P2X4"
                maxLength={6}
                className="w-full bg-[#21201d] border border-[#3d3b38] px-3 py-2 rounded text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-[#81b64c] mb-2 uppercase"
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={!isConnected || !joinCode.trim()}
                className="btn-chess-secondary w-full py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Join Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Challenges / Public Rooms Table */}
      <div className="bg-[#262522] border border-[#3d3b38] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3d3b38] mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Users className="w-4 h-4 text-[#81b64c]" />
            <span>Open Challenges ({publicRooms.filter((r) => r.status === 'waiting').length})</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#989795] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player or code..."
                className="bg-[#21201d] border border-[#3d3b38] pl-8 pr-3 py-1 rounded text-xs text-white focus:outline-none focus:border-[#81b64c] w-48"
              />
            </div>
            <button
              onClick={() => socket?.emit('getRooms')}
              className="p-1.5 bg-[#3d3b38] hover:bg-[#4b4844] text-[#c3c2c1] rounded text-xs transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#989795] italic">
            No open challenges right now. Click "Play Online" or "Create Challenge"!
          </div>
        ) : (
          <div className="divide-y divide-[#3d3b38]">
            {filteredRooms.map((room) => (
              <div key={room.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-[#21201d] border border-[#3d3b38] flex items-center justify-center font-bold text-xs text-white">
                    {room.host ? room.host.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{room.host}</div>
                    <div className="text-[10px] text-[#989795] font-mono">Code: {room.id}</div>
                  </div>
                </div>

                {room.status === 'waiting' && currentRoom?.id !== room.id && (
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="btn-chess-green px-3 py-1 rounded text-xs cursor-pointer"
                  >
                    Play
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
