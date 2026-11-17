import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function ChatBox({ socket, roomId, username }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('newChatMessage', handleNewMessage);

    return () => {
      socket.off('newChatMessage', handleNewMessage);
    };
  }, [socket, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !socket) return;

    socket.emit('sendChatMessage', {
      roomId,
      message: inputVal,
      username,
    });

    setInputVal('');
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col text-xs">
      {/* Chat Header / Toggle Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-slate-300 font-semibold cursor-pointer transition"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>In-Game Chat</span>
          {!isOpen && unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Expandable Chat Body */}
      {isOpen && (
        <div className="flex flex-col h-48">
          {/* Messages scroll list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-[11px]">
                Say hello or good luck! ♟️
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === username;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-500">
                      <span className="font-semibold">{m.sender}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <div
                      className={`py-1.5 px-2.5 rounded-xl max-w-[85%] break-words leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Field */}
          <form
            onSubmit={handleSend}
            className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Send a chat message..."
              maxLength={140}
              className="flex-1 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
