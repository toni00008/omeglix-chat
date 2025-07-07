const socket = io("/video");

const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
videoGrid.appendChild(myVideo);

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    myVideo.srcObject = stream;
    myVideo.play();

    const peer = new RTCPeerConnection();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate);
    };

    peer.ontrack = (e) => {
      const strangerVideo = document.createElement("video");
      strangerVideo.srcObject = e.streams[0];
      strangerVideo.play();
      videoGrid.appendChild(strangerVideo);
    };

    socket.emit("readyForCall");

    socket.on("offer", async (offer) => {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", (answer) => {
      peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", (candidate) => {
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    peer.createOffer().then(offer => {
      peer.setLocalDescription(offer);
      socket.emit("offer", offer);
    });

    socket.on("stranger-disconnected", () => {
      alert("Stranger disconnected.");
      location.reload();
    });
  });
