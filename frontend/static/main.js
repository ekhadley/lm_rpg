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
const createStoryModal = document.getElementById('create-story-modal');
const createStoryModalClose = document.getElementById('create-story-modal-close');
const createStoryModalCancel = document.getElementById('create-story-modal-cancel');
const storyList = document.getElementById('story-list');
const exportButton = document.getElementById('export-button');
const archiveButton = document.getElementById('archive-button');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const archivePopup = document.getElementById('archive-popup');
const archivePopupCancel = document.getElementById('archive-popup-cancel');
const archivePopupConfirm = document.getElementById('archive-popup-confirm');
const costButton = document.getElementById('cost-button');
const costPopup = document.getElementById('cost-popup');
const costTotalTokens = document.getElementById('cost-total-tokens');
const costAvgTokens = document.getElementById('cost-avg-tokens');
const costTotalCost = document.getElementById('cost-total-cost');
const costAvgCost = document.getElementById('cost-avg-cost');

// Modal dropdown elements
const createSystemSelectCustom = document.getElementById('create-system-select-custom');
const createSystemSelectDropdown = document.getElementById('create-system-select-dropdown');
const createSystemSelect = document.getElementById('create-system-select');
const createModelSelectCustom = document.getElementById('create-model-select-custom');
const createModelSelectDropdown = document.getElementById('create-model-select-dropdown');
const createModelSelect = document.getElementById('create-model-select');

// Select story config modal elements
const selectStoryConfigModal = document.getElementById('select-story-config-modal');
const selectStoryConfigModalClose = document.getElementById('select-story-config-modal-close');
const selectStoryConfigModalCancel = document.getElementById('select-story-config-modal-cancel');
const selectStoryConfigBtn = document.getElementById('select-story-config-btn');
const selectStorySystemSelectCustom = document.getElementById('select-story-system-select-custom');
const selectStorySystemSelectDropdown = document.getElementById('select-story-system-select-dropdown');
const selectStorySystemSelect = document.getElementById('select-story-system-select');
const selectStoryModelSelectCustom = document.getElementById('select-story-model-select-custom');
const selectStoryModelSelectDropdown = document.getElementById('select-story-model-select-dropdown');
const selectStoryModelSelect = document.getElementById('select-story-model-select');

// Store the pending story name when modal is shown
let pendingStoryName = null;

