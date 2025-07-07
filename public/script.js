const socket = io();
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const chatbox = document.getElementById("chatbox");
const status = document.getElementById("status");
const onlineCount = document.getElementById("onlineCount");

let myCountry = "🌍";
let myFlag = "🌐";

fetch("https://ipinfo.io/json?token=8ac26849c86146")
  .then(res => res.json())
  .then(data => {
    myCountry = data.country;
    myFlag = countryToFlagEmoji(data.country);
    socket.emit("findPartner", { country: myCountry, flag: myFlag });
  });

function countryToFlagEmoji(cc) {
  return cc.toUpperCase().replace(/./g, char =>
    String.fromCodePoint(127397 + char.charCodeAt())
  );
}

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing");
});
input.addEventListener("keyup", () => {
  if (input.value.trim() === "") socket.emit("stopTyping");
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit("message", msg);
  addMessage("you", msg);
  input.value = "";
  socket.emit("stopTyping");
}

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.innerText = `${sender === "you" ? "You" : "Stranger"}: ${text}`;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Events
socket.on("partnerFound", (userData) => {
  status.innerText = `Stranger connected from ${userData.flag} ${userData.country}`;
});
socket.on("partnerDisconnected", () => {
  status.innerText = "Stranger disconnected. Searching again...";
  socket.emit("findPartner", { country: myCountry, flag: myFlag });
});
socket.on("message", (msg) => addMessage("stranger", msg));
socket.on("typing", () => status.innerText = "Stranger is typing...");
socket.on("stopTyping", () => status.innerText = "Stranger connected.");
socket.on("updateUserCount", (count) => {
  onlineCount.innerText = `${count}+ online`;
});
