const socket = io();

// Elements
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const nextBtn = document.getElementById("nextBtn");
const onlineCount = document.getElementById("onlineCount");

let isTyping = false;

// Request to find a partner
socket.emit("findPartner");

// Partner found
socket.on("partnerFound", () => {
  appendMessage("🔗 Stranger connected!", "system");
  typingIndicator.innerText = "";
});

// Stranger disconnected
socket.on("partnerDisconnected", () => {
  appendMessage("🚫 Stranger disconnected.", "system");
  typingIndicator.innerText = "";
});

// New message
socket.on("message", (msg) => {
  appendMessage(`Stranger: ${msg}`, "stranger");
});

// Typing indicators
socket.on("typing", () => {
  typingIndicator.innerText = "Stranger is typing...";
});

socket.on("stopTyping", () => {
  typingIndicator.innerText = "";
});

// Send message
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else {
    if (!isTyping) {
      isTyping = true;
      socket.emit("typing");
    }

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      isTyping = false;
      socket.emit("stopTyping");
    }, 1000);
  }
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  appendMessage(`You: ${msg}`, "you");
  socket.emit("message", msg);
  messageInput.value = "";
  socket.emit("stopTyping");
  isTyping = false;
}

// Next button
nextBtn.addEventListener("click", () => {
  chatBox.innerHTML = "";
  socket.emit("next");
  appendMessage("🔍 Looking for a new stranger...", "system");
});

// Append message to chat
function appendMessage(msg, type) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);
  msgDiv.innerText = msg;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Show online user count
socket.on("userCount", (count) => {
  if (onlineCount) {
    onlineCount.innerText = `${count}+ Online`;
  }
});
