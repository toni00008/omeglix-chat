const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const path = require("path");

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/video", (req, res) => {
  res.sendFile(__dirname + "/public/video.html");
});

// ---------- TEXT CHAT ----------
let textQueue = [];

io.on("connection", (socket) => {
  console.log("[TEXT] User connected: " + socket.id);

  if (textQueue.length > 0) {
    const partner = textQueue.shift();
    socket.partner = partner;
    partner.partner = socket;

    socket.emit("partnerFound");
    partner.emit("partnerFound");
  } else {
    textQueue.push(socket);
  }

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
    textQueue.push(socket);
  });

  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    } else {
      textQueue = textQueue.filter(s => s !== socket);
    }
    console.log("[TEXT] User disconnected: " + socket.id);
  });
});

// ---------- VIDEO CHAT ----------
let videoQueue = [];

io.of("/video").on("connection", (socket) => {
  console.log("[VIDEO] Connected: " + socket.id);

  if (videoQueue.length > 0) {
    const partner = videoQueue.shift();
    socket.partner = partner;
    partner.partner = socket;

    partner.emit("offer", partner.offer); // send offer to new user
  } else {
    videoQueue.push(socket);
  }

  socket.on("offer", (offer) => {
    socket.offer = offer;
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
    if (socket.partner) {
      socket.partner.emit("stranger-disconnected");
      socket.partner.partner = null;
    } else {
      videoQueue = videoQueue.filter(s => s !== socket);
    }
    console.log("[VIDEO] Disconnected: " + socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

