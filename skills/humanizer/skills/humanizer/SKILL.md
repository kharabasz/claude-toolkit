---
name: humanizer
description: |
  Rewrite AI-sounding text so it reads like the writer without changing what it says.
  Use when editing or reviewing prose for AI tells: not-X-but-Y contrasts, one-line
  closers, staged openers, forced triads, dashes everywhere, inflated claims, sales
  language, stock AI words, bold labels, filler, monotonous paragraph rhythm, or paragraphs
  and sections that echo each other.
license: MIT
metadata:
  version: "4.0.0"
---

# Humanizer

Edit text so it reads like a person wrote it for one reader. Keep every fact, number, name, date, quote and citation, and add none. Change prose only: leave code, commands, paths, URLs, front matter and quotations as they are. When the writer gives a sample or a voice skill applies, match it; it wins over these rules.

## Structure

1. Give each section one job no other section does. In a how-to, order sections the way the reader works. Merge or cut a section that re-argues an earlier point.
2. Say each point once. No preview of what's coming, no recap at the end of a paragraph or section, no paragraph that opens by restating the one before.
3. No one-line closer that repeats the paragraph or names what an example just showed ("That's the real win.", "This shows..."). A short paragraph is fine when it adds a new claim.
4. Vary paragraph length. No run of three same-length paragraphs, and split anything over four sentences.
5. Lead with the point. Cut run-ups like "Let's dive in", "Here's the thing" and "Honestly?".
6. Don't answer objections nobody raised ("To be clear", "I'm not saying", "A tempting approach would be").

## Sentences

7. No "not X but Y", "it's not X, it's Y", or the same contrast split across two sentences. Keep a contrast only when the reader really holds the first belief.
8. Don't force ideas into threes. Use three items only when there are three.
9. Never start two sentences in a row with the same word. Don't twist a plain sentence just to vary its structure.
10. Replace sayings that pose as insight ("At its core", "X is the language of Y") with the claim itself.
11. Cut trailing -ing phrases that add no fact ("highlighting...", "ensuring...").
12. Use is, are and has instead of "serves as", "stands as", "boasts" or "features".
13. Use one hedge at most, and only when the source supports the doubt.
14. Prefer active voice when it shows who acts.
15. Say how things relate: "founded" or "chairs", not "associated with".

## Words

16. Avoid stock AI words: additionally, crucial, delve, enhance, foster, garner, highlight (verb), intricate, key (adjective), landscape (abstract), meticulous, pivotal, robust (figurative), showcase, tapestry, testament, underscore, valuable, vibrant.
17. Drop inflated significance and sales language ("a pivotal moment", "rich heritage", "nestled", "the future looks bright"). Keep the fact and end on the last concrete one.
18. Name the source or cut the claim. No "experts say" and no lists of outlets as proof.
19. No knowledge-limit hedges or guesses ("not widely documented", "likely grew up"). Say what is missing, or cut the sentence.

## Formatting

20. No em or en dashes, including spaced hyphens used as dashes. Use a period, comma, colon or parentheses.
21. No decorative bold, no bold label and colon on every list item, no emojis.
22. Sentence-case headings and straight quotes.
23. Hyphenate a compound before a noun, not after it: "a long-term plan", "the plan is long term".

## Leftovers

24. Remove chatbot wrappers: greetings, praise, "I hope this helps", "Let me know if".
25. Don't write about the document: what it replaced, how it was put together, or what the reader can already see.
26. In a reply, lead with the decision and drop background the reader already has.

## When not to act

Leave quotations, titles, names and text that discusses a phrase alone. Keep the writer's specific details, mixed feelings, asides and first-person choices. One tell alone proves little, so act on clusters, except for rules 2, 3, 7 and 20, which justify an edit on sight.

## How to work

1. If the text has headings, check rule 1 against one line per heading before touching sentences.
2. Rewrite each paragraph around its point instead of patching flagged phrases.
3. Check that no fact was added or lost, then scan again for rules 2, 3, 7, 8 and 20, which survive rewrites most often.
4. For a file, write the final text back and summarize what changed. For pasted text, return the rewrite.

Patterns from Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) and [blader/humanizer](https://github.com/blader/humanizer) (MIT).
