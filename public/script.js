const socket = io();

const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const chatbox = document.getElementById("chatbox");
const status = document.getElementById("status");
const onlineCount = document.getElementById("onlineCount");

let myCountry = "Unknown";
let myFlag = "🌍";

// Get user location via IP
fetch("https://ipinfo.io/json?token=8ac26849c86146") // Replace with your token if needed
  .then(res => res.json())
  .then(data => {
    myCountry = data.country || "Unknown";
    myFlag = countryToFlagEmoji(myCountry);
    findStranger();
  }).catch(() => {
    findStranger(); // Still try to connect even if IP lookup fails
  });

function countryToFlagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}

function findStranger() {
  status.innerText = "🔍 Searching for a stranger...";
  socket.emit("findPartner", { country: myCountry, flag: myFlag });
}

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit("message", msg);
  appendMessage("you", msg);
  input.value = "";
  socket.emit("stopTyping");
}

function appendMessage(sender, text) {
  const msgEl = document.createElement("div");
  msgEl.classList.add("message", sender);
  msgEl.innerText = `${sender === "you" ? "You" : "Stranger"}: ${text}`;
  chatbox.appendChild(msgEl);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Send on button click or Enter
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing");
});

input.addEventListener("keyup", e => {
  if (input.value.trim() === "") socket.emit("stopTyping");
});

// Incoming events
socket.on("partnerFound", (userData) => {
  status.innerText = `✅ Stranger connected from ${userData.flag} ${userData.country}`;
});

socket.on("partnerDisconnected", () => {
  status.innerText = "⚠️ Stranger disconnected. Finding new one...";
  chatbox.innerHTML = "";
  findStranger();
});

socket.on("message", (msg) => appendMessage("stranger", msg));

socket.on("typing", () => {
  status.innerText = "✍️ Stranger is typing...";
});

socket.on("stopTyping", () => {
  status.innerText = `✅ Stranger connected`;
});

socket.on("updateUserCount", (count) => {
  onlineCount.innerText = `${count}+`;
});

// Theme toggle
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeToggle.innerText = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

