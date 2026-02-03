// Connect to SocketIO server
const socket = io();

// DOM elements
const welcomeWrapper = document.getElementById('welcome-container');
const chatHeader = document.getElementById('chat-header');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const messageForm = document.getElementById('message-form');
const newStoryBtn = document.getElementById('new-story-btn');
const createStoryBtn = document.getElementById('create-story-btn');
const createStoryContainer = document.getElementById('create-story-container');
const storyList = document.getElementById('story-list');
const createStoryForm = document.getElementById('create-story-form');
const exportButton = document.getElementById('export-button');
const modelSelect = document.getElementById('model-select');
const modelSelectMeasure = document.getElementById('model-select-measure');
const modelSelectInline = document.getElementById('model-select-inline');
const systemSelect = document.getElementById('system-select');
const systemSelectMeasure = document.getElementById('system-select-measure');

// Store conversation history
let conversationHistory = [];

// Variables for managing the narrator's message state
let currentNarratorMessageElement = null;
let currentThinkingElement = null;
let currentStory = null;
let lastNarratorMessageElement = null;

// Track tool calls and thinking for the current assistant turn
let currentTurnToolCalls = [];
let currentTurnThinking = '';
let isToolCallInProgress = false;
let isThinkingInProgress = false;

// Story selection
if (storyList) {
    storyList.addEventListener('click', function(e) {
        let storyItem = e.target.closest('.story-item');
        if (storyItem) {
            let storyTitle = storyItem.getAttribute('data-story');
            console.log('Selected story:', storyTitle);
            const modelName = modelSelect ? modelSelect.value : undefined;
            socket.emit('select_story', { "selected_story": storyTitle, "model_name": modelName });
            // Clear chat history when switching stories
            if (document.getElementById('current-story-title')) {
                document.getElementById('current-story-title').textContent = storyTitle;
            }
            if (chatHistory) {
                chatHistory.innerHTML = '';
            }
            // Hide welcome wrapper and show chat wrapper
            if (welcomeWrapper) {
                welcomeWrapper.style.display = 'none';
            }
            if (chatHeader) {
                chatHeader.style.display = 'flex';
            }
            showTypingIndicator();
            if (modelSelect) modelSelect.disabled = true; // lock immediately; backend will confirm actual model
            if (systemSelect) systemSelect.disabled = true; // lock immediately; backend will confirm actual system
            if (modelSelectInline) modelSelectInline.style.paddingTop = '0'; // tuck it under title without extra gap
        }
    });
}
// When backend confirms/locks a model and system for this story, reflect it in the UI
socket.on('story_locked', function(data) {
    console.log('Story locked with data:', data);
    
    if (modelSelect && data && data.model_name) {
        // Temporarily enable to ensure value change works
        modelSelect.disabled = false;
        modelSelect.value = data.model_name;
        modelSelect.disabled = true;
        if (modelSelectInline) modelSelectInline.style.paddingTop = '0';
        // Update width after setting value
        if (modelSelectMeasure) {
            const selectedText = modelSelect.options[modelSelect.selectedIndex]?.text || '';
            modelSelectMeasure.textContent = selectedText;
            const computed = window.getComputedStyle(modelSelect);
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingRight = parseFloat(computed.paddingRight) || 0;
            const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
            const borderRight = parseFloat(computed.borderRightWidth) || 0;
            const extra = paddingLeft + paddingRight + borderLeft + borderRight + 12;
            modelSelect.style.width = (modelSelectMeasure.offsetWidth + extra) + 'px';
        }
        console.log('Model select updated to:', modelSelect.value);
    }
    if (systemSelect && data && data.system_name) {
        // Temporarily enable to ensure value change works
        systemSelect.disabled = false;
        systemSelect.value = data.system_name;
        systemSelect.disabled = true;
        // Update width after setting value
        if (systemSelectMeasure) {
            const selectedText = systemSelect.options[systemSelect.selectedIndex]?.text || '';
            systemSelectMeasure.textContent = selectedText;
            const computed = window.getComputedStyle(systemSelect);
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingRight = parseFloat(computed.paddingRight) || 0;
            const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
            const borderRight = parseFloat(computed.borderRightWidth) || 0;
            const extra = paddingLeft + paddingRight + borderLeft + borderRight + 12;
            systemSelect.style.width = (systemSelectMeasure.offsetWidth + extra) + 'px';
        }
        console.log('System select updated to:', systemSelect.value);
    }
});


