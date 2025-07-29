window.addEventListener("DOMContentLoaded", () => {
  const chatInput       = document.querySelector("#chat-input");
  const sendButton      = document.querySelector("#send-btn");
  const chatContainer   = document.querySelector(".chat-container");
  const themeButton     = document.querySelector("#theme-btn");
  const deleteButton    = document.querySelector("#delete-btn");

  let userText = null;
  let chatHistory = [];

  // The API URL now points to your secure Vercel proxy function.
  const API_URL = "/api/proxy";

  const loadDataFromLocalStorage = () => {
    // Load theme
    const themeColor = localStorage.getItem("themeColor");
    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";

    // Load chat history
    const savedChats = localStorage.getItem("all-chats");
    chatContainer.innerHTML = savedChats || `
      <div class="default-text">
        <h1>StudyBuddy Prototype</h1>
        <p>Learn with your study companion.<br> Your chat history will be displayed here.</p>
      </div>`;
    
    // Load message history for API calls
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

    // The fetch request is now simpler. It sends only the chat history to your proxy.
    // No API key or Authorization header is needed on the frontend anymore.
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
      })
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

      // Append the new incoming chat bubble to the DOM
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
      
      // Read the stream from the proxy
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data.trim() === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                fullResponse += content;
                pElement.textContent = fullResponse;
                chatContainer.scrollTo(0, chatContainer.scrollHeight);
              }
            } catch (e) {
                // Ignore parsing errors for incomplete JSON chunks
            }
          }
        }
      }
      // Add the full assistant response to the history
      chatHistory.push({ role: "assistant", content: fullResponse });
      localStorage.setItem("all-chats", chatContainer.innerHTML);
      localStorage.setItem("chat-history", JSON.stringify(chatHistory));

    } catch (error) {
      console.error(error);
      const errorPara = document.createElement("p");
      errorPara.classList.add("error");
      errorPara.textContent = `Error: ${error.message}`;
      // Replace typing animation with error message
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

    // Add user message to history
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
    
    // Save state before getting response
    localStorage.setItem("all-chats", chatContainer.innerHTML);
    localStorage.setItem("chat-history", JSON.stringify(chatHistory));

    setTimeout(showTypingAnimation, 500);
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