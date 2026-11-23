---
name: plain-direct-voice
description: |
  Write or edit blog posts, essays and articles in a plain, direct voice: plain assertions,
  everyday words, no callbacks or wordplay, light on research, other people's stories told
  second-hand, practical endings. Use when drafting, rewriting or reviewing long-form prose
  that should read this way. Not for code, commit messages, pull requests or technical docs.
license: MIT
metadata:
  version: "0.2.0"
---

# Plain, direct voice

This voice is for opinion pieces written for working developers. It states a point, gives the reader what they need to act on it, and stops. The rules come from a writer's line edits to a full draft, so each one is a choice a writer made, not a style guess.

Run the `humanizer` skill as well when it is installed. Humanizer removes AI habits; this skill adds the writer's. Treat this skill as the writer's sample that humanizer matches.

## The rules

1. **State it plainly.** Assert the point. Keep hedges and epistemic labels ("that half is well supported", "that part is a hypothesis", "as far as I know") out of the argument's flow. When a claim needs qualifying, build the qualifier into the claim ("archeology helps recover", "the agent may have to infer") instead of adding a caveat sentence.
2. **Use everyday words.** Prefer "different" to "a different number", "wrong" to "false", "result" to "answer", "cheated by reward-hacking" to "reward-hacked". Everyday words include the terms developers already use: "tribal knowledge", not "colleagues' recollections". Readability beats precision, within one limit: see the guardrail below.
3. **Be direct, not clever.** No callbacks to earlier phrases, no echoes, no reversals ("improve the evidence instead of the work"), no punchlines ("verified perfectly"), no metaphor that has to be carried through ("when the box empties, fill it again").
4. **Keep research light.** At most one source per claim, and only for a claim that needs it. Report the one figure that carries the point, without the study's method, its full breakdown or a caveat sentence, unless the claim would mislead without them. Cut illustrative detours (a famous result, a personal anecdote used as a metaphor, the history of a tool) and state the general point instead.
5. **End sentences early.** Cut trailing qualifiers ("made before the first run", "an empty box") when the next sentence carries the detail. A colon can introduce a list without restating it.
6. **Keep distance on other people's stories.** Report them second-hand and in the plural: "I've heard from colleagues in the industry about teams…", never "I watched a colleague…". Don't add details the writer didn't give.
7. **Make general claims broad and firm.** "Months or even years", not "months or even a year".
8. **End on the practice.** The last paragraph says what to do and stops. No image, no return to the opening story, no summary line.
9. **Say each point once.** The readers aren't dumb. No thesis preview in the opening that later sections repeat, no recap at the end of a section, and no section that re-argues a point an earlier one made. Order the sections in the order the reader works: for example investigate, find what's uncertain, test it, specify, record.
10. **List once.** When a list appears, don't also name its items in the sentence that introduces it, and later mentions use the short form ("cite the evidence behind every finding", not the list of evidence types again).
11. **Don't teach from another field.** Say what something is in the reader's own terms. Skip the lesson from history, law or science that sets it up ("Historians separate primary sources…"); it reads as showing off.
12. **Give instructions, not habits.** State a practice as advice to the reader ("Use a small search agent…"), not as what the writer does ("I use…"). Keep "I" for opinions and things the writer saw.
13. **Write American English.** American spelling and idiom: behavior, organization, gotten, archeology, labeled.

## Guardrail: flag source drift once

When a simpler word changes what a source says, keep the writer's wording but say so once, briefly, with a fix that stays plain. Example: "cheated by reward-hacking in 30.5% of open-ended research tasks" drops that the study found the behavior *unprompted* in *research-pipeline* tasks. Offer "cheated, unprompted, by reward-hacking" and let the writer choose. Do the same when a cut breaks a link to an earlier section: "based on merit" lost the tie to "define done", and the writer took "based on the definition of done".

## Example edits

Each pair is a draft line and the writer's version.

