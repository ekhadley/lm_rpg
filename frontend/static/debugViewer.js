import { socket, debugModal, debugModalBody } from './state.js';

function formatDebugContent(msg) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        return msg.content.map(block => {
            if (block.type === 'text') return block.text;
            if (block.type === 'tool_use') return `[tool_use: ${block.name}(${JSON.stringify(block.input)})]`;
            return JSON.stringify(block);
        }).join('\n');
    }
    if (typeof msg.content === 'string') return msg.content;
    if (msg.content === null || msg.content === undefined) return '';
    return JSON.stringify(msg.content, null, 2);
}

function getPreview(msg) {
    const full = formatDebugContent(msg);
    if (!full) return '';
    const oneline = full.replace(/\n/g, ' ').trim();
    return oneline.length > 120 ? oneline.substring(0, 120) + '...' : oneline;
}

function renderDebugMessages(messages) {
    debugModalBody.innerHTML = '';
    messages.forEach((msg, i) => {
        // Render separator between previous and current
        if (msg.role === '_separator') {
            const sep = document.createElement('div');
            sep.className = 'debug-separator';
            sep.innerHTML = '<span>' + (msg.content || 'Current Conversation') + '</span>';
            debugModalBody.appendChild(sep);
            return;
        }

        const row = document.createElement('div');
        row.className = 'debug-row';

        const header = document.createElement('div');
        header.className = 'debug-row-header';

        // Role badge
        const badge = document.createElement('span');
        badge.className = 'debug-role-badge debug-role-' + (msg.role || 'unknown');
        badge.textContent = msg.role || 'unknown';
        header.appendChild(badge);

        // Index
        const idx = document.createElement('span');
        idx.className = 'debug-index';
        idx.textContent = '#' + i;
        header.appendChild(idx);

        // Tool call names for assistant with tool_calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            const toolNames = document.createElement('span');
            toolNames.className = 'debug-tool-names';
            toolNames.textContent = msg.tool_calls.map(tc => tc.function?.name || tc.name || '?').join(', ');
            header.appendChild(toolNames);
        }

        // Content preview (middle, flex: 1)
        const preview = document.createElement('span');
        preview.className = 'debug-preview';
        preview.textContent = getPreview(msg);
        header.appendChild(preview);

        // Right-aligned stats (tokens + cost)
        if (msg.role === 'assistant' && msg.usage) {
            const rightStats = document.createElement('span');
            rightStats.className = 'debug-right-stats';

            const total = (msg.usage.prompt_tokens || 0) + (msg.usage.completion_tokens || 0);
            const tokens = document.createElement('span');
            tokens.className = 'debug-tokens';
            tokens.textContent = total.toLocaleString() + ' tok';
            rightStats.appendChild(tokens);

            if (msg.usage.cost !== undefined) {
                const cost = document.createElement('span');
                cost.className = 'debug-cost';
                cost.textContent = '$' + msg.usage.cost.toFixed(4);
                rightStats.appendChild(cost);
            }
            header.appendChild(rightStats);
        }

        row.appendChild(header);

        // Expandable body
        const body = document.createElement('div');
        body.className = 'debug-row-body';
        const pre = document.createElement('pre');
        pre.textContent = formatDebugContent(msg);
        body.appendChild(pre);

        // Show raw JSON for tool_calls, reasoning, usage
        const extras = [];
        if (msg.tool_calls) extras.push(['tool_calls', msg.tool_calls]);
        if (msg.reasoning) extras.push(['reasoning', msg.reasoning]);
        if (msg.usage) extras.push(['usage', msg.usage]);
        extras.forEach(([label, data]) => {
            const section = document.createElement('div');
            section.className = 'debug-extra-section';
            const sectionLabel = document.createElement('div');
            sectionLabel.className = 'debug-extra-label';
            sectionLabel.textContent = label;
            section.appendChild(sectionLabel);
            const sectionPre = document.createElement('pre');
            sectionPre.textContent = JSON.stringify(data, null, 2);
            section.appendChild(sectionPre);
            body.appendChild(section);
        });

        row.appendChild(body);

        // Toggle expand on click
        header.addEventListener('click', () => {
            row.classList.toggle('expanded');
        });

        debugModalBody.appendChild(row);
    });

    debugModal.classList.add('show');
}

socket.on('debug_messages', renderDebugMessages);

export function exportConversation() {
    socket.emit('get_debug_messages');
}
