const stripProvider = (model) => model ? model.split('/').pop() : model;

// Date for a story's last activity as mm/dd/yy. Empty for stories with no timestamp.
const formatStoryDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};

import {
    socket, storyList, chatHistory, chatHeader, welcomeWrapper, userInput,
    newStoryBtn, createStoryBtn, createStoryModal, createStoryModalClose, createStoryModalCancel,
    createModelSelect, createSystemSelect,
    selectStoryConfigModal, selectStoryConfigModalClose, selectStoryConfigModalCancel,
    selectStoryConfigBtn, selectStoryModelSelect, selectStorySystemSelect,
    copyStoryModal, copyStoryModalClose, copyStoryModalCancel,
    copyStoryBtn, copyStoryNameInput, copyStoryModelSelect,
    copyPcCheckbox, copyPlanCheckbox, copySummaryCheckbox, copyOtherCheckbox, copyHistoryCheckbox,
    currentStory, setCurrentStory,
    pendingStoryName, setPendingStoryName,
    fileList, rightSidebar,
    fileViewerOverlay, fileViewerTitle, fileViewerBody, fileViewerToc, fileViewerClose,
} from './state.js';
import { showTypingIndicator, showConfirmPopup, positionPopupNear } from './ui.js';

export function addStoryFileToSidebar(filename) {
    if (!fileList || !filename) return;
    if (fileList.querySelector('.file-item[data-filename="' + filename + '"]')) return;
    const li = document.createElement('li');
    li.className = 'file-item';
    li.dataset.filename = filename;
    li.innerHTML = '<i class="fas fa-file-lines"></i>';
    const span = document.createElement('span');
    span.textContent = filename;
    li.appendChild(span);
    fileList.appendChild(li);
}

function setHeaderIcon(system) {
    const icon = document.getElementById('current-story-icon');
    if (!icon) return;
    if (system === 'hp') {
        icon.className = 'story-header-icon hp-logo-icon';
    } else if (system === 'twd') {
        icon.className = 'story-header-icon twd-logo-icon';
    } else if (system === 'dnd5e') {
        icon.className = 'fab fa-d-and-d story-header-icon';
    } else {
        icon.className = 'fas fa-scroll story-header-icon';
    }
    icon.style.display = '';
}

// Switch the UI into the chat view for a selected story (title, icon, model, panels).
function enterStoryView({ storyId, displayName, model, system }) {
    setCurrentStory(storyId);
    const titleEl = document.getElementById('current-story-title');
    if (titleEl) titleEl.textContent = displayName;
    if (system) setHeaderIcon(system);
    const modelSubtext = document.getElementById('current-story-model');
    if (modelSubtext) {
        modelSubtext.textContent = stripProvider(model);
        modelSubtext.style.display = model ? '' : 'none';
    }
    const uuidSubtext = document.getElementById('current-story-uuid');
    if (uuidSubtext) {
        uuidSubtext.textContent = storyId;
        uuidSubtext.style.display = storyId ? '' : 'none';
    }
    if (chatHistory) chatHistory.innerHTML = '';
    if (welcomeWrapper) welcomeWrapper.style.display = 'none';
    if (chatHeader) chatHeader.style.display = 'flex';
    if (rightSidebar) rightSidebar.classList.add('visible');
    showTypingIndicator();
}

// Select a story directly (when info.json exists)
export function selectStoryDirectly(storyId) {
    socket.emit('select_story', { "selected_story": storyId });
    const storyItem = storyList ? storyList.querySelector('.story-item[data-story="' + storyId + '"]') : null;
    const displayName = storyItem ? storyItem.querySelector('.story-name').textContent : storyId;
    const sidebarIcon = storyItem ? storyItem.querySelector('[title]') : null;
    const system = sidebarIcon ? sidebarIcon.getAttribute('title') : null;
    const modelText = storyItem ? storyItem.querySelector('.story-meta').textContent.trim() : '';
    enterStoryView({ storyId, displayName, model: modelText, system });
}

