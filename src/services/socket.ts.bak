import { io } from 'socket.io-client';
const SOCKET_URL = 'https://telecrm-copy-production.up.railway.app';
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000,
  transports: ['polling', 'websocket'],
});
