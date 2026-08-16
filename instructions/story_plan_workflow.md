# Story Plan Generation Workflow — Harry Potter (Hard System)

A procedure for generating a complete, runnable campaign plan from a short premise. Written for an agent with no prior context.

**Inputs you will receive:** a premise of a few sentences, `core.md`, `hp.md`, and possibly an existing `pc.md`.
**Output you will produce:** `story_plan.md`, plus `pc.md` if not supplied, plus intermediate working documents.
**Consumer of the output:** a different model instance, running the game live, holding only `core.md`, `hp.md`, `pc.md`, and `story_plan.md`. It will never see your working documents. Anything load-bearing must survive into the final plan.

This document has two equally weighted halves. **Posture** is how you think. **Procedure** is what you produce. Procedure without posture yields documents of the right shape and the wrong quality: the stages below are containers, and what fills them comes from the adversarial habit described first.

---

# PART I — POSTURE

## Propose, then attack

Every idea you generate gets an immediate, specific attack before it is allowed to survive. Not a hedge, not a caveat, an attempt to kill it. Ideas that survive a real attempt are load-bearing; ideas that were never attacked are decoration.

The attack must name a concrete failure. "This might be predictable" is not an attack. "The player suspects the correct person on day one because the premise puts a neon sign over him, so the *who* question is dead and only the *why* remains, which is thinner" is an attack. It kills or demotes the idea, or it forces a specific repair.

**Worked example — a premise dying.**
*Proposal:* A Hogwarts campaign where a student is secretly brewing Polyjuice to impersonate a prefect and sabotage the House Cup.
*Attack:* Polyjuice is one of the most canon-famous plot devices in the series, and the player has read book 2. The moment anyone behaves out of character, the player names Polyjuice, and from there names the mechanism, the timing constraint, and the counter-test. The mystery's central turn is retrievable from canon alone, which means the player solves it without engaging the campaign's own evidence. Also: the ruleset's `Verdimillious` and any competent adult's suspicion both defeat the disguise cheaply.
*Verdict:* Dead as a spine. Survives as a **red herring** the campaign explicitly disproves, which converts the player's canon fluency from an advantage into a trap.

