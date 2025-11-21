// Test Interface for SamaCV
class ChatInterface {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.imageBtn = document.getElementById('image-btn');
        this.imageInput = document.getElementById('image-input');
        this.resetBtn = document.getElementById('reset-btn');
        this.sessionStatus = document.getElementById('session-status');
        this.debugInfo = document.getElementById('debug-info');

        // Use a consistent test phone number
        this.phoneNumber = 'test-' + Date.now();

        this.init();
    }

    init() {
        // Event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.imageBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.resetBtn.addEventListener('click', () => this.resetSession());

        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.dataset.message;
                this.messageInput.value = message;
                this.sendMessage();
            });
        });

        // Welcome message
        this.addBotMessage('Welcome to SamaCV Test Interface! Type "start" to begin creating your CV.');
        this.updateDebug({ status: 'Ready', phoneNumber: this.phoneNumber });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Disable input while processing
        this.messageInput.disabled = true;
        this.sendBtn.disabled = true;

        // Add user message to chat
        this.addUserMessage(message);
        this.messageInput.value = '';

        // Show typing indicator
        const typingId = this.showTyping();

        try {
            // Send to webhook with 60 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch('/api/webhook/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    waId: this.phoneNumber,
                    text: message,
                    id: 'test-msg-' + Date.now(),
                    type: 'text',
                    timestamp: Date.now()
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove typing indicator
            this.removeTyping(typingId);

            // Update debug info
            this.updateDebug({
                lastMessage: message,
                response: data,
                timestamp: new Date().toLocaleTimeString()
            });

            // Update session status
            this.updateSessionStatus(data);

            // Poll for bot messages from backend (test mode) - retry multiple times
            let attempts = 0;
            const maxAttempts = 20; // Poll for up to 10 seconds
            const pollInterval = setInterval(async () => {
                attempts++;
                const hadMessages = await this.pollBotMessages();

                // Stop polling if we got messages or reached max attempts
                if (hadMessages || attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                }
            }, 500);

        } catch (error) {
            this.removeTyping(typingId);
            let errorMessage = 'Sorry, an error occurred. ';
            if (error.name === 'AbortError') {
                errorMessage += 'The request took too long. Please try again with a shorter message.';
            } else {
                errorMessage += error.message;
            }
            this.addBotMessage(errorMessage);
            this.updateDebug({ error: error.message, errorName: error.name });
        } finally {
            // Re-enable input
            this.messageInput.disabled = false;
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        // Disable input while processing
        this.imageBtn.disabled = true;
        this.sendBtn.disabled = true;
        this.messageInput.disabled = true;

        // Add user message showing image upload
        this.addUserMessage('📷 Image uploaded');

        // Show typing indicator
        const typingId = this.showTyping();

        try {
            // Convert image to base64
            const base64 = await this.fileToBase64(file);

            // Send to webhook as image type
            const response = await fetch('/api/webhook/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    waId: this.phoneNumber,
                    type: 'image',
                    mediaId: 'test-image-' + Date.now(),
                    mediaUrl: base64, // Send base64 as mediaUrl for testing
                    id: 'test-msg-' + Date.now(),
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove typing indicator
            this.removeTyping(typingId);

            // Update debug info
            this.updateDebug({
                lastAction: 'Image Upload',
                fileName: file.name,
                fileSize: file.size,
                response: data,
                timestamp: new Date().toLocaleTimeString()
            });

            // Poll for bot messages
            let attempts = 0;
            const maxAttempts = 20;
            const pollInterval = setInterval(async () => {
                attempts++;
                const hadMessages = await this.pollBotMessages();
                if (hadMessages || attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                }
            }, 500);

        } catch (error) {
            this.removeTyping(typingId);
            this.addBotMessage('Sorry, an error occurred while uploading the image. Please try again.');
            this.updateDebug({ error: error.message });
        } finally {
            // Re-enable input
            this.imageBtn.disabled = false;
            this.sendBtn.disabled = false;
            this.messageInput.disabled = false;
            // Reset file input
            this.imageInput.value = '';
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async pollBotMessages() {
        try {
            const response = await fetch('/api/webhook/test/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: this.phoneNumber
                })
            });

            const data = await response.json();

            if (data.messages && data.messages.length > 0) {
                // Display each message from the bot
                for (const msg of data.messages) {
                    this.addBotMessage(msg.text);
                    await new Promise(resolve => setTimeout(resolve, 300)); // Small delay between messages
                }
                return true; // Messages found
            }
            return false; // No messages
        } catch (error) {
            console.error('Error polling bot messages:', error);
            return false;
        }
    }

    simulateBotResponse(userMessage) {
        const lower = userMessage.toLowerCase();

        // Simulate different bot responses based on conversation flow
        if (lower.includes('start') || lower.includes('hello') || lower.includes('hi')) {
            this.addBotMessage("Welcome to the CV Generator! 👋\n\nI'll help you create a professional CV in minutes.\n\nLet's start by choosing your preferred language.");
            setTimeout(() => {
                this.addBotMessage("Please select your preferred language:\n1. English\n2. Français\n3. Español");
            }, 500);
        }
        else if (lower.includes('english') || lower.includes('1')) {
            this.addBotMessage("Great! Let's start with your personal information.\n\nPlease provide:\n- Full Name\n- Email\n- Phone Number\n- City and Country\n\nYou can send it all in one message or separately.");
        }
        else if (lower.includes('@') && lower.includes(',')) {
            this.addBotMessage("✅ Personal information saved!\n\nNow let's add your work experience.\n\nFor each position, please provide:\n- Company name\n- Job title\n- Start date and end date (or 'current')\n- Brief description of your responsibilities\n\nSend 'done' when you've added all your work experiences.");
        }
        else if (lower.includes('done')) {
            this.addBotMessage("Great! Now let's add your education.\n\nFor each degree/certification, provide:\n- Institution name\n- Degree/Certification\n- Field of study\n- Graduation year (or 'current')\n\nSend 'done' when finished, or 'skip' if you want to skip this section.");
        }
        else if (lower.includes('skip')) {
            this.addBotMessage("Perfect! Now let's add your skills.\n\nList your key skills separated by commas.\nFor example: 'JavaScript, Python, Project Management, Communication'");
        }
        else {
            this.addBotMessage("Message received and processed! ✅\n\n(Check the Debug panel below for details)");
        }
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.escapeHtml(text)}
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.escapeHtml(text).replace(/\n/g, '<br>')}
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTyping() {
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = typingId;
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span class="loading"></span>
                <span class="loading"></span>
                <span class="loading"></span>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
        return typingId;
    }

    removeTyping(typingId) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
    }

    updateSessionStatus(data) {
        if (data.status === 'processed') {
            this.sessionStatus.textContent = 'Active';
            this.sessionStatus.className = 'status-badge active';
        }
    }

    updateDebug(info) {
        const debugText = JSON.stringify(info, null, 2);
        this.debugInfo.textContent = debugText;
    }

    resetSession() {
        if (confirm('Are you sure you want to reset the session?')) {
            this.phoneNumber = 'test-' + Date.now();
            this.messagesContainer.innerHTML = '';
            this.sessionStatus.textContent = 'Not Started';
            this.sessionStatus.className = 'status-badge';
            this.addBotMessage('Session reset! Type "start" to begin a new CV creation process.');
            this.updateDebug({ status: 'Reset', phoneNumber: this.phoneNumber });
            document.getElementById('phone-number').textContent = 'Phone: ' + this.phoneNumber;
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
});
