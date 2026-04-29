import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 3,
  timeout: 5000,
  transports: ['polling', 'websocket'],
});