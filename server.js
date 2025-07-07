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

let waiting = null;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("readyForCall", () => {
    if (waiting) {
      // Pair with waiting user
      socket.partner = waiting;
      waiting.partner = socket;

      socket.emit("offer", waiting.offer);
      waiting = null;
    } else {
      // Wait for partner
      waiting = socket;

      // Prepare to send offer later
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
    if (waiting === socket) {
      waiting = null;
    }
    if (socket.partner) {
      socket.partner.emit("stranger-disconnected");
      socket.partner.partner = null;
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