**Worked example — a premise surviving with a scar.**
*Proposal:* A campaign about corruption in a regional Quidditch league, where an official is fixing matches through subtle magical interference.
*Attack:* The PC is a student with no standing in league politics and no reason for anyone to speak to him. Every critical node requires access he does not have. Also, match-fixing is discovered by watching matches, and watching is passive, which produces a campaign the player observes rather than acts in.
*Repair:* Give the PC a diegetic access route created by the premise itself, not granted by fiat (a family connection, a job, a school team's fixture against the affected club) and restructure the evidence so it lives in people and places rather than in the matches. The passivity attack was fatal to the original shape and forced a structural change; the access attack forced an intake question.
*Verdict:* Survives, restructured.

## Build the break-list before the premises

Do not generate premises and then check them for problems. Generate the list of things that break campaigns in this setting **first**, then test candidate premises against it. Premises tested by a pre-existing list get killed honestly. Premises examined after the fact get defended, because by then you are attached to them.

The break-list has two parts, and both are mandatory:

**Generic breakers** (these recur in nearly every campaign):
- The PC tells a competent adult, who solves it.
- The PC's companions or mentors solve it by owl.
- A time skip trivializes a timed threat, or the plan has no answer for "I spend two weeks doing nothing."
- One item, spell, or NPC in the PC's possession short-circuits the central obstacle.
- The player's canon knowledge yields the answer without engaging the campaign's evidence.
- The critical path requires rolls the PC statistically cannot make.
- The climax requires the PC to win a fight he mechanically cannot win.
- Every path to the central revelation runs through one node, which the player may never touch.

**Setting-specific breakers — the HP capability checklist.** Walk this list explicitly for every premise. Each entry either does not apply, is out of the PC's reach at this year, or must be answered in the plan:

`Alohomora` and lock-based obstacles · `Legilimens` · `Obliviate` and memory tampering · `Expecto Patronum` and dementor encounters · `Apparition` (age 17; splinching) · Floo network · owl post latency and interception · Invisibility Cloak · Marauder's Map · Time-Turner (year 3+, catastrophic if present) · Polyjuice Potion · Veritaserum · Priori Incantatem and Ministry wand forensics · the Trace and underage-magic detection · portraits as witnesses · ghosts as witnesses · house-elves (they can fetch, spy, and Apparate inside wards) · Sneakoscopes, Foe-Glasses, Probity Probes and other purchasable detectors · Pensieves · Unbreakable Vows · Fidelius and other concealment charms · portkeys · the PC's broom (vertical access defeats many ground-level obstacles) · Parseltongue if the PC has it · Gringotts and the PC's actual liquid wealth.

Being rich is a capability. A PC with vault access can buy detectors, bribes, potions, and services, and a plan that ignores this will be routed around.

## Proportional attention

Spend reasoning where the answer is not already determined. Ground truth, the mechanical audit, and the protected nodes deserve slow, explicit work. Street texture and shop dressing deserve almost none, because they are the runtime GM's job and over-specifying them produces a plan that fights the table's pacing.

## Never optimize for your own convenience

The single failure mode that most degrades these plans: choosing the version that is easier to write. Easier means the villain's plan has no holes because you never examined it, the evidence is where the player will obviously look, the adults are inexplicably absent, and the numbers were never run. Every time you notice that one option is less work, treat that as a signal to check whether it is also worse.

---

# PART II — SPOILER DISCIPLINE

**The user will not read your artifacts.** They are handing the finished plan to a runtime GM unread so they can play the campaign themselves. If you spoil the campaign in chat, the work is destroyed and cannot be un-destroyed.

Rules, applied to every message you send:

- Artifacts and files carry all content. Chat carries process only.
- Never name the antagonist, the crime, the twist, the location of a protected node, or any clue's content in chat.
- Report progress as: what stage you completed, what *kinds* of decisions you made, what you tested and whether it passed, a numeric confidence, and named risks stated abstractly. "Two premise candidates failed the break-list on the access dimension" is fine. "The Quidditch premise failed because the PC can't reach the officials" is a leak.
- Beware of near-misses: describing a mechanism abstractly can still identify it. If a spoiler-free description would take more than a sentence, say less.
- This applies to the intake questions in Stage 0 too. Ask about the PC without foreshadowing what the PC will face.

---

# PART III — PROCEDURE

## Stage protocol

Work in stages. At the end of each, send a short spoiler-free message: stage complete, confidence, top residual risks, next stage named, request to continue. The user is not giving directional input, only permission to proceed, so **do not ask them to make design decisions after Stage 0.** Make the call, note it, move on.

**Carry a running residual-risk list forward.** Every stage inherits the previous stage's open risks, and closes, downgrades, or re-states each. Risks silently dropped between documents are the most common way a flaw reaches the final plan. The final stage must show every risk either closed or explicitly accepted.

**Stage merging and splitting is allowed and expected.** A three-scene one-shot does not need six stages; merge 1-2 and 3-4. A term-length campaign with multiple factions may need Stage 3 split by faction. Scale the process to the campaign, not the reverse.

---

## Stage 0 — Intake and PC construction

If `pc.md` was supplied: **audit it before proceeding** (see Stage 4 for the audit's content), and skip to Stage 1. Do not skip the audit. A supplied sheet is exactly as likely to have a mechanically fatal profile as one you write, and you will not discover it later because you will assume it was already checked.

If `pc.md` was not supplied, this is your **only** user interaction that requests decisions. One message, all questions at once.

**What to ask.** Enumerate only the decisions that the premise, canon, and `hp.md` do not jointly determine. Propose your recommended default for each so the user can accept in one word. Do not ask questions whose answer is already implied by the premise, and do not ask for preferences you should simply choose.

Recurring HP-specific underdetermined decisions:

- **Mechanical year vs. narrative year**, when the campaign sits between school years or mid-term. `hp.md` grants stat, proficiency, and spell advancement "at the start of each year"; a summer or early-term campaign creates a real ambiguity about what the PC has actually acquired. State your reading.
- **Canon character or original.** If canon, warn that the ruleset's point budget and the character's canon capabilities may conflict, and propose which wins as a standing policy. That policy is a precedent for every future sheet, so make it deliberately.
- **Stat allocation**, with a proposed spiky-not-flat spread justified against the character concept. Flat allocations produce characters who are mediocre at everything, which is worse for play than being bad at some things.
- **Proficiency selection**, noting which ones the premise will actually exercise.
- **Spell list**, flagging any spell that would trivialize a plausible obstacle, and any canon-associated spell the point budget or year gate excludes.
- **Scope-breaking inventory**: Cloak, Map, Time-Turner, broom, unusual wealth, magical creature companions. For each, state whether it is present and how the plan will accommodate it. Prefer accommodating over excluding; contrived absences read as GM cheating.
- **Anything the premise leaves open** about the PC's position, allegiances, or relationships that the plan will depend on.

**What to write.** `pc.md` per the ruleset's character-creation section, plus a **knowledge-state section**. Knowledge state is not optional. Record precisely what the character knows, believes, and does not yet know at the campaign's start date, especially where canon gives a sharp before/after boundary near the window. Runtime GMs trample knowledge boundaries constantly, and the sheet is the only durable defense. Include beliefs that are false or outdated, marked as beliefs, with a note on how to adjudicate against them.

Also record: current physical/magical state, relationships in-window, inventory with specifics, and any trait with social or mechanical consequences.

If the user asks for a cleaned version, strip provenance, alternatives-considered, and editorial commentary. Keep adjudication instructions, which are rules rather than notes.

---

## Stage 1 — Constraint inventory and break-list

Produce a working document. Contents:

**What the window gives you.** The specific affordances of this premise's time, place, and PC position. Autonomy, isolation, access, a fixed deadline, a stable cast, a recurring event structure, a source of ambient pressure. Name them concretely, because the campaign's best mechanics usually come from turning an affordance into a system.

**What the window forbids.** Encounters the PC cannot survive at this statline. Scene types that cannot occur. Canon events that must remain untouched. Timeline hard stops.

**The break-list**, both parts, per Part I. Every generic breaker gets a specific answer or is marked open. Every applicable HP capability gets a ruling.

**Dramatic irony reserves.** Where the player knows something the character does not. This is free tension and a free source of red herrings that cost the character nothing.

Gate message. Continue.

---

## Stage 2 — Premise generation and convergence

Generate **at least five** distinct campaign directions. Fewer means you converged before you explored. For each: the shape of it in two or three sentences, its strongest attraction, and then a real attack.

Sort outcomes into dead, demoted (survives as a component, a subplot, or a herring), and alive. Expect most to die. Two or three surviving candidates that want to be the same campaign is the target state: convergence, where the setting's pressure, the antagonist's method, and the reason-it-is-happening-now load onto each other rather than sitting side by side, produces campaigns that feel inevitable instead of assembled.

**Test the survivor against three things before proceeding:**

1. **The whole break-list**, item by item.
2. **Canon-derivability.** State the campaign's central turn. Ask whether a reader of the books could arrive at it from canon alone. If yes, it is dead as a spine and demoted to herring. The solution should be *canon-compatible* (nothing in it contradicts the source) and *canon-invisible* (the source does not contain it). Invented antagonists and invented crimes are the reliable way there. Where the campaign will naturally evoke a famous canon pattern, plan to trap it: let the player suspect the canon answer and disprove it fairly.
3. **The one-sentence test.** Write the campaign's ground truth in a single sentence. If it will not fit, the motive layer is baroque and will collapse in play. Simplify until it fits, then let complexity live in the *evidence*, not the truth.

Also fix here: the **threat model**. What the antagonist's signature weapon actually is, scaled to what the PC can survive, and how death remains genuinely possible without being the opening move.

Gate message. Continue.

---

## Stage 3 — Structure

The truth layer gets frozen here, in writing, and never moves again. This is not neatness; it is a defense. The runtime GM is a language model subject to compliance pressure, and an uncommitted solution drifts toward whatever the player theorizes aloud. A committed one cannot.

Produce a working document containing:

**Ground truth.** What actually happened or is happening, who is responsible, what they want, why it is happening now. The "why now" should be causally downstream of something in the setting or timeline, not coincidental with it; coincidence reads as contrivance.

**Antagonist dossier.** Public face, private truth, capabilities, resources, method, and an escalation logic — what they do at each level of pressure, and where their moral line sits and when it moves. Give them a statline per `hp.md` if they will ever be adjudicated.

**Cast map.** For each significant NPC: what they know, what they think they know, what they want, how they feel about the PC, and their **baseline behavior**. Baselines are load-bearing whenever the campaign asks the player to notice that someone is behaving oddly, because "odd" is undefined without a documented "normal," and a runtime GM cannot play a deviation consistently across ten turns if the baseline lived only in one earlier narration.

**Clock or clocks.** What the world does on its own schedule, independent of the PC. Parameterize granularity to campaign length:

| In-game span | Granularity | Notes |
|---|---|---|
| Under ~4 weeks | Per day | Usually one clock, no time jumps expected |
| One term to a year | Per week, with dated set pieces | Often 2-3 clocks; term structure (classes, matches, holidays, exams) is free pacing infrastructure |
| Multi-year | Per milestone | Trigger on events and PC progress rather than dates |

Multiple clocks are appropriate when independent forces move on independent schedules. Each clock is separately FIXED. If the premise leaves the span ambiguous, decide, state the decision, and design to it.

The clock's purpose is that time skips produce visible change rather than nothing. Test this directly: if the player disengages for a week, what is observably different?

**Progression ladder.** The general form: what must the player obtain (information, access, resources, allies, capability, standing), tiered from earliest to latest, each entry specifying its content, its gate, and its prerequisites. For mysteries this is a clue ladder with DCs per `core.md`'s subtlety guidance. For heists it is access and intelligence. For political campaigns it is leverage and allies. For horror it is understanding and survivability.

Two rules regardless of genre:
- **Content and difficulty are FIXED. Placement FLOATS.** The runtime GM decides which scene delivers a given item; it does not decide what the item is or how hard it is to get. Improvised content over-signals, because helpfulness pressure at runtime beats written subtlety guidance every time.
- **Protected nodes get hard trigger lists.** Any item whose premature acquisition collapses the campaign may surface only through explicitly enumerated routes. Never through lucky narration, never as a consolation prize for an unrelated roll.

**Opposition response ladder.** A numeric track, 0 to 5 or similar, of how aware the opposition is of the PC. Fixed thresholds, fixed triggers for incrementing, floating expression. Every increment must come from a player-visible cause, so consequences read as earned rather than arbitrary. This is also where scope-breaking possessions can be diegetically removed, if the plan needs that, at a moment the player can see coming.

**Authority-response policy.** Written in advance, as a table, for every adult or institution that could plausibly short-circuit the campaign. The answer is never "adults are inexplicably useless." Good answers: the situation is built to survive inspection; the report is true but unactionable; the response is real but costs the PC something they value more; the responder's priorities differ from the PC's. Best case, the mechanism teaches itself after one use, and the player chooses not to escalate rather than being forbidden from escalating. Include a late-game inversion: at sufficient evidence, authority should flip from obstacle to win condition, or the campaign is teaching that adults are furniture.

**Endgame structures.** Fixed mechanics for the climax, honoring the threat model. If the PC cannot win a fight, the plan must state what winning looks like instead and guarantee the necessary affordances exist in every endgame scene.

**Endings on independent axes.** Not a branch tree. Three or four axes (antagonist's fate, third-party fates, PC's state, world change) graded independently, with every combination dovetailing into the campaign's end date and, where canon continues afterward, into an altered canon.

**False paths.** Every herring must be **disprovable** by evidence the player can obtain. A false lead that cannot be killed is a railroad in disguise, because the player cannot rule it out and cannot proceed past it.

Gate message. Continue.

---

## Stage 4 — Mechanical war-game

Run the numbers. Do not skip this because the structure "feels" sound. This stage exists because it is where plans that read well are discovered to be unplayable.

**A. The PC capability audit.** Compute the PC's actual modifier for every stat, including proficiency where it applies. Then list every node on the critical path and compute the success probability at the DC you proposed. Expect unpleasant surprises: canon-faithful sheets are spiky, and the spikes rarely point at the campaign's demands.

The correcting principle when the numbers are bad: **do not lower DCs**, which violates the subtlety guidance. Instead guarantee that **every critical-path node has at least one action-gated route** — going somewhere, asking a specific person, buying something, correlating public information, using a class ability or unusual trait. Rolls accelerate and reward; they never solely gate the critical path. Produce the audit as an explicit table of node, roll-gated route, action-gated route, verdict. Any node without an action-gated route is a defect, not a difficulty setting.

Add a **re-examination rule** to the plan: a failed check may be retried when the player brings genuinely new information, at a reduced DC. This converts early misses into later realizations instead of permanent lockouts, which matters enormously for low-stat PCs and costs nothing.

**B. The solution-spell audit.** Walk the PC's actual spell list, house abilities, and inventory against every planned obstacle. Ask, for each: does anything the PC already possesses trivially bypass this? Then walk the HP capability checklist from Stage 1 again, now against the specific structure. This is where "a spell solves the whole campaign" gets caught, and it is only catchable at this stage, because Stage 3 did not yet know the obstacles in detail.

Where a capability does bypass an obstacle, prefer changing the obstacle over removing the capability.

**C. The antagonist audit.** Statline the opposition and simulate the confrontation. Compute per-round hit probability in both directions and time-to-defeat. If the PC loses a straight exchange, say so numerically, and derive a design law from it (for example: what kind of space the PC must always have access to, and what must therefore be present in every endgame scene).

**D. Subsystem invention.** If the campaign depends on a mechanic `hp.md` does not define, invent it here with explicit numbers: costs, times, save DCs, failure states. Runtime GMs improvise missing mechanics inconsistently, and inconsistency in the mechanic the campaign is *about* is fatal. Prefer mechanics whose timing produces graded outcomes, so partial failure states emerge from the clock rather than from GM fiat.

**E. Resource economy check.** Verify the PC's MS and HP pools against the campaign's expected demands. Confirm the resource binds when you want tension and does not bind during routine play.

Gate message, including a spoiler-free note on any structural change the numbers forced. Continue.

---

## Stage 5 — Authoring `story_plan.md`

Self-contained. The runtime GM has `core.md`, `hp.md`, `pc.md`, and this file. Every load-bearing fact from your working documents must appear here, restated, because those documents are gone.

**Annotate every section FIXED or FLOATS.** Roughly 70/30: the truth layer, clocks, ladder content and difficulty, protected-node triggers, response thresholds, location geometry, and endgame mechanics are FIXED; scene dressing, dialogue, encounter placement, weather, and texture FLOAT. Open the document with a short statement of the anti-drift rule: the solution is committed, player theories do not bend it, and a correct theory still requires evidence.

**Fixed section template.** Include all sections; write "not applicable" where a genre does not use one rather than silently omitting it.

1. **The truth** — one-sentence core, then full ground truth, then why-now.
2. **Antagonist dossier** — public face, capabilities, statline, method, escalation logic, moral line. Include any requirement that the antagonist appear benignly before a late reveal, with instructions to re-route it if player routing prevents the planned appearance.
3. **Cast** — knowledge, wants, feelings toward the PC, and baselines. Mark explicitly who is *not* what they appear to be and who is exactly what they appear to be.
4. **Clock(s)** — table form, dated or milestone-keyed, with a note that it runs whether or not the PC engages.
5. **Progression ladder** — tiers, content, gates, prerequisites, protected-node trigger lists, the action-gated guarantee, the re-examination rule.
6. **Opposition response ladder** — thresholds, triggers, expressions.
7. **Locations** — geometry and access routes FIXED, dressing FLOATS. Include routes the player may never find; their existence is what makes discovery feel earned.
8. **Endgame structures** — mechanics, checkpoint structures, design laws, graded outcome mechanics.
9. **NPC baselines** — with an instruction to spin each into `name.md` at first appearance, per `core.md`.
10. **Authority-response policy** — the table, plus the late-game inversion.
11. **False paths** — each with its kill condition stated.
12. **Toolbox** — floating encounters keyed to `core.md`'s pacing and mode-seeking triggers, not to dates.
13. **Endings** — independent axes, plus how each dovetails into the end date and into canon afterward.
14. **Divergence tracking** — canon rails that must remain untouched (named explicitly, including things the runtime GM might reach for and must not), and a section for logging divergences at runtime.
15. **Opening and pacing notes** — the first scene's required content, and honest guidance about the campaign's natural rhythm, including permission to let slow stretches be slow when the genre calls for it.

Write instructions to the runtime GM in the imperative. It is a peer executing a spec, not an audience.

---

## Stage 6 — Validation

**A. Critical-path reachability audit.** For every route to the campaign's central revelation or objective, confirm at least two independent paths exist to any single point of failure, and that each is reachable by this PC with these capabilities. Single-path campaigns die when the player does not touch the one node.

**B. Degenerate-line playtests.** Minimum three, chosen from: *tell an adult immediately* · *skip a week or a month* · *refuse the hook entirely* · *confront or attack the suspect early* · *brute-force the protected location* · *flee the situation* · *tell everyone everything constantly*. For each, play it forward concretely and state whether the campaign survives, what it costs, and any dependency the test exposes. A test that "passes" without producing a specific consequence chain was not actually run.

**C. Residual-risk closure.** Every risk carried since Stage 1 is closed, downgraded with reasoning, or explicitly accepted.

**D. Optional cold read.** If a fresh context is available, hand it only the four runtime documents and play the opening turns of a probable player line, checking whether the plan's floors actually fire without your working knowledge filling the gaps. This targets the one flaw you structurally cannot see: what the plan fails to say, because you know it.

Final message: spoiler-free summary, confidence, accepted risks, and what validation was run.

---

# PART IV — FAILURE MODES OF THIS WORKFLOW

Watch for these in your own execution:

- **Stage theater.** Producing the documents without the adversarial pressure. Symptom: nothing died in Stage 2, no numbers changed anything in Stage 4, every playtest passed cleanly. If nothing was killed or repaired, the process did not run.
- **Baroque drift.** Motive layers that grow across stages. The one-sentence test applies at every gate, not just at Stage 2.
- **Risk evaporation.** Flagged concerns that vanish between documents. The carry-forward list is the countermeasure; use it.
- **Over-planning texture.** Scheduling atmosphere and dialogue. It bloats the plan and makes the runtime GM serve a calendar instead of the table.
- **Under-planning the audit.** Skipping Stage 4 because the structure feels sound. The structure always feels sound; that is why the numbers exist.
- **Chat leakage.** Described in Part II. The most expensive error available to you, and the easiest to make while trying to be helpful.