// New story button
if (newStoryBtn) {
    newStoryBtn.addEventListener('click', function() {
        const wasActive = createStoryContainer.classList.contains('active');
        createStoryContainer.classList.toggle('active');
        
        // Focus the input field when opening the create story form
        if (!wasActive && createStoryContainer.classList.contains('active')) {
            const newStoryInput = document.getElementById('new_story_name');
            if (newStoryInput) {
                setTimeout(() => newStoryInput.focus(), 0);
            }
        }
    });
}

if (createStoryBtn) {
    createStoryBtn.addEventListener('click', function() {
        //e.preventDefault();
        new_story_name = document.getElementById('new_story_name').value;
        const modelName = modelSelect ? modelSelect.value : 'openai/gpt-5';
        const systemName = systemSelect ? systemSelect.value : 'hp';
        createStoryContainer.classList.remove('active');
        socket.emit('create_story', { 
            story_name: new_story_name,
            model_name: modelName,
            system_name: systemName
        });
        createStoryContainer.classList.remove('active');
        addNewStory({ story_name: new_story_name });
    });
}

// Event listeners for messaging
if (messageForm) {
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
        //if (true) {
            socket.emit('user_message', { message });
            userInput.value = '';

            addUserMessage(message);
            conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            scrollToBottom()
        }
    });
}

socket.on('conversation_history', function(history) {
    console.log('Loading conversation history:', history);
    
    // Clear existing conversation history in UI
    conversationHistory = [];
    
    // Queue to match tool_use with tool_result in order
    let pendingToolUses = [];
    
    history.forEach(function(message) {
        if (message.type === 'user') {
            if (message.content != "<|begin_conversation|>") {
                addUserMessage(message.content, false);
            } else {
                addUserMessage(message.content);
            }
        } else if (message.type == "tool_result") {
            // Match with the corresponding tool_use from the queue
            const toolUse = pendingToolUses.shift();
            if (toolUse) {
                const tool_call = {
                    tools: [{
                        name: toolUse.name,
                        inputs: toolUse.input,
                        result: message.content
                    }]
                };
                addToolUseToHistory(tool_call);
            }
        } else if (message.type === 'assistant') {
            console.log(message);
            addAssistantMessageFromHistory(message.content);
        } else if (message.type == "tool_use") {
            // Queue the tool use to match with its result later
            pendingToolUses.push({
                name: message.name,
                input: message.input
            });
        } else if (message.type == "thinking") {
            addThinkingFromHistory(message.content);
        } else {
            console.warn('Unknown message type:', message.type);
        }
        
        conversationHistory.push({
            role: message.type,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString()
        });
    });
    
    scrollToBottom();
});

socket.on('assistant_ready', function() {
    hideTypingIndicator();
    //accumulatedContent = '';
    //currentNarratorMessageElement = null;
});

socket.on('think_start', function() {
    console.log('Model started thinking');
    isThinkingInProgress = true;
    currentTurnThinking = '';
});

socket.on('think_output', function(data) {
    currentTurnThinking += data.text;
    scrollToBottom();
});

