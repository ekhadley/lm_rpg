# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LM RPG is an LLM-powered text RPG engine. A Flask/SocketIO backend streams LLM responses (via OpenRouter) to a vanilla JS frontend. The LLM acts as game master, using tool calls (dice rolls, story-context read/write) to manage game state. Multiple game systems (Harry Potter, D&D 5e, The Walking Dead) are pluggable.

**Story context** (the PC sheet, story plan, summary, NPC sheets) is *not stored as files on disk*. It lives in an in-memory `dict[str, str]` (`narrator.files`) that is the single source of truth for the in-progress turn, and is reconstructed from the history tree on every navigation. The model's file tools (`read_file`/`write_file`/etc.) are just dict operations on this. Entry names are **extensionless** (`pc`, `story_plan`, `story_summary`, `firstname_lastname` for NPCs) — the model never sees a `.md` extension. Only the shared instruction files in `instructions/` are real files on disk, live-read into the system prompt.

## Running

```bash
# From project root, with .venv activated:
python app.py
# Runs on http://localhost:5001
```

Requires `OPENROUTER_API_KEY` in `.env`. Set `DEBUG=1` for verbose logging.

## Project Structure

**Backend flow:** `app.py` (Flask+SocketIO routes) → `narrator.py` (orchestration, system prompt assembly, history tree) → `openrouter.py` (SSE streaming, tool call loop) → `model_tools.py` (tool execution)

