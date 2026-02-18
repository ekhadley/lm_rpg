import {
    chatHistory,
    currentNarratorMessageElement,
    currentTurnToolCalls, currentTurnThinking,
    isToolCallInProgress, isThinkingInProgress,
} from './state.js';
import { setupPopupBehavior } from './ui.js';

const TOOL_DATA_MAX_LEN = 200;

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

export function splitToolCalls(toolCalls) {
    const diceRolls = [];
    const otherTools = [];
    toolCalls.forEach(tool => {
        if (tool.name === 'roll_dice') diceRolls.push(tool);
        else otherTools.push(tool);
    });
    return { diceRolls, otherTools };
}

export function createThinkingButton(thinkingContent, isAnimating) {
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

export function createDiceButton(diceRolls, isAnimating) {
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

export function createToolButton(toolCalls, isAnimating) {
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

export function ensureAssistantTurnWrapper() {
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

export function updateSideButtonsAnimated() {
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

export function updateThinkingPopupContent() {
    const wrapper = chatHistory.querySelector('.assistant-turn-wrapper.in-progress') ||
                    (currentNarratorMessageElement && currentNarratorMessageElement.closest('.assistant-turn-wrapper'));
    if (!wrapper) return;
    const thinkingPopup = wrapper.querySelector('.thinking-popup .popup-content');
    if (thinkingPopup) {
        thinkingPopup.textContent = currentTurnThinking || 'Thinking...';
        thinkingPopup.scrollTop = thinkingPopup.scrollHeight;
    }
}

export function buildFinalSideButtons(sideButtons) {
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