socket.on('text_start', function() {
    console.log('Narrator switched to outputting text');
    isThinkingInProgress = false;
    
    // If we're not retrying (currentNarratorMessageElement is null), create a new message element
    if (!currentNarratorMessageElement) {
        // Create wrapper for side buttons + message
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'assistant-turn-wrapper';
        
        // Create side buttons container
        const sideButtons = document.createElement('div');
        sideButtons.className = 'assistant-side-buttons';
        
        // Add thinking button if we have thinking content
        if (currentTurnThinking) {
            const thinkingBtn = createThinkingButton(currentTurnThinking, false);
            sideButtons.appendChild(thinkingBtn);
        }
        
        // Split tool calls into dice rolls and other tools
        const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
        
        // Add dice button if we have dice rolls
        if (diceRolls.length > 0) {
            const diceBtn = createDiceButton(diceRolls, false);
            sideButtons.appendChild(diceBtn);
        }
        
        // Add tool calls button if we have other tool calls
        if (otherTools.length > 0) {
            const toolBtn = createToolButton(otherTools, false);
            sideButtons.appendChild(toolBtn);
        }
        
        messageWrapper.appendChild(sideButtons);
        
        currentNarratorMessageElement = document.createElement('div');
        currentNarratorMessageElement.className = 'message narrator-message';
        currentNarratorMessageElement.style.display = 'none'; // Hide until we get content
        
        messageWrapper.appendChild(currentNarratorMessageElement);
        chatHistory.appendChild(messageWrapper);
    } else {
        // Retry case - update side buttons with new thinking/tools
        const wrapper = currentNarratorMessageElement.closest('.assistant-turn-wrapper');
        if (wrapper) {
            const sideButtons = wrapper.querySelector('.assistant-side-buttons');
            if (sideButtons) {
                sideButtons.innerHTML = '';
                
                if (currentTurnThinking) {
                    const thinkingBtn = createThinkingButton(currentTurnThinking, false);
                    sideButtons.appendChild(thinkingBtn);
                }
                
                const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
                
                if (diceRolls.length > 0) {
                    const diceBtn = createDiceButton(diceRolls, false);
                    sideButtons.appendChild(diceBtn);
                }
                
                if (otherTools.length > 0) {
                    const toolBtn = createToolButton(otherTools, false);
                    sideButtons.appendChild(toolBtn);
                }
            }
        }
    }
    
    // Remove any existing retry buttons from previous messages (only show on last message)
    const existingRetryButtons = chatHistory.querySelectorAll('.retry-button');
    existingRetryButtons.forEach(button => {
        const messageActions = button.closest('.message-actions');
        if (messageActions) {
            messageActions.remove();
        }
    });
});

// Store the raw content to avoid extra spaces
let accumulatedContent = '';

// Track the last received timestamp to prevent duplicate/out-of-order chunks
socket.on('text_output', function(data) {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    // Show and update the narrator message
    if (currentNarratorMessageElement) {
        currentNarratorMessageElement.style.display = 'block';
        
        // Accumulate the raw text
        accumulatedContent += data.text;

        // Special processing for narration tags
        // if processedContent has a start narration tag but no end, add a closing tag
        let processedContent = accumulatedContent;
        if (processedContent.includes('<narration>') && !processedContent.includes('</narration>')) {
            processedContent += '</narration>';
        }
        
        // Check if content has narration tags
        if (processedContent.includes('<narration>')) {
            // Parse markdown within narration tags, then wrap in book-narration div
            processedContent = processedContent.replace(/<narration>([\s\S]*?)<\/narration>/g, function(_, narrationContent) {
                // Parse the markdown inside the narration tags
                let parsedMarkdown;
                try {
                    parsedMarkdown = marked.parse(narrationContent);
                } catch (e) {
                    console.error('Error parsing narration markdown:', e);
                    parsedMarkdown = narrationContent;
                }
                return '<div class="book-narration">' + parsedMarkdown + '</div>';
            });
        } else {
            // No narration tags, just parse as regular markdown
            try {
                processedContent = marked.parse(processedContent);
            } catch (e) {
                console.error('Error parsing markdown:', e);
            }
        }
        
        currentNarratorMessageElement.innerHTML = processedContent;
        
    }
});

socket.on('tool_request', function(data) {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    console.log('Tool requested:', data);
    isToolCallInProgress = true;
    accumulatedContent = '';
});

