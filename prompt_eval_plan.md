# Prompt Eval Harness (A/B, LLM judge, story-copy fixtures)

## Context

The GM's behavior is driven entirely by the on-disk instruction files (`instructions/core{N}.md`,
`instructions/{system}{N}.md`), which now carry integer **versions** (`core0.md`, `core1.md`, …; the
resolver in `utils.py:_resolveInstructionFile` takes the highest version by default). There is currently
no way to tell whether editing those instructions makes the GM *better* or *worse* — changes are judged
by feel.

This adds an offline **A/B prompt-eval harness**: freeze a library of game situations, run the GM on each
under two instruction versions (e.g. `core0` vs `core1`), and have an LLM judge pick the better response
pairwise. Output is JSON for now; a viewer comes later. The goal is a reproducible "did this edit help?"
signal, decoupled from the live SocketIO app.

## Approach

- A **scenario** is a frozen copy of a real story, stored in a new `./eval_stories/<id>/` directory using
  the *exact same on-disk shape* as `./stories/` (`info.json` + `history.json`). Each scenario's eval
  point is its **leaf turn**: the harness re-generates the leaf assistant node's response to its parent
  user message. Capturing a different point = capture another fork to that node.
- A **variant** is a version pick per instruction base, e.g. `{"core": 0}`. Unspecified bases fall back to
  the resolved-latest (production) behavior.
- Both the **GM model** and **judge model** are chosen at run time (CLI flags), mirroring how models are
  picked per-story in the app.
- The harness is a standalone script with **no SocketIO** — it drives `OpenRouterProvider` directly with
  the existing no-op `CallbackHandler` base class (`callbacks.py:4`), so no new callback code is needed.

### Headless turn run (mirrors `narrator.regenerate_turn`)

For an eval story loaded as a `TurnTree` (`history.TurnTree.deserialize`):
1. `leaf = tree.current_leaf` (must be an assistant node; skip with a warning otherwise).
2. `parent = nodes[leaf]["parent"]` — the user node whose input we respond to.
3. `before = tree.file_state_at(parent)`; `prefix = tree.messages_to(parent)`.
4. Build the system prompt with the variant's pinned versions:
   `getFullStoryInstruction(system, before, versions=variant)`.
5. `tb = SYSTEM_TOOLBOXES[system](files)` over a fresh `files = dict(before)` (file tools may mutate it).
6. `provider = OpenRouterProvider(gm_model, tb, CallbackHandler(), thinking_effort="max", cache_mode="none")`;
   `provider.messages = [system_msg] + prefix`; `provider.run()`.
7. Output = messages produced after the prefix → extract `{narration, tool_calls, cost}`
   (narration = assistant `content`; tool calls from `tool_calls`; cost from `provider.getCostStats()`).

### Pairwise judge (position-bias guarded)

- Judge = `OpenRouterProvider(judge_model, Toolbox([]), CallbackHandler())` (empty toolbox → no tools;
  `Toolbox([])` is valid per `model_tools.py:71`). One system+user message pair, read the final assistant
  content.
- The judge sees: recent context (last ~2 turns of `prefix` + `story_plan`/`pc` from `before`), the user
  input, and two candidate continuations labeled **Response 1** / **Response 2** (A/B identity hidden).
  Rubric drawn from the GM goals in `core{N}.md` (voice, pacing, tool/rule correctness, no railroading,
  story-plan consistency). Judge must end with `VERDICT: 1` / `VERDICT: 2` / `VERDICT: tie`.
- Run **both orderings** (order1: 1=A,2=B; order2: 1=B,2=A). **A wins** only if the judge picks A in both
  orderings; **B wins** only if it picks B both times; otherwise **tie**. Kills position bias for one
  extra judge call.

## Files

### Modify `utils.py` (small, reuse-only)
- `_resolveInstructionFile(base, version=None)`: when `version` is given, return
  `f"{INSTRUCTIONS_DIR}/{base}{version}.md"` and assert it exists (loud error, no fallback); else current
  highest-version logic unchanged.
