const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

let localStream;
let peerConnection;
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

// 1. Get user's webcam
async function startVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    socket.emit("readyForCall");
  } catch (err) {
    alert("Error accessing camera/mic");
    console.error(err);
  }
}

// 2. Start connection as caller
function createOffer() {
  peerConnection = new RTCPeerConnection(config);
  setupPeerEvents();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.createOffer()
    .then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit("offer", offer);
    });
}

// 3. When receiving an offer
socket.on("offer", (offer) => {
  peerConnection = new RTCPeerConnection(config);
  setupPeerEvents();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    .then(() => peerConnection.createAnswer())
    .then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });
});

// 4. When receiving an answer
socket.on("answer", (answer) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// 5. When receiving ICE candidate
socket.on("ice-candidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// 6. Handle remote stream
function setupPeerEvents() {
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    statusText.innerText = "Stranger connected!";
  };
}

// END call
function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  statusText.innerText = "Call ended.";
  socket.emit("end");
}

// NEXT call
function nextStranger() {
  endCall();
  startVideo();
}

// Stranger left
socket.on("stranger-disconnected", () => {
  endCall();
  statusText.innerText = "Stranger disconnected.";
});

// Start video on load
startVideo();