socket.on('tool_submit', function(data) {
    accumulatedContent = '';
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    console.log('Tool submitted:', data);
    isToolCallInProgress = false;
    
    // Collect tool calls for this turn (don't display inline anymore)
    data.tools.forEach(tool => {
        // Parse inputs if it's a JSON string (from history) vs object (from streaming)
        let inputs = tool.inputs;
        if (typeof inputs === 'string') {
            try {
                inputs = JSON.parse(inputs);
            } catch (e) {
                inputs = {};
            }
        }
        
        currentTurnToolCalls.push({
            name: tool.name,
            inputs: inputs,
            result: tool.result
        });
        
        conversationHistory.push({
            role: 'tool',
            name: tool.name,
            inputs: tool.inputs,
            result: tool.result,
            timestamp: new Date().toISOString()
        });
    });
});

function addToolUseToHistory(data) {
    // Used when loading from history - collect tool calls for the message
    data.tools.forEach(tool => {
        let inputs = tool.inputs;
        if (typeof inputs === 'string') {
            try {
                inputs = JSON.parse(inputs);
            } catch (e) {
                inputs = {};
            }
        }
        
        currentTurnToolCalls.push({
            name: tool.name,
            inputs: inputs,
            result: tool.result
        });
    });
}

socket.on('turn_end', function() {
    // Add narrator's complete response to conversation history
    if (currentNarratorMessageElement) {
        conversationHistory.push({
            role: 'assistant',
            content: accumulatedContent,
            timestamp: new Date().toISOString()
        });
        
        // Update/finalize side buttons now that we have the full content
        const wrapper = currentNarratorMessageElement.closest('.assistant-turn-wrapper');
        if (wrapper) {
            const sideButtons = wrapper.querySelector('.assistant-side-buttons');
            if (sideButtons) {
                // Clear and rebuild buttons with final state
                sideButtons.innerHTML = '';
                
                if (currentTurnThinking) {
                    const thinkingBtn = createThinkingButton(currentTurnThinking, false);
                    sideButtons.appendChild(thinkingBtn);
                }
                
                const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
                
                if (diceRolls.length > 0) {
                    const diceBtn = createDiceButton(diceRolls, false);
                    sideButtons.appendChild(diceBtn);
                }
                
                if (otherTools.length > 0) {
                    const toolBtn = createToolButton(otherTools, false);
                    sideButtons.appendChild(toolBtn);
                }
            }
        }
        
        // Store reference to last narrator message for retry functionality
        lastNarratorMessageElement = currentNarratorMessageElement;
        
        // Add retry button to the last narrator message
        addRetryButton(lastNarratorMessageElement);
    }
    
    currentNarratorMessageElement = null;
    currentThinkingElement = null;
    accumulatedContent = '';
    
    // Reset turn tracking
    currentTurnToolCalls = [];
    currentTurnThinking = '';
    isToolCallInProgress = false;
    isThinkingInProgress = false;
    
    // Enable user input
    if (userInput) {
        userInput.disabled = false;
        userInput.focus();
    }
});

function addNewStory(story) {
    const li = document.createElement('li');
    li.className = 'story-item';
    li.setAttribute('data-story', story.story_name);
    const icon = document.createElement('i');
    icon.className = 'fas fa-book';
    const span = document.createElement('span');
    span.textContent = story.story_name;
    li.appendChild(icon);
    li.appendChild(span);
    storyList.appendChild(li);
}

// Helper functions
function addUserMessage(message, disableInput = true) {
    if (!chatHistory) return;
    
    // Create container div for message alignment
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message';
    messageContainer.style.display = 'flex';
    messageContainer.style.justifyContent = 'flex-end';
    
    // Create the actual message element
    const messageElement = document.createElement('div');
    messageElement.className = 'user-message';
    messageElement.textContent = message;
    
    // Add message to container, then container to chat
    messageContainer.appendChild(messageElement);
    chatHistory.appendChild(messageContainer);
    
    // Disable input while waiting for response (unless loading from history)
    if (disableInput && userInput) {
        userInput.disabled = true;
    }
}

