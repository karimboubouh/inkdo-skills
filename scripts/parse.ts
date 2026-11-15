// A skill is an AI action written as a small .md file: front matter (`name`, `output`, and an
// optional `description`) and a body that is the instruction. Pure: no files, no Tauri.

export type SkillOutput = "replace" | "insert" | "new-note";

export interface Skill {
  name: string;
  description: string;
  output: SkillOutput;
  /** The instruction sent with the text. */
  body: string;
  builtin: boolean;
  /** Set by the loader: your file in Skills/, or a gallery install (Skills/gallery/). */
  source?: "yours" | "gallery";
  /** The file name (yours) or the slug (gallery), for Reveal and Remove. */
  file?: string;
  /** Gallery: the hash recorded at Install, and whether the file changed since. */
  sha256?: string | null;
  edited?: boolean;
}

/** What a run carries into the ⌘J bar. */
export interface SkillRun {
  name: string;
  instruction: string;
  output: SkillOutput;
}

export const OUTPUTS: SkillOutput[] = ["replace", "insert", "new-note"];
/** A longer file is more likely a mistake than a prompt. */
export const MAX_BODY = 4000;

const FRONT = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

/** The skill in a file's text, or null when it is not a valid one (no name, unknown output, …). */
export function parseSkill(text: string, builtin = false): Skill | null {
  const m = FRONT.exec(text);
  if (!m) return null;
  const fields = new Map<string, string>();
  for (const line of (m[1] as string).split(/\r?\n/)) {
    const kv = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) fields.set((kv[1] as string).toLowerCase(), unquote((kv[2] as string).trim()));
  }
  const name = fields.get("name") ?? "";
  const output = (fields.get("output") ?? "") as SkillOutput;
  const body = (m[2] as string).trim();
  if (!name || name.length > 60 || !OUTPUTS.includes(output)) return null;
  if (!body || body.length > MAX_BODY) return null;
  return { name, description: fields.get("description") ?? "", output, body, builtin };
}

function unquote(s: string): string {
  const q = s[0];
  return s.length > 1 && (q === '"' || q === "'") && s.endsWith(q) ? s.slice(1, -1) : s;
}

export const asRun = (s: Skill): SkillRun => ({
  name: s.name,
  instruction: s.body,
  output: s.output,
});

/** A file name for the note a `new-note` skill makes. */
export function noteName(skill: string): string {
  return (
    skill
      .replace(/[\\/:*?"<>|\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Note"
  );
}
