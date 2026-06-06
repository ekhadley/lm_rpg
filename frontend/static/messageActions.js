import {
    socket, chatHistory, userInput,
    setCurrentNarratorMessageElement,
    setAccumulatedContent,
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

function handleRetryResponse(messageElement) {
    if (userInput && userInput.disabled) return;

    const wrapper = messageElement.closest('.assistant-turn-wrapper');
    if (!wrapper) return;
    const turnId = wrapper.dataset.turnId;
    if (!turnId) return;

    showConfirmPopup('Regenerate this response?', () => {
        if (userInput) userInput.disabled = true;

        // Optimistically clear this response (and later DOM, now off-branch). The
        // authoritative re-render arrives via conversation_history when the run ends.
        while (wrapper.nextElementSibling) wrapper.nextElementSibling.remove();
        wrapper.innerHTML = '';
        wrapper.classList.add('in-progress');

        setCurrentNarratorMessageElement(null);
        setAccumulatedContent('');
        showTypingIndicator();
        socket.emit('retry_response', { turn_id: turnId });
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
    if (userInput && userInput.disabled) return;
    const turnId = userMessageContainer.dataset.turnId;
    if (!turnId) return;
    if (userInput) userInput.disabled = true;

    // Optimistically drop everything after the edited message (now off-branch) and
    // stream the new response into a fresh wrapper; conversation_history re-renders at the end.
    while (userMessageContainer.nextElementSibling) userMessageContainer.nextElementSibling.remove();

    const newWrapper = document.createElement('div');
    newWrapper.className = 'assistant-turn-wrapper in-progress';
    chatHistory.appendChild(newWrapper);

    setCurrentNarratorMessageElement(null);
    setAccumulatedContent('');
    showTypingIndicator();
    socket.emit('edit_message', { turn_id: turnId, new_content: newText });
}