// Add a new story to the sidebar list
export function addNewStory(story) {
    const li = document.createElement('li');
    li.className = 'story-item';
    li.setAttribute('data-story', story.id);

    let icon;
    const system = story.system || 'unknown';
    if (system === 'hp') {
        icon = document.createElement('span');
        icon.className = 'hp-logo-icon';
    } else if (system === 'twd') {
        icon = document.createElement('span');
        icon.className = 'twd-logo-icon';
    } else {
        icon = document.createElement('i');
        icon.className = system === 'dnd5e' ? 'fab fa-d-and-d' : 'fas fa-scroll';
    }
    icon.title = system;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'story-item-content';
    const nameRow = document.createElement('div');
    nameRow.className = 'story-name-row';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'story-name';
    nameSpan.textContent = story.name;
    nameRow.appendChild(nameSpan);
    const metaRow = document.createElement('div');
    metaRow.className = 'story-meta-row';
    const metaSpan = document.createElement('span');
    metaSpan.className = 'story-meta';
    metaSpan.textContent = stripProvider(story.model) || 'unknown';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'story-date';
    dateSpan.textContent = formatStoryDate(story.last_activity);
    metaRow.appendChild(metaSpan);
    metaRow.appendChild(dateSpan);
    contentDiv.appendChild(nameRow);
    contentDiv.appendChild(metaRow);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'story-menu-btn';
    menuBtn.dataset.story = story.id;
    menuBtn.title = 'Story options';
    menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';

    const contextMenu = document.createElement('div');
    contextMenu.className = 'story-context-menu';
    contextMenu.dataset.story = story.id;
    contextMenu.innerHTML = '<div class="context-menu-item" data-action="rename-story"><i class="fas fa-pen"></i><span>Rename Story</span></div><div class="context-menu-item" data-action="copy-story"><i class="fas fa-copy"></i><span>Copy Story</span></div><div class="context-menu-item delete" data-action="delete-story"><i class="fas fa-trash"></i><span>Delete Story</span></div>';

    li.appendChild(icon);
    li.appendChild(contentDiv);
    li.appendChild(menuBtn);
    li.appendChild(contextMenu);
    // Newest story has the most recent activity, so it goes to the top of the list.
    storyList.prepend(li);
}

function closeCopyStoryModal() {
    if (copyStoryModal) copyStoryModal.classList.remove('show');
}

// Turn a story-name span into an editable field for renaming
function startRename(nameSpan) {
    const original = nameSpan.textContent;
    nameSpan.contentEditable = 'true';
    nameSpan.classList.add('editing');
    nameSpan.focus();
    document.getSelection().selectAllChildren(nameSpan);

    let done = false;
    const finish = (commit) => {
        if (done) return;
        done = true;
        nameSpan.contentEditable = 'false';
        nameSpan.classList.remove('editing');
        const newName = nameSpan.textContent.trim();
        if (commit && newName && newName !== original) {
            const storyId = nameSpan.closest('.story-item').dataset.story;
            socket.emit('rename_story', { story_id: storyId, new_name: newName });
            nameSpan.textContent = newName; // optimistic; server confirms via story_renamed
        } else {
            nameSpan.textContent = original;
        }
    };

    nameSpan.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    nameSpan.addEventListener('blur', () => finish(true));
}