// Custom Dropdown Functionality
function initCustomDropdown(customSelect, dropdown, nativeSelect, selectType) {
    if (!customSelect || !dropdown || !nativeSelect) return;
    
    const valueSpan = customSelect.querySelector('.custom-select-value');
    let isOpen = false;
    
    // Initialize selected value
    const selectedOption = dropdown.querySelector('.custom-select-option[data-selected="true"]');
    if (selectedOption) {
        valueSpan.textContent = selectedOption.textContent;
        selectedOption.classList.add('selected');
        nativeSelect.value = selectedOption.dataset.value;
    } else {
        const firstOption = dropdown.querySelector('.custom-select-option');
        if (firstOption) {
            valueSpan.textContent = firstOption.textContent;
            firstOption.classList.add('selected');
            nativeSelect.value = firstOption.dataset.value;
        }
    }
    
    // Toggle dropdown
    function toggleDropdown() {
        if (nativeSelect.disabled) return;
        
        isOpen = !isOpen;
        if (isOpen) {
            customSelect.classList.add('active');
            dropdown.classList.add('show');
            // Close other dropdowns
            if (selectType === 'system') {
                if (modelSelectDropdown) modelSelectDropdown.classList.remove('show');
                if (modelSelectCustom) modelSelectCustom.classList.remove('active');
            } else {
                if (systemSelectDropdown) systemSelectDropdown.classList.remove('show');
                if (systemSelectCustom) systemSelectCustom.classList.remove('active');
            }
        } else {
            customSelect.classList.remove('active');
            dropdown.classList.remove('show');
        }
    }
    
    // Close dropdown
    function closeDropdown() {
        isOpen = false;
        customSelect.classList.remove('active');
        dropdown.classList.remove('show');
    }
    
    // Handle custom select click
    customSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Handle keyboard
    customSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });
    
    // Handle option clicks
    dropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Update selected state
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            
            // Update display value
            valueSpan.textContent = option.textContent;
            
            // Update native select
            nativeSelect.value = option.dataset.value;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            closeDropdown();
        });
    });
    
    // Sync with native select changes (for when backend updates it)
    nativeSelect.addEventListener('change', () => {
        const selectedValue = nativeSelect.value;
        const option = dropdown.querySelector(`.custom-select-option[data-value="${selectedValue}"]`);
        if (option) {
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            valueSpan.textContent = option.textContent;
        }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Update disabled state
    function updateDisabledState() {
        if (nativeSelect.disabled) {
            customSelect.classList.add('disabled');
        } else {
            customSelect.classList.remove('disabled');
        }
    }
    
    // Watch for disabled state changes
    const observer = new MutationObserver(updateDisabledState);
    observer.observe(nativeSelect, { attributes: true, attributeFilter: ['disabled'] });
    updateDisabledState();
}

// Initialize modal custom dropdowns when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (createSystemSelectCustom && createSystemSelectDropdown && createSystemSelect) {
            initCustomDropdown(createSystemSelectCustom, createSystemSelectDropdown, createSystemSelect, 'system');
        }
        if (createModelSelectCustom && createModelSelectDropdown && createModelSelect) {
            initCustomDropdown(createModelSelectCustom, createModelSelectDropdown, createModelSelect, 'model');
        }
        if (selectStorySystemSelectCustom && selectStorySystemSelectDropdown && selectStorySystemSelect) {
            initCustomDropdown(selectStorySystemSelectCustom, selectStorySystemSelectDropdown, selectStorySystemSelect, 'system');
        }
        if (selectStoryModelSelectCustom && selectStoryModelSelectDropdown && selectStoryModelSelect) {
            initCustomDropdown(selectStoryModelSelectCustom, selectStoryModelSelectDropdown, selectStoryModelSelect, 'model');
        }
    });
} else {
    if (createSystemSelectCustom && createSystemSelectDropdown && createSystemSelect) {
        initCustomDropdown(createSystemSelectCustom, createSystemSelectDropdown, createSystemSelect, 'system');
    }
    if (createModelSelectCustom && createModelSelectDropdown && createModelSelect) {
        initCustomDropdown(createModelSelectCustom, createModelSelectDropdown, createModelSelect, 'model');
    }
    if (selectStorySystemSelectCustom && selectStorySystemSelectDropdown && selectStorySystemSelect) {
        initCustomDropdown(selectStorySystemSelectCustom, selectStorySystemSelectDropdown, selectStorySystemSelect, 'system');
    }
    if (selectStoryModelSelectCustom && selectStoryModelSelectDropdown && selectStoryModelSelect) {
        initCustomDropdown(selectStoryModelSelectCustom, selectStoryModelSelectDropdown, selectStoryModelSelect, 'model');
    }
}

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
            
            // Check if story has unknown system/model (indicates missing info.json)
            const systemSpan = storyItem.querySelector('.story-system');
            const modelSpan = storyItem.querySelector('.story-meta');
            const system = systemSpan ? systemSpan.textContent.trim() : '';
            const model = modelSpan ? modelSpan.textContent.trim() : '';
            
            if (system === 'unknown' || model === 'unknown') {
                // Show modal to select system and model
                pendingStoryName = storyTitle;
                if (selectStoryConfigModal) {
                    selectStoryConfigModal.classList.add('show');
                }
            } else {
                // Story has info.json, proceed normally
                selectStoryDirectly(storyTitle);
            }
        }
    });
}