| Draft | Writer's version |
|---|---|
| That's a different number from the probability that the output is correct. | That's different from the probability that the output is correct. |
| A fluent answer can break a requirement nobody wrote down, hide a bug or simply be false, and running the model again gets you another answer, which may or may not be a better one. | An iteration can break a requirement nobody wrote down, hide a bug or simply be wrong, and running the model again gets you another result, which may or may not be a better one. |
| …so whatever was missing, it wasn't compute. | …so the problem wasn't compute. |
| The machine can keep generating without getting closer to a correct result, and that half is well supported. | The machine can keep generating without getting closer to a correct result. |
| The second loop runs through the person at the keyboard, and it has no proof checker. | The second loop runs through the person at the keyboard. |
| …and it comes down to three moves made before the first run. | …and it comes down to three moves: |
| Second, set the box and treat an empty box as a checkpoint. | Second, set the box and treat it as a checkpoint. |
| I have watched colleagues spend more than $20,000 a month each on AI… | I've heard from colleagues in the industry about teams spending more than $20,000 a month per person on AI… |
| …breaking one can take months or even a year. | …breaking one can take months or even years. |
| …when it empties, someone looks at what is actually there and decides on purpose whether to fill it again. The projects I heard about went from week two to month six… | …when the budget runs out, a person looks at what has been built and decides whether to spend more. |
| Code archeology (n.): working out why code is the way it is from the evidence it left behind: the code itself, its tests, its history, the pull requests and tickets that shaped it, and the behavior of the running system. | Code archeology (n.): working out why code is the way it is from the evidence it left behind. |
| …the only record of it is an old pull request and a ticket nobody reads anymore. | …the only record of it is an old ticket buried by history. |
| Working out what a change must keep doing, like that check, hasn't gotten any easier. | Writing the right code takes work. |
| Nearly half were code that broke the task's requirements, about a third got a general fact wrong… Because these are shares of the hallucinations the authors classified, they aren't failure rates… | …about two thirds of hallucinations broke the task's requirements or project's setup (Zhang et al., 2025). |
| In history, primary sources are the records made at the time by the people involved, and secondary sources are someone's account of those records. The same split works for code. | Code archeology starts with the evidence closest to what you're investigating. |
| Documentation, comments, colleagues' recollections and AI-generated summaries… | Documentation, tribal knowledge and AI-generated summaries… |
| I use a small search agent that answers one question at a time… | Use a small search agent that answers one question at a time… |
| Tell the agent to cite the evidence behind every factual finding: file paths, lines, commits, tests or other records, tied to the revision it inspected. | Tell the agent to cite the evidence behind every finding. |
| …the effort needed to understand the background of a change dropped sharply. | …the effort needed to understand the background of a change dropped. |

The writer also cut a whole sentence of supporting example ("In formal mathematics a proof counts only once a proof checker validates it…") and dropped a swimming anecdote in favor of the general point about habits. On a later post they cut the draft in half, removed a section on the history of code search tools and its illustration because neither served the practical argument, and dropped every section recap.

## An accepted paragraph

This is the target register. Short sentences, plain words, one source, one caveat where the evidence is:

> Gambling research calls this a near-miss, and near-misses make people want to keep playing (Clark et al., 2009). Nobody has shown the same effect in agent loops, and nineteen of twenty can be a real sign that one more run is worth it. The problem is carrying on when the evidence of progress is weak or comes only from the agent.

The full reference samples are the posts [Token boxing](https://codingthinks.com/ai/token-boxing/) and [Code archeology](https://codingthinks.com/ai/code-archeology/). Token boxing uses British spelling; follow rule 13 instead.

## How to work

1. Draft in this voice from the start rather than writing generically and converting.
2. Check every sentence against the thirteen rules, then run humanizer's checks (no dashes, no not-X-but-Y, no one-line closers, no bold labels).
3. Keep every fact, number and source accurate. Never add a fact, story detail or quote the writer didn't give.
4. When the writer edits a line, apply their wording as given. If it causes source drift or breaks a link to another section, say so once, after applying it.
