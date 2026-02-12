import {
    socket, storyList, chatHistory, chatHeader, welcomeWrapper, userInput,
    newStoryBtn, createStoryBtn, createStoryModal, createStoryModalClose, createStoryModalCancel,
    createModelSelect, createSystemSelect,
    selectStoryConfigModal, selectStoryConfigModalClose, selectStoryConfigModalCancel,
    selectStoryConfigBtn, selectStoryModelSelect, selectStorySystemSelect,
    copyStoryModal, copyStoryModalClose, copyStoryModalCancel,
    copyStoryBtn, copyStoryNameInput, copyAllHistoryCheckbox, copyStoryModelSelect,
    currentStory, setCurrentStory,
    pendingStoryName, setPendingStoryName,
    fileList, rightSidebar,
    fileViewerOverlay, fileViewerTitle, fileViewerBody, fileViewerToc, fileViewerClose,
} from './state.js';
import { showTypingIndicator } from './ui.js';

function setHeaderIcon(system) {
    const icon = document.getElementById('current-story-icon');
    if (!icon) return;
    if (system === 'hp') {
        icon.className = 'story-header-icon hp-logo-icon';
    } else if (system === 'dnd5e') {
        icon.className = 'fab fa-d-and-d story-header-icon';
    } else {
        icon.className = 'fas fa-scroll story-header-icon';
    }
    icon.style.display = '';
}

// Select a story directly (when info.json exists)
export function selectStoryDirectly(storyTitle) {
    setCurrentStory(storyTitle);
    socket.emit('select_story', { "selected_story": storyTitle });
    if (document.getElementById('current-story-title')) {
        document.getElementById('current-story-title').textContent = storyTitle;
    }
    const storyItem = storyList ? storyList.querySelector('.story-item[data-story="' + storyTitle + '"]') : null;
    const sidebarIcon = storyItem ? storyItem.querySelector('.hp-logo-icon, i[title]') : null;
    const system = sidebarIcon ? sidebarIcon.getAttribute('title') : null;
    if (system) setHeaderIcon(system);
    const modelText = storyItem ? storyItem.querySelector('.story-meta').textContent.trim() : '';
    const modelSubtext = document.getElementById('current-story-model');
    if (modelSubtext) {
        modelSubtext.textContent = modelText;
        modelSubtext.style.display = modelText ? '' : 'none';
    }
    if (chatHistory) chatHistory.innerHTML = '';
    if (welcomeWrapper) welcomeWrapper.style.display = 'none';
    if (chatHeader) chatHeader.style.display = 'flex';
    if (rightSidebar) rightSidebar.classList.add('visible');
    showTypingIndicator();
}

