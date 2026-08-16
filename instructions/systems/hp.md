# Harry Potter RPG — Rules & Spellbook

This document contains the complete ruleset and spellbook for a Harry Potter RPG set at Hogwarts. It is a hard game system, not soft. This file covers the setting rules, mechanics, and spellbook reference.

## Setting

The game takes place in the Harry Potter universe. Unless the story plan states otherwise, assume all canon events, locations, characters, and magical rules are still canon. Adjudicate by the known rules of the canon world — how magic works, what Hogwarts is like, what the Ministry does, what creatures exist and how they behave.

---

## Character Creation

- **Stats**: Four primary ability scores, ranging from 1 to 20. Initial minimum of **8**, maximum of **13**. Total must not exceed **40**.
  - **Magical Prowess (MP)**: Innate magical talent and spellcasting ability.
  - **Physical Prowess (PP)**: Strength, agility, and physical resilience.
  - **Mental Acuity (MA)**: Intelligence, perception, and magical intuition for knowledge and investigation.
  - **Social Grace (SG)**: Social and conversation ability.
- **Skill Modifiers**: `floor((stat - 10) / 2)`
- **Proficiencies**: Specific skills tied to each stat. Choose **two** for a first-year character.
  - **MP**: Charms, Transfiguration, Standard spells, Curses, Jinxes, Elemental spells, Healing spells, Enchantment, Nonverbal Casting.
  - **PP**: Flying, Dueling, Stealth, Melee, Acrobatics, Sleight of Hand.
  - **MA**: History of Magic, Arithmancy, Ancient Runes, Herbology, Investigation, Perception, Potions.
  - **SG**: Persuasion, Deception, Intimidation, Performance.
- **Proficiency Modifier (PM)**: Starts at 1, grows with year (see Dice Mechanics).
- **House**: Gryffindor, Hufflepuff, Ravenclaw, or Slytherin. Each provides unique abilities.
- **Magical Stamina (MS)**: `10 + (Year * 2) + MP Modifier`. Depletes with spellcasting. Recharges via rest or potions.
- **Hit Points (HP)**: `10 + (Year * 2) + PP Modifier`. Represents physical health.
- **Starting Spells**: Choose 3 Basic spells.
- **Backstory**: Describe the character's upbringing, home life, motivations, goals, fears, habits, etc.

---

## House Abilities

Each house provides two special abilities, one at Year 1 and another at Year 4.

### Gryffindor
- **Year 1 — Heroic Surge**: Once per long rest, gain temporary MS equal to `Year + Proficiency Bonus`. This bonus MS disappears after 10 minutes or 5 turns. If you end up with less than 0 MS, you faint for an hour.
- **Year 4 — Swish and Flick**: Once per combat, you may cast two offensive spells in a single action.

### Hufflepuff
- **Year 1 — True Friend**: When you use the Help action to aid an ally's check, they gain a +2 bonus to their roll in addition to Advantage.
- **Year 4 — Perseverance**: When at 0 MS, you can still attempt to cast a spell by taking 1d4 Hit Point damage, adding 1d4 for each spell difficulty category.

### Ravenclaw
- **Year 1 — Quick Study**: Reduce the required downtime or number of checks needed to learn a new spell or proficiency through Personal Study by one step (GM discretion).
- **Year 4 — Eureka Moment**: Once per long rest, you can choose to succeed on one MA-based skill check (Investigation, History of Magic, Arithmancy, Ancient Runes, Perception) as if you had rolled a natural 20.

### Slytherin
- **Year 1 — Cunning**: Once per long rest, you can reroll any failed SG-based check.
- **Year 4 — Resourceful Magic**: Once per long rest, you may attempt to cast any one spell you have seen successfully cast within the last 24 hours, even if it is not in your spellbook. You must still meet the MS cost and make the spellcasting check.

---

## Dice Mechanics

- **Checks**: Roll `d20 + Stat Modifier + PM (if proficient)` vs. a Difficulty Class (DC).
- **Proficiency Bonus by Year**:
  - Year 1: +1
  - Year 2–3: +2
  - Year 4–6: +3
  - Year 7: +4
- **Spellcasting**: Roll `d20 + MP Modifier + PM (if proficient in the spell's category)` vs. the spell's DC. MS cost is spent **regardless** of success or failure.
- **Saving Throws**: Roll `d20 + Stat Modifier (specified by the spell/effect)` vs. the caster's Spell Save DC (`8 + Caster's MP Modifier + Caster's Prof Bonus`) or a set DC for environmental effects.

---

## Hit Points and Physical Health

