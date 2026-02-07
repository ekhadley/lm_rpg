import {
    socket, chatHistory, userInput, messageForm,
    conversationHistory, setConversationHistory,
    currentNarratorMessageElement, setCurrentNarratorMessageElement,
    currentThinkingElement, setCurrentThinkingElement,
    lastNarratorMessageElement, setLastNarratorMessageElement,
    accumulatedContent, setAccumulatedContent,
    currentTurnToolCalls, setCurrentTurnToolCalls,
    currentTurnThinking, setCurrentTurnThinking,
    isToolCallInProgress, setIsToolCallInProgress,
    isThinkingInProgress, setIsThinkingInProgress,
    debugModal, debugModalBody,
} from './state.js';
import {
    scrollToBottom, showTypingIndicator, hideTypingIndicator,
    setupPopupBehavior, positionPopup, updateCostDisplay,
    showConfirmPopup,
} from './ui.js';

const TOOL_DATA_MAX_LEN = 200;

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format tool data for display
function formatToolData(data) {
    if (typeof data === 'string') {
        if (data.length > TOOL_DATA_MAX_LEN) return '<code>' + escapeHtml(data.substring(0, TOOL_DATA_MAX_LEN)) + '...</code>';
        return '<code>' + escapeHtml(data) + '</code>';
    } else if (typeof data === 'object') {
        const jsonStr = JSON.stringify(data, null, 2);
        if (jsonStr.length > TOOL_DATA_MAX_LEN) return '<code>' + escapeHtml(jsonStr.substring(0, TOOL_DATA_MAX_LEN)) + '...</code>';
        return '<code>' + escapeHtml(jsonStr) + '</code>';
    }
    return '<code>' + escapeHtml(String(data)) + '</code>';
}

// Split tool calls into dice rolls and other tools
function splitToolCalls(toolCalls) {
    const diceRolls = [];
    const otherTools = [];
    toolCalls.forEach(tool => {
        if (tool.name === 'roll_dice') diceRolls.push(tool);
        else otherTools.push(tool);
    });
    return { diceRolls, otherTools };
}

// Parse narration tags and markdown
function processNarration(content) {
    let s = content.trim();
    if (s.includes('<narration>')) {
        return s.replace(/<narration>([\s\S]*?)<\/narration>/g, (_, n) => {
            try { return '<div class="book-narration">' + marked.parse(n) + '</div>'; }
            catch (e) { return '<div class="book-narration">' + n + '</div>'; }
        }).trim();
    }
    try { return marked.parse(s).trim(); }
    catch (e) { return s; }
}