// Add a new story to the sidebar list
export function addNewStory(story) {
    const li = document.createElement('li');
    li.className = 'story-item';
    li.setAttribute('data-story', story.story_name || story.name);

    let icon;
    const system = story.system || 'unknown';
    if (system === 'hp') {
        icon = document.createElement('span');
        icon.className = 'hp-logo-icon';
    } else {
        icon = document.createElement('i');
        icon.className = system === 'dnd5e' ? 'fab fa-d-and-d' : 'fas fa-scroll';
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'story-item-content';
    const nameRow = document.createElement('div');
    nameRow.className = 'story-name-row';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'story-name';
    nameSpan.textContent = story.story_name || story.name;
    nameRow.appendChild(nameSpan);
    const metaSpan = document.createElement('span');
    metaSpan.className = 'story-meta';
    metaSpan.textContent = story.model || 'unknown';
    contentDiv.appendChild(nameRow);
    contentDiv.appendChild(metaSpan);

    const storyName = story.story_name || story.name;
    const menuBtn = document.createElement('button');
    menuBtn.className = 'story-menu-btn';
    menuBtn.dataset.story = storyName;
    menuBtn.title = 'Story options';
    menuBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';

    const contextMenu = document.createElement('div');
    contextMenu.className = 'story-context-menu';
    contextMenu.dataset.story = storyName;
    contextMenu.innerHTML = '<div class="context-menu-item" data-action="copy-story"><i class="fas fa-copy"></i><span>Copy Story</span></div><div class="context-menu-item delete" data-action="delete-story"><i class="fas fa-trash"></i><span>Delete Story</span></div>';

    li.appendChild(icon);
    li.appendChild(contentDiv);
    li.appendChild(menuBtn);
    li.appendChild(contextMenu);
    storyList.appendChild(li);
}

function closeCopyStoryModal() {
    if (copyStoryModal) copyStoryModal.classList.remove('show');
}

export function initStory() {
    // New Story button opens create modal
    if (newStoryBtn) {
        newStoryBtn.addEventListener('click', () => createStoryModal && createStoryModal.classList.add('show'));
    }

    // Story list click handler
    if (storyList) {
        storyList.addEventListener('click', function(e) {
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
            if (menuItem && menuItem.dataset.action === 'copy-story') {
                e.stopPropagation();
                const storyItem = menuItem.closest('.story-item');
                setPendingStoryName(storyItem.getAttribute('data-story'));
                menuItem.closest('.story-context-menu').classList.remove('show');
                if (copyStoryModal) {
                    if (copyStoryNameInput) copyStoryNameInput.value = pendingStoryName + ' (copy)';
                    copyStoryModal.classList.add('show');
                }
                return;
            }
            if (menuItem && menuItem.dataset.action === 'delete-story') {
                e.stopPropagation();
                const storyItem = menuItem.closest('.story-item');
                const storyName = storyItem.getAttribute('data-story');
                menuItem.closest('.story-context-menu').classList.remove('show');
                if (confirm('Delete "' + storyName + '"? It will be moved to the archive.')) {
                    socket.emit('delete_story', { story_name: storyName });
                }
                return;
            }

            let storyItem = e.target.closest('.story-item');
            if (storyItem) {
                let storyTitle = storyItem.getAttribute('data-story');
                const modelSpan = storyItem.querySelector('.story-meta');
                const model = modelSpan ? modelSpan.textContent.trim() : '';

                if (model === 'unknown') {
                    setPendingStoryName(storyTitle);
                    if (selectStoryConfigModal) selectStoryConfigModal.classList.add('show');
                } else {
                    selectStoryDirectly(storyTitle);
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
            const modelName = selectStoryModelSelect ? selectStoryModelSelect.value : 'openai/gpt-5.2';
            const systemName = selectStorySystemSelect ? selectStorySystemSelect.value : 'hp';

            if (storyList) {
                storyList.querySelectorAll('.story-item').forEach(item => {
                    if (item.getAttribute('data-story') === pendingStoryName) {
                        const modelSpan = item.querySelector('.story-meta');
                        if (modelSpan) modelSpan.textContent = modelName;
                    }
                });
            }

            if (selectStoryConfigModal) selectStoryConfigModal.classList.remove('show');
            setCurrentStory(pendingStoryName);
            setHeaderIcon(systemName);

            socket.emit('select_story', {
                "selected_story": pendingStoryName,
                "model_name": modelName,
                "system_name": systemName
            });

            if (document.getElementById('current-story-title')) {
                document.getElementById('current-story-title').textContent = pendingStoryName;
            }
            const modelSubtext = document.getElementById('current-story-model');
            if (modelSubtext) {
                modelSubtext.textContent = modelName;
                modelSubtext.style.display = modelName ? '' : 'none';
            }
            if (chatHistory) chatHistory.innerHTML = '';
            if (welcomeWrapper) welcomeWrapper.style.display = 'none';
            if (chatHeader) chatHeader.style.display = 'flex';
            if (rightSidebar) rightSidebar.classList.add('visible');
            showTypingIndicator();
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
            const newStoryName = document.getElementById('new_story_name').value.trim();
            if (!newStoryName) { alert('Please enter a story name'); return; }
            const modelName = createModelSelect ? createModelSelect.value : 'openai/gpt-5.2';
            const systemName = createSystemSelect ? createSystemSelect.value : 'hp';
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
        copyStoryModal.addEventListener('click', function(e) {
            if (e.target === copyStoryModal) closeCopyStoryModal();
        });
    }
    if (copyStoryBtn) {
        copyStoryBtn.addEventListener('click', function() {
            const newName = copyStoryNameInput ? copyStoryNameInput.value.trim() : '';
            if (!newName || !pendingStoryName) return;
            const modelName = copyStoryModelSelect ? copyStoryModelSelect.value : 'openai/gpt-5.2';
            const copyAll = copyAllHistoryCheckbox ? copyAllHistoryCheckbox.checked : false;
            socket.emit('copy_story', {
                source_story: pendingStoryName,
                new_story_name: newName,
                model_name: modelName,
                copy_all_history: copyAll,
            });
            closeCopyStoryModal();
        });
    }

    // Socket listeners
    socket.on('story_created', function(data) { addNewStory(data); });

    socket.on('story_deleted', function(data) {
        const storyName = data.story_name;
        if (storyList) {
            const item = storyList.querySelector('.story-item[data-story="' + storyName + '"]');
            if (item) item.remove();
        }
        if (currentStory === storyName) {
            setCurrentStory(null);
            if (chatHistory) chatHistory.innerHTML = '';
            if (welcomeWrapper) welcomeWrapper.style.display = '';
            if (chatHeader) chatHeader.style.display = 'none';
            if (rightSidebar) rightSidebar.classList.remove('visible');
            if (fileList) fileList.innerHTML = '';
        }
    });

    socket.on('story_copied', function(data) { addNewStory(data); });

    socket.on('story_locked', function(data) {
        console.log('Story locked with data:', data);
        if (currentStory && storyList) {
            storyList.querySelectorAll('.story-item').forEach(item => {
                if (item.getAttribute('data-story') === currentStory) {
                    const modelSpan = item.querySelector('.story-meta');
                    if (modelSpan && data.model_name) modelSpan.textContent = data.model_name;
                }
            });
        }
        // Populate right sidebar file list
        if (fileList) {
            fileList.innerHTML = '';
            (data.story_files || []).forEach(filename => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.dataset.filename = filename;
                li.innerHTML = '<i class="fas fa-file-lines"></i>';
                const span = document.createElement('span');
                span.textContent = filename;
                li.appendChild(span);
                fileList.appendChild(li);
            });
        }
        // Update system instructions label
        const label = document.getElementById('system-instructions-label');
        if (label && data.system_name) {
            label.textContent = data.system_name + ' instructions';
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