function addThinkingFromHistory(thinkingContent) {
    // Collect thinking for the current turn - will be displayed with the assistant message
    currentTurnThinking = thinkingContent;
}

function addAssistantMessageFromHistory(content) {
    if (!chatHistory) return;
    
    // Create wrapper for side buttons + message
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'assistant-turn-wrapper';
    
    // Create side buttons container
    const sideButtons = document.createElement('div');
    sideButtons.className = 'assistant-side-buttons';
    
    // Add thinking button if we have thinking content
    if (currentTurnThinking) {
        const thinkingBtn = createThinkingButton(currentTurnThinking, false);
        sideButtons.appendChild(thinkingBtn);
    }
    
    // Split tool calls into dice rolls and other tools
    const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
    
    // Add dice button if we have dice rolls
    if (diceRolls.length > 0) {
        const diceBtn = createDiceButton(diceRolls, false);
        sideButtons.appendChild(diceBtn);
    }
    
    // Add tool calls button if we have other tool calls
    if (otherTools.length > 0) {
        const toolBtn = createToolButton(otherTools, false);
        sideButtons.appendChild(toolBtn);
    }
    
    messageWrapper.appendChild(sideButtons);
    
    // Create narrator message element
    const narratorMessageElement = document.createElement('div');
    narratorMessageElement.className = 'message narrator-message';
    
    // Process narration tags - parse markdown FIRST, then wrap
    let processedContent = content;
    
    // Check if content has narration tags
    if (processedContent.includes('<narration>')) {
        // Parse markdown within narration tags, then wrap in book-narration div
        processedContent = processedContent.replace(/<narration>([\s\S]*?)<\/narration>/g, function(_, narrationContent) {
            // Parse the markdown inside the narration tags
            let parsedMarkdown;
            try {
                parsedMarkdown = marked.parse(narrationContent);
            } catch (e) {
                console.error('Error parsing narration markdown:', e);
                parsedMarkdown = narrationContent;
            }
            return '<div class="book-narration">' + parsedMarkdown + '</div>';
        });
    } else {
        // No narration tags, just parse as regular markdown
        try {
            processedContent = marked.parse(processedContent);
        } catch (e) {
            console.error('Error parsing markdown:', e);
        }
    }
    
    narratorMessageElement.innerHTML = processedContent;
    
    messageWrapper.appendChild(narratorMessageElement);
    chatHistory.appendChild(messageWrapper);
    
    // Reset turn tracking after adding the message
    currentTurnToolCalls = [];
    currentTurnThinking = '';
}

// Export conversation history to console
function exportConversation() {
    console.log('Conversation History:');
    console.log(JSON.stringify(conversationHistory, null, 2));
}

function showTypingIndicator() {
    if (chatHistory) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatHistory.appendChild(typingIndicator);
    }
}
function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function addRetryButton(messageElement) {
    // Don't add retry button if one already exists
    if (messageElement.querySelector('.retry-button')) {
        return;
    }
    
    // Create retry button container
    const retryContainer = document.createElement('div');
    retryContainer.className = 'message-actions';
    
    // Create retry button
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.innerHTML = '<i class="fas fa-redo"></i>';
    retryButton.title = 'Retry this response';
    
    // Add click handler
    retryButton.addEventListener('click', function() {
        handleRetryResponse(messageElement, retryButton);
    });
    
    retryContainer.appendChild(retryButton);
    messageElement.appendChild(retryContainer);
}

