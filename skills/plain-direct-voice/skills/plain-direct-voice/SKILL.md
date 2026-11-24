---
name: plain-direct-voice
description: |
  Write or edit blog posts, essays and articles in a plain, direct voice: plain assertions,
  everyday words, no callbacks or wordplay, light on research, other people's stories told
  second-hand, practical endings. Use when drafting, rewriting or reviewing long-form prose
  that should read this way. Not for code, commit messages, pull requests or technical docs.
license: MIT
metadata:
  version: "0.3.0"
---

# Plain, direct voice

Opinion pieces for working developers: state the point, give the reader what they need to act on it, stop. The rules and examples come from a writer's own line edits. Run `humanizer` too; it removes AI habits (recaps, reversals, dashes, triads), and this skill is the writer's sample it matches.

## Rules

1. **State it plainly.** Assert the point without epistemic labels ("that half is well supported", "as far as I know"). Put a needed qualifier inside the claim ("helps recover", "may have to infer"), not in a caveat sentence.
2. **Use everyday words,** including the terms developers already use ("tribal knowledge"). Readability beats precision, within the guardrail below.
3. **Be direct, not clever.** No callbacks, wordplay or metaphor carried through a passage.
4. **Keep research light.** One source per claim, only where the claim needs it. Report the one figure that carries the point, without the method or breakdown. Cut detours: famous results, anecdotes used as metaphors, the history of a tool.
5. **End sentences early.** Cut trailing qualifiers the next sentence covers. Name a list's items once.
6. **Tell other people's stories second-hand and in the plural** ("I've heard from colleagues in the industry about teams…"). Add no details the writer didn't give.
7. **Make general claims broad and firm:** "months or even years".
8. **Speak in the reader's field.** No lesson from history, law or science to set up a point.
9. **Give instructions, not habits:** "Use a small search agent", not "I use". Keep "I" for opinions and things the writer saw.
10. **End on the practice.** The last paragraph says what to do and stops.
11. **Write American English:** behavior, organization, gotten, archeology, labeled.

## Guardrail: flag source drift once

When a simpler word changes what a source says, or a cut breaks a link to another section, keep the writer's wording and say so once with a plain fix. Example: "cheated by reward-hacking in 30.5% of open-ended research tasks" drops that the study found it *unprompted* in *research-pipeline* tasks; offer "cheated, unprompted, by reward-hacking".

## Example edits

| Draft | Writer's version |
|---|---|
| That's a different number from the probability that the output is correct. | That's different from the probability that the output is correct. |
| …so whatever was missing, it wasn't compute. | …so the problem wasn't compute. |
| The machine can keep generating without getting closer to a correct result, and that half is well supported. | The machine can keep generating without getting closer to a correct result. |
| …and it comes down to three moves made before the first run. | …and it comes down to three moves: |
| I have watched colleagues spend more than $20,000 a month each on AI… | I've heard from colleagues in the industry about teams spending more than $20,000 a month per person on AI… |
| …breaking one can take months or even a year. | …breaking one can take months or even years. |
| Code archeology (n.): working out why code is the way it is from the evidence it left behind: the code itself, its tests, its history, the pull requests and tickets that shaped it, and the behavior of the running system. | Code archeology (n.): working out why code is the way it is from the evidence it left behind. |
| …the only record of it is an old pull request and a ticket nobody reads anymore. | …the only record of it is an old ticket buried by history. |
| Working out what a change must keep doing, like that check, hasn't gotten any easier. | Writing the right code takes work. |
| Nearly half were code that broke the task's requirements, about a third got a general fact wrong… Because these are shares of the hallucinations the authors classified, they aren't failure rates… | …about two thirds of hallucinations broke the task's requirements or project's setup (Zhang et al., 2025). |
| In history, primary sources are the records made at the time by the people involved… The same split works for code. | Code archeology starts with the evidence closest to what you're investigating. |
| Documentation, comments, colleagues' recollections and AI-generated summaries… | Documentation, tribal knowledge and AI-generated summaries… |
| I use a small search agent that answers one question at a time… | Use a small search agent that answers one question at a time… |

## Target register

> Gambling research calls this a near-miss, and near-misses make people want to keep playing (Clark et al., 2009). Nobody has shown the same effect in agent loops, and nineteen of twenty can be a real sign that one more run is worth it. The problem is carrying on when the evidence of progress is weak or comes only from the agent.

Reference posts: [Token boxing](https://codingthinks.com/ai/token-boxing/) (British spelling; follow rule 11 instead) and [Code archeology](https://codingthinks.com/ai/code-archeology/).

## How to work

1. Draft in this voice from the start, then run humanizer.
2. Keep every fact, number and source accurate, and add none.
3. When the writer edits a line, apply their wording as given, then flag drift once as above.
