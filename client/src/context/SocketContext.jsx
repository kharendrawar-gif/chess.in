import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Determine backend URL (works locally, in dev server, and in deployment)
    const isDev = window.location.port === '5173';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL ||
      (isDev && isLocal ? `http://${window.location.hostname}:5000` : window.location.origin);

    console.log('[Socket] Connecting to server at:', backendUrl);

    const s = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    s.on('connect', () => {
      console.log('[Socket Connected] ID:', s.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    s.on('disconnect', (reason) => {
      console.log('[Socket Disconnected] Reason:', reason);
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket Connection Error]:', err.message);
      setIsConnected(false);
      setConnectionError('Cannot reach game server. Make sure the backend server is running on port 5000.');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
