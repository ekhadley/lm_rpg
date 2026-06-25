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

The LM receives a system prompt assembled from a core instructions file (core.md) and (optionally) story-specific context: a story plan, player character sheet, and running summary. It responds with narration and can make tool calls — rolling dice, reading/writing named entries of story context — to manage game state across turns.

Story context is not stored as files on disk. It's a keyed collection of text the model reads and writes through its tools; the authoritative copy lives inside the conversation history (see [Story context](#story-context-and-rollback) below). Conversations are stored as JSON in each story's directory and can be archived to start fresh while keeping history accessible.

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
- `history.json` — the conversation **and** all story context (PC sheet, story plan, summary, NPC sheets), stored as per-turn deltas in the history tree
- `previous/` — archived conversation history

Stories are self-contained. You can create, copy, and delete them from the UI. Story context is named with bare identifiers (`pc`, `story_plan`, `story_summary`, `firstname_lastname` for NPCs) — there are no `.md` extensions.

## Frontend

Single-page app, no build step. Left sidebar for story management, center for the chat, right sidebar for viewing the current story context.

The narration uses a book-style layout (EB Garamond). Model thinking, tool calls, and dice rolls appear as small side buttons with hover popups rather than inline, keeping the narrative clean.

Seven themes: Discord, Gruvbox Dark, Leather & Gilt, Tavern, Parchment, Study, Green Lamp.

## Story context and rollback

Story context is a keyed collection of text (`pc`, `story_plan`, NPC sheets, etc.) that the model reads and writes through its tools. It is **never written to disk** — the working copy is an in-memory dict that the tools mutate during a turn, and the authoritative store is the conversation tree itself.

Because the conversation is a branching tree, each turn records the full contents of the entries it changed (a delta); a node's complete context state is a pure function of the active node, reconstructed by replaying deltas root→node. Navigating the tree (regenerate, edit, branch-switch, rollback) just resets the in-memory dict to that node's reconstructed state — no disk side effects. The changed-entries indicator shows up in the debug menu.

Each assistant turn also has a **fork** action (next to rerun/rewind): it spins off a new story whose history is the linear path up to that turn, carrying the story context reconstructed at that point. The source story is left untouched, so forking is a cheap "branch this timeline into its own story."

The model never sees a `.md` extension on context entries — names are bare identifiers throughout.

## TODO

- Cyberpunk RED hard system

- Benchmarking loop for core instructions and system-specific instructions A/B testing
    - maybe full suite with numerical scoring, maybe just a side by side comparator
        - im thinking some kind of lm-arena type loop of generate turns with prompt A and prompt B, select preferred between pairs but where idk which came from which. show win% at the end
    - maybe also for model benchamrking, but models are way easier to evaluate anyways so less value

- extremely extensive story plans just break things. need to limit size or have more complicated scaffolding
    - phandelver story plan (copied verbatim from the book, including lots of 'first time GMing' advice) is ~170k tokens on its own
    - my first thought is to condense the story plan and tailor it more for the form factor. no brainer either way
    - my second thought is that we should have the story plan give a ~30k token overview, with lots of references to blocked sections in a much more in depth guide.
        - This would require new tools for querying story files as well and/or extra delimiters in the detailed story plan for finding specified content chunks.

- experimental: explicit combat boards?
    - little interactive widgets that GM models can query or control and show the state of combat live.
        - for example, the model can have a tool for finding the distance between two points. so it can set up the geometry how it wants and then use that to find geometry for unspecified things like 'can i get to xyz with my movement speed'
    - could even be replayable, show combat events in a timeline, etc
    - image gen for backgrounds/character models?
    - could be pre-prepped

- general issue with dnd: relying on pretraining memory alone leads to lots of rule edition confusions. it really likes 2014 rules it seems?
    - ACTUALLY the story plan itself gives instruction for 2014. so that clearly needs fixing
    - not sure what the solution is here.
    - sub agent for searching rules?
    - maybe just putting a small bit of 2024-specific content in the system rules will key it in better?
    - wait for better model?

- framework for story plan generation?
    - this is of course ideally part of the main app, but I still have no idea what the right workflow is for creating good plans.
        - need to play with the hp system more I think to nail this down
        - it's really hard
    - part of the dream here is that it could be used fully autonomously create story plans without requiring me to audit the full thing so I can remain spoilerless but add still add direction
        - realistic?
        - I could see many a multiple-agents-with-divergent-personalities iterative debate type solution being pretty good
            - check out what cursor did for their web browser demo project thing

- note in `core.md` that replying out of narration in <md> is also appropriate when the user's requested action is impossible or doesn't make sense.
