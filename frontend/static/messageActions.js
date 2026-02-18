import {
    socket, chatHistory, userInput,
    conversationHistory, setConversationHistory,
    setCurrentNarratorMessageElement,
    setAccumulatedContent,
    setCurrentTurnToolCalls, setCurrentTurnThinking,
} from './state.js';
import { showTypingIndicator, showConfirmPopup } from './ui.js';

export function addRetryButton(messageElement) {
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

export function addEditButton(userMessageContainer) {
    const userMsg = userMessageContainer.querySelector('.user-message');
    if (!userMsg || userMsg.querySelector('.edit-button')) return;
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const btn = document.createElement('button');
    btn.className = 'edit-button';
    btn.innerHTML = '<i class="fas fa-pencil"></i>';
    btn.title = 'Edit this message';
    btn.addEventListener('click', () => startEditing(userMessageContainer));
    actions.appendChild(btn);
    userMsg.appendChild(actions);
}

function startEditing(userMessageContainer) {
    if (userInput && userInput.disabled) return;
    const userMsg = userMessageContainer.querySelector('.user-message');
    if (!userMsg || userMsg.classList.contains('editing')) return;
    const originalText = userMsg.childNodes[0].textContent;
    userMsg.classList.add('editing');
    userMsg.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = originalText;
    textarea.rows = Math.max(1, Math.ceil(originalText.length / 60));
    const editActions = document.createElement('div');
    editActions.className = 'edit-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-save-btn';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.title = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.innerHTML = '<i class="fas fa-xmark"></i>';
    cancelBtn.title = 'Cancel';
    editActions.appendChild(saveBtn);
    editActions.appendChild(cancelBtn);
    userMsg.appendChild(textarea);
    userMsg.appendChild(editActions);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    function cancel() {
        userMsg.classList.remove('editing');
        userMsg.innerHTML = '';
        userMsg.textContent = originalText;
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        const btn = document.createElement('button');
        btn.className = 'edit-button';
        btn.innerHTML = '<i class="fas fa-pencil"></i>';
        btn.title = 'Edit this message';
        btn.addEventListener('click', () => startEditing(userMessageContainer));
        actions.appendChild(btn);
        userMsg.appendChild(actions);
    }

    function save() {
        const newText = textarea.value.trim();
        if (!newText || newText === originalText) { cancel(); return; }
        userMsg.classList.remove('editing');
        userMsg.innerHTML = '';
        userMsg.textContent = newText;
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        const btn = document.createElement('button');
        btn.className = 'edit-button';
        btn.innerHTML = '<i class="fas fa-pencil"></i>';
        btn.title = 'Edit this message';
        btn.addEventListener('click', () => startEditing(userMessageContainer));
        actions.appendChild(btn);
        userMsg.appendChild(actions);
        handleEditMessage(userMessageContainer, newText);
    }

    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', cancel);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
        if (e.key === 'Escape') cancel();
    });
}

function handleEditMessage(userMessageContainer, newText) {
    // Find the assistant-turn-wrapper that follows this user message
    let nextEl = userMessageContainer.nextElementSibling;
    while (nextEl && !nextEl.classList.contains('assistant-turn-wrapper')) {
        nextEl = nextEl.nextElementSibling;
    }
    if (!nextEl) return;
    const wrapper = nextEl;
    const turnIndex = getTurnIndex(wrapper);
    if (turnIndex < 0) return;

    const hasLaterMessages = wrapper.nextElementSibling !== null;
    const doEdit = () => {
        if (userInput) userInput.disabled = true;

        // Remove the assistant wrapper and everything after it
        while (userMessageContainer.nextElementSibling) {
            userMessageContainer.nextElementSibling.remove();
        }

        // Truncate conversation history and update the user message content
        let userCount = 0;
        for (let i = 0; i < conversationHistory.length; i++) {
            if (conversationHistory[i].role === 'user') {
                if (userCount === turnIndex) {
                    const truncated = conversationHistory.slice(0, i + 1);
                    truncated[i] = { ...truncated[i], content: newText };
                    setConversationHistory(truncated);
                    break;
                }
                userCount++;
            }
        }

        // Create a fresh assistant wrapper for the new response
        const newWrapper = document.createElement('div');
        newWrapper.className = 'assistant-turn-wrapper';
        const sideButtons = document.createElement('div');
        sideButtons.className = 'assistant-side-buttons';
        newWrapper.appendChild(sideButtons);
        const narratorEl = document.createElement('div');
        narratorEl.className = 'message narrator-message';
        newWrapper.appendChild(narratorEl);
        chatHistory.appendChild(newWrapper);

        setCurrentNarratorMessageElement(narratorEl);
        setAccumulatedContent('');
        setCurrentTurnToolCalls([]);
        setCurrentTurnThinking('');
        showTypingIndicator();
        socket.emit('edit_message', { turn_index: turnIndex, new_content: newText });
    };

    if (hasLaterMessages) {
        showConfirmPopup('Edit this message? All later messages will be deleted.', doEdit);
    } else {
        doEdit();
    }
}
