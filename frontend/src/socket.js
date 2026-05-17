

import { io } from 'socket.io-client';

// Make sure this is your EXACT live Render backend URL (no trailing slash)
const URL = 'https://quizeria-gxag.onrender.com'; 

export const socket = io(URL, { 
  autoConnect: false,
  transports: ['websocket', 'polling'] // Forces clean websocket handshakes first
});