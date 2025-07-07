const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/video", (req, res) => {
  res.sendFile(__dirname + "/public/video.html");
});

// ========== TEXT CHAT ==========
let textQueue = [];

io.of("/").on("connection", (socket) => {
  console.log(`[TEXT] User connected: ${socket.id}`);

  socket.on("findPartner", () => {
    if (textQueue.length > 0) {
      const partner = textQueue.shift();
      socket.partner = partner;
      partner.partner = socket;

      socket.emit("partnerFound");
      partner.emit("partnerFound");
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
    if (socket.partner) {
      socket.partner.emit("typing");
    }
  });

  socket.on("stopTyping", () => {
    if (socket.partner) {
      socket.partner.emit("stopTyping");
    }
  });

  socket.on("disconnect", () => {
    console.log(`[TEXT] Disconnected: ${socket.id}`);
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    } else {
      textQueue = textQueue.filter(s => s.id !== socket.id);
    }
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
    socket.emit("findPartner");
  });
});

// ========== VIDEO CHAT ==========
let videoWaiting = null;

io.of("/video").on("connection", (socket) => {
  console.log(`[VIDEO] Connected: ${socket.id}`);

  socket.on("readyForCall", () => {
    if (videoWaiting) {
      socket.partner = videoWaiting;
      videoWaiting.partner = socket;

      // Send offer from waiting user to new user
      socket.emit("offer", videoWaiting.offer);
      videoWaiting = null;
    } else {
      videoWaiting = socket;

      socket.on("offer", (offer) => {
        socket.offer = offer;
      });
    }
  });

  socket.on("answer", (answer) => {
    if (socket.partner) {
      socket.partner.emit("answer", answer);
    }
  });

  socket.on("ice-candidate", (candidate) => {
    if (socket.partner) {
      socket.partner.emit("ice-candidate", candidate);
    }
  });

  socket.on("end", () => {
    if (socket.partner) {
      socket.partner.emit("stranger-disconnected");
      socket.partner.partner = null;
    }
    socket.partner = null;
  });

  socket.on("disconnect", () => {
    if (videoWaiting === socket) {
      videoWaiting = null;
    }
    if (socket.partner) {
      socket.partner.emit("stranger-disconnected");
      socket.partner.partner = null;
    }
    console.log(`[VIDEO] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

