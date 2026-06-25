import {
    chatHistory, userInput,
    summarizeButton, summarizePopup, summarizePopupCancel, summarizePopupConfirm,
    costButton, costPopup, costTotalTokens, costAvgTokens, costTotalCost, costAvgCost, costLastTurn,
    themeToggleBtn,
    settingsBtn, settingsModal, settingsModalClose, cacheModeSelect,
    socket,
} from './state.js';

// Layout constants for popup positioning
const EDGE_MARGIN = 8;
const POPUP_FALLBACK = { width: 525, height: 400 };
const SUMMARIZE_FALLBACK = { width: 320, height: 150 };

// Scroll — track whether the view is "stuck" to the bottom so streaming text
// follows along only when the user hasn't scrolled up to read.
let stickToBottom = true;

export function scrollToBottom() {
    if (!chatHistory) return;
    chatHistory.scrollTop = chatHistory.scrollHeight;
    stickToBottom = true;
}

// Scroll to bottom only if the user is currently pinned there (didn't scroll up).
export function scrollToBottomIfStuck() {
    if (stickToBottom) scrollToBottom();
}

if (chatHistory) {
    chatHistory.addEventListener('scroll', () => {
        const dist = chatHistory.scrollHeight - chatHistory.scrollTop - chatHistory.clientHeight;
        stickToBottom = dist < 80;
    });
}

// Typing indicator
export function showTypingIndicator() {
    if (chatHistory) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.textContent = '.';
        chatHistory.appendChild(typingIndicator);
    }
}

export function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Popup positioning (used by side buttons)
export function positionPopup(button, popup) {
    const rect = button.getBoundingClientRect();
    const popupWidth = popup.offsetWidth || POPUP_FALLBACK.width;
    const popupHeight = popup.offsetHeight || POPUP_FALLBACK.height;

    let left;
    if (rect.right + EDGE_MARGIN + popupWidth <= window.innerWidth - EDGE_MARGIN) {
        left = rect.right + EDGE_MARGIN;
    } else {
        left = rect.left - EDGE_MARGIN - popupWidth;
    }

    const centerY = rect.top + rect.height / 2;
    let top = centerY - popupHeight / 2;
    if (top < EDGE_MARGIN) top = EDGE_MARGIN;
    if (top + popupHeight > window.innerHeight - EDGE_MARGIN) top = window.innerHeight - popupHeight - EDGE_MARGIN;

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
}

export function setupPopupBehavior(container, button, popup) {
    const showPopup = () => {
        positionPopup(button, popup);
        popup.classList.add('visible');
    };

    const hidePopup = () => {
        if (!popup.classList.contains('pinned')) {
            popup.classList.remove('visible');
        }
    };

    container.addEventListener('mouseenter', showPopup);
    container.addEventListener('mouseleave', hidePopup);
    popup.addEventListener('mouseenter', showPopup);
    popup.addEventListener('mouseleave', hidePopup);

    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isPinned = popup.classList.toggle('pinned');
        button.classList.toggle('pinned', isPinned);
        if (isPinned) {
            positionPopup(button, popup);
            popup.classList.add('visible');
        }
    });

    document.addEventListener('click', (e) => {
        if (popup.classList.contains('pinned') &&
            !container.contains(e.target) &&
            !popup.contains(e.target)) {
            popup.classList.remove('pinned', 'visible');
            button.classList.remove('pinned');
        }
    });

    if (chatHistory) {
        chatHistory.addEventListener('scroll', () => {
            if (popup.classList.contains('visible') || popup.classList.contains('pinned')) {
                positionPopup(button, popup);
            }
        });
    }
}

// Cost display
export function updateCostDisplay(stats) {
    if (costTotalTokens) costTotalTokens.textContent = stats.total_tokens.toLocaleString();
    if (costAvgTokens) costAvgTokens.textContent = stats.avg_tokens_per_turn.toLocaleString();
    if (costTotalCost) costTotalCost.textContent = '$' + stats.total_cost.toFixed(4);
    if (costAvgCost) costAvgCost.textContent = '$' + stats.avg_cost_per_turn.toFixed(4);
    if (costLastTurn) costLastTurn.textContent = '$' + (stats.last_turn_cost || 0).toFixed(4);
}

export function setupCostPopupBehavior() {
    if (!costButton || !costPopup) return;
    let hoverTimeout = null;

    const showCostPopup = () => {
        clearTimeout(hoverTimeout);
        costPopup.classList.add('visible');
    };
    const hideCostPopup = () => {
        hoverTimeout = setTimeout(() => costPopup.classList.remove('visible'), 100);
    };

    costButton.addEventListener('mouseenter', showCostPopup);
    costButton.addEventListener('mouseleave', hideCostPopup);
    costPopup.addEventListener('mouseenter', showCostPopup);
    costPopup.addEventListener('mouseleave', hideCostPopup);
}