// Create thinking button with hover popup
function createThinkingButton(thinkingContent, isAnimating) {
    const container = document.createElement('div');
    container.className = 'side-button-container';
    const button = document.createElement('button');
    button.className = 'side-button thinking-button' + (isAnimating ? ' animating' : '');
    button.innerHTML = '<i class="fas fa-gears"></i>';
    const popup = document.createElement('div');
    popup.className = 'side-button-popup thinking-popup';
    const popupHeader = document.createElement('div');
    popupHeader.className = 'popup-header';
    popupHeader.innerHTML = '<i class="fas fa-gears"></i> Reasoning';
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    popupContent.textContent = thinkingContent;
    popup.appendChild(popupHeader);
    popup.appendChild(popupContent);
    container.appendChild(button);
    container.appendChild(popup);
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
    diceRolls.forEach(roll => {
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
    setupPopupBehavior(container, button, popup);
    return container;
}

// Create tool calls button with hover popup
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
    if (isAnimating && toolCalls.length === 0) {
        popupHeader.innerHTML = '<i class="fas fa-wrench"></i> Processing...';
    } else {
        popupHeader.innerHTML = '<i class="fas fa-wrench"></i> Tool Calls (' + toolCalls.length + ')';
    }
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    if (toolCalls.length === 0 && isAnimating) {
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
            if (tool.inputs && Object.keys(tool.inputs).length > 0) {
                const inputsDiv = document.createElement('div');
                inputsDiv.className = 'tool-inputs';
                inputsDiv.innerHTML = '<strong>Inputs:</strong> ' + formatToolData(tool.inputs);
                toolDetails.appendChild(inputsDiv);
            }
            if (tool.result !== undefined) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'tool-result';
                resultDiv.innerHTML = '<strong>Result:</strong> ' + formatToolData(tool.result);
                toolDetails.appendChild(resultDiv);
            }
            toolItem.appendChild(toolName);
            toolItem.appendChild(toolDetails);
            popupContent.appendChild(toolItem);
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
    setupPopupBehavior(container, button, popup);
    return container;
}

// Ensure assistant turn wrapper exists for animated buttons
function ensureAssistantTurnWrapper() {
    if (currentNarratorMessageElement) {
        return currentNarratorMessageElement.closest('.assistant-turn-wrapper');
    }
    const existingWrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress');
    if (existingWrapper) return existingWrapper;

    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'assistant-turn-wrapper in-progress';
    const sideButtons = document.createElement('div');
    sideButtons.className = 'assistant-side-buttons';
    messageWrapper.appendChild(sideButtons);
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

    sideButtons.innerHTML = '';
    if (currentTurnThinking || isThinkingInProgress) {
        sideButtons.appendChild(createThinkingButton(currentTurnThinking || 'Thinking...', isThinkingInProgress));
    }
    const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
    if (diceRolls.length > 0) {
        sideButtons.appendChild(createDiceButton(diceRolls, isToolCallInProgress));
    }
    if (otherTools.length > 0 || isToolCallInProgress) {
        sideButtons.appendChild(createToolButton(otherTools.length > 0 ? otherTools : [], isToolCallInProgress));
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
        thinkingPopup.scrollTop = thinkingPopup.scrollHeight;
    }
}

// Build final side buttons (non-animated)
function buildFinalSideButtons(sideButtons) {
    sideButtons.innerHTML = '';
    if (currentTurnThinking) {
        sideButtons.appendChild(createThinkingButton(currentTurnThinking, false));
    }
    const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
    if (diceRolls.length > 0) {
        sideButtons.appendChild(createDiceButton(diceRolls, false));
    }
    if (otherTools.length > 0) {
        sideButtons.appendChild(createToolButton(otherTools, false));
    }
}

// Add user message to chat
function addUserMessage(message, disableInput = true) {
    if (!chatHistory) return;
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message';
    messageContainer.style.display = 'flex';
    messageContainer.style.justifyContent = 'flex-end';
    const messageElement = document.createElement('div');
    messageElement.className = 'user-message';
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
    chatHistory.appendChild(messageContainer);
    if (disableInput && userInput) userInput.disabled = true;
}

// Add thinking from history (collect for turn)
function addThinkingFromHistory(thinkingContent) {
    setCurrentTurnThinking(thinkingContent);
}

// Add assistant message from history
function addAssistantMessageFromHistory(content, addRetry = false) {
    if (!chatHistory) return;
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'assistant-turn-wrapper';
    const sideButtons = document.createElement('div');
    sideButtons.className = 'assistant-side-buttons';

    if (currentTurnThinking) {
        sideButtons.appendChild(createThinkingButton(currentTurnThinking, false));
    }
    const { diceRolls, otherTools } = splitToolCalls(currentTurnToolCalls);
    if (diceRolls.length > 0) {
        sideButtons.appendChild(createDiceButton(diceRolls, false));
    }
    if (otherTools.length > 0) {
        sideButtons.appendChild(createToolButton(otherTools, false));
    }
    messageWrapper.appendChild(sideButtons);

    const narratorMessageElement = document.createElement('div');
    narratorMessageElement.className = 'message narrator-message';
    narratorMessageElement.innerHTML = processNarration(content);
    messageWrapper.appendChild(narratorMessageElement);
    chatHistory.appendChild(messageWrapper);

    if (addRetry) addRetryButton(narratorMessageElement);

    setCurrentTurnToolCalls([]);
    setCurrentTurnThinking('');
}

// Add tool use to current turn (from history)
function addToolUseToHistory(data) {
    const calls = [...currentTurnToolCalls];
    data.tools.forEach(tool => {
        let inputs = tool.inputs;
        if (typeof inputs === 'string') {
            try { inputs = JSON.parse(inputs); } catch (e) { inputs = {}; }
        }
        calls.push({ name: tool.name, inputs: inputs, result: tool.result });
    });
    setCurrentTurnToolCalls(calls);
}

// Render a list of history messages
function renderHistoryMessages(messages, addRetry = false) {
    let pendingToolUses = [];
    messages.forEach(function(message) {
        if (message.type === 'user') {
            if (message.content != "<|begin_conversation|>") addUserMessage(message.content, false);
        } else if (message.type === "tool_result") {
            const toolUse = pendingToolUses.shift();
            if (toolUse) addToolUseToHistory({ tools: [{ name: toolUse.name, inputs: toolUse.input, result: message.content }] });
        } else if (message.type === 'assistant') {
            addAssistantMessageFromHistory(message.content, addRetry);
        } else if (message.type === "tool_use") {
            pendingToolUses.push({ name: message.name, input: message.input });
        } else if (message.type === "thinking") {
            addThinkingFromHistory(message.content);
        }
    });
}

// Retry
function addRetryButton(messageElement) {
    if (messageElement.querySelector('.retry-button')) return;
    const retryContainer = document.createElement('div');
    retryContainer.className = 'message-actions';
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.innerHTML = '<i class="fas fa-redo"></i>';
    retryButton.title = 'Regenerate this response';
    retryButton.addEventListener('click', function() {
        handleRetryResponse(messageElement);
    });
    retryContainer.appendChild(retryButton);
    messageElement.appendChild(retryContainer);
}

function getTurnIndex(wrapper) {
    const currentSep = chatHistory.querySelector('.history-separator.current');
    const allWrappers = [...chatHistory.querySelectorAll('.assistant-turn-wrapper')];
    const currentWrappers = currentSep
        ? allWrappers.filter(w => currentSep.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)
        : allWrappers;
    return currentWrappers.indexOf(wrapper);
}

function handleRetryResponse(messageElement) {
    if (userInput && userInput.disabled) return;

    const wrapper = messageElement.closest('.assistant-turn-wrapper');
    if (!wrapper) return;
    const turnIndex = getTurnIndex(wrapper);
    if (turnIndex < 0) return;

    const hasLaterMessages = wrapper.nextElementSibling !== null;
    const message = hasLaterMessages
        ? 'Regenerate this response? All later messages will be deleted.'
        : 'Regenerate this response?';

    showConfirmPopup(message, () => {
        if (userInput) userInput.disabled = true;

        // Remove all DOM elements after this wrapper
        while (wrapper.nextElementSibling) {
            wrapper.nextElementSibling.remove();
        }

        // Clear side buttons and message content
        const sideButtons = wrapper.querySelector('.assistant-side-buttons');
        if (sideButtons) sideButtons.innerHTML = '';
        messageElement.innerHTML = '';

        // Truncate conversation history to the user message that triggered this turn
        let userCount = 0;
        for (let i = 0; i < conversationHistory.length; i++) {
            if (conversationHistory[i].role === 'user') {
                if (userCount === turnIndex) {
                    setConversationHistory(conversationHistory.slice(0, i + 1));
                    break;
                }
                userCount++;
            }
        }

        setCurrentNarratorMessageElement(messageElement);
        setAccumulatedContent('');
        setCurrentTurnToolCalls([]);
        setCurrentTurnThinking('');
        showTypingIndicator();
        socket.emit('retry_response', { turn_index: turnIndex });
    });
}

// Format content for debug display
function formatDebugContent(msg) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        return msg.content.map(block => {
            if (block.type === 'text') return block.text;
            if (block.type === 'tool_use') return `[tool_use: ${block.name}(${JSON.stringify(block.input)})]`;
            return JSON.stringify(block);
        }).join('\n');
    }
    if (typeof msg.content === 'string') return msg.content;
    if (msg.content === null || msg.content === undefined) return '';
    return JSON.stringify(msg.content, null, 2);
}