- **app.py** — Server entry point. SocketIO event handlers for story CRUD (create, copy, delete), user messages, retry, edit, branch switching, archive, manual story-context edits (`save_story_file` → `narrator.editFile`), and cache-mode setting (a global `settings` dict). Global `narrator` object holds active state. Serves stories at `/stories/<name>` for direct linking.
- **narrator.py** — Owns the `TurnTree` (branching conversation history; see `history.py`) and `self.files`, the in-memory story-context dict (mutated in place during a turn; reset from the tree on every navigation via `_setFiles`). Loads story context (plan, PC, summary) into system prompt via XML tags. Rebuilds the provider's flat message list as `[system] + active branch` on each turn. Looks up the system's toolbox factory in `model_tools.SYSTEM_TOOLBOXES`, passing it `self.files`. Transforms messages between OpenRouter and frontend formats. Branch ops: `regenerate_turn` (retry → new sibling), `edit_turn` (edit → new branch from grandparent), `switch_branch` (navigate siblings). `editFile` persists a manual story-context edit by folding it into the current leaf's `files` delta. Thinking effort set to "max".
- **history.py** — `TurnTree`: a branching tree of turns. Each node is one user message OR one narrator response (the assistant/tool messages from a single tool-calling loop); nodes alternate role down a path. The active path is reconstructed by walking `parent` links up from `current_leaf`. The system message is never stored — it's prepended live when building model context. Each node also carries a `files` **delta** (changed story-context entries that turn; `None` value = tombstone for a deleted entry); `file_state_at(node)` replays deltas root→node to reconstruct full story-context state. This makes the tree the authoritative store for story content and enables rollback. Handles serialize/deserialize and `migrate_from_flat` for legacy flat-list histories.
- **openrouter.py** — `OpenRouterProvider` holds the flat message list (rebuilt by the narrator from the active branch) and streams responses. Supports prompt caching via `cache_mode` ("none" | "5m" | "1h") with a moving cache breakpoint (`_with_cache_anchor`). `OpenRouterStream` parses SSE with retry logic. Handles reasoning/thinking output (both `delta.reasoning` and `delta.reasoning_details` formats) and multi-turn tool calling loops. Tracks per-message usage/cost data via `getCostStats()`.
- **model_tools.py** — Tool definitions are plain functions with structured docstrings that get auto-parsed into OpenAI function schemas. `Toolbox` class manages registration, schema generation, and execution. Args with a default value in the function signature are optional in the schema; the rest are required. `BASE_HANDLERS` (file tools) are shared by every system; each system factory adds its own dice tool. `SYSTEM_TOOLBOXES` maps each system name to a factory; a factory takes the narrator's `files` dict and threads it into every handler as a default kwarg. File tools (`list_files`, `read_file`, `write_file`, `append_file`) are pure dict operations on that in-memory story-context dict — no disk I/O. Entry names are extensionless (the model is never shown or asked for a `.md`). Dice tools: `roll_dice` (string `XdY`, used by `hp`/`twd`) and `dnd_dice` (structured `sides`/`count`/`multiplier`/`bonus`/`advantage`/`disadvantage`/`desc`, used by `dnd5e`).
- **callbacks.py** — `WebCallbackHandler` emits SocketIO events for streaming text, thinking, and tool calls to the frontend. Tracks output state transitions.
- **utils.py** — Story/system directory management, history archival (current → `previous/{n}.json`), story copying, colored logging. `resolveInstructionFile(base)` maps an instruction base name to its on-disk file: `{base}.md` if present, else the highest-numbered `{base}{n}.md` (used by both prompt assembly and app.py's rulebook viewer). `getFullStoryInstruction(system_name, files)` assembles the system prompt from the resolved instruction files plus the in-memory story-context entries. `copyStory` reconstructs the source's story context from its tree (`_sourceFileState`) and, for a no-history copy, seeds a fresh tree whose hidden root carries the selected entries.

**Frontend** (no build step, vanilla JS with ES6 modules):
- `frontend/templates/index.html` — Single-page app: left sidebar (story list), chat area, right sidebar (story context + system instructions)
- `frontend/static/main.js` — Entry point, imports and initializes all modules
- `frontend/static/state.js` — Centralized state, DOM references, socket connection
- `frontend/static/chat.js` — SocketIO message handlers, Markdown rendering (Marked.js), history rendering, `initChat()` wires all socket events
- `frontend/static/reasoningRow.js` — Reasoning row system: collapsible dropdown rows holding the model's reasoning chunks, tool calls, and dice rolls in the order they occurred; assistant turn wrapper management
- `frontend/static/messageActions.js` — Retry and edit-message UI (confirmation popups, DOM manipulation, history truncation)
- `frontend/static/debugViewer.js` — Debug conversation viewer modal (`exportConversation`, message rendering with expandable rows)
- `frontend/static/story.js` — Story list CRUD, context menu, story-context viewer with collapsible TOC and a Raw mode (editable textarea; Save writes back via `save_story_file`), right sidebar resize
- `frontend/static/ui.js` — Popups (hover + pinnable), cost display, archive/confirm dialogs, theme system
- `frontend/static/dropdowns.js` — Custom dropdown component with keyboard navigation
- `frontend/static/styles.css` — 7 themes (Discord, Gruvbox Dark, Leather & Gilt, Tavern, Parchment, Study, Green Lamp) via CSS variables. Book-style narration (EB Garamond font).

**Game systems**:
- `instructions/core*.md` — Shared GM instructions loaded for every system.
- `instructions/{name}*.md` — Per-system ruleset (presence is what makes a system valid).
- Instruction files can be versioned: `resolveInstructionFile` loads `{base}.md` if it exists, otherwise the highest-numbered `{base}{n}.md` (e.g. `core0.md`/`core1.md` → `core1.md`). Lower-numbered versions are kept for comparison/eval.
- Toolbox factory for the system lives in `model_tools.SYSTEM_TOOLBOXES`. Currently registered: `hp`, `dnd5e`, `twd` (all share `BASE_HANDLERS` plus a dice tool). An instruction file with no registered toolbox (e.g. `got.md`) is not an active system.
- Files prefixed with `_` in `instructions/` (e.g. `_story_planning_context.md`, `_hp.md`, `_core.md`) are archived/reference material, not loaded by code.

**Stories** (`stories/{name}/`): Each is a self-contained directory with `info.json`, `history.json`, and an optional `previous/` folder for archived conversations. Story content (PC, plan, summary, NPC sheets) is **not** stored as files here — it rides inside `history.json` as per-turn deltas in the tree. (Pre-refactor story dirs may still contain stray `pc.md` / `story_plan.md` etc.; these are no longer read and are simply ignored — no migration is done.)

## Key Patterns

- **Tool definitions** use docstring parsing, not decorators: first line is `tool_name: Description`, subsequent lines are `param_name (type): Description`. The function signature + docstring is the schema.
- **Message flow**: User input → SocketIO → narrator → OpenRouter stream → callbacks emit SocketIO events → frontend renders incrementally.
- **System prompt** is assembled from the resolved core + system instruction files (real files on disk) + optional story-context entries pulled from the in-memory `files` dict (`story_plan`, `pc`, `story_summary`), each wrapped in XML tags (`<core_instructions>`, `<system_instructions>`, `<story_plan>`, `<player_character>`, `<story_summary>`). System prompt is refreshed on history load (live version, not frozen).
- **Story context is tree-authoritative** (`narrator.files`): a single in-memory `dict[str, str]` mutated in place by the file tools during a turn, then diffed against the parent state to store a `files` delta on the new tree node. On any navigation (load, branch-switch, rollback, retry/edit baseline) it is reset to `file_state_at(target)`. The user can also hand-edit an entry in the file viewer's Raw mode; `narrator.editFile` folds that into the current leaf's delta. No story content is read from or written to disk — `history.json` is the only persistent copy. Names are extensionless; the model never sees `.md`. A crash mid-turn loses the in-progress edits (history.json is only written at end-of-turn) — accepted, and cleaner than partial disk writes.
- **Reasoning rows**: Each assistant turn renders as an ordered stack of collapsible reasoning rows (reasoning chunks + tool calls + dice, in the sequence the model produced them) interleaved with narration blocks. A row shows a "Reasoning" label + gears icon, a `…` animation while reasoning is ongoing, and expands on click. Tool calls use orange styling to stand apart from reasoning text.
- **Branching history (`TurnTree`)**: History is a tree, not a flat list. Retrying a turn adds a new sibling branch; editing a user message branches from the grandparent; the frontend can switch between sibling branches. Only the active path (root → `current_leaf`) is sent to the model. Persisted as a serialized tree in `history.json`; legacy flat histories are migrated on load.
- **History archiving**: Distinct from branching. The whole conversation can be archived to `previous/{n}.json` (e.g. after summarization) and a fresh tree started, with archived history displayed above a separator.
- **No tests or CI** exist currently.
- **No default browser dialogs** — Never use `alert()`, `confirm()`, or `prompt()`. Always use custom-styled popups/modals.
- **UI polish conventions** (all in `styles.css`):
    - Never `transition: all` — list the exact properties that change (e.g. `transition: color, background-color`). `all` forces the browser to watch everything and animates props you didn't intend.
    - Concentric border radius on nested surfaces: outer radius = inner radius + padding between them.
    - `font-variant-numeric: tabular-nums` on any live-updating numbers (costs, branch counters) to stop width jitter.
    - Buttons get `transform: scale(0.96)` on `:active` (never below `0.95`).
    - `text-wrap: balance` on headings, `text-wrap: pretty` on short UI text; leave long book-narration prose on default.

## TODO

- **Large story plan handling** — Need a solution for very large story plans that blow up the system prompt. Probably a short compacted story plan that goes in the system prompt, plus a guide pointing to the full story plan split across smaller files (readable via `read_file` tool).
- **Mechanical annotation system** — In D&D, the GM describes damage narratively but also tells you the exact numbers (e.g. "12 points of damage"). Design a formatting system where the narrator can embed annotations in natural prose that are hoverable (or similar) to reveal mechanical specifics (damage numbers, DC checks, modifiers, etc.). Keeps the narrative immersive while still surfacing the crunch on demand.
