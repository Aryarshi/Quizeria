import { io } from 'socket.io-client';

// Replace this string with your live Render backend URL
const URL = 'https://quizeria-gxag.onrender.com/'; 
export const socket = io(URL, { autoConnect: false });