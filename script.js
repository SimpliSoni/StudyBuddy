// StudyBuddy with Voice & Hardcoded Responses

window.addEventListener("DOMContentLoaded", () => {
  const chatInput       = document.querySelector("#chat-input");
  const sendButton      = document.querySelector("#send-btn");
  const chatContainer   = document.querySelector(".chat-container");
  const themeButton     = document.querySelector("#theme-btn");
  const deleteButton    = document.querySelector("#delete-btn");
  const voiceBtn        = document.querySelector("#voice-btn");

  let userText = null;
  let chatHistory = [];
  const API_URL = "/api/proxy";

  // Hardcoded responses
  const hardcodedResponses = {
    "what is studybuddy": "StudyBuddy is your AI-powered learning companion that helps you study smarter, not harder!",
    "who created you": "I was built by a team of developers and AI researchers to support student learning.",
    "hello": "Hi there! Ready to learn something new today?",
    "how are you": "I'm just lines of code, but I'm always ready to help!",
    "thank you": "You're welcome! 😊"
  };

  // Speech recognition
  let recognition;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener('click', () => {
      recognition.start();
      voiceBtn.classList.add('listening');
    });

    recognition.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      handleOutgoingChat();
    });

    recognition.addEventListener('end', () => {
      voiceBtn.classList.remove('listening');
    });
  } else {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Speech Recognition not supported';
  }

  // Speech synthesis
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  }

  const loadDataFromLocalStorage = () => {
    const themeColor = localStorage.getItem("themeColor");
    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";

    const savedChats = localStorage.getItem("all-chats");
    chatContainer.innerHTML = savedChats || `
      <div class="default-text">
        <h1>StudyBuddy Prototype</h1>
        <p>Learn with your study companion.<br> Your chat history will be displayed here.</p>
      </div>`;

    chatHistory = JSON.parse(localStorage.getItem("chat-history")) || [];
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  };

  const createChatElement = (content, className) => {
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv;
  };

  const getChatResponse = async () => {
    const pElement = document.createElement("p");
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    };

    try {
      const response = await fetch(API_URL, requestOptions);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'An unknown error occurred');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      const html = `
        <div class="chat-content">
          <div class="chat-details">
            <img src="images/chatbot.jpg" alt="chatbot">
            <div class="message-content"></div>
          </div>
        </div>`;
      const incomingChatDiv = createChatElement(html, "incoming");
      const messageContent = incomingChatDiv.querySelector(".message-content");
      messageContent.appendChild(pElement);
      chatContainer.querySelector(".typing-animation")?.remove();
      chatContainer.appendChild(incomingChatDiv);
      chatContainer.scrollTo(0, chatContainer.scrollHeight);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data.trim() === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                fullResponse += content;
                pElement.textContent = fullResponse;
                chatContainer.scrollTo(0, chatContainer.scrollHeight);
              }
            } catch (e) {}
          }
        }
      }

      speak(fullResponse);
      chatHistory.push({ role: "assistant", content: fullResponse });
      localStorage.setItem("all-chats", chatContainer.innerHTML);
      localStorage.setItem("chat-history", JSON.stringify(chatHistory));
    } catch (error) {
      console.error(error);
      const errorPara = document.createElement("p");
      errorPara.classList.add("error");
      errorPara.textContent = `Error: ${error.message}`;
      const typingDiv = chatContainer.querySelector(".typing-animation")?.parentElement.parentElement.parentElement;
      if (typingDiv) {
        typingDiv.innerHTML = `<div class="chat-details"><img src="images/chatbot.jpg" alt="chatbot">${errorPara.outerHTML}</div>`;
      }
      localStorage.setItem("all-chats", chatContainer.innerHTML);
    }
  };

  const showTypingAnimation = () => {
    const html = `
      <div class="chat-content">
        <div class="chat-details">
          <img src="images/chatbot.jpg" alt="chatbot">
          <div class="typing-animation">
            <div class="typing-dot" style="--delay:0.2s"></div>
            <div class="typing-dot" style="--delay:0.3s"></div>
            <div class="typing-dot" style="--delay:0.4s"></div>
          </div>
        </div>
      </div>`;
    const incomingChatDiv = createChatElement(html, "incoming");
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse();
  };

  const handleOutgoingChat = () => {
    userText = chatInput.value.trim();
    if (!userText) return;

    chatInput.value = "";
    chatInput.style.height = `${initialInputHeight}px`;
    chatHistory.push({ role: "user", content: userText });

    const html = `
      <div class="chat-content">
        <div class="chat-details">
          <img src="images/user.jpg" alt="user">
          <p>${userText}</p>
        </div>
      </div>`;
    chatContainer.querySelector(".default-text")?.remove();
    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    localStorage.setItem("all-chats", chatContainer.innerHTML);
    localStorage.setItem("chat-history", JSON.stringify(chatHistory));

    const lowerCaseText = userText.toLowerCase().trim();
    if (hardcodedResponses[lowerCaseText]) {
      const response = hardcodedResponses[lowerCaseText];
      const html = `
        <div class="chat-content">
          <div class="chat-details">
            <img src="images/chatbot.jpg" alt="chatbot">
            <p>${response}</p>
          </div>
        </div>`;
      const incomingChatDiv = createChatElement(html, "incoming");
      chatContainer.appendChild(incomingChatDiv);
      chatContainer.scrollTo(0, chatContainer.scrollHeight);
      speak(response);
      chatHistory.push({ role: "assistant", content: response });
      localStorage.setItem("all-chats", chatContainer.innerHTML);
      localStorage.setItem("chat-history", JSON.stringify(chatHistory));
    } else {
      setTimeout(showTypingAnimation, 500);
    }
  };

  deleteButton.addEventListener("click", () => {
    if (confirm("Delete all chats?")) {
      localStorage.removeItem("all-chats");
      localStorage.removeItem("chat-history");
      loadDataFromLocalStorage();
    }
  });

  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLightMode = document.body.classList.contains("light-mode");
    themeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
    localStorage.setItem("themeColor", themeButton.innerText);
  });

  const initialInputHeight = chatInput.scrollHeight;
  chatInput.addEventListener("input", () => {
    chatInput.style.height = `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOutgoingChat();
    }
  });

  loadDataFromLocalStorage();
  sendButton.addEventListener("click", handleOutgoingChat);
});