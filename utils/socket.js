import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected to socket:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from socket:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn('Socket.io is not initialized!');
    return null;
  }
  return io;
};
