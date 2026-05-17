# D&D 5th Edition — Rules Reference

This document contains a condensed ruleset reference for a D&D 5th Edition RPG. It is a hard game system, not soft. This file covers the setting rules, mechanics, and spellbook reference.

**Important**: Use only D&D 5th Edition rules. Do not mix in mechanics from 3.5e, 4e, Pathfinder, or other systems.

---

## Core Mechanics

All checks follow the same basic formula:

**d20 + Ability Modifier + Proficiency Bonus (if proficient) vs. Difficulty Class (DC)**

- **Advantage**: Roll 2d20, take the higher result.
- **Disadvantage**: Roll 2d20, take the lower result.
- Advantage and disadvantage cancel each other out (roll normally).

**Difficulty Classes**:
| Difficulty | DC |
|---|---|
| Very Easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very Hard | 25 |
| Nearly Impossible | 30 |

---

## Ability Scores

Six ability scores define a character's capabilities:

- **Strength (STR)**: Physical power, melee attacks, athletics
- **Dexterity (DEX)**: Agility, ranged attacks, stealth, initiative
- **Constitution (CON)**: Endurance, hit points, concentration saves
- **Intelligence (INT)**: Knowledge, investigation, arcane spellcasting (wizard)
- **Wisdom (WIS)**: Perception, insight, divine spellcasting (cleric, druid)
- **Charisma (CHA)**: Persuasion, deception, innate spellcasting (sorcerer, bard, warlock, paladin)

**Modifier Formula**: `floor((score - 10) / 2)`

| Score | Modifier |
|---|---|
| 8-9 | -1 |
| 10-11 | +0 |
| 12-13 | +1 |
| 14-15 | +2 |
| 16-17 | +3 |
| 18-19 | +4 |
| 20 | +5 |

---

## Combat Essentials

**Initiative**: d20 + DEX modifier. Higher goes first. Ties broken by DEX score, then coin flip.

**Action Economy** (per turn):
- **Action**: Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object
- **Bonus Action**: Only if a feature/spell specifically grants one
- **Reaction**: One per round, used on triggers (opportunity attacks, certain spells)
- **Movement**: Up to your speed (typically 30 feet)
- **Free Interaction**: Draw/sheathe weapon, open door, speak briefly

**Attack Rolls**: d20 + ability modifier + proficiency bonus (if proficient) vs. target's AC
- **Critical Hit**: Natural 20 always hits, roll damage dice twice
- **Critical Miss**: Natural 1 always misses

**Saving Throws**: d20 + ability modifier + proficiency bonus (if proficient) vs. DC

**Conditions**: Track conditions carefully (blinded, charmed, deafened, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious, exhaustion levels).

---

## Spellcasting Basics

- **Spell Slots**: Limited resource per long rest (except warlocks). Slot level ≥ spell level required.
- **Cantrips**: At-will, no slot required.
- **Concentration**: Only one concentration spell at a time. CON save (DC 10 or half damage taken, whichever is higher) when hit to maintain.
- **Components**: V (verbal), S (somatic), M (material). Some require free hand or focus.

**Spell Save DC** = 8 + proficiency bonus + spellcasting ability modifier

**Spell Attack Modifier** = proficiency bonus + spellcasting ability modifier

*Note*: Do not describe individual spell effects in detail — use official 5e spell descriptions. The model should know them.

---

## Death and Recovery

**Dropping to 0 HP**:
- Fall unconscious and begin death saving throws
- Stable at 0 HP: unconscious but not dying

**Death Saving Throws** (start of each turn while at 0 HP):
- d20: 10+ = success, <10 = failure
- Natural 20: Regain 1 HP and consciousness
- Natural 1: Two failures
- 3 failures = death
- 3 successes = stable (unconscious, 0 HP)
- Taking damage while at 0 HP = 1 failure (critical hit = 2 failures)

**Resting**:
- **Short Rest** (1 hour): Spend Hit Dice to heal (roll HD + CON modifier per die)
- **Long Rest** (8 hours): Regain all HP, regain half total Hit Dice (minimum 1), reset spell slots