// Summarize popup
export function positionSummarizePopup(button) {
    if (!summarizePopup || !button) return;
    const rect = button.getBoundingClientRect();
    const popupWidth = summarizePopup.offsetWidth || SUMMARIZE_FALLBACK.width;
    const popupHeight = summarizePopup.offsetHeight || SUMMARIZE_FALLBACK.height;

    let top = rect.bottom + EDGE_MARGIN;
    let left = rect.right - popupWidth;
    if (left < EDGE_MARGIN) left = rect.left;
    if (top + popupHeight > window.innerHeight - EDGE_MARGIN) top = rect.top - popupHeight - EDGE_MARGIN;

    summarizePopup.style.top = top + 'px';
    summarizePopup.style.left = left + 'px';
}

export function showSummarizePopup() {
    if (summarizePopup && summarizeButton) {
        positionSummarizePopup(summarizeButton);
        summarizePopup.classList.add('visible');
        if (summarizePopupCancel) setTimeout(() => summarizePopupCancel.focus(), 100);
    }
}

export function hideSummarizePopup() {
    if (summarizePopup) summarizePopup.classList.remove('visible');
}

// Position a side popup next to an anchor element, clamped to the viewport.
export function positionPopupNear(popup, anchorEl) {
    popup.classList.add('show');
    const a = anchorEl.getBoundingClientRect();
    const p = popup.getBoundingClientRect();
    const pad = 8;
    let left = a.right + pad;
    if (left + p.width > window.innerWidth - pad) left = a.left - p.width - pad;
    if (left < pad) left = pad;
    let top = a.top;
    if (top + p.height > window.innerHeight - pad) top = window.innerHeight - p.height - pad;
    if (top < pad) top = pad;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

// Confirm popup
let confirmCallback = null;

export function showConfirmPopup(message, onConfirm, anchorEl) {
    const popup = document.getElementById('confirm-popup');
    const msg = document.getElementById('confirm-popup-message');
    if (!popup || !msg) return;
    msg.textContent = message;
    confirmCallback = onConfirm;
    positionPopupNear(popup, anchorEl || document.body);
}

export function hideConfirmPopup() {
    const popup = document.getElementById('confirm-popup');
    if (popup) popup.classList.remove('show');
    confirmCallback = null;
}

// Fork popup: a name field + Fork/Cancel. onConfirm receives the entered name.
let forkCallback = null;

export function showForkPopup(defaultName, onConfirm, anchorEl) {
    const popup = document.getElementById('fork-popup');
    const input = document.getElementById('fork-popup-name');
    if (!popup || !input) return;
    input.value = defaultName || '';
    forkCallback = onConfirm;
    positionPopupNear(popup, anchorEl || document.body);
    input.focus();
    input.select();
}

export function hideForkPopup() {
    const popup = document.getElementById('fork-popup');
    if (popup) popup.classList.remove('show');
    forkCallback = null;
}

export function initForkPopup() {
    const cancelBtn = document.getElementById('fork-popup-cancel');
    const confirmBtn = document.getElementById('fork-popup-confirm');
    const input = document.getElementById('fork-popup-name');
    const submit = () => {
        const name = input.value.trim();
        if (name && forkCallback) forkCallback(name);
        hideForkPopup();
    };
    if (cancelBtn) cancelBtn.addEventListener('click', hideForkPopup);
    if (confirmBtn) confirmBtn.addEventListener('click', submit);
    if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
        else if (e.key === 'Escape') { e.preventDefault(); hideForkPopup(); }
    });
    document.addEventListener('click', function(e) {
        const popup = document.getElementById('fork-popup');
        if (popup && popup.classList.contains('show') && !popup.contains(e.target)) hideForkPopup();
    });
}

export function initConfirmPopup() {
    const cancelBtn = document.getElementById('confirm-popup-cancel');
    const confirmBtn = document.getElementById('confirm-popup-confirm');
    if (cancelBtn) cancelBtn.addEventListener('click', hideConfirmPopup);
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        hideConfirmPopup();
    });
    document.addEventListener('click', function(e) {
        const popup = document.getElementById('confirm-popup');
        if (popup && popup.classList.contains('show') && !popup.contains(e.target)) hideConfirmPopup();
    });
}

// Settings
export function getCacheMode() {
    return localStorage.getItem('cacheMode') || '1h';
}

export function initSettings() {
    if (!settingsBtn || !settingsModal) return;

    // Sync the dropdown to the saved value, then start listening for changes
    if (cacheModeSelect) {
        cacheModeSelect.value = getCacheMode();
        cacheModeSelect.dispatchEvent(new Event('change'));  // update custom dropdown display
        cacheModeSelect.addEventListener('change', () => {
            localStorage.setItem('cacheMode', cacheModeSelect.value);
            socket.emit('set_settings', { cache_mode: cacheModeSelect.value });
        });
    }

    // Push the saved setting to the server now and on every (re)connect
    socket.emit('set_settings', { cache_mode: getCacheMode() });
    socket.on('connect', () => socket.emit('set_settings', { cache_mode: getCacheMode() }));

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
    if (settingsModalClose) settingsModalClose.addEventListener('click', () => settingsModal.classList.remove('show'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('show');
    });
}

// Theme
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'discord';
}

export function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // Update active state in picker
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTheme(savedTheme);

    const picker = document.getElementById('theme-picker');

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        picker.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
        if (picker && !picker.contains(e.target) && e.target !== themeToggleBtn) {
            picker.classList.remove('visible');
        }
    });

    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Set initial active state
    setTheme(getCurrentTheme());
}
