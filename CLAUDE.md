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

- **app.py** — Server entry point. SocketIO event handlers for story CRUD, user messages, retry. Global `narrator` object holds active state.
- **narrator.py** — Loads story context (plan, PC, summary) into system prompt via XML tags. Dynamically imports system tools via `importlib`. Transforms message formats between OpenRouter and frontend.
- **openrouter.py** — `OpenRouterProvider` manages conversation history and streams responses. `OpenRouterStream` parses SSE with retry logic. Handles reasoning/thinking output and multi-turn tool calling loops.
- **model_tools.py** — Tool definitions are plain functions with structured docstrings that get auto-parsed into OpenAI function schemas. `Toolbox` class manages registration, schema generation, and execution.
- **callbacks.py** — `WebCallbackHandler` emits SocketIO events for streaming text, thinking, and tool calls to the frontend. Tracks output state transitions.
- **utils.py** — Story/system directory management, history archival (current → `previous/{n}.json`), colored logging.

**Frontend** (no build step, vanilla JS):
- `frontend/templates/index.html` — Single-page app, split sidebar + chat layout
- `frontend/static/main.js` — SocketIO handlers, message rendering with Markdown (Marked.js), custom dropdowns/modals, theme toggle
- `frontend/static/styles.css` — Two themes (Discord, Gruvbox Dark) via CSS variables

**Game systems** (`systems/{name}/`):
- `instructions.md` — Complete ruleset (required for a system to be valid)
- `tools.py` — Exports `make_toolbox(story_name, system_name)` factory

**Stories** (`stories/{name}/`): Each is a self-contained directory with `info.json`, `history.json`, optional `pc.md`, `story_plan.md`, `story_summary.md`, and a `previous/` folder for archived conversations.

## Key Patterns

- **Tool definitions** use docstring parsing, not decorators: first line is `tool_name: Description`, subsequent lines are `param_name (type): Description`. The function signature + docstring is the schema.
- **Message flow**: User input → SocketIO → narrator → OpenRouter stream → callbacks emit SocketIO events → frontend renders incrementally.
- **System prompt** is assembled from global instructions.md + optional story files, each wrapped in XML tags (`<global_instructions>`, `<story_plan>`, etc.).
- **No tests or CI** exist currently.
