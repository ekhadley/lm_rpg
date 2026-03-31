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

The LM receives a system prompt assembled from a core instructions file and (optionally) story-specific context: a story plan, player character sheet, and running summary. It responds with narration and can make tool calls — rolling dice, reading/writing files in the story directory — to manage game state across turns.

Conversations are stored as JSON in each story's directory and can be archived to start fresh while keeping history accessible.

## Game Systems

A game system is defined by:

- `instructions.md` — the ruleset and world context the LM follows
- Optionally, a `tools.py` providing system-specific tools (e.g. character sheet manipulation)

The core instructions (`instructions/core.md`) define system-agnostic GM behavior: how to handle player intent, when to roll dice, how to narrate. Each game system's instructions layer on top of that with specific mechanics and setting.

Current systems include D&D 5e (hard system with full mechanical resolution) and a Harry Potter setting (soft system with freeform dice).

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
