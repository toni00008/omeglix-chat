const express = require('express');
const axios = require('axios');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

app.use(express.static('public'));

let users = new Set();
let waitingUser = null;
let videoWaitingUser = null;

function updateOnlineCount() {
  io.emit('onlineCount', users.size);
}

// Get country from IP
async function getCountryFromIP(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return {
      country: response.data.country || 'Unknown',
      code: response.data.countryCode || ''
    };
  } catch (err) {
    return { country: 'Unknown', code: '' };
  }
}

io.on('connection', async (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.conn.remoteAddress;
  const location = await getCountryFromIP(ip);

  socket.country = location.country;
  socket.countryCode = location.code;

  users.add(socket.id);
  updateOnlineCount();

  // TEXT CHAT LOGIC
  if (waitingUser) {
    const partner = waitingUser;
    waitingUser = null;
    socket.partner = partner;
    partner.partner = socket;

    socket.emit('partner-found', {
      country: partner.country,
      code: partner.countryCode
    });

    partner.emit('partner-found', {
      country: socket.country,
      code: socket.countryCode
    });
  } else {
    waitingUser = socket;
  }

  socket.on('message', msg => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('typing', () => {
    if (socket.partner) {
      socket.partner.emit('typing');
    }
  });

  socket.on('next', () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit('partner-disconnected');
    }

    socket.partner = null;

    if (!waitingUser || waitingUser === socket) {
      waitingUser = socket;
    } else {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.emit('partner-found', {
        country: partner.country,
        code: partner.countryCode
      });

      partner.emit('partner-found', {
        country: socket.country,
        code: socket.countryCode
      });
    }
  });

  // VIDEO CHAT LOGIC
  socket.on('video-ready', () => {
    if (videoWaitingUser && videoWaitingUser !== socket) {
      socket.partner = videoWaitingUser;
      videoWaitingUser.partner = socket;

      socket.emit('start-video');
      videoWaitingUser.emit('start-video');

      videoWaitingUser = null;
    } else {
      videoWaitingUser = socket;
    }
  });

  socket.on('video-offer', (data) => {
    if (socket.partner) socket.partner.emit('video-offer', data);
  });

  socket.on('video-answer', (data) => {
    if (socket.partner) socket.partner.emit('video-answer', data);
  });

  socket.on('video-candidate', (data) => {
    if (socket.partner) socket.partner.emit('video-candidate', data);
  });

  socket.on('video-next', () => {
    if (socket.partner) {
      socket.partner.emit('partner-disconnected');
      socket.partner.partner = null;
    }

    socket.partner = null;
    socket.emit('video-ready');
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    updateOnlineCount();

    if (waitingUser === socket) waitingUser = null;
    if (videoWaitingUser === socket) videoWaitingUser = null;

    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit('partner-disconnected');
    }
  });
});

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
