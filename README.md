# LM RPG

A text RPG engine where a language model acts as game master. You play a character; the LM runs the world, rolls dice, tracks state, and narrates outcomes. Responses are streamed in real time.

Built with Flask/SocketIO on the backend and vanilla JS on the frontend. LLM calls go through OpenRouter.

## Setup

Requires Python 3.13+. Uses [uv](https://github.com/astral-sh/uv) for dependency management.

```bash
uv sync
cp .env.example .env  # add your OPENROUTER_API_KEY
```

## Running

```bash
uv run python app.py
```

Runs on `http://localhost:5001`. Set `DEBUG=1` for verbose logging.

## How It Works

The LM receives a system prompt assembled from a core instructions file (core.md)  and (optionally) story-specific context: a story plan, player character sheet, and running summary. It responds with narration and can make tool calls — rolling dice, reading/writing files in the story directory — to manage game state across turns.

Conversations are stored as JSON in each story's directory and can be archived to start fresh while keeping history accessible.

## Game Systems

A game system is defined by:

- `instructions.md` — the ruleset and world context the LM follows
- Optionally, a `tools.py` providing system-specific tools (e.g. character sheet manipulation)

The core instructions (`instructions/core.md`) define system-agnostic GM behavior: how to handle player intent, when to roll dice, how to narrate. Each game system's instructions layer on top of that with specific mechanics and setting.

Game systems are divided into 'hard' systems and 'soft' systems. Hard systems are more like typical DnD (more dice rolling, characters with speficic stat sheets, predefined ability mechanics, etc), soft systems are more like a choose your own adventure type resolution system (outcomes determined more by holistic GM discretion and narrative considerations), although dice are still used where randomness is needed. core.md references both types and how to run them.

Current systems include D&D 5e (hard), Harry Potter (hard), and Game of Thrones (soft).

## Stories

Each story lives in `stories/{name}/` and contains:

- `info.json` — metadata (which game system, model, etc.)
- `history.json` — the conversation
- `pc.md` — player character description/sheet
- `story_plan.md` — GM-facing plot outline
- `story_summary.md` — running summary of events
- `previous/` — archived conversation history

Stories are self-contained. You can create, copy, and delete them from the UI.

## Frontend

Single-page app, no build step. Left sidebar for story management, center for the chat, right sidebar for viewing/editing story files.

The narration uses a book-style layout (EB Garamond). Model thinking, tool calls, and dice rolls appear as small side buttons with hover popups rather than inline, keeping the narrative clean.

Seven themes: Discord, Gruvbox Dark, Leather & Gilt, Tavern, Parchment, Study, Green Lamp.

## Per-turn file state

Story files are mutated by tool calls, but the conversation is a branching tree, so the file state on disk has to follow the active branch. Each turn records the full contents of the files it changed (a delta); a node's complete file state is reconstructed by replaying deltas root→node. Navigating the tree (regenerate, edit, branch-switch, rollback) restores that node's files to disk before continuing, so the model always sees the files as they were at that point. The changed-files indicator shows up in the debug menu.

## TODO

- Cyberpunk RED hard system
- Benchmarking framework primarily for core instructions and system-specific instructions A/B testing, but also for model benchamrking
- **Scratchpad file model (considered, tabled).** Story files only ever need to be named chunks of text the model reads and writes — the on-disk files are incidental. Making the `TurnTree` the sole store (files live as deltas on nodes, never written to disk) would delete the whole snapshot/diff/materialize layer: per-turn deltas come straight from the tools (no before/after diffing), and navigation becomes a pure leaf move with zero side effects, since file state is a pure function of the active node. Costs: system-prompt assembly, the sidebar viewer, and story seeding all currently read files off disk and would read from the tree instead; in-app editing would replace external-editor editing (write a new delta from the sidebar); `core.md`/`{system}.md` stay disk-backed (shared, dev-authored). The granular `copyStory` options become unnecessary — copy-at-a-point-in-time is just branching.
