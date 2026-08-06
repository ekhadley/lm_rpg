# Prompt Studio — side-by-side completions across instruction versions

## Context

Instruction files carry integer versions (`core0.md`, `core1.md`, …; `utils._resolveInstructionFile`
takes the highest by default). There's no way to see what a prompt edit actually changes about GM
behavior — it's judged by feel.

**v1 is a comparison tool, not an eval.** No judging, no rubric, no scoring. It generates completions
side by side from the *same model* at the *same story point* under *two different instruction versions*,
so differences can be read directly. Automatic judging + rubrics come later and will consume the JSON
this writes.

Note: `core1.md` is currently `core0.md` minus the `## Self-Evaluation` section, and nothing in the code
ever sends the System instructions that section describes — so that particular pair is expected to show
little difference. It's a smoke test for the tool, not a meaningful comparison.

## Shape

- **Capture**: a button on any assistant turn copies the story state *at that point* into
  `./eval_stories/<id>/` (same on-disk shape as `./stories/`). It does **not** switch views.
- **Studio mode**: a toggle at the top of the left sidebar. On, the sidebar lists captured test turns
  (like the story list). Grouping/organization comes later.
- **Compare**: pick a test turn → choose an instruction base (default `core`), version **A** and version
  **B**, N completions per version, and a model → generate **2N** completions, streamed live into two
  columns.
- Studio runs never touch the story tree or the global narrator; each completion gets its own provider
  over its own `files` copy, read from the frozen test turn.

## Backend

### `utils.py`
- `_resolveInstructionFile(base, version=None)` — when `version` is given, return
  `{INSTRUCTIONS_DIR}/{base}{version}.md` and assert it exists (loud, no fallback); else current logic.
- `getFullStoryInstruction(system_name, files, versions=None)` — thread a `{base: int}` dict into the
  `core` and `system_name` lookups. `versions=None` → unchanged production behavior, so `narrator.py`
  needs no edits.
- `listInstructionVersions(base) -> list[int]` — powers the UI version picker.
- `makeNewStoryDir(display_name, system, model_name, root=STORIES_ROOT_DIR)` — add `root` so captures
  land in `eval_stories/`.
- `EVAL_STORIES_DIR = "eval_stories"`.

### `narrator.py`
- `fork_to(node_id, new_name, root=STORIES_ROOT_DIR)` — add `root`. Capture is then just
  `fork_to(turn_id, name, root=EVAL_STORIES_DIR)`; the existing path-trimming logic is reused as-is.

### `callbacks.py`
- `StudioCallbackHandler(CallbackHandler)` — emits `studio_*` events, each payload tagged
  `{run_id, lane}`. Separate event names keep studio traffic away from the chat view's global handlers.

### `studio.py` (new)
- `runStudio(eval_id, base, ver_a, ver_b, n, model, socket, run_id)`:
  1. load `eval_stories/<id>/history.json` → `TurnTree.deserialize`; `info.json` → system.
  2. `leaf = tree.current_leaf`; `parent = nodes[leaf]["parent"]`;
     `before = tree.file_state_at(parent)`; `prefix = tree.messages_to(parent)`.
  3. For each of the 2N lanes, `socket.start_background_task`:
     `files = dict(before)`; `tb = SYSTEM_TOOLBOXES[system](files)`;
     `provider = OpenRouterProvider(model, tb, StudioCallbackHandler(socket, run_id, lane),
     thinking_effort="max", cache_mode="none")`;
     `provider.messages = [systemMsg(versions={base: ver})] + prefix`; `provider.run()`.
  4. As lanes finish, collect results; when the last completes, write
     `eval_stories/<id>/runs/<ts>.json` (config + per-lane narration/tool_calls/cost).

Parallelism is safe: no eventlet/gevent installed → Flask-SocketIO runs in **threading** mode, `requests`
blocks per thread, and `socket.emit` works from background threads. Default **N=1** (2N concurrent
max-effort turns is a real cost burst).

### `app.py` — socket events
`capture_eval_turn` {turn_id, name} · `list_eval_turns` · `delete_eval_turn` · `studio_run`
{eval_id, base, ver_a, ver_b, n, model} · `get_instruction_versions` {base}

## Frontend

Streaming is **reused, not rebuilt** — the renderers are already lane-ready:
- `reasoningRow.js` — `ensureRow/appendReasoning/appendTool/appendDice/closeRows` all already take a
  `wrapper`. Only change: `ensureLiveWrapper(container = chatHistory)`.
- `chat.js` — export `processNarration` and `appendNarration(wrapper, content)` (already
  wrapper-parameterized).
- A studio lane is then just "a wrapper element in a column"; every existing renderer works unchanged.

New:
- `frontend/static/studio.js` — sidebar Stories/Studio toggle, captured-turn list, studio view
  (2 columns × N lanes), version/model/N pickers, `studio_*` handlers routing `{run_id, lane}` → wrapper.
- Per-turn capture button — mirrors the existing per-turn actions in `messageActions.js`.
- `styles.css` — studio layout, following the existing conventions (no `transition: all`, concentric
  radii, `tabular-nums` on live numbers).

## Deferred (explicitly not v1)
Automatic judging, rubrics, scoring, aggregate win rates; grouping/organizing captured turns; a results
viewer over `runs/*.json`.

## Verification
1. Capture a turn from a story → `./eval_stories/<id>/` has `info.json` + `history.json`; the story is
   untouched and the view doesn't switch.
2. Toggle Studio in the sidebar → the captured turn is listed; select it.
3. Run `core` 0 vs 1, N=1 → two columns stream live and complete; reasoning rows and tool calls render
   like the chat view. Confirm `eval_stories/<id>/runs/<ts>.json` is written.
4. Run with N=2 → 4 lanes stream concurrently into the right columns (no cross-talk between lanes).
5. Confirm production is untouched: normal chat turn still streams correctly and still resolves the
   latest instruction version (`getFullStoryInstruction` called with `versions=None`).