function handleRetryResponse(messageElement, retryButton) {
    // Disable retry button during retry
    retryButton.disabled = true;
    retryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Disable user input
    if (userInput) {
        userInput.disabled = true;
    }
    
    // Remove the last assistant message from conversation history (will be replaced)
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
        conversationHistory.pop();
    }
    
    // Clear side buttons from wrapper
    const wrapper = messageElement.closest('.assistant-turn-wrapper');
    if (wrapper) {
        const sideButtons = wrapper.querySelector('.assistant-side-buttons');
        if (sideButtons) {
            sideButtons.innerHTML = '';
        }
    }
    
    // Remove current message content but keep the container
    const messageActions = messageElement.querySelector('.message-actions');
    messageElement.innerHTML = '';
    if (messageActions) {
        messageElement.appendChild(messageActions);
    }
    
    // Set as current narrator message element for new content
    currentNarratorMessageElement = messageElement;
    accumulatedContent = '';
    
    // Reset turn tracking for retry
    currentTurnToolCalls = [];
    currentTurnThinking = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Request retry from server
    socket.emit('retry_last_response');
}

function scrollToBottom() {
    if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

// Position popup relative to button (for fixed positioning)
function positionPopup(button, popup) {
    const rect = button.getBoundingClientRect();
    const popupWidth = popup.offsetWidth || 350;
    
    // Position to the left of the button
    popup.style.top = rect.top + 'px';
    popup.style.left = (rect.left - popupWidth - 8) + 'px';
}

// Setup hover and click behavior for popup
function setupPopupBehavior(container, button, popup) {
    let hoverTimeout = null;
    
    // Position and show on hover
    const showPopup = () => {
        clearTimeout(hoverTimeout);
        positionPopup(button, popup);
        popup.classList.add('visible');
    };
    
    // Hide on mouse leave (unless pinned)
    const hidePopup = () => {
        hoverTimeout = setTimeout(() => {
            if (!popup.classList.contains('pinned')) {
                popup.classList.remove('visible');
            }
        }, 100); // Small delay to allow moving to popup
    };
    
    // Button hover
    container.addEventListener('mouseenter', showPopup);
    container.addEventListener('mouseleave', hidePopup);
    
    // Popup hover (keep visible while scrolling)
    popup.addEventListener('mouseenter', showPopup);
    popup.addEventListener('mouseleave', hidePopup);
    
    // Click to toggle pinned
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isPinned = popup.classList.toggle('pinned');
        button.classList.toggle('pinned', isPinned);
        
        if (isPinned) {
            positionPopup(button, popup);
            popup.classList.add('visible');
        }
    });
    
    // Close pinned popup when clicking outside
    document.addEventListener('click', (e) => {
        if (popup.classList.contains('pinned') && 
            !container.contains(e.target) && 
            !popup.contains(e.target)) {
            popup.classList.remove('pinned', 'visible');
            button.classList.remove('pinned');
        }
    });
    
    // Reposition on chat scroll
    if (chatHistory) {
        chatHistory.addEventListener('scroll', () => {
            if (popup.classList.contains('visible') || popup.classList.contains('pinned')) {
                positionPopup(button, popup);
            }
        });
    }
}

// Create thinking button with hover popup
function createThinkingButton(thinkingContent, isAnimating) {
    const container = document.createElement('div');
    container.className = 'side-button-container';
    
    const button = document.createElement('button');
    button.className = 'side-button thinking-button' + (isAnimating ? ' animating' : '');
    button.innerHTML = '<i class="fas fa-brain"></i>';
    
    const popup = document.createElement('div');
    popup.className = 'side-button-popup thinking-popup';
    
    const popupHeader = document.createElement('div');
    popupHeader.className = 'popup-header';
    popupHeader.innerHTML = '<i class="fas fa-brain"></i> Reasoning';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    popupContent.textContent = thinkingContent;
    
    popup.appendChild(popupHeader);
    popup.appendChild(popupContent);
    container.appendChild(button);
    container.appendChild(popup);
    
    // Setup hover and click behavior
    setupPopupBehavior(container, button, popup);
    
    return container;
}