- **Taking Damage**: HP is reduced by attacks, hazards, or certain strenuous activities.
- **Critical State**: At 0 HP, a character falls unconscious and is incapacitated. Further damage while unconscious may lead to death (GM discretion or specific rules for lasting injuries).
  - **Instant Death**: Certain effects, such as *Avada Kedavra*, cause instant, permanent death on a failed save, bypassing the unconscious state.
  - **Stabilization**: Spells like *Episkey* restore HP as described in the spellbook. Reviving a character at 0 HP requires a healing spell, potion, or physical assistance.
- **Recovery**:
  - **Short Rest** (1 hour): Regain HP equal to `2d6 + PP Modifier`.
  - **Long Rest** (8 hours): Regain all lost HP.

---

## Spell Mechanics

- **Spell Difficulty & Cost**:
  - **Basic**: DC 10, **1 MS** (e.g., *Lumos*, *Incendio*)
  - **Intermediate**: DC 15, **3 MS** (e.g., *Expelliarmus*, *Reducto*)
  - **Advanced**: DC 20, **5 MS** (e.g., *Expecto Patronum*, *Confringo*)
  - **Expert**: DC 25, **7 MS** (e.g., *Avada Kedavra*, *Fiendfyre*)
- **Categories**: Spells align with proficiencies under MP (e.g., Charms, Elemental, Healing).
- **Special Requirements**: Some spells need conditions (e.g., *Expecto Patronum* requires focus on a happy memory, potentially requiring a separate check like MA DC 10 under stress).
- **Magical Stamina Management**:
  - MS depletes with each spell cast.
  - At 0 MS, no spells requiring MS can be cast (unless an ability like Hufflepuff's Perseverance allows it).
  - **Recharge**:
    - **Short Rest** (1 hour): Regain MS equal to `Year + MP Modifier + Proficiency Bonus`.
    - **Long Rest** (8 hours): Regain full MS pool.
    - **Potions**: Specific potions (e.g., Pepperup Potion) might restore MS (e.g., DC 15 Potions check to brew, restores 1d6+1 MS upon consumption).

---

## Damage Types, Resistances, and Vulnerabilities

- **Damage Types**: *Fire*, *Force*, *Cold*, *Radiant*, *Psychic*, *Slashing*, *Piercing*, *Bludgeoning* (for physical).
- **Resistance**: Half damage from that type.
- **Vulnerability**: Double damage from that type.
- **Immunity**: No damage from that type.
- **Sample Traits**: Inferi (Vulnerable: Fire, Immune: Cold, Piercing); Ghosts (Immune: Physical, Force); Trolls (Resistant: Slashing, Bludgeoning). The GM determines these for NPCs/creatures.

---

## Nonverbal Spellcasting

Nonverbal spellcasting involves performing magic without speaking the incantation, requiring significant concentration and magical control.

- Any spell can be attempted nonverbally at any year.
- **Without** Nonverbal Casting proficiency: Spellcasting DC increases by **7**.
- **With** Nonverbal Casting proficiency: Spellcasting DC increases by **4**.
- MS cost remains the same as the verbal version.
- Roll: `d20 + MP Modifier + Proficiency Bonus (if applicable)` vs. the new, higher DC.
- **Benefits**: Stealth (no spoken incantation reveals intent) and circumvention (casting when silenced or unable to speak).

---

## Combat and Dueling

- **Initiative**: All participants roll `d20 + PP Modifier` at the start of combat.
- **Actions**: On your turn, take **one Action** (Cast a Spell, Attack, Use an Object, Dash, Disengage, Dodge, Help) and **move** up to your speed (typically 30 feet). Some spells or abilities use a Bonus Action or Reaction if specified.
- **Reactions**: Some abilities (e.g., *Protego*) can be used as reactions — an instant response to a trigger such as an incoming attack or spell. One reaction per round, regained at the start of your next turn.
- **Offensive Spells**: Caster makes a spellcasting check (`d20 + MP Mod + Prof Bonus` vs Spell DC). If successful, the spell takes effect. If the spell requires a save, the target rolls against the caster's Spell Save DC (`8 + Caster MP Mod + Caster Prof Bonus`). Failure means suffering the spell's effects.
- **Defensive Spells**: Spells like *Protego* can be cast as an Action or Reaction (if specified). They negate an incoming spell/attack if the caster's spellcasting check meets or exceeds the incoming attack roll or spell save DC, or provide a temporary HP shield, as described by the spell.

---

## Progression

- **Advancement**: Progress through Hogwarts years via story milestones (typically end-of-year events). Upon advancing a year:
  - Increase **one** ability score by +1 (maximum 20).
  - Gain **one** new proficiency.
  - Learn several new spells.
  - Increase MS and HP pools based on the Year component of their formulas.
  - Proficiency Bonus increases at Years 2, 4, and 7.

---

## Spell Acquisition

- **Automatic Learning** at the start of each year:
  - **Year 1**: 3 Basic spells.
  - **Year 2**: 2 Intermediate spells.
  - **Year 3**: 1 Intermediate + 1 Advanced spell.
  - **Year 4**: 2 Advanced spells.
  - **Year 5**: 1 Advanced + 1 Expert spell.
  - **Year 6**: 2 Expert spells.
  - **Year 7**: 1 Expert spell + 1 additional spell of choice (up to Advanced).
  - Spells chosen must be appropriate for that year level (GM guidance).
- **Additional Learning**:
  - **Mentorship**: Dedicated teaching from professors or skilled peers (requires time and potential checks).
  - **Discovery**: Finding spellbooks, scrolls, or ancient texts during adventures.
- **Limitations**: Characters generally cannot learn spells significantly above their Year level unless specific narrative circumstances and GM permission allow it. Casting spells above one's typical level might incur Disadvantage or increased MS cost.

---

## Transfiguration Rules

- **Impermanence**: Transfigurations are not permanent and eventually revert. Reversion inside a living being is dangerous/lethal. Sustaining requires periodic re-application (reduced DC MP check).
- **MS Costs & Checks**:
  - Simple (matchstick to needle): **1 MS**, DC 10 MP Check.
  - Moderate (stool to chair): **3 MS**, DC 15 MP Check.
  - Complex / Living (goblet to bird): **5 MS**, DC 20 MP Check.
- Failure results in partial, unstable, or failed transformation, which can be situationally dangerous.

---

## Spellbook

### Basic Spells (DC 10, 1 MS)

#### Charms
- **Lumos** — Creates a beam of light from the wand tip.
  - *Effect*: Bright light in a 20 ft radius, dim for another 20 ft.
  - *Duration*: 10 minutes or until dismissed.

- **Reparo** — Mends a broken non-magical object.
  - *Effect*: Fully restores shattered items like glass, wood, or paper.

- **Verdimillious** — Emits green sparks revealing hidden objects or beings.
  - *Effect*: Highlights invisible or concealed entities within 20 ft.
  - *Roll Required*: MP check vs. passive stealth of hidden targets.
  - *Duration*: 1 round.

- **Alohomora** — Unlocks non-magical or lightly enchanted locks.
  - *Effect*: Opens basic locks instantly.
  - *Roll Required*: MP check vs. Lock DC (Simple: 10, Complex: 15).

#### Elemental
- **Incendio** — Launches a jet of flame.
  - *Effect*: 1d6 Fire damage to one target within 30 ft.
  - *Save*: PP save for half damage.
  - *Special*: Ignites flammable materials.

- **Expulso** — Concussive area blast.
  - *Effect*: 10 ft radius AoE, 1d6 Force damage. Targets make DC 5 PP save or be knocked prone.
  - *Range*: 30 ft.

#### Jinxes
- **Flipendo** — Forceful shove.
  - *Effect*: 1d4 force damage + target pushed 10 ft.
  - *Save*: PP save to resist push.
  - *Range*: 20 ft.

#### Healing
- **Episkey** — Heals minor wounds.
  - *Effect*: Restores 1d6 + MP modifier HP.
  - *Range*: Touch.

- **Anapneo** — Clears airway obstruction.
  - *Effect*: Removes choking, clears airways from gases or suffocation.
  - *Range*: Touch.
  - *Special*: Automatic success unless magical obstruction (then MA check DC 12).

---

### Intermediate Spells (DC 15, 3 MS)

#### Enchantment
- **Silencio** — Prevents vocalization.
  - *Effect*: Target cannot speak or cast verbal spells.
  - *Duration*: 2 rounds.
  - *Save*: SG vs caster save DC to resist.

- **Confundo** — Induces mental confusion.
  - *Effect*: Target acts erratically (50% chance to take no action).
  - *Duration*: 2 rounds.
  - *Save*: MA vs caster save DC to resist.

#### Elemental
- **Glacius** — Freezing mist.
  - *Effect*: 15 ft cone, 2d6 Cold damage. Ground becomes icy terrain.
  - *Save*: PP save for half. PP check DC 12 to move in area, otherwise fall prone.

- **Reducto** — Focused force blast.
  - *Effect*: 2d8 Force damage to one target or structure.
  - *Range*: 30 ft.

#### Standard
- **Protego** — Summons protective barrier.
  - *Effect*: Negates one spell/attack if caster's roll beats opponent's.
  - *Duration*: Instant.
  - *Special*: Can be cast as a reaction. After use, cannot be cast again for 2 rounds.

- **Expelliarmus** — Disarms target.
  - *Effect*: Target drops held item.
  - *Save*: PP save to resist.
  - *Bonus*: Deals 1d4 Force damage.

- **Diffindo** — Magical slash.
  - *Effect*: 2d6 Slashing damage.
  - *Range*: 20 ft.

- **Arania Exumai** — Radiant repulsion.
  - *Effect*: 2d6 Radiant damage to spider-type creatures.
  - *Save*: PP save for half damage.

#### Healing
- **Vulnera Sanentur** — Closes moderate wounds.
  - *Effect*: Restores 2d6 + MP modifier HP. Ends bleeding.

- **Calmantia** — Calms mental disturbances.
  - *Effect*: Removes *Confused*, *Frightened*, or *Panicked*.
  - *Range*: Touch.

---

### Advanced Spells (DC 20, 5 MS)

#### Charms
- **Oppugno** — Animates objects to strike.
  - *Effect*: 3 objects attack for 1d6 each. Caster chooses targets.
  - *Save*: PP save to avoid each hit.

- **Obscuro** — Summons magical blindfold.
  - *Effect*: Blinds target.
  - *Duration*: 1 minute or until removed.
  - *Save*: MA save to resist.

#### Curses
- **Sectumsempra** — Invisible slicing.
  - *Effect*: 3d8 Slashing damage + bleeding (1d4 per round).
  - *Save*: PP save for half, avoids bleeding.

- **Petrificus Totalus** — Full body-bind.
  - *Effect*: Target immobilized.
  - *Duration*: 2 rounds.
  - *Save*: PP save to resist.

- **Legilimens** — Reads target's mind.
  - *Effect*: Extract surface thoughts or recent memory.
  - *Save*: MA save to resist.

#### Elemental
- **Confringo** — Fire burst.
  - *Effect*: 20 ft radius, 3d6 Fire damage.
  - *Save*: PP save for half.
  - *Special*: Ignites surroundings.

- **Bombarda Maxima** — Devastating concussive force.
  - *Effect*: 30 ft radius, 3d8 Force damage.
  - *Save*: PP save or fall prone.

#### Jinxes
- **Rictusempra** — Tickling hex.
  - *Effect*: Prone and incapacitated 1 round.
  - *Save*: SG save to resist.

#### Standard
- **Expecto Patronum** — Wards dark creatures.
  - *Effect*: 3d8 Radiant to Dementors/Lethifolds. Repels them.
  - *Special*: Requires happy memory (DC 15 MP check).
  - *Duration*: 2 rounds.

#### Healing
- **Sanatio Profunda** — Strong healing.
  - *Effect*: Restores 3d6 + MP modifier HP. Stabilizes target at 0 HP.

- **Purgo Malum** — Purges affliction.
  - *Effect*: Cures poisons, diseases, or magical curses.
  - *Roll*: MA check vs. DC of affliction (GM sets).

---

### Expert Spells (DC 25, 7 MS)

#### Curses
- **Avada Kedavra** — Killing curse.
  - *Effect*: Target dies instantly on a failed save. Bypasses unconscious state; causes permanent death.
  - *Save*: PP save vs. caster's Spell Save DC.
  - *Special*: No damage on save. Cannot be blocked by Protego.

- **Crucio** — Inflicts agony.
  - *Effect*: Incapacitates for 2 rounds.
  - *Save*: MA save each round to act.

#### Elemental
- **Fiendfyre** — Uncontrollable hellfire.
  - *Effect*: 30 ft cone, 5d10 Fire/turn for 3 turns.
  - *Save*: PP save for half. Caster must pass DC 18 MA check or lose control.

#### Enchantment
- **Imperio** — Full mind control.
  - *Effect*: Control target for 3 turns.
  - *Save*: SG save each round.

- **Morsmordre** — Dark Mark.
  - *Effect*: Projects fear in 60 ft. Enemies of the Dark Lord gain Disadvantage next round.
  - *Save*: SG save to resist.

#### Standard
- **Apparition** — Teleport to any visited location.
  - *Effect*: Requires that the caster has visited the target location and it is not sealed from apparition. Requires 1 full action to channel while in combat. Interruption during channeling causes splinching damage.
  - *Roll*: MA check DC 15 to avoid Splinching (2d8 damage + bleeding).

#### Healing
- **Renovatio Maxima** — Supreme restoration.
  - *Effect*: Fully heals or revives unconscious target with half HP.

- **Sanctum Aegis** — Radiant ward.
  - *Effect*: Grants 15 temp HP and 1d6 regeneration per turn (3 turns).

---

### Non-Magical Abilities (No MS)

- **Melee Attack** — `d20 + PP` vs. target's PP; damage based on weapon.
- **Throw** — `d20 + PP`; damage depends on object.
- **Dodge** — `d20 + PP` vs. attack roll; success avoids hit.
