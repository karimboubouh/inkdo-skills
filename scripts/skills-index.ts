// Builds the Skills gallery data: lints every <slug>.md in a directory with the app's own
// parseSkill, then writes index.json (docs/V07-GALLERY-SPEC.md §6) and copies each file byte for
// byte. Usage: bun scripts/skills-index.ts <skills-dir> <out-dir>. Exits 1 on any rejection.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSkill, type SkillOutput } from "./parse";

export interface GalleryEntry {
  slug: string;
  name: string;
  description: string;
  output: SkillOutput;
  author: string;
  sha256: string;
  bytes: number;
  updated: string;
}

export const SLUG = /^[a-z0-9-]{1,60}$/;
export const MAX_BYTES = 16 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Built-in skill names (scripts/builtin/*.md, copied from the InkDo app), from the files so they cannot drift. */
export function builtinNames(): string[] {
  const dir = join(import.meta.dirname, "./builtin");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseSkill(readFileSync(join(dir, f), "utf8"), true)?.name)
    .filter((n): n is string => !!n);
}

/** One front-matter value (the keys parseSkill ignores: author, updated). */
function front(text: string, key: string): string {
  const m = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/.exec(text);
  for (const line of m?.[1]?.split(/\r?\n/) ?? []) {
    const kv = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (kv && (kv[1] as string).toLowerCase() === key) {
      return (kv[2] as string).trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  return "";
}

/** Reasons a skill file is rejected; empty when it is fine. */
export function lintFile(
  slug: string,
  data: Buffer,
  taken: ReadonlyMap<string, string>,
  builtins: readonly string[],
): string[] {
  const errs: string[] = [];
  if (!SLUG.test(slug)) errs.push("slug must match ^[a-z0-9-]{1,60}$");
  if (data.length > MAX_BYTES) errs.push(`file is ${data.length} bytes, the limit is ${MAX_BYTES}`);
  const text = data.toString("utf8");
  const skill = parseSkill(text);
  if (!skill) {
    errs.push(
      "not a valid skill (needs name, output replace|insert|new-note, a body ≤ 4000 chars)",
    );
    return errs;
  }
  const lower = skill.name.toLowerCase();
  if (builtins.some((b) => b.toLowerCase() === lower))
    errs.push(`name "${skill.name}" is a built-in`);
  const dup = taken.get(lower);
  if (dup) errs.push(`name "${skill.name}" is already used by ${dup}.md`);
  if (/https?:\/\/|www\.|\bftp:\/\/|\w+:\/\/|mailto:/i.test(skill.body))
    errs.push("body contains a URL");
  if (/!\[/.test(skill.body)) errs.push("body contains an image (![)");
  if (/</.test(skill.body)) errs.push("body contains HTML (<)");
  if (!front(text, "author")) errs.push("front matter needs author");
  if (!DATE.test(front(text, "updated"))) errs.push("front matter needs updated: YYYY-MM-DD");
  return errs;
}

export interface Result {
  entries: GalleryEntry[];
  files: Map<string, Buffer>;
  errors: string[];
}

/** Lint a directory of <slug>.md files and build the index entries. */
export function buildIndex(dir: string, builtins: readonly string[] = builtinNames()): Result {
  const entries: GalleryEntry[] = [];
  const files = new Map<string, Buffer>();
  const errors: string[] = [];
  const taken = new Map<string, string>();
  for (const f of readdirSync(dir).sort()) {
    // Repo docs sit beside the skills; every other .md is a skill.
    if (!f.endsWith(".md") || /^(README|CONTRIBUTING)\.md$/.test(f)) continue;
    const slug = f.slice(0, -3);
    const data = readFileSync(join(dir, f));
    const errs = lintFile(slug, data, taken, builtins);
    for (const e of errs) errors.push(`${f}: ${e}`);
    const skill = errs.length ? null : parseSkill(data.toString("utf8"));
    if (!skill) continue;
    taken.set(skill.name.toLowerCase(), slug);
    const text = data.toString("utf8");
    files.set(f, data);
    entries.push({
      slug,
      name: skill.name,
      description: skill.description,
      output: skill.output,
      author: front(text, "author"),
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.length,
      updated: front(text, "updated"),
    });
  }
  return { entries, files, errors };
}

/** Lint and write index.json plus the copied files. Returns the rejection lines. */
export function writeGallery(dir: string, out: string): string[] {
  const { entries, files, errors } = buildIndex(dir);
  if (errors.length) return errors;
  mkdirSync(out, { recursive: true });
  for (const [f, data] of files) writeFileSync(join(out, f), data);
  writeFileSync(
    join(out, "index.json"),
    `${JSON.stringify({ version: 1, skills: entries }, null, 2)}\n`,
  );
  return [];
}

if (import.meta.main) {
  const [dir, out] = process.argv.slice(2);
  if (!dir || !out) {
    console.error("usage: bun scripts/skills-index.ts <skills-dir> <out-dir>");
    process.exit(2);
  }
  const errors = writeGallery(dir, out);
  for (const e of errors) console.error(e);
  if (errors.length) process.exit(1);
  console.log(
    `skills: ${readdirSync(out).filter((f) => f.endsWith(".md")).length} skills → ${out}`,
  );
}
