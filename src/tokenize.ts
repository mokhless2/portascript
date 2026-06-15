/**
 * Lightweight, heuristic tokenizer for npm script bodies.
 *
 * It is deliberately NOT a full shell parser: npm scripts are short and the
 * goal is high-signal detection, not perfect POSIX semantics. Operators inside
 * quotes are not specially handled, which is rare enough in practice to ignore.
 */

export interface Segment {
  /** The raw segment text (trimmed). */
  raw: string;
  /** The base command name, lowercased (e.g. "rm", "node", "shx"). */
  command: string;
  /** Whether the segment begins with one or more inline env assignments. */
  hadLeadingEnv: boolean;
  /** The leading env assignment text, if any (e.g. `NODE_ENV=production`). */
  leadingEnvRaw: string;
}

// Order matters: longer operators first so `&&` beats `&` and `||` beats `|`.
const OP_SPLIT = /\s*(?:&&|\|\||;|\||&)\s*/;

/** Split a script body into command segments on shell operators. */
export function splitSegments(script: string): string[] {
  return script
    .split(OP_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const ENV_ASSIGN = /^([A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+))\s+/;

/** Parse a single segment into structured form. */
export function parseSegment(raw: string): Segment {
  let rest = raw;
  let leadingEnvRaw = "";
  let m: RegExpExecArray | null;
  while ((m = ENV_ASSIGN.exec(rest)) !== null) {
    leadingEnvRaw += (leadingEnvRaw ? " " : "") + m[1];
    rest = rest.slice(m[0].length);
  }

  const firstToken = rest.split(/\s+/)[0] ?? "";
  const command = baseName(stripQuotes(firstToken)).toLowerCase();

  return {
    raw,
    command,
    hadLeadingEnv: leadingEnvRaw.length > 0,
    leadingEnvRaw,
  };
}

function stripQuotes(s: string): string {
  return s.replace(/^['"]+|['"]+$/g, "");
}

function baseName(s: string): string {
  const parts = s.split(/[\\/]/);
  return parts[parts.length - 1] || s;
}
