const socket = io();

const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const chatBox = document.getElementById("chat-box");
const status = document.getElementById("status");
const flagDisplay = document.getElementById("flagDisplay");
const onlineCount = document.getElementById("online-count");
const themeToggle = document.getElementById("themeToggle");
const nextBtn = document.getElementById("next");

let myCountry = "🌍";
let myFlag = "🌐";
let myFullCountry = "Unknown";

function countryToFlagEmoji(cc) {
  return cc.toUpperCase().replace(/./g, char =>
    String.fromCodePoint(127397 + char.charCodeAt())
  );
}

// Get full country name & flag
fetch("https://ipinfo.io/json?token=8ac26849c86146")
  .then(res => res.json())
  .then(data => {
    myCountry = data.country || "🌍";
    myFlag = countryToFlagEmoji(myCountry);
    fetch(`https://restcountries.com/v3.1/alpha/${myCountry}`)
      .then(res => res.json())
      .then(result => {
        myFullCountry = result[0]?.name?.common || myCountry;
        connectToStranger();
      })
      .catch(() => connectToStranger());
  });

function connectToStranger() {
  status.textContent = "Looking for a stranger...";
  flagDisplay.textContent = "";
  chatBox.innerHTML = "";
  socket.emit("findPartner", {
    country: myFullCountry,
    flag: myFlag
  });
}

function appendMessage(type, msg) {
  const div = document.createElement("div");
  div.className = type;
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit("message", msg);
  appendMessage("you", `You: ${msg}`);
  input.value = "";
  socket.emit("stopTyping");
}

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing");
});
input.addEventListener("keyup", () => {
  if (input.value.trim() === "") socket.emit("stopTyping");
});

socket.on("partnerFound", (userData) => {
  status.textContent = `Stranger connected from ${userData.country} ${userData.flag}`;
  flagDisplay.textContent = `${userData.flag}`;
});

socket.on("partnerDisconnected", () => {
  appendMessage("system", "Stranger disconnected.");
  status.textContent = "Stranger disconnected. Click Next to chat again.";
});

socket.on("message", (msg) => appendMessage("stranger", `Stranger: ${msg}`));
socket.on("typing", () => status.textContent = "Stranger is typing...");
socket.on("stopTyping", () => status.textContent = "Stranger connected.");
socket.on("updateUserCount", (count) => {
  onlineCount.textContent = `${count}+ online`;
});

nextBtn.onclick = () => {
  socket.emit("disconnectPartner");
  connectToStranger();
};

themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  themeToggle.textContent = document.body.classList.contains("light") ? "🌙" : "☀️";
};
