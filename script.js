// script.js: Production-grade StudyBuddy Chat Logic

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const input      = document.getElementById('chat-input');
  const sendBtn    = document.getElementById('send-btn');
  const voiceBtn   = document.getElementById('voice-btn');
  const themeBtn   = document.getElementById('theme-btn');
  const deleteBtn  = document.getElementById('delete-btn');
  const container  = document.querySelector('.chat-container');

  // Chat history & rate limiting
  let history = JSON.parse(localStorage.getItem('chat-history')) || [];
  const RATE_LIMIT_MS = 3000;
  let lastRequest = 0;

  // Initialize theme
  function applyTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    const isLight = saved === 'light';
    document.body.classList.toggle('light-mode', isLight);
    themeBtn.textContent = isLight ? 'dark_mode' : 'light_mode';
  }

  // Render existing chats
  function loadChats() {
    container.innerHTML = '';
    if (history.length) {
      history.forEach(({ role, content }) => addBubble(role, content));
    } else {
      container.innerHTML = `<div class="default-text">
        <h1>Welcome to StudyBuddy</h1>
        <p>Your AI-powered study companion.</p>
      </div>`;
    }
    container.scrollTop = container.scrollHeight;
  }

  // Speech Recognition
  let recognition;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    voiceBtn.addEventListener('click', () => {
      recognition.start();
      voiceBtn.classList.add('listening');
    });

    recognition.addEventListener('result', e => {
      input.value = e.results[0][0].transcript;
      recognition.stop();
      voiceBtn.classList.remove('listening');
      sendMessage();
    });
    recognition.addEventListener('end', () => voiceBtn.classList.remove('listening'));
  } else {
    voiceBtn.style.display = 'none';
  }

  // Speech Synthesis
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    speechSynthesis.speak(utter);
  }

  // UI: Add chat bubble
  function addBubble(role, text) {
    const div = document.createElement('div');
    div.className = `chat ${role}`;
    div.innerHTML = `
      <div class="content">
        <img src="images/${role}.jpg" alt="${role}">
        <div class="message">${text}</div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // Save history
  function saveHistory() {
    localStorage.setItem('chat-history', JSON.stringify(history));
  }

  // Hardcoded responses
  const hardcoded = {
    'what is studybuddy': 'StudyBuddy is your AI study companion that helps you learn effectively!',
    'hello': 'Hello! What would you like to study today?',
    'thank you': 'You’re welcome! Happy to help!'
  };

  // Model routing: choose GPT-4o for complex, GPT-4o-mini for simple
  function selectModel(text) {
    const simple = text.length < 30;
    const complexKeywords = ['explain', 'compare', 'summarize', 'analysis', 'detail'];
    const hasComplex = complexKeywords.some(k => text.toLowerCase().includes(k));
    return (!simple || hasComplex) ? 'gpt-4o' : 'gpt-4o-mini';
  }

  // Core send logic
  async function sendMessage() {
    const now = Date.now();
    if (now - lastRequest < RATE_LIMIT_MS) {
      alert('Please wait a moment before next message.');
      return;
    }
    lastRequest = now;

    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    // Display user
    addBubble('outgoing', text);
    history.push({ role: 'user', content: text });
    saveHistory();

    // Check hardcoded
    const key = text.toLowerCase();
    if (hardcoded[key]) {
      const reply = hardcoded[key];
      addBubble('incoming', reply);
      history.push({ role: 'assistant', content: reply });
      saveHistory();
      speak(reply);
      return;
    }

    // Loading placeholder
    addBubble('incoming', '<em>Loading...</em>');

    // Select model and call API
    const model = selectModel(text);
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: history })
      });
      if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
      const { choices } = await res.json();
      const reply = choices[0].message.content.trim();

      // Update latest bubble
      const last = container.lastChild;
      last.querySelector('.message').textContent = reply;

      history.push({ role: 'assistant', content: reply });
      saveHistory();
      speak(reply);
    } catch (err) {
      const last = container.lastChild;
      last.querySelector('.message').textContent = 'Error: ' + err.message;
    }
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  themeBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyTheme();
  });

  deleteBtn.addEventListener('click', () => {
    if (confirm('Clear all chats?')) {
      history = [];
      saveHistory();
      container.innerHTML = '';
      loadChats();
    }
  });

  // Initialize
  applyTheme();
  loadChats();
});
