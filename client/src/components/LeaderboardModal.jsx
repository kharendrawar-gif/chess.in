import React, { useState, useEffect } from 'react';
import { Trophy, X, RefreshCw, Flame } from 'lucide-react';

export default function LeaderboardModal({ isOpen, onClose, currentUsername }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = () => {
    setLoading(true);
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setLeaders(data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch leaderboard:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#262522] border border-[#3d3b38] p-5 sm:p-6 rounded-xl shadow-2xl max-w-xl w-full relative max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#989795] hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3d3b38] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#302e2b] border border-[#3d3b38] flex items-center justify-center text-[#eab308]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Leaderboard</h2>
              <p className="text-[11px] text-[#989795]">Top rated players</p>
            </div>
          </div>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="p-1.5 bg-[#3d3b38] hover:bg-[#4b4844] text-[#c3c2c1] rounded text-xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#989795] gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#81b64c]" />
              <span className="text-xs">Loading ratings...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#989795] italic">
              No players recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#989795] border-b border-[#3d3b38] pb-1 text-[11px]">
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-2">Player</th>
                  <th className="py-2 px-2 text-right">Rating</th>
                  <th className="py-2 px-2 text-center">W / L / D</th>
                  <th className="py-2 px-2 text-right">Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3b38]/60 font-medium">
                {leaders.map((player, idx) => {
                  const rank = idx + 1;
                  const isCurrent =
                    currentUsername &&
                    player.username.toLowerCase() === currentUsername.toLowerCase();

                  return (
                    <tr
                      key={player.username}
                      className={isCurrent ? 'bg-[#302e2b] text-white' : 'hover:bg-[#2b2926] text-[#c3c2c1]'}
                    >
                      <td className="py-2.5 px-2 text-center font-bold">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </td>

                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{player.username}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-[#81b64c] text-white px-1 rounded font-bold">
                              YOU
                            </span>
                          )}
                          {player.elo >= 1700 && (
                            <Flame className="w-3 h-3 text-[#eab308] flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono font-bold text-[#81b64c]">
                        {player.elo}
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-[#989795]">
                        <span className="text-white font-semibold">{player.wins}</span>-
                        <span className="text-[#989795]">{player.losses}</span>-
                        <span className="text-[#989795]">{player.draws}</span>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-white font-semibold">
                        {player.win_rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
