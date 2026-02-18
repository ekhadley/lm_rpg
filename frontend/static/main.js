import { userInput, archivePopup, archiveButton, selectStoryConfigModal, copyStoryModal, exportButton, socket, fileViewerOverlay, debugModal, debugModalClose } from './state.js';
import { setPendingStoryName } from './state.js';
import { initAllDropdowns } from './dropdowns.js';
import { initStory, selectStoryDirectly, closeCopyStoryModal } from './story.js';
import { initChat } from './chat.js';
import { exportConversation } from './debugViewer.js';
import {
    setupCostPopupBehavior, initTheme,
    showArchivePopup, hideArchivePopup, positionArchivePopup,
    initConfirmPopup, hideConfirmPopup,
} from './ui.js';

// Initialize dropdowns
initAllDropdowns();

// Initialize story sidebar and modals
initStory();

// Initialize chat socket handlers
initChat();

// Auto-select initial story if provided via URL
if (window.INITIAL_STORY) {
    selectStoryDirectly(window.INITIAL_STORY);
}

// Setup on load
window.onload = function() {
    if (userInput) userInput.focus();
    setupCostPopupBehavior();
    initConfirmPopup();
    initTheme();

    if (exportButton) exportButton.addEventListener('click', exportConversation);
    if (debugModalClose) debugModalClose.addEventListener('click', () => debugModal.classList.remove('show'));

    // Archive button
    if (archiveButton) {
        archiveButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (archivePopup && archivePopup.classList.contains('visible')) hideArchivePopup();
            else showArchivePopup();
        });
    }

    const archivePopupCancel = document.getElementById('archive-popup-cancel');
    const archivePopupConfirm = document.getElementById('archive-popup-confirm');

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

    // Close popups on outside click
    document.addEventListener('click', function(e) {
        if (archivePopup && archivePopup.classList.contains('visible')) {
            if (!archivePopup.contains(e.target) && e.target !== archiveButton) {
                hideArchivePopup();
            }
        }
    });

    // Escape key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (archivePopup && archivePopup.classList.contains('visible')) hideArchivePopup();
            if (selectStoryConfigModal && selectStoryConfigModal.classList.contains('show')) {
                selectStoryConfigModal.classList.remove('show');
                setPendingStoryName(null);
            }
            if (copyStoryModal && copyStoryModal.classList.contains('show')) closeCopyStoryModal();
            if (fileViewerOverlay && fileViewerOverlay.classList.contains('show')) fileViewerOverlay.classList.remove('show');
            if (debugModal && debugModal.classList.contains('show')) debugModal.classList.remove('show');
            hideConfirmPopup();
        }
    });

    // Reposition archive popup on resize
    window.addEventListener('resize', function() {
        if (archivePopup && archivePopup.classList.contains('visible') && archiveButton) {
            positionArchivePopup(archiveButton);
        }
    });
};