// Create dice rolls button with hover popup
function createDiceButton(diceRolls, isAnimating) {
    const container = document.createElement('div');
    container.className = 'side-button-container';
    
    const button = document.createElement('button');
    button.className = 'side-button dice-button' + (isAnimating ? ' animating' : '');
    button.innerHTML = '<i class="fas fa-dice-d20"></i>';
    
    const popup = document.createElement('div');
    popup.className = 'side-button-popup dice-popup';
    
    const popupHeader = document.createElement('div');
    popupHeader.className = 'popup-header';
    popupHeader.innerHTML = '<i class="fas fa-dice-d20"></i> Dice Rolls (' + diceRolls.length + ')';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    diceRolls.forEach((roll, index) => {
        const rollItem = document.createElement('div');
        rollItem.className = 'dice-roll-item';
        
        const diceExpr = roll.inputs.dice || roll.inputs.expression || '?';
        rollItem.innerHTML = '<span class="dice-expr">' + escapeHtml(diceExpr) + '</span><span class="dice-arrow">→</span><span class="dice-result">' + escapeHtml(String(roll.result)) + '</span>';
        
        popupContent.appendChild(rollItem);
    });
    
    popup.appendChild(popupHeader);
    popup.appendChild(popupContent);
    container.appendChild(button);
    container.appendChild(popup);
    
    // Setup hover and click behavior
    setupPopupBehavior(container, button, popup);
    
    return container;
}

// Create tool calls button with hover popup (excludes dice rolls)
function createToolButton(toolCalls, isAnimating) {
    const container = document.createElement('div');
    container.className = 'side-button-container';
    
    const button = document.createElement('button');
    button.className = 'side-button tool-button' + (isAnimating ? ' animating' : '');
    button.innerHTML = '<i class="fas fa-wrench"></i>';
    
    const popup = document.createElement('div');
    popup.className = 'side-button-popup tool-popup';
    
    const popupHeader = document.createElement('div');
    popupHeader.className = 'popup-header';
    popupHeader.innerHTML = '<i class="fas fa-wrench"></i> Tool Calls (' + toolCalls.length + ')';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    toolCalls.forEach((tool, index) => {
        const toolItem = document.createElement('div');
        toolItem.className = 'tool-item';
        
        const toolName = document.createElement('div');
        toolName.className = 'tool-name';
        toolName.textContent = tool.name;
        
        const toolDetails = document.createElement('div');
        toolDetails.className = 'tool-details';
        
        // Format inputs
        if (tool.inputs && Object.keys(tool.inputs).length > 0) {
            const inputsDiv = document.createElement('div');
            inputsDiv.className = 'tool-inputs';
            inputsDiv.innerHTML = '<strong>Inputs:</strong> ' + formatToolData(tool.inputs);
            toolDetails.appendChild(inputsDiv);
        }
        
        // Format result
        if (tool.result !== undefined) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'tool-result';
            resultDiv.innerHTML = '<strong>Result:</strong> ' + formatToolData(tool.result);
            toolDetails.appendChild(resultDiv);
        }
        
        toolItem.appendChild(toolName);
        toolItem.appendChild(toolDetails);
        
        popupContent.appendChild(toolItem);
        
        // Add separator between tools
        if (index < toolCalls.length - 1) {
            const separator = document.createElement('hr');
            separator.className = 'tool-separator';
            popupContent.appendChild(separator);
        }
    });
    
    popup.appendChild(popupHeader);
    popup.appendChild(popupContent);
    container.appendChild(button);
    container.appendChild(popup);
    
    // Setup hover and click behavior
    setupPopupBehavior(container, button, popup);
    
    return container;
}

// Helper to split tool calls into dice rolls and other tools
function splitToolCalls(toolCalls) {
    const diceRolls = [];
    const otherTools = [];
    
    toolCalls.forEach(tool => {
        if (tool.name === 'roll_dice') {
            diceRolls.push(tool);
        } else {
            otherTools.push(tool);
        }
    });
    
    return { diceRolls, otherTools };
}

