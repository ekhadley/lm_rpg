import { chatHistory } from './state.js';

const TOOL_DATA_MAX_LEN = 200;

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Abbreviated <code> rendering of tool inputs/results
function abbrev(data) {
    let s = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    if (s.length > TOOL_DATA_MAX_LEN) s = s.substring(0, TOOL_DATA_MAX_LEN) + '...';
    return '<code>' + escapeHtml(s) + '</code>';
}

// The in-progress turn wrapper (live streaming), creating it if absent.
export function ensureLiveWrapper() {
    const existing = chatHistory.querySelector('.assistant-turn-wrapper.in-progress');
    if (existing) return existing;
    const w = document.createElement('div');
    w.className = 'assistant-turn-wrapper in-progress';
    chatHistory.appendChild(w);
    return w;
}

function liveRow(wrapper) {
    return wrapper.querySelector('.reasoning-row.live');
}

// Get the open reasoning row in this wrapper, creating a new (collapsed, live) one if none is open.
export function ensureRow(wrapper) {
    let row = liveRow(wrapper);
    if (row) return row;
    row = document.createElement('div');
    row.className = 'reasoning-row live collapsed';
    const header = document.createElement('div');
    header.className = 'reasoning-header';
    header.innerHTML = '<i class="fas fa-gears"></i>'
        + '<span class="reasoning-title">Reasoning</span>'
        + '<span class="reasoning-dots"><span></span><span></span><span></span></span>'
        + '<i class="fas fa-chevron-down reasoning-caret"></i>';
    header.addEventListener('click', () => row.classList.toggle('collapsed'));
    const body = document.createElement('div');
    body.className = 'reasoning-body';
    row.appendChild(header);
    row.appendChild(body);
    wrapper.appendChild(row);
    return row;
}

// Append reasoning text, merging into the current chunk unless a tool/dice item interrupted it.
export function appendReasoning(wrapper, text) {
    const body = ensureRow(wrapper).querySelector('.reasoning-body');
    let chunk = body.lastElementChild;
    if (!chunk || !chunk.classList.contains('reason-chunk')) {
        chunk = document.createElement('div');
        chunk.className = 'reason-chunk';
        body.appendChild(chunk);
    }
    chunk.textContent += text;
}

export function appendTool(wrapper, tool) {
    const body = ensureRow(wrapper).querySelector('.reasoning-body');
    const el = document.createElement('div');
    el.className = 'reason-tool';
    let html = '<div class="reason-tool-name">' + escapeHtml(tool.name) + '</div>';
    if (tool.inputs && Object.keys(tool.inputs).length > 0) {
        html += '<div class="reason-io"><strong>Inputs:</strong> ' + abbrev(tool.inputs) + '</div>';
    }
    if (tool.result !== undefined && tool.result !== null) {
        html += '<div class="reason-io"><strong>Result:</strong> ' + abbrev(tool.result) + '</div>';
    }
    el.innerHTML = html;
    body.appendChild(el);
}

export function appendDice(wrapper, rolls) {
    const body = ensureRow(wrapper).querySelector('.reasoning-body');
    const el = document.createElement('div');
    el.className = 'reason-dice';
    el.innerHTML = '<i class="fas fa-dice-d20"></i> ' + escapeHtml(rolls.map(r => r.expr + ' → ' + r.result).join(', '));
    body.appendChild(el);
}

// Close any open reasoning row (stops the live "..." animation, reveals the caret).
export function closeRows(wrapper) {
    wrapper.querySelectorAll('.reasoning-row.live').forEach(r => r.classList.remove('live'));
}
