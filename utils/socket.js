import { Server } from "socket.io";

export const connectedClients = {}; // Track connected users
export let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("register", (userId) => {
      connectedClients[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      for (const userId in connectedClients) {
        if (connectedClients[userId] === socket.id) {
          delete connectedClients[userId];
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};
