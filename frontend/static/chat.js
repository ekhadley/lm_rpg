import {
    socket, chatHistory, userInput, messageForm,
    conversationHistory, setConversationHistory,
    currentNarratorMessageElement, setCurrentNarratorMessageElement,
    setCurrentThinkingElement,
    lastNarratorMessageElement, setLastNarratorMessageElement,
    accumulatedContent, setAccumulatedContent,
    currentTurnToolCalls, setCurrentTurnToolCalls,
    currentTurnThinking, setCurrentTurnThinking,
    setIsToolCallInProgress, setIsThinkingInProgress,
} from './state.js';
import { scrollToBottom, hideTypingIndicator, updateCostDisplay } from './ui.js';
import {
    splitToolCalls, createThinkingButton, createDiceButton, createToolButton,
    ensureAssistantTurnWrapper, updateSideButtonsAnimated,
    updateThinkingPopupContent, buildFinalSideButtons,
} from './sideButtons.js';
import { addRetryButton, addEditButton } from './messageActions.js';

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

// Add user message to chat
function addUserMessage(message, disableInput = true) {
    if (!chatHistory) return null;
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
    return messageContainer;
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
            if (message.content != "<|begin_conversation|>") {
                const container = addUserMessage(message.content, false);
                if (addRetry && container) addEditButton(container);
            }
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
                const msgContainer = addUserMessage(message);
                if (msgContainer) addEditButton(msgContainer);
                const hist = [...conversationHistory];
                hist.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
                setConversationHistory(hist);
                scrollToBottom();
            }
        });
    }

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
