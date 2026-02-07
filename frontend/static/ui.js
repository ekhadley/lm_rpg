import {
    chatHistory, userInput,
    archiveButton, archivePopup, archivePopupCancel, archivePopupConfirm,
    costButton, costPopup, costTotalTokens, costAvgTokens, costTotalCost, costAvgCost,
    themeToggleBtn,
} from './state.js';

// Layout constants for popup positioning
const EDGE_MARGIN = 8;
const POPUP_FALLBACK = { width: 525, height: 400 };
const ARCHIVE_FALLBACK = { width: 320, height: 150 };

// Scroll
export function scrollToBottom() {
    if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
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

    const centerX = rect.left + rect.width / 2;
    let left = centerX - popupWidth / 2;

    let top;
    if (rect.top - popupHeight - EDGE_MARGIN >= EDGE_MARGIN) {
        top = rect.top - popupHeight - EDGE_MARGIN;
    } else {
        top = rect.bottom + EDGE_MARGIN;
    }

    if (left < EDGE_MARGIN) left = EDGE_MARGIN;
    if (left + popupWidth > window.innerWidth - EDGE_MARGIN) left = window.innerWidth - popupWidth - EDGE_MARGIN;

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
}

export function setupPopupBehavior(container, button, popup) {
    let hoverTimeout = null;

    const showPopup = () => {
        clearTimeout(hoverTimeout);
        positionPopup(button, popup);
        popup.classList.add('visible');
    };

    const hidePopup = () => {
        hoverTimeout = setTimeout(() => {
            if (!popup.classList.contains('pinned')) {
                popup.classList.remove('visible');
            }
        }, 100);
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

// Archive popup
export function positionArchivePopup(button) {
    if (!archivePopup || !button) return;
    const rect = button.getBoundingClientRect();
    const popupWidth = archivePopup.offsetWidth || ARCHIVE_FALLBACK.width;
    const popupHeight = archivePopup.offsetHeight || ARCHIVE_FALLBACK.height;

    let top = rect.bottom + EDGE_MARGIN;
    let left = rect.right - popupWidth;
    if (left < EDGE_MARGIN) left = rect.left;
    if (top + popupHeight > window.innerHeight - EDGE_MARGIN) top = rect.top - popupHeight - EDGE_MARGIN;

    archivePopup.style.top = top + 'px';
    archivePopup.style.left = left + 'px';
}

export function showArchivePopup() {
    if (archivePopup && archiveButton) {
        positionArchivePopup(archiveButton);
        archivePopup.classList.add('visible');
        if (archivePopupCancel) setTimeout(() => archivePopupCancel.focus(), 100);
    }
}

export function hideArchivePopup() {
    if (archivePopup) archivePopup.classList.remove('visible');
}

// Confirm popup
let confirmCallback = null;

export function showConfirmPopup(message, onConfirm) {
    const overlay = document.getElementById('confirm-popup-overlay');
    const msg = document.getElementById('confirm-popup-message');
    if (!overlay || !msg) return;
    msg.textContent = message;
    confirmCallback = onConfirm;
    overlay.classList.add('show');
}

export function hideConfirmPopup() {
    const overlay = document.getElementById('confirm-popup-overlay');
    if (overlay) overlay.classList.remove('show');
    confirmCallback = null;
}

export function initConfirmPopup() {
    const cancelBtn = document.getElementById('confirm-popup-cancel');
    const confirmBtn = document.getElementById('confirm-popup-confirm');
    if (cancelBtn) cancelBtn.addEventListener('click', hideConfirmPopup);
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        hideConfirmPopup();
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
