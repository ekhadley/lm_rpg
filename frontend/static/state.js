// Socket connection
export const socket = io();

// DOM elements
export const welcomeWrapper = document.getElementById('welcome-container');
export const chatHeader = document.getElementById('chat-header');
export const chatHistory = document.getElementById('chat-history');
export const userInput = document.getElementById('user-input');
export const messageForm = document.getElementById('message-form');
export const newStoryBtn = document.getElementById('new-story-btn');
export const createStoryBtn = document.getElementById('create-story-btn');
export const createStoryModal = document.getElementById('create-story-modal');
export const createStoryModalClose = document.getElementById('create-story-modal-close');
export const createStoryModalCancel = document.getElementById('create-story-modal-cancel');
export const storyList = document.getElementById('story-list');
export const exportButton = document.getElementById('export-button');
export const rightSidebar = document.getElementById('right-sidebar');
export const fileList = document.getElementById('file-list');
export const fileViewerOverlay = document.getElementById('file-viewer-overlay');
export const fileViewerTitle = document.getElementById('file-viewer-title');
export const fileViewerBody = document.getElementById('file-viewer-body');
export const fileViewerToc = document.getElementById('file-viewer-toc');
export const fileViewerClose = document.getElementById('file-viewer-close');
export const archiveButton = document.getElementById('archive-button');
export const themeToggleBtn = document.getElementById('theme-toggle-btn');
export const archivePopup = document.getElementById('archive-popup');
export const archivePopupCancel = document.getElementById('archive-popup-cancel');
export const archivePopupConfirm = document.getElementById('archive-popup-confirm');
export const costButton = document.getElementById('cost-button');
export const costPopup = document.getElementById('cost-popup');
export const costTotalTokens = document.getElementById('cost-total-tokens');
export const costAvgTokens = document.getElementById('cost-avg-tokens');
export const costTotalCost = document.getElementById('cost-total-cost');
export const costAvgCost = document.getElementById('cost-avg-cost');
export const debugModal = document.getElementById('debug-modal');
export const debugModalBody = document.getElementById('debug-modal-body');
export const debugModalClose = document.getElementById('debug-modal-close');

// Modal dropdown elements
export const createSystemSelectCustom = document.getElementById('create-system-select-custom');
export const createSystemSelectDropdown = document.getElementById('create-system-select-dropdown');
export const createSystemSelect = document.getElementById('create-system-select');
export const createModelSelectCustom = document.getElementById('create-model-select-custom');
export const createModelSelectDropdown = document.getElementById('create-model-select-dropdown');
export const createModelSelect = document.getElementById('create-model-select');

// Select story config modal elements
export const selectStoryConfigModal = document.getElementById('select-story-config-modal');
export const selectStoryConfigModalClose = document.getElementById('select-story-config-modal-close');
export const selectStoryConfigModalCancel = document.getElementById('select-story-config-modal-cancel');
export const selectStoryConfigBtn = document.getElementById('select-story-config-btn');
export const selectStorySystemSelectCustom = document.getElementById('select-story-system-select-custom');
export const selectStorySystemSelectDropdown = document.getElementById('select-story-system-select-dropdown');
export const selectStorySystemSelect = document.getElementById('select-story-system-select');
export const selectStoryModelSelectCustom = document.getElementById('select-story-model-select-custom');
export const selectStoryModelSelectDropdown = document.getElementById('select-story-model-select-dropdown');
export const selectStoryModelSelect = document.getElementById('select-story-model-select');

// Copy story modal elements
export const copyStoryModal = document.getElementById('copy-story-modal');
export const copyStoryModalClose = document.getElementById('copy-story-modal-close');
export const copyStoryModalCancel = document.getElementById('copy-story-modal-cancel');
export const copyStoryBtn = document.getElementById('copy-story-btn');
export const copyStoryNameInput = document.getElementById('copy_story_name');
export const copyAllHistoryCheckbox = document.getElementById('copy_all_history');
export const copyStoryModelSelectCustom = document.getElementById('copy-story-model-select-custom');
export const copyStoryModelSelectDropdown = document.getElementById('copy-story-model-select-dropdown');
export const copyStoryModelSelect = document.getElementById('copy-story-model-select');

// Shared mutable state
export let conversationHistory = [];
export let currentNarratorMessageElement = null;
export let currentThinkingElement = null;
export let currentStory = null;
export let lastNarratorMessageElement = null;
export let accumulatedContent = '';
export let pendingStoryName = null;

// Turn tracking
export let currentTurnToolCalls = [];
export let currentTurnThinking = '';
export let isToolCallInProgress = false;
export let isThinkingInProgress = false;

// State setters (needed because ES module exports are live bindings but not assignable from outside)
export function setConversationHistory(v) { conversationHistory = v; }
export function setCurrentNarratorMessageElement(v) { currentNarratorMessageElement = v; }
export function setCurrentThinkingElement(v) { currentThinkingElement = v; }
export function setCurrentStory(v) { currentStory = v; }
export function setLastNarratorMessageElement(v) { lastNarratorMessageElement = v; }
export function setAccumulatedContent(v) { accumulatedContent = v; }
export function setPendingStoryName(v) { pendingStoryName = v; }
export function setCurrentTurnToolCalls(v) { currentTurnToolCalls = v; }
export function setCurrentTurnThinking(v) { currentTurnThinking = v; }
export function setIsToolCallInProgress(v) { isToolCallInProgress = v; }
export function setIsThinkingInProgress(v) { isThinkingInProgress = v; }