// Get preview text for a message row
function getPreview(msg) {
    const full = formatDebugContent(msg);
    if (!full) return '';
    const oneline = full.replace(/\n/g, ' ').trim();
    return oneline.length > 120 ? oneline.substring(0, 120) + '...' : oneline;
}

// Show debug conversation viewer
export function exportConversation() {
    socket.emit('get_debug_messages');
}

function renderDebugMessages(messages) {
    debugModalBody.innerHTML = '';
    messages.forEach((msg, i) => {
        // Render separator between previous and current
        if (msg.role === '_separator') {
            const sep = document.createElement('div');
            sep.className = 'debug-separator';
            sep.innerHTML = '<span>' + (msg.content || 'Current Conversation') + '</span>';
            debugModalBody.appendChild(sep);
            return;
        }

        const row = document.createElement('div');
        row.className = 'debug-row';

        const header = document.createElement('div');
        header.className = 'debug-row-header';

        // Role badge
        const badge = document.createElement('span');
        badge.className = 'debug-role-badge debug-role-' + (msg.role || 'unknown');
        badge.textContent = msg.role || 'unknown';
        header.appendChild(badge);

        // Index
        const idx = document.createElement('span');
        idx.className = 'debug-index';
        idx.textContent = '#' + i;
        header.appendChild(idx);

        // Tool call names for assistant with tool_calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            const toolNames = document.createElement('span');
            toolNames.className = 'debug-tool-names';
            toolNames.textContent = msg.tool_calls.map(tc => tc.function?.name || tc.name || '?').join(', ');
            header.appendChild(toolNames);
        }

        // Content preview (middle, flex: 1)
        const preview = document.createElement('span');
        preview.className = 'debug-preview';
        preview.textContent = getPreview(msg);
        header.appendChild(preview);

        // Right-aligned stats (tokens + cost)
        if (msg.role === 'assistant' && msg.usage) {
            const rightStats = document.createElement('span');
            rightStats.className = 'debug-right-stats';

            const total = (msg.usage.prompt_tokens || 0) + (msg.usage.completion_tokens || 0);
            const tokens = document.createElement('span');
            tokens.className = 'debug-tokens';
            tokens.textContent = total.toLocaleString() + ' tok';
            rightStats.appendChild(tokens);

            if (msg.usage.cost !== undefined) {
                const cost = document.createElement('span');
                cost.className = 'debug-cost';
                cost.textContent = '$' + msg.usage.cost.toFixed(4);
                rightStats.appendChild(cost);
            }
            header.appendChild(rightStats);
        }

        row.appendChild(header);

        // Expandable body
        const body = document.createElement('div');
        body.className = 'debug-row-body';
        const pre = document.createElement('pre');
        pre.textContent = formatDebugContent(msg);
        body.appendChild(pre);

        // Show raw JSON for tool_calls, reasoning, usage
        const extras = [];
        if (msg.tool_calls) extras.push(['tool_calls', msg.tool_calls]);
        if (msg.reasoning) extras.push(['reasoning', msg.reasoning]);
        if (msg.usage) extras.push(['usage', msg.usage]);
        extras.forEach(([label, data]) => {
            const section = document.createElement('div');
            section.className = 'debug-extra-section';
            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'debug-extra-label';
            sectionLabel.textContent = label;
            section.appendChild(sectionLabel);
            const sectionPre = document.createElement('pre');
            sectionPre.textContent = JSON.stringify(data, null, 2);
            section.appendChild(sectionPre);
            body.appendChild(section);
        });

        row.appendChild(body);

        // Toggle expand on click
        header.addEventListener('click', () => {
            row.classList.toggle('expanded');
        });

        debugModalBody.appendChild(row);
    });

    debugModal.classList.add('show');
}

