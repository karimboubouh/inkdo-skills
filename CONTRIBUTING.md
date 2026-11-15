# Contributing

A skill is accepted when it passes the lint and a maintainer approves the prompt.

## Lint rules

`scripts/skills-index.ts` (from the InkDo repo) rejects a file when:

- the file name is not `<slug>.md` with a slug matching `^[a-z0-9-]{1,60}$`;
- the file is over 16 KB;
- InkDo's own parser rejects it: no `name` (60 characters at most), an `output` other than `replace`, `insert` or `new-note`, or an empty body or one over 4,000 characters;
- the `name` equals a built-in's (Fix grammar, Mermaid diagram, Slide outline, Summarise) or another skill's, ignoring case;
- the body contains a URL, an image (`![`) or HTML (`<`);
- `author` or `updated` (`YYYY-MM-DD`) is missing.

Each rejection prints one line. Any rejection fails the run.

## What a maintainer looks for

- The prompt does what its name and description say, and nothing else.
- It works on any text, in the user's language.
- It never asks the model to fetch, send or reveal anything.
- It is original, or you have the right to share it.

Set `updated` to today's date whenever you change a skill.
