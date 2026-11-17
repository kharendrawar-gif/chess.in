import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, X, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#262522] border border-[#3d3b38] p-6 rounded-xl shadow-2xl max-w-sm w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#989795] hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-full bg-[#302e2b] border border-[#3d3b38] flex items-center justify-center text-[#81b64c] mx-auto mb-2.5">
            {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </div>
          <h2 className="text-lg font-bold text-white">
            {isRegister ? 'Create Account' : 'Log In'}
          </h2>
          <p className="text-xs text-[#989795] mt-0.5">
            {isRegister
              ? 'Track your rating and climb the leaderboard'
              : 'Sign in to access your Chess rating'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-800 rounded text-xs text-red-300 mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#c3c2c1] uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#989795] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                maxLength={16}
                className="w-full bg-[#21201d] border border-[#3d3b38] pl-9 pr-3 py-2 rounded text-sm text-white focus:outline-none focus:border-[#81b64c]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#c3c2c1] uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#989795] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#21201d] border border-[#3d3b38] pl-9 pr-3 py-2 rounded text-sm text-white focus:outline-none focus:border-[#81b64c]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-chess-green w-full py-2.5 px-4 rounded text-sm cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-t border-[#3d3b38] text-xs text-[#989795]">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="text-[#81b64c] font-bold hover:underline cursor-pointer"
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              New player?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="text-[#81b64c] font-bold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
