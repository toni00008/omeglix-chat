let textQueue = [];
let onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("🔌 Text chat user connected:", socket.id);
  onlineUsers.add(socket.id);
  io.emit("updateUserCount", onlineUsers.size);

  socket.on("findPartner", (userData) => {
    socket.userData = userData;

    if (textQueue.length > 0) {
      const partner = textQueue.shift();

      socket.partner = partner;
      partner.partner = socket;

      socket.emit("partnerFound", partner.userData);
      partner.emit("partnerFound", socket.userData);
    } else {
      textQueue.push(socket);
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

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
    socket.partner = null;
    socket.emit("findPartner", socket.userData);
  });

  socket.on("disconnect", () => {
    console.log("❌ Text user disconnected:", socket.id);
    onlineUsers.delete(socket.id);
    io.emit("updateUserCount", onlineUsers.size);

    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    } else {
      textQueue = textQueue.filter(s => s !== socket);
    }
  });
});
