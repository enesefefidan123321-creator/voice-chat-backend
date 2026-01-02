const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socket.data.username = username;
    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const peers = clients
      .filter(id => id !== socket.id)
      .map(id => ({ socketId: id, username: io.sockets.sockets.get(id)?.data.username || "Anonim" }));
    socket.emit("peers", peers);
  });

  socket.on("webrtc-offer", ({ to, offer }) => {
    io.to(to).emit("webrtc-offer", { from: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    io.to(to).emit("webrtc-answer", { from: socket.id, answer });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
    }
    console.log("Bağlantı koptu:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
