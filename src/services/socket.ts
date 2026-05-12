import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://telecrm-copy-production.up.railway.app/api').replace(/\/api$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 3,
  timeout: 5000,
  transports: ['polling', 'websocket'],
});