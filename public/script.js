const socket = io();

let isTyping = false;
let typingTimeout;

const chatBox = document.getElementById('chat-box');
const status = document.getElementById('status');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const nextBtn = document.getElementById('next');
const onlineCount = document.getElementById('online-count');

// Add messages to chat
function addMessage(type, text) {
  const msg = document.createElement('div');
  msg.className = type;
  msg.innerText = `${type === 'you' ? 'You' : type === 'stranger' ? 'Stranger' : ''}${type !== 'system' ? ': ' : ''}${text}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Show connection status
function setStatus(html) {
  status.innerHTML = `🍌 <strong>${html}</strong>`;
}

// Show typing
function showTyping() {
  if (!document.getElementById('typing-indicator')) {
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'system';
    typing.innerText = 'Stranger is typing...';
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Hide typing
function hideTyping() {
  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();
}

// Send message
sendBtn.onclick = () => {
  const msg = msgInput.value.trim();
  if (msg === '') return;

  addMessage('you', msg);
  socket.emit('message', msg);
  msgInput.value = '';
  hideTyping();
};

// Press Enter to send
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    sendBtn.click();
  } else {
    if (!isTyping) {
      socket.emit('typing');
      isTyping = true;
      typingTimeout = setTimeout(() => {
        isTyping = false;
      }, 3000);
    }
  }
});

// Next button
nextBtn.onclick = () => {
  chatBox.innerHTML = '';
  msgInput.value = '';
  setStatus('Searching for a new stranger...');
  socket.emit('next');
};

// ✅ Handle partner found with country & flag
socket.on('partner-found', ({ country, code }) => {
  const flagURL = code ? `https://flagcdn.com/24x18/${code.toLowerCase()}.png` : '';
  const countryLabel = country ? ` (${country})` : '';
  const flagImg = flagURL ? `<img src="${flagURL}" alt="${code}" style="margin-left:6px;vertical-align:middle;" />` : '';
  setStatus(`Stranger connected!${countryLabel}${flagImg}`);
});

// Stranger disconnected
socket.on('partner-disconnected', () => {
  addMessage('system', 'Stranger disconnected.');
  setStatus('Searching for a new stranger...');
});

// Receive message
socket.on('message', msg => {
  hideTyping();
  addMessage('stranger', msg);
});

// Typing signal
socket.on('typing', () => {
  showTyping();
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    hideTyping();
  }, 3000);
});

// ✅ Online users update
socket.on('onlineCount', (count) => {
  console.log("🟡 Online users:", count);
  if (onlineCount) {
    onlineCount.innerText = `👥 ${count}+`;
  }
});
