const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

let waitingUsers = [];
let allUsers = new Set();

io.on("connection", (socket) => {
  allUsers.add(socket);
  io.emit("updateUserCount", allUsers.size);

  socket.on("findPartner", (data) => {
    socket.country = data.country || "🌍";
    socket.flag = data.flag || "🌐";
    waitingUsers.push(socket);
    matchUsers();
  });

  socket.on("disconnectPartner", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("typing", () => {
    if (socket.partner) socket.partner.emit("typing");
  });

  socket.on("stopTyping", () => {
    if (socket.partner) socket.partner.emit("stopTyping");
  });

  socket.on("disconnect", () => {
    allUsers.delete(socket);
    io.emit("updateUserCount", allUsers.size);
    waitingUsers = waitingUsers.filter((s) => s !== socket);
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
  });
});

function matchUsers() {
  while (waitingUsers.length >= 2) {
    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();

    user1.partner = user2;
    user2.partner = user1;

    user1.emit("partnerFound", {
      country: user2.country,
      flag: user2.flag,
    });

    user2.emit("partnerFound", {
      country: user1.country,
      flag: user1.flag,
    });
  }
}

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