// Helper to format tool data for display
function formatToolData(data) {
    if (typeof data === 'string') {
        // Truncate long strings
        if (data.length > 200) {
            return '<code>' + escapeHtml(data.substring(0, 200)) + '...</code>';
        }
        return '<code>' + escapeHtml(data) + '</code>';
    } else if (typeof data === 'object') {
        const jsonStr = JSON.stringify(data, null, 2);
        if (jsonStr.length > 200) {
            return '<code>' + escapeHtml(jsonStr.substring(0, 200)) + '...</code>';
        }
        return '<code>' + escapeHtml(jsonStr) + '</code>';
    }
    return '<code>' + escapeHtml(String(data)) + '</code>';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initial setup
window.onload = function() {
    if (userInput) {
        userInput.focus();
    }
    
    // Add event listener for export button
    if (exportButton) {
        exportButton.addEventListener('click', exportConversation);
    }

    // Adaptive width for model select based on current selection text
    if (modelSelect && modelSelectMeasure) {
        const updateSelectWidth = () => {
            const selectedText = modelSelect.options[modelSelect.selectedIndex]?.text || '';
            modelSelectMeasure.textContent = selectedText;
            const computed = window.getComputedStyle(modelSelect);
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingRight = parseFloat(computed.paddingRight) || 0;
            const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
            const borderRight = parseFloat(computed.borderRightWidth) || 0;
            const extra = paddingLeft + paddingRight + borderLeft + borderRight + 12; // small buffer
            modelSelect.style.width = (modelSelectMeasure.offsetWidth + extra) + 'px';
        };
        // Create hidden measurer styles
        modelSelectMeasure.style.visibility = 'hidden';
        modelSelectMeasure.style.whiteSpace = 'nowrap';
        modelSelectMeasure.style.position = 'absolute';
        modelSelectMeasure.style.pointerEvents = 'none';
        // Match font styles
        const syncMeasureStyle = () => {
            const cs = window.getComputedStyle(modelSelect);
            modelSelectMeasure.style.fontFamily = cs.fontFamily;
            modelSelectMeasure.style.fontSize = cs.fontSize;
            modelSelectMeasure.style.fontWeight = cs.fontWeight;
            modelSelectMeasure.style.letterSpacing = cs.letterSpacing;
        };
        syncMeasureStyle();
        updateSelectWidth();
        modelSelect.addEventListener('change', updateSelectWidth);
        window.addEventListener('resize', () => { syncMeasureStyle(); updateSelectWidth(); });
    }

    // Adaptive width for system select based on current selection text
    if (systemSelect && systemSelectMeasure) {
        const updateSystemSelectWidth = () => {
            const selectedText = systemSelect.options[systemSelect.selectedIndex]?.text || '';
            systemSelectMeasure.textContent = selectedText;
            const computed = window.getComputedStyle(systemSelect);
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingRight = parseFloat(computed.paddingRight) || 0;
            const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
            const borderRight = parseFloat(computed.borderRightWidth) || 0;
            const extra = paddingLeft + paddingRight + borderLeft + borderRight + 12; // small buffer
            systemSelect.style.width = (systemSelectMeasure.offsetWidth + extra) + 'px';
        };
        // Create hidden measurer styles
        systemSelectMeasure.style.visibility = 'hidden';
        systemSelectMeasure.style.whiteSpace = 'nowrap';
        systemSelectMeasure.style.position = 'absolute';
        systemSelectMeasure.style.pointerEvents = 'none';
        // Match font styles
        const syncSystemMeasureStyle = () => {
            const cs = window.getComputedStyle(systemSelect);
            systemSelectMeasure.style.fontFamily = cs.fontFamily;
            systemSelectMeasure.style.fontSize = cs.fontSize;
            systemSelectMeasure.style.fontWeight = cs.fontWeight;
            systemSelectMeasure.style.letterSpacing = cs.letterSpacing;
        };
        syncSystemMeasureStyle();
        updateSystemSelectWidth();
        systemSelect.addEventListener('change', updateSystemSelectWidth);
        window.addEventListener('resize', () => { syncSystemMeasureStyle(); updateSystemSelectWidth(); });
    }
};