export function initStory() {
    // Fill in last-activity dates on the server-rendered story list
    document.querySelectorAll('.story-date[data-ts]').forEach(el => { el.textContent = formatStoryDate(el.dataset.ts); });

    // New Story button opens create modal
    if (newStoryBtn) {
        newStoryBtn.addEventListener('click', () => createStoryModal && createStoryModal.classList.add('show'));
    }

    // Story list click handler
    if (storyList) {
        storyList.addEventListener('click', function(e) {
            if (e.target.closest('.story-name.editing')) return;
            const menuBtn = e.target.closest('.story-menu-btn');
            if (menuBtn) {
                e.stopPropagation();
                const storyItem = menuBtn.closest('.story-item');
                const contextMenu = storyItem.querySelector('.story-context-menu');
                document.querySelectorAll('.story-context-menu.show').forEach(m => m.classList.remove('show'));
                if (contextMenu) {
                    const rect = menuBtn.getBoundingClientRect();
                    contextMenu.style.top = rect.bottom + 'px';
                    contextMenu.style.left = rect.left + 'px';
                    contextMenu.classList.toggle('show');
                }
                return;
            }

            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem && menuItem.dataset.action === 'rename-story') {
                e.stopPropagation();
                const storyItem = menuItem.closest('.story-item');
                menuItem.closest('.story-context-menu').classList.remove('show');
                const nameSpan = storyItem.querySelector('.story-name');
                if (nameSpan) startRename(nameSpan);
                return;
            }
            if (menuItem && menuItem.dataset.action === 'copy-story') {
                e.stopPropagation();
                const storyItem = menuItem.closest('.story-item');
                setPendingStoryName(storyItem.getAttribute('data-story'));
                const displayName = storyItem.querySelector('.story-name').textContent;
                menuItem.closest('.story-context-menu').classList.remove('show');
                if (copyStoryModal) {
                    if (copyStoryNameInput) copyStoryNameInput.value = displayName + ' (copy)';
                    positionPopupNear(copyStoryModal, storyItem);
                }
                return;
            }
            if (menuItem && menuItem.dataset.action === 'delete-story') {
                e.stopPropagation();
                const storyItem = menuItem.closest('.story-item');
                const storyId = storyItem.getAttribute('data-story');
                const displayName = storyItem.querySelector('.story-name').textContent;
                menuItem.closest('.story-context-menu').classList.remove('show');
                showConfirmPopup('Delete "' + displayName + '"? It will be moved to the archive.', () => {
                    socket.emit('delete_story', { story_id: storyId });
                }, storyItem);
                return;
            }

            let storyItem = e.target.closest('.story-item');
            if (storyItem) {
                let storyId = storyItem.getAttribute('data-story');
                const modelSpan = storyItem.querySelector('.story-meta');
                const model = modelSpan ? modelSpan.textContent.trim() : '';

                if (model === 'unknown') {
                    setPendingStoryName(storyId);
                    if (selectStoryConfigModal) selectStoryConfigModal.classList.add('show');
                } else {
                    selectStoryDirectly(storyId);
                }
            }
        });

        document.addEventListener('click', function() {
            document.querySelectorAll('.story-context-menu.show').forEach(m => m.classList.remove('show'));
        });
    }

    // Select story config modal
    if (selectStoryConfigBtn) {
        selectStoryConfigBtn.addEventListener('click', function() {
            if (!pendingStoryName) return;
            const modelName = selectStoryModelSelect.value;
            const systemName = selectStorySystemSelect.value;

            if (storyList) {
                storyList.querySelectorAll('.story-item').forEach(item => {
                    if (item.getAttribute('data-story') === pendingStoryName) {
                        const modelSpan = item.querySelector('.story-meta');
                        if (modelSpan) modelSpan.textContent = stripProvider(modelName);
                    }
                });
            }

            if (selectStoryConfigModal) selectStoryConfigModal.classList.remove('show');

            socket.emit('select_story', {
                "selected_story": pendingStoryName,
                "model_name": modelName,
                "system_name": systemName
            });

            const item = storyList ? storyList.querySelector('.story-item[data-story="' + pendingStoryName + '"]') : null;
            const displayName = item ? item.querySelector('.story-name').textContent : pendingStoryName;
            enterStoryView({ storyId: pendingStoryName, displayName, model: modelName, system: systemName });
            setPendingStoryName(null);
        });
    }

    if (selectStoryConfigModalClose) {
        selectStoryConfigModalClose.addEventListener('click', function() {
            if (selectStoryConfigModal) selectStoryConfigModal.classList.remove('show');
            setPendingStoryName(null);
        });
    }

    if (selectStoryConfigModalCancel) {
        selectStoryConfigModalCancel.addEventListener('click', function() {
            if (selectStoryConfigModal) selectStoryConfigModal.classList.remove('show');
            setPendingStoryName(null);
        });
    }

    if (selectStoryConfigModal) {
        selectStoryConfigModal.addEventListener('click', function(e) {
            if (e.target === selectStoryConfigModal) {
                selectStoryConfigModal.classList.remove('show');
                setPendingStoryName(null);
            }
        });
    }

    // Create story
    if (createStoryBtn) {
        createStoryBtn.addEventListener('click', function() {
            const nameInput = document.getElementById('new_story_name');
            const newStoryName = nameInput.value.trim();
            if (!newStoryName) {
                nameInput.classList.add('input-error');
                nameInput.addEventListener('input', () => nameInput.classList.remove('input-error'), { once: true });
                nameInput.focus();
                return;
            }
            const modelName = createModelSelect.value;
            const systemName = createSystemSelect.value;
            socket.emit('create_story', { story_name: newStoryName, model_name: modelName, system_name: systemName });
            if (createStoryModal) createStoryModal.classList.remove('show');
            const newStoryInput = document.getElementById('new_story_name');
            if (newStoryInput) newStoryInput.value = '';
        });
    }

    // Create modal close/cancel
    if (createStoryModalClose) createStoryModalClose.addEventListener('click', () => createStoryModal && createStoryModal.classList.remove('show'));
    if (createStoryModalCancel) createStoryModalCancel.addEventListener('click', () => createStoryModal && createStoryModal.classList.remove('show'));

    // Copy story modal handlers
    if (copyStoryModalClose) copyStoryModalClose.addEventListener('click', closeCopyStoryModal);
    if (copyStoryModalCancel) copyStoryModalCancel.addEventListener('click', closeCopyStoryModal);
    if (copyStoryModal) {
        document.addEventListener('click', function(e) {
            if (copyStoryModal.classList.contains('show') && !copyStoryModal.contains(e.target)) closeCopyStoryModal();
        });
    }
    if (copyStoryBtn) {
        copyStoryBtn.addEventListener('click', function() {
            const newName = copyStoryNameInput ? copyStoryNameInput.value.trim() : '';
            if (!newName || !pendingStoryName) return;
            const modelName = copyStoryModelSelect.value;
            socket.emit('copy_story', {
                source_story: pendingStoryName,
                new_story_name: newName,
                model_name: modelName,
                copy_pc: copyPcCheckbox ? copyPcCheckbox.checked : true,
                copy_plan: copyPlanCheckbox ? copyPlanCheckbox.checked : true,
                copy_summary: copySummaryCheckbox ? copySummaryCheckbox.checked : true,
                copy_other: copyOtherCheckbox ? copyOtherCheckbox.checked : true,
                copy_history: copyHistoryCheckbox ? copyHistoryCheckbox.checked : true,
            });
            closeCopyStoryModal();
        });
    }

    // Socket listeners
    socket.on('story_created', function(data) { addNewStory(data); });

    socket.on('story_deleted', function(data) {
        const storyId = data.story_id;
        if (storyList) {
            const item = storyList.querySelector('.story-item[data-story="' + storyId + '"]');
            if (item) item.remove();
        }
        if (currentStory === storyId) {
            setCurrentStory(null);
            if (chatHistory) chatHistory.innerHTML = '';
            if (welcomeWrapper) welcomeWrapper.style.display = '';
            if (chatHeader) chatHeader.style.display = 'none';
            if (rightSidebar) rightSidebar.classList.remove('visible');
            if (fileList) fileList.innerHTML = '';
        }
    });

    socket.on('story_copied', function(data) { addNewStory(data); });

    socket.on('story_forked', function(data) { addNewStory(data); selectStoryDirectly(data.id); });

    socket.on('story_renamed', function(data) {
        const { story_id, new_name } = data;
        if (storyList) {
            const item = storyList.querySelector('.story-item[data-story="' + story_id + '"]');
            const nameSpan = item ? item.querySelector('.story-name') : null;
            if (nameSpan) nameSpan.textContent = new_name;
        }
        if (currentStory === story_id) {
            const titleEl = document.getElementById('current-story-title');
            if (titleEl) titleEl.textContent = new_name;
        }
    });

    socket.on('story_locked', function(data) {
        console.log('Story locked with data:', data);
        if (currentStory && storyList) {
            storyList.querySelectorAll('.story-item').forEach(item => {
                if (item.getAttribute('data-story') === currentStory) {
                    const modelSpan = item.querySelector('.story-meta');
                    if (modelSpan && data.model_name) modelSpan.textContent = stripProvider(data.model_name);
                }
            });
        }
        // Populate right sidebar file list
        if (fileList) {
            fileList.innerHTML = '';
            (data.story_context || []).forEach(addStoryFileToSidebar);
        }
        // Update system instructions label
        const label = document.getElementById('system-instructions-label');
        if (label && data.system_name) {
            label.textContent = 'Rulebook';
        }
    });

    // File list click handler
    if (fileList) {
        fileList.addEventListener('click', function(e) {
            const item = e.target.closest('.file-item');
            if (!item || !item.dataset.filename) return;
            socket.emit('get_story_file', { filename: item.dataset.filename });
        });
    }

    // System instructions click handler
    const sysInstrBtn = document.getElementById('system-instructions-btn');
    if (sysInstrBtn) {
        sysInstrBtn.addEventListener('click', () => socket.emit('get_system_instructions'));
    }

    // File viewer response
    socket.on('story_file_content', function(data) {
        if (!fileViewerOverlay) return;
        fileViewerTitle.textContent = data.filename;
        fileViewerBody.innerHTML = marked.parse(data.content);

        // Build TOC from rendered headings
        if (fileViewerToc) {
            fileViewerToc.innerHTML = '';
            // Add resize handle
            const tocResize = document.createElement('div');
            tocResize.className = 'file-viewer-toc-resize';
            fileViewerToc.appendChild(tocResize);
            let tocResizing = false;
            tocResize.addEventListener('mousedown', function(e) {
                tocResizing = true;
                tocResize.classList.add('active');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
            document.addEventListener('mousemove', function(e) {
                if (!tocResizing) return;
                const tocRect = fileViewerToc.getBoundingClientRect();
                const newWidth = Math.max(100, Math.min(400, e.clientX - tocRect.left));
                fileViewerToc.style.width = newWidth + 'px';
            });
            document.addEventListener('mouseup', function() {
                if (!tocResizing) return;
                tocResizing = false;
                tocResize.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            });

            const headings = fileViewerBody.querySelectorAll('h1, h2, h3, h4');
            const tocLinks = [];
            headings.forEach((h, i) => {
                const id = 'fv-heading-' + i;
                const level = parseInt(h.tagName[1]);
                h.id = id;
                const a = document.createElement('a');
                a.href = '#' + id;
                a.className = 'toc-' + h.tagName.toLowerCase();
                a.dataset.level = level;
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    h.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                // Text goes in a span so chevron + text are separate
                const span = document.createElement('span');
                span.textContent = h.textContent;
                a.appendChild(span);
                fileViewerToc.appendChild(a);
                tocLinks.push(a);
            });

            // Add chevrons and collapse all by default
            tocLinks.forEach((link, i) => {
                const level = parseInt(link.dataset.level);
                const next = tocLinks[i + 1];
                if (next && parseInt(next.dataset.level) > level) {
                    const chevron = document.createElement('i');
                    chevron.className = 'fas fa-chevron-down toc-chevron';
                    link.prepend(chevron);
                    link.classList.add('collapsed');
                    // Hide all children
                    let sibling = link.nextElementSibling;
                    while (sibling && parseInt(sibling.dataset.level) > level) {
                        sibling.classList.add('toc-hidden');
                        sibling = sibling.nextElementSibling;
                    }
                }
            });

            // Collapse/expand on chevron click
            fileViewerToc.addEventListener('click', function(e) {
                const chevron = e.target.closest('.toc-chevron');
                if (!chevron) return;
                e.preventDefault();
                e.stopPropagation();
                const link = chevron.closest('a');
                const level = parseInt(link.dataset.level);
                const collapsed = link.classList.toggle('collapsed');
                // Toggle all following deeper-level siblings
                let sibling = link.nextElementSibling;
                while (sibling && parseInt(sibling.dataset.level) > level) {
                    sibling.classList.toggle('toc-hidden', collapsed);
                    // If collapsing, also collapse any nested parents
                    if (collapsed && sibling.querySelector('.toc-chevron')) {
                        sibling.classList.add('collapsed');
                    }
                    sibling = sibling.nextElementSibling;
                }
            });
        }

        fileViewerOverlay.classList.add('show');
    });

    // File viewer close
    if (fileViewerClose) {
        fileViewerClose.addEventListener('click', () => fileViewerOverlay.classList.remove('show'));
    }
    if (fileViewerOverlay) {
        fileViewerOverlay.addEventListener('click', function(e) {
            if (e.target === fileViewerOverlay) fileViewerOverlay.classList.remove('show');
        });
    }

    // Left sidebar resize
    const leftResizeHandle = document.getElementById('sidebar-resize');
    const leftSidebar = document.querySelector('.sidebar');
    if (leftResizeHandle && leftSidebar) {
        let isResizing = false;
        leftResizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            leftResizeHandle.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            const newWidth = Math.max(180, Math.min(500, e.clientX));
            leftSidebar.style.width = newWidth + 'px';
        });
        document.addEventListener('mouseup', function() {
            if (!isResizing) return;
            isResizing = false;
            leftResizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    }

    // Right sidebar resize
    const resizeHandle = document.getElementById('right-sidebar-resize');
    if (resizeHandle && rightSidebar) {
        let isResizing = false;
        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            resizeHandle.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            const newWidth = Math.max(140, Math.min(500, window.innerWidth - e.clientX));
            rightSidebar.style.width = newWidth + 'px';
        });
        document.addEventListener('mouseup', function() {
            if (!isResizing) return;
            isResizing = false;
            resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    }
}

// Expose closeCopyStoryModal for Escape key handler
export { closeCopyStoryModal };
