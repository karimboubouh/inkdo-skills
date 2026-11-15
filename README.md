# InkDo skills

Prompt-only AI actions for [InkDo](https://inkdo.app). Each skill is one `.md` file: front matter, then the instruction. The InkDo Skills gallery lists them; installing one copies the file to your computer.

## Submit a skill

1. Fork, then add one `<slug>.md` file. One skill per pull request.
2. Run `bun scripts/skills-index.ts . /tmp/skills-out` and fix every line it prints.
3. Open the PR. A maintainer reads the whole prompt before merging. Merged skills appear in the gallery with the SHA-256 of the file, and the app checks it on install.

## Format

```markdown
---
name: Tighten prose
output: replace
description: Cut filler, keep the voice
author: your-handle
updated: 2026-11-14
---
The instruction, up to 4,000 characters.
```

`output` is `replace` (swap the selection), `insert` (add below it) or `new-note` (open a new note).

See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules the lint enforces.