// Function to select a story directly (used when info.json exists)
function selectStoryDirectly(storyTitle) {
    currentStory = storyTitle;
    socket.emit('select_story', { "selected_story": storyTitle });
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
}

// Handle select story config modal
if (selectStoryConfigBtn) {
    selectStoryConfigBtn.addEventListener('click', function() {
        if (!pendingStoryName) return;
        
        const modelName = selectStoryModelSelect ? selectStoryModelSelect.value : 'openai/gpt-5.2';
        const systemName = selectStorySystemSelect ? selectStorySystemSelect.value : 'hp';
        
        // Update sidebar immediately with selected values
        if (storyList) {
            const storyItems = storyList.querySelectorAll('.story-item');
            storyItems.forEach(item => {
                const storyName = item.getAttribute('data-story');
                if (storyName === pendingStoryName) {
                    const systemSpan = item.querySelector('.story-system');
                    const modelSpan = item.querySelector('.story-meta');
                    if (systemSpan) {
                        systemSpan.textContent = systemName;
                    }
                    if (modelSpan) {
                        modelSpan.textContent = modelName;
                    }
                }
            });
        }
        
        // Close modal
        if (selectStoryConfigModal) {
            selectStoryConfigModal.classList.remove('show');
        }
        
        // Store current story name for updating sidebar
        currentStory = pendingStoryName;
        
        // Emit select_story with system and model
        socket.emit('select_story', {
            "selected_story": pendingStoryName,
            "model_name": modelName,
            "system_name": systemName
        });
        
        // Clear chat history when switching stories
        if (document.getElementById('current-story-title')) {
            document.getElementById('current-story-title').textContent = pendingStoryName;
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
        
        pendingStoryName = null;
    });
}

// Handle modal close/cancel
if (selectStoryConfigModalClose) {
    selectStoryConfigModalClose.addEventListener('click', function() {
        if (selectStoryConfigModal) {
            selectStoryConfigModal.classList.remove('show');
        }
        pendingStoryName = null;
    });
}

if (selectStoryConfigModalCancel) {
    selectStoryConfigModalCancel.addEventListener('click', function() {
        if (selectStoryConfigModal) {
            selectStoryConfigModal.classList.remove('show');
        }
        pendingStoryName = null;
    });
}

// Close modal when clicking outside
if (selectStoryConfigModal) {
    selectStoryConfigModal.addEventListener('click', function(e) {
        if (e.target === selectStoryConfigModal) {
            selectStoryConfigModal.classList.remove('show');
            pendingStoryName = null;
        }
    });
}
// When backend confirms/locks a model and system for this story
socket.on('story_locked', function(data) {
    console.log('Story locked with data:', data);
    // Update the story item in the sidebar if it had unknown system/model
    if (currentStory && storyList) {
        const storyItems = storyList.querySelectorAll('.story-item');
        storyItems.forEach(item => {
            const storyName = item.getAttribute('data-story');
            if (storyName === currentStory) {
                const systemSpan = item.querySelector('.story-system');
                const modelSpan = item.querySelector('.story-meta');
                if (systemSpan && data.system_name) {
                    systemSpan.textContent = data.system_name;
                }
                if (modelSpan && data.model_name) {
                    modelSpan.textContent = data.model_name;
                }
            }
        });
    }
});



if (createStoryBtn) {
    createStoryBtn.addEventListener('click', function() {
        const newStoryName = document.getElementById('new_story_name').value.trim();
        if (!newStoryName) {
            alert('Please enter a story name');
            return;
        }
        const modelName = createModelSelect ? createModelSelect.value : 'openai/gpt-5.2';
        const systemName = createSystemSelect ? createSystemSelect.value : 'hp';
        
        socket.emit('create_story', { 
            story_name: newStoryName,
            model_name: modelName,
            system_name: systemName
        });
        
        if (createStoryModal) {
            createStoryModal.classList.remove('show');
        }
        
        // Clear input
        const newStoryInput = document.getElementById('new_story_name');
        if (newStoryInput) {
            newStoryInput.value = '';
        }
    });
}

// Handle story created event
socket.on('story_created', function(data) {
    addNewStory(data);
});

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

// Handle previous history (archived conversations displayed before live history)
socket.on('previous_history', function(history) {
    console.log('Loading previous history:', history);
    
    if (!history || history.length === 0) return;
    
    // Add a visual separator/header for previous conversations
    const separator = document.createElement('div');
    separator.className = 'history-separator';
    separator.innerHTML = '<span>Previous Conversations</span>';
    chatHistory.appendChild(separator);
    
    // Queue to match tool_use with tool_result in order
    let pendingToolUses = [];
    
    // Render previous messages (similar to conversation_history handler)
    history.forEach(function(message) {
        if (message.type === 'user') {
            if (message.content != "<|begin_conversation|>") {
                addUserMessage(message.content, false);
            }
        } else if (message.type == "tool_result") {
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
            addAssistantMessageFromHistory(message.content);
        } else if (message.type == "tool_use") {
            pendingToolUses.push({
                name: message.name,
                input: message.input
            });
        } else if (message.type == "thinking") {
            addThinkingFromHistory(message.content);
        }
    });
    
    // Add separator before current conversation if we had previous history
    const currentSeparator = document.createElement('div');
    currentSeparator.className = 'history-separator current';
    currentSeparator.innerHTML = '<span>Current Conversation</span>';
    chatHistory.appendChild(currentSeparator);
});

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

// Handle archive response
socket.on('history_archived', function(data) {
    console.log('History archived:', data);
    if (data.success) {
        // Don't clear the UI - previous messages stay visible
        // Add a separator to mark where the new conversation begins
        if (chatHistory) {
            // Add "Previous Conversations" separator at the very top if not already there
            const existingSeparator = chatHistory.querySelector('.history-separator');
            if (!existingSeparator) {
                const prevSeparator = document.createElement('div');
                prevSeparator.className = 'history-separator';
                prevSeparator.innerHTML = '<span>Previous Conversations</span>';
                chatHistory.insertBefore(prevSeparator, chatHistory.firstChild);
            }
            
            // Add "Current Conversation" separator at the end
            const currentSeparator = document.createElement('div');
            currentSeparator.className = 'history-separator current';
            currentSeparator.innerHTML = '<span>Current Conversation</span>';
            chatHistory.appendChild(currentSeparator);
            
            scrollToBottom();
        }
        // Reset conversation history (model context) but keep UI
        conversationHistory = [];
        // Reset turn tracking
        currentTurnToolCalls = [];
        currentTurnThinking = '';
        currentNarratorMessageElement = null;
        lastNarratorMessageElement = null;
        accumulatedContent = '';
        // Enable user input - it's the user's turn to continue
        if (userInput) {
            userInput.disabled = false;
            userInput.focus();
        }
    }
});

socket.on('think_start', function() {
    console.log('Model started thinking');
    isThinkingInProgress = true;
    currentTurnThinking = '';
    
    // Create message wrapper with animated thinking button immediately
    ensureAssistantTurnWrapper();
    updateSideButtonsAnimated();
});

socket.on('think_output', function(data) {
    currentTurnThinking += data.text;
    
    // Update thinking content in popup while thinking
    updateThinkingPopupContent();
    scrollToBottom();
});

socket.on('text_start', function() {
    console.log('Narrator switched to outputting text');
    isThinkingInProgress = false;
    
    // If we're not retrying (currentNarratorMessageElement is null), create or use existing wrapper
    if (!currentNarratorMessageElement) {
        // Check if we have an in-progress wrapper from animated buttons
        let messageWrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress');
        
        if (messageWrapper) {
            // Use existing wrapper, remove in-progress class
            messageWrapper.classList.remove('in-progress');
            
            // Find or create narrator message element
            let narratorEl = messageWrapper.querySelector('.narrator-message');
            if (narratorEl && narratorEl.classList.contains('narrator-placeholder')) {
                // Remove placeholder class and prepare for content
                narratorEl.classList.remove('narrator-placeholder');
            }
            currentNarratorMessageElement = narratorEl;
        } else {
            // Create new wrapper for side buttons + message
            messageWrapper = document.createElement('div');
            messageWrapper.className = 'assistant-turn-wrapper';
            
            // Create side buttons container
            const sideButtons = document.createElement('div');
            sideButtons.className = 'assistant-side-buttons';
            messageWrapper.appendChild(sideButtons);
            
            currentNarratorMessageElement = document.createElement('div');
            currentNarratorMessageElement.className = 'message narrator-message';
            
            messageWrapper.appendChild(currentNarratorMessageElement);
            chatHistory.appendChild(messageWrapper);
        }
        
        currentNarratorMessageElement.style.display = 'none'; // Hide until we get content
        
        // Update side buttons with final (non-animated) state
        const sideButtons = messageWrapper.querySelector('.assistant-side-buttons');
        if (sideButtons) {
            sideButtons.innerHTML = '';
            
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
        }
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
        let processedContent = accumulatedContent.trim();
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
        
        // Strip leading/trailing whitespace from final HTML
        processedContent = processedContent.trim();
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
    
    // Show animated tool button while tool is being processed
    ensureAssistantTurnWrapper();
    updateSideButtonsAnimated();
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
    
    // Update side buttons to show new tool calls (still animated if more coming)
    ensureAssistantTurnWrapper();
    updateSideButtonsAnimated();
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

socket.on('turn_end', function(data) {
    // Update cost stats if provided
    if (data && data.cost_stats) {
        updateCostDisplay(data.cost_stats);
    }
    
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
    li.setAttribute('data-story', story.story_name || story.name);
    
    // Create appropriate icon based on system type
    let icon;
    const system = story.system || 'unknown';
    if (system === 'hp') {
        icon = document.createElement('span');
        icon.className = 'hp-logo-icon';
    } else {
        icon = document.createElement('i');
        if (system === 'dnd5e') {
            icon.className = 'fab fa-d-and-d';
        } else {
            icon.className = 'fas fa-scroll';
        }
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'story-item-content';
    
    const nameRow = document.createElement('div');
    nameRow.className = 'story-name-row';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'story-name';
    nameSpan.textContent = story.story_name || story.name;
    
    const systemSpan = document.createElement('span');
    systemSpan.className = 'story-system';
    systemSpan.textContent = story.system || 'unknown';
    
    nameRow.appendChild(nameSpan);
    nameRow.appendChild(systemSpan);
    
    const metaSpan = document.createElement('span');
    metaSpan.className = 'story-meta';
    metaSpan.textContent = story.model || 'unknown';
    
    contentDiv.appendChild(nameRow);
    contentDiv.appendChild(metaSpan);
    
    li.appendChild(icon);
    li.appendChild(contentDiv);
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
    // Strip leading/trailing whitespace from content
    let processedContent = content.trim();
    
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
    
    // Strip leading/trailing whitespace from final HTML
    processedContent = processedContent.trim();
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

// Ensure assistant turn wrapper exists for animated buttons
function ensureAssistantTurnWrapper() {
    // If we already have a wrapper with the current narrator message, use it
    if (currentNarratorMessageElement) {
        return currentNarratorMessageElement.closest('.assistant-turn-wrapper');
    }
    
    // Check if we already created a wrapper for this turn (before text_start)
    const existingWrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress');
    if (existingWrapper) {
        return existingWrapper;
    }
    
    // Create a new wrapper
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'assistant-turn-wrapper in-progress';
    
    const sideButtons = document.createElement('div');
    sideButtons.className = 'assistant-side-buttons';
    messageWrapper.appendChild(sideButtons);
    
    // Create placeholder for narrator message (will be populated later)
    const narratorPlaceholder = document.createElement('div');
    narratorPlaceholder.className = 'message narrator-message narrator-placeholder';
    narratorPlaceholder.style.display = 'none';
    messageWrapper.appendChild(narratorPlaceholder);
    
    chatHistory.appendChild(messageWrapper);
    return messageWrapper;
}

// Update side buttons with current state (animated = in progress)
function updateSideButtonsAnimated() {
    const wrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress') || 
                    (currentNarratorMessageElement && currentNarratorMessageElement.closest('.assistant-turn-wrapper'));
    if (!wrapper) return;
    
    const sideButtons = wrapper.querySelector('.assistant-side-buttons');
    if (!sideButtons) return;
    
    // Clear existing buttons
    sideButtons.innerHTML = '';
    
    // Add thinking button if we have thinking content or thinking is in progress
    if (currentTurnThinking || isThinkingInProgress) {
        const thinkingBtn = createThinkingButton(currentTurnThinking || 'Thinking...', isThinkingInProgress);
        sideButtons.appendChild(thinkingBtn);
    }
    
    // Split tool calls into dice rolls and other tools
    const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
    
    // Add dice button if we have dice rolls
    if (diceRolls.length > 0) {
        const diceBtn = createDiceButton(diceRolls, isToolCallInProgress);
        sideButtons.appendChild(diceBtn);
    }
    
    // Add tool calls button if we have other tool calls or tool is in progress
    if (otherTools.length > 0 || isToolCallInProgress) {
        const toolBtn = createToolButton(otherTools.length > 0 ? otherTools : [], isToolCallInProgress);
        sideButtons.appendChild(toolBtn);
    }
}

// Update thinking popup content without recreating the button
function updateThinkingPopupContent() {
    const wrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress') || 
                    (currentNarratorMessageElement && currentNarratorMessageElement.closest('.assistant-turn-wrapper'));
    if (!wrapper) return;
    
    const thinkingPopup = wrapper.querySelector('.thinking-popup .popup-content');
    if (thinkingPopup) {
        thinkingPopup.textContent = currentTurnThinking || 'Thinking...';
        // Auto-scroll to bottom of popup content
        thinkingPopup.scrollTop = thinkingPopup.scrollHeight;
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
    
    // Show different header when processing vs completed
    if (isAnimating && toolCalls.length === 0) {
        popupHeader.innerHTML = '<i class="fas fa-wrench"></i> Processing...';
    } else {
        popupHeader.innerHTML = '<i class="fas fa-wrench"></i> Tool Calls (' + toolCalls.length + ')';
    }
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    if (toolCalls.length === 0 && isAnimating) {
        // Show processing message
        const processingMsg = document.createElement('div');
        processingMsg.className = 'tool-processing';
        processingMsg.textContent = 'Calling tool...';
        popupContent.appendChild(processingMsg);
    } else {
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
    }
    
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

// Update cost display with new stats
function updateCostDisplay(stats) {
    if (costTotalTokens) {
        costTotalTokens.textContent = stats.total_tokens.toLocaleString();
    }
    if (costAvgTokens) {
        costAvgTokens.textContent = stats.avg_tokens_per_turn.toLocaleString();
    }
    if (costTotalCost) {
        costTotalCost.textContent = '$' + stats.total_cost.toFixed(4);
    }
    if (costAvgCost) {
        costAvgCost.textContent = '$' + stats.avg_cost_per_turn.toFixed(4);
    }
}

// Cost popup hover behavior
function setupCostPopupBehavior() {
    if (!costButton || !costPopup) return;
    
    let hoverTimeout = null;
    
    const showCostPopup = () => {
        clearTimeout(hoverTimeout);
        costPopup.classList.add('visible');
    };
    
    const hideCostPopup = () => {
        hoverTimeout = setTimeout(() => {
            costPopup.classList.remove('visible');
        }, 100);
    };
    
    // Show on hover
    costButton.addEventListener('mouseenter', showCostPopup);
    costButton.addEventListener('mouseleave', hideCostPopup);
    
    // Keep visible while hovering popup
    costPopup.addEventListener('mouseenter', showCostPopup);
    costPopup.addEventListener('mouseleave', hideCostPopup);
}

// Archive popup functions
function positionArchivePopup(button) {
    if (!archivePopup || !button) return;
    
    const rect = button.getBoundingClientRect();
    const popupWidth = archivePopup.offsetWidth || 320;
    const popupHeight = archivePopup.offsetHeight || 150;
    
    // Position below the button, aligned to the right
    let top = rect.bottom + 8;
    let left = rect.right - popupWidth;
    
    // If popup would go off the right edge, align to left edge of button
    if (left < 8) {
        left = rect.left;
    }
    
    // If popup would go off the bottom, position above button instead
    if (top + popupHeight > window.innerHeight - 8) {
        top = rect.top - popupHeight - 8;
    }
    
    archivePopup.style.top = top + 'px';
    archivePopup.style.left = left + 'px';
}

function showArchivePopup() {
    if (archivePopup && archiveButton) {
        positionArchivePopup(archiveButton);
        archivePopup.classList.add('visible');
        // Focus the cancel button for accessibility
        if (archivePopupCancel) {
            setTimeout(() => archivePopupCancel.focus(), 100);
        }
    }
}

function hideArchivePopup() {
    if (archivePopup) {
        archivePopup.classList.remove('visible');
    }
}

// Initial setup
window.onload = function() {
    if (userInput) {
        userInput.focus();
    }
    
    // Setup cost popup hover behavior
    setupCostPopupBehavior();
    
    // Add event listener for export button
    if (exportButton) {
        exportButton.addEventListener('click', exportConversation);
    }
    
    // Add event listener for archive button
    if (archiveButton) {
        archiveButton.addEventListener('click', function(e) {
            e.stopPropagation();
            // Toggle popup visibility
            if (archivePopup && archivePopup.classList.contains('visible')) {
                hideArchivePopup();
            } else {
                showArchivePopup();
            }
        });
    }
    
    // Archive popup handlers
    if (archivePopupCancel) {
        archivePopupCancel.addEventListener('click', function(e) {
            e.stopPropagation();
            hideArchivePopup();
        });
    }
    
    if (archivePopupConfirm) {
        archivePopupConfirm.addEventListener('click', function(e) {
            e.stopPropagation();
            socket.emit('archive_history');
            hideArchivePopup();
        });
    }
    
    // Close popup when clicking outside
    document.addEventListener('click', function(e) {
        if (archivePopup && archivePopup.classList.contains('visible')) {
            if (!archivePopup.contains(e.target) && e.target !== archiveButton) {
                hideArchivePopup();
            }
        }
    });
    
    // Close popup with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (archivePopup && archivePopup.classList.contains('visible')) {
                hideArchivePopup();
            }
            if (selectStoryConfigModal && selectStoryConfigModal.classList.contains('show')) {
                selectStoryConfigModal.classList.remove('show');
                pendingStoryName = null;
            }
        }
    });
    
    // Reposition popup on window resize
    window.addEventListener('resize', function() {
        if (archivePopup && archivePopup.classList.contains('visible') && archiveButton) {
            positionArchivePopup(archiveButton);
        }
    });

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

    // Theme toggle functionality
    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'discord';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'discord' ? 'gruvbox-dark' : 'discord';
        setTheme(newTheme);
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }

    // Add event listener for theme toggle button
    const themeToggleBtnEl = document.getElementById('theme-toggle-btn');
    if (themeToggleBtnEl) {
        themeToggleBtnEl.addEventListener('click', toggleTheme);
    }
};
