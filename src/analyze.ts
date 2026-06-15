import { parseSegment, splitSegments } from "./tokenize.js";
import { UNIX_COMMANDS } from "./rules.js";
import type { Finding, Severity, Summary } from "./types.js";

function mk(
  script: string,
  body: string,
  ruleId: string,
  severity: Severity,
  message: string,
  suggestion: string,
  match: string,
): Finding {
  return { script, body, ruleId, severity, message, suggestion, match };
}

/** Analyze a single npm script body, returning any portability findings. */
export function analyzeScript(name: string, body: string): Finding[] {
  const out: Finding[] = [];
  const segments = splitSegments(body).map(parseSegment);

  // Per-segment rules: command names and inline env assignments.
  for (const seg of segments) {
    const unix = UNIX_COMMANDS[seg.command];
    if (unix) {
      out.push(
        mk(
          name,
          body,
          "unix-command",
          unix.severity,
          `\`${seg.command}\` is a Unix command that isn't available in Windows cmd.exe.`,
          unix.suggestion,
          seg.command,
        ),
      );
    }
    if (seg.hadLeadingEnv) {
      out.push(
        mk(
          name,
          body,
          "inline-env",
          "error",
          `Inline env assignment \`${seg.leadingEnvRaw}\` is ignored by Windows cmd.exe.`,
          "Use `cross-env` (npm i -D cross-env): `cross-env " +
            seg.leadingEnvRaw +
            " <command>`.",
          seg.leadingEnvRaw,
        ),
      );
    }
  }

  // Whole-script syntax rules (run once on the raw body to avoid duplicates).
  const mkdirP = body.match(/\bmkdir\s+-p\b/);
  if (mkdirP) {
    out.push(
      mk(
        name,
        body,
        "mkdir-p",
        "error",
        "`mkdir -p` fails on Windows because cmd.exe treats `-p` as a directory name.",
        "Use `shx mkdir -p` or `make-dir-cli`.",
        mkdirP[0],
      ),
    );
  }

  const sub = body.match(/\$\([^)]*\)|`[^`]*`/);
  if (sub) {
    out.push(
      mk(
        name,
        body,
        "command-substitution",
        "error",
        "Command substitution isn't supported in Windows cmd.exe.",
        "Move this logic into a Node script (e.g. `node scripts/task.mjs`).",
        sub[0],
      ),
    );
  }

  const envRef = body.match(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/);
  if (envRef) {
    out.push(
      mk(
        name,
        body,
        "env-var-ref",
        "warning",
        `\`${envRef[0]}\` uses POSIX env-var syntax; cmd.exe expects \`%VAR%\`.`,
        "Use `cross-env-shell` for a consistent shell, or read the var inside a Node script.",
        envRef[0],
      ),
    );
  }

  const sq = body.match(/'[^']*'/);
  if (sq) {
    out.push(
      mk(
        name,
        body,
        "single-quotes",
        "warning",
        "Single quotes are passed literally by cmd.exe; only double quotes group arguments.",
        "Use double quotes, or run the command through a Node script.",
        sq[0],
      ),
    );
  }

  if (/\/dev\/null/.test(body)) {
    out.push(
      mk(
        name,
        body,
        "dev-null",
        "warning",
        "`/dev/null` doesn't exist on Windows (the equivalent is `NUL`).",
        "Drop the redirect, or handle output inside a Node script.",
        "/dev/null",
      ),
    );
  }

  if (/;(?:\s|$)/.test(body)) {
    out.push(
      mk(
        name,
        body,
        "semicolon-separator",
        "warning",
        "`;` does not separate commands in Windows cmd.exe.",
        "Chain commands with `&&` instead of `;`.",
        ";",
      ),
    );
  }

  return out;
}

/** Analyze every script in a scripts map. */
export function analyzeScripts(scripts: Record<string, unknown>): Finding[] {
  const out: Finding[] = [];
  for (const [name, body] of Object.entries(scripts)) {
    if (typeof body === "string") out.push(...analyzeScript(name, body));
  }
  return out;
}

/** Analyze a parsed package.json object. */
export function analyzePackageJson(pkg: { scripts?: Record<string, unknown> }): Finding[] {
  if (!pkg || typeof pkg !== "object" || !pkg.scripts) return [];
  return analyzeScripts(pkg.scripts);
}

/** Roll up findings into counts. */
export function summarize(findings: Finding[], totalScripts: number): Summary {
  const scriptsWithIssues = new Set(findings.map((f) => f.script)).size;
  return {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    scripts: totalScripts,
    scriptsWithIssues,
  };
}