// Wire up all socket listeners and form handler
export function initChat() {
    // Message form submit
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const message = userInput.value.trim();
            if (message) {
                socket.emit('user_message', { message });
                userInput.value = '';
                addUserMessage(message);
                const hist = [...conversationHistory];
                hist.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
                setConversationHistory(hist);
                scrollToBottom();
            }
        });
    }

    socket.on('debug_messages', renderDebugMessages);

    socket.on('previous_history', function(history) {
        if (!history || history.length === 0) return;
        const separator = document.createElement('div');
        separator.className = 'history-separator';
        separator.innerHTML = '<span>Previous Conversations</span>';
        chatHistory.appendChild(separator);
        renderHistoryMessages(history);
        const currentSeparator = document.createElement('div');
        currentSeparator.className = 'history-separator current';
        chatHistory.appendChild(currentSeparator);
    });

    socket.on('conversation_history', function(history) {
        setConversationHistory([]);
        renderHistoryMessages(history, true);
        const hist = [];
        history.forEach(function(message) {
            hist.push({ role: message.type, content: message.content, timestamp: message.timestamp || new Date().toISOString() });
        });
        setConversationHistory(hist);
        scrollToBottom();
    });

    socket.on('assistant_ready', function() {
        hideTypingIndicator();
    });

    socket.on('history_archived', function(data) {
        console.log('History archived:', data);
        if (data.success) {
            if (chatHistory) {
                const existingSeparator = chatHistory.querySelector('.history-separator');
                if (!existingSeparator) {
                    const prevSeparator = document.createElement('div');
                    prevSeparator.className = 'history-separator';
                    prevSeparator.innerHTML = '<span>Previous Conversations</span>';
                    chatHistory.insertBefore(prevSeparator, chatHistory.firstChild);
                }
                const currentSeparator = document.createElement('div');
                currentSeparator.className = 'history-separator current';
                chatHistory.appendChild(currentSeparator);
                scrollToBottom();
            }
            setConversationHistory([]);
            setCurrentTurnToolCalls([]);
            setCurrentTurnThinking('');
            setCurrentNarratorMessageElement(null);
            setLastNarratorMessageElement(null);
            setAccumulatedContent('');
            if (userInput) { userInput.disabled = false; userInput.focus(); }
        }
    });

    socket.on('think_start', function() {
        console.log('Model started thinking');
        setIsThinkingInProgress(true);
        setCurrentTurnThinking('');
        ensureAssistantTurnWrapper();
        updateSideButtonsAnimated();
    });

    socket.on('think_end', function() {
        setIsThinkingInProgress(false);
        updateSideButtonsAnimated();
    });

    socket.on('think_output', function(data) {
        setCurrentTurnThinking(currentTurnThinking + data.text);
        updateThinkingPopupContent();
        scrollToBottom();
    });

    socket.on('text_start', function() {
        console.log('Narrator switched to outputting text');
        setIsThinkingInProgress(false);

        if (!currentNarratorMessageElement) {
            let messageWrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress');
            if (messageWrapper) {
                messageWrapper.classList.remove('in-progress');
                let narratorEl = messageWrapper.querySelector('.narrator-message');
                if (narratorEl && narratorEl.classList.contains('narrator-placeholder')) {
                    narratorEl.classList.remove('narrator-placeholder');
                }
                setCurrentNarratorMessageElement(narratorEl);
            } else {
                messageWrapper = document.createElement('div');
                messageWrapper.className = 'assistant-turn-wrapper';
                const sideButtons = document.createElement('div');
                sideButtons.className = 'assistant-side-buttons';
                messageWrapper.appendChild(sideButtons);
                const el = document.createElement('div');
                el.className = 'message narrator-message';
                setCurrentNarratorMessageElement(el);
                messageWrapper.appendChild(el);
                chatHistory.appendChild(messageWrapper);
            }

            currentNarratorMessageElement.style.display = 'none';
            const sideButtons = messageWrapper.querySelector('.assistant-side-buttons');
            if (sideButtons) buildFinalSideButtons(sideButtons);
        } else {
            const wrapper = currentNarratorMessageElement.closest('.assistant-turn-wrapper');
            if (wrapper) {
                const sideButtons = wrapper.querySelector('.assistant-side-buttons');
                if (sideButtons) buildFinalSideButtons(sideButtons);
            }
        }

    });

    socket.on('text_output', function(data) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
        if (currentNarratorMessageElement) {
            currentNarratorMessageElement.style.display = 'block';
            setAccumulatedContent(accumulatedContent + data.text);
            let content = accumulatedContent.trim();
            if (content.includes('<narration>') && !content.includes('</narration>')) {
                content += '</narration>';
            }
            currentNarratorMessageElement.innerHTML = processNarration(content);
        }
    });

    socket.on('tool_request', function(data) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
        console.log('Tool requested:', data);
        setIsToolCallInProgress(true);
        setAccumulatedContent('');
        ensureAssistantTurnWrapper();
        updateSideButtonsAnimated();
    });

    socket.on('tool_submit', function(data) {
        setAccumulatedContent('');
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
        console.log('Tool submitted:', data);
        setIsToolCallInProgress(false);

        const calls = [...currentTurnToolCalls];
        const hist = [...conversationHistory];
        data.tools.forEach(tool => {
            let inputs = tool.inputs;
            if (typeof inputs === 'string') {
                try { inputs = JSON.parse(inputs); } catch (e) { inputs = {}; }
            }
            calls.push({ name: tool.name, inputs: inputs, result: tool.result });
            hist.push({ role: 'tool', name: tool.name, inputs: tool.inputs, result: tool.result, timestamp: new Date().toISOString() });
        });
        setCurrentTurnToolCalls(calls);
        setConversationHistory(hist);

        ensureAssistantTurnWrapper();
        updateSideButtonsAnimated();
    });

    socket.on('turn_end', function(data) {
        if (data && data.cost_stats) updateCostDisplay(data.cost_stats);

        if (currentNarratorMessageElement) {
            const hist = [...conversationHistory];
            hist.push({ role: 'assistant', content: accumulatedContent, timestamp: new Date().toISOString() });
            setConversationHistory(hist);

            const wrapper = currentNarratorMessageElement.closest('.assistant-turn-wrapper');
            if (wrapper) {
                const sideButtons = wrapper.querySelector('.assistant-side-buttons');
                if (sideButtons) buildFinalSideButtons(sideButtons);
            }

            setLastNarratorMessageElement(currentNarratorMessageElement);
            addRetryButton(lastNarratorMessageElement);
        }

        setCurrentNarratorMessageElement(null);
        setCurrentThinkingElement(null);
        setAccumulatedContent('');
        setCurrentTurnToolCalls([]);
        setCurrentTurnThinking('');
        setIsToolCallInProgress(false);
        setIsThinkingInProgress(false);

        if (userInput) { userInput.disabled = false; userInput.focus(); }
    });
}