- `getFullStoryInstruction(system_name, files, versions=None)`: thread `versions` (a `{base: int}` dict)
  into the two `_resolveInstructionFile` calls for `core` and `system_name`. `versions=None` → unchanged
  production behavior, so `narrator.py` callers need no edits.

### New `eval.py` (root, standalone CLI)
Subcommands:
- `capture <story_id> [node_id] --name X` — copy a story into `./eval_stories/<new_id>/`. Whole-story copy
  when no `node_id` (preserves source `current_leaf`); for a `node_id`, trim to the linear path
  root→node like `narrator.fork_to` (`narrator.py:305`) and set `current_leaf=node_id`. Write
  `info.json` (`{system, model, story_name, created, "enabled": true}`) + `history.json` verbatim/trimmed.
- `list` — print each eval story's name + `enabled`.
- `enable <id>` / `disable <id>` — flip the `enabled` flag in its `info.json`.
- `run --a core=0 --b core=1 [--gm MODEL] [--judge MODEL]` — for each **enabled** eval story: headless GM
  run under A and B, pairwise judge, accumulate. `--a`/`--b` parse comma-separated `base=ver` into
  `{base:int}` (empty/omitted → latest). `--gm` overrides the GM model for both variants (default: each
  story's own `info.json` model, so A vs B differ only in instructions). `--judge` default
  `anthropic/claude-opus-4.8`. Writes `./evals/results/<timestamp>.json`.

Result JSON shape:
```json
{
  "timestamp": "...", "gm_model": "...", "judge_model": "...",
  "variant_a": {"core": 0}, "variant_b": {"core": 1},
  "scenarios": [{
    "id": "...", "name": "...", "system": "twd", "user_input": "...",
    "out_a": {"narration": "...", "tool_calls": [...], "cost": 0.0},
    "out_b": {"narration": "...", "tool_calls": [...], "cost": 0.0},
    "order_verdicts": ["1", "2"], "verdict": "A|B|tie", "rationale": "..."
  }],
  "aggregate": {"a_wins": 0, "b_wins": 0, "ties": 0, "total_cost": 0.0}
}
```

### New directories (created at runtime)
- `./eval_stories/` — frozen scenario corpus (git-trackable).
- `./evals/results/` — per-run JSON reports.

### Reused as-is (no change)
- `callbacks.CallbackHandler` (no-op base) — headless callbacks.
- `openrouter.OpenRouterProvider` — `.messages`, `.run()`, `.getCostStats()`.
- `history.TurnTree` — `deserialize`, `file_state_at`, `messages_to`, `path_to`.
- `model_tools.SYSTEM_TOOLBOXES` / `Toolbox([])`.

## Notes / risks
- Empty-tools judge request: `Toolbox([])` yields `tools: []` in the request. If OpenRouter rejects an
  empty `tools` array, fall back to a tiny non-streaming `requests.post` judge helper. Verify during
  implementation.
- An eval story whose leaf isn't an assistant node (or whose parent is missing) is skipped with a logged
  warning rather than crashing the run.
- `cache_mode="none"` for GM runs — A/B prefixes differ by the system block anyway, so caching buys little
  and keeps runs independent.

## Verification
1. `python eval.py capture <existing_story_id> --name "smoke"` → confirm `./eval_stories/<id>/` has
   `info.json` (with `enabled: true`) + `history.json`; `python eval.py list` shows it.
2. Create a trivial second core version (e.g. copy `core0.md` → `core1.md` with one line changed) so A/B
   has something to differ on.
3. `python eval.py run --a core=0 --b core=1 --judge anthropic/claude-opus-4.8` → confirm a
   `./evals/results/<ts>.json` appears with both `out_a`/`out_b` narration populated, a `verdict`, a
   `rationale`, and a sane `aggregate` (wins + ties == scenario count, `total_cost` > 0).
4. Sanity-check the rendered narrations read like real GM turns (tool calls present where the scenario
   warrants a dice roll), and that swapping `--a`/`--b` flips the win counts symmetrically.
5. Confirm production is untouched: launch `python app.py`, open a story, take a normal turn — instruction
   resolution still uses the latest version (`getFullStoryInstruction` called with `versions=None`).
