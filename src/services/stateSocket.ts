import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://telecrm-copy-production.up.railway.app';

let stateSocket: Socket | null = null;

export function getStateSocket(): Socket {
  if (stateSocket) return stateSocket;
  const token = localStorage.getItem('state_crm_token');
  stateSocket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ['polling', 'websocket'],
    auth: { token },
  });
  return stateSocket;
}

export function disconnectStateSocket() {
  if (stateSocket) {
    stateSocket.disconnect();
    stateSocket = null;
  }
}
