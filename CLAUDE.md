# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LM RPG is an LLM-powered text RPG engine. A Flask/SocketIO backend streams LLM responses (via OpenRouter) to a vanilla JS frontend. The LLM acts as game master, using tool calls (dice rolls, file read/write) to manage game state. Multiple game systems (Harry Potter, D&D 5e) are pluggable.

## Running

```bash
# From project root, with .venv activated:
python app.py
# Runs on http://localhost:5001
```

Requires `OPENROUTER_API_KEY` in `.env`. Set `DEBUG=1` for verbose logging.

## Project Structure

**Backend flow:** `app.py` (Flask+SocketIO routes) → `narrator.py` (orchestration, system prompt assembly) → `openrouter.py` (SSE streaming, tool call loop) → `model_tools.py` (tool execution)

- **app.py** — Server entry point. SocketIO event handlers for story CRUD (create, copy, delete), user messages, retry, archive. Global `narrator` object holds active state. Serves stories at `/stories/<name>` for direct linking.
- **narrator.py** — Loads story context (plan, PC, summary) into system prompt via XML tags. Dynamically imports system tools via `importlib`. Transforms messages between OpenRouter and frontend formats. Thinking effort set to "xhigh".
- **openrouter.py** — `OpenRouterProvider` manages conversation history and streams responses. `OpenRouterStream` parses SSE with retry logic. Handles reasoning/thinking output (both `delta.reasoning` and `delta.reasoning_details` formats) and multi-turn tool calling loops. Tracks per-message usage/cost data via `getCostStats()`.
- **model_tools.py** — Tool definitions are plain functions with structured docstrings that get auto-parsed into OpenAI function schemas. `Toolbox` class manages registration, schema generation, and execution. Built-in tools: `list_files`, `read_file`, `write_file`, `append_file`, `roll_dice`.
- **callbacks.py** — `WebCallbackHandler` emits SocketIO events for streaming text, thinking, and tool calls to the frontend. Tracks output state transitions.
- **utils.py** — Story/system directory management, history archival (current → `previous/{n}.json`), story copying, colored logging.
- **story_planning_context.md** — Philosophy document for AI GM behavior, referenced when planning stories.

**Frontend** (no build step, vanilla JS with ES6 modules):
- `frontend/templates/index.html` — Single-page app: left sidebar (story list), chat area, right sidebar (story files + system instructions)
- `frontend/static/main.js` — Entry point, imports and initializes all modules
- `frontend/static/state.js` — Centralized state, DOM references, socket connection
- `frontend/static/chat.js` — SocketIO message handlers, Markdown rendering (Marked.js), side button system, retry, debug viewer
- `frontend/static/story.js` — Story list CRUD, context menu, file viewer with collapsible TOC, right sidebar resize
- `frontend/static/ui.js` — Popups (hover + pinnable), cost display, archive/confirm dialogs, theme system
- `frontend/static/dropdowns.js` — Custom dropdown component with keyboard navigation
- `frontend/static/styles.css` — 7 themes (Discord, Gruvbox Dark, Leather & Gilt, Tavern, Parchment, Study, Green Lamp) via CSS variables. Book-style narration (EB Garamond font).

**Game systems** (`systems/{name}/`):
- `instructions.md` — Complete ruleset (required for a system to be valid)
- `tools.py` — Exports `make_toolbox(story_name, system_name)` factory

**Stories** (`stories/{name}/`): Each is a self-contained directory with `info.json`, `history.json`, optional `pc.md`, `story_plan.md`, `story_summary.md`, additional character `.md` files, and a `previous/` folder for archived conversations.

## Key Patterns

- **Tool definitions** use docstring parsing, not decorators: first line is `tool_name: Description`, subsequent lines are `param_name (type): Description`. The function signature + docstring is the schema.
- **Message flow**: User input → SocketIO → narrator → OpenRouter stream → callbacks emit SocketIO events → frontend renders incrementally.
- **System prompt** is assembled from global instructions.md + optional story files, each wrapped in XML tags (`<global_instructions>`, `<story_plan>`, etc.). System prompt is refreshed on history load (live version, not frozen).
- **Side buttons**: Thinking, tool calls, and dice rolls are shown as small buttons on the side of messages with hover/pinnable popups — not inline.
- **History archiving**: Current conversation can be archived to `previous/{n}.json` and a fresh conversation started, with archived history displayed above a separator.
- **No tests or CI** exist currently.
- **No default browser dialogs** — Never use `alert()`, `confirm()`, or `prompt()`. Always use custom-styled popups/modals.

## TODO

- **Large story plan handling** — Need a solution for very large story plans that blow up the system prompt. Probably a short compacted story plan that goes in the system prompt, plus a guide pointing to the full story plan split across smaller files (readable via `read_file` tool).
