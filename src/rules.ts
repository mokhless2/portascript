import type { Severity } from "./types.js";

/**
 * Unix coreutils / shell builtins that are not available (or behave
 * differently) in Windows `cmd.exe`, mapped to a portable fix.
 *
 * Note: cross-platform JS tools (node, npm, tsc, eslint, vite, ...) are NOT
 * listed here on purpose — they already run everywhere.
 */
export const UNIX_COMMANDS: Record<
  string,
  { severity: Severity; suggestion: string }
> = {
  rm: { severity: "error", suggestion: "Use `rimraf` (npm i -D rimraf) or `shx rm`." },
  cp: { severity: "error", suggestion: "Use `shx cp`, `copyfiles`, or `cpy-cli`." },
  mv: { severity: "error", suggestion: "Use `shx mv` or `move-file-cli`." },
  cat: { severity: "error", suggestion: "Use `shx cat`." },
  touch: { severity: "error", suggestion: "Use `shx touch`." },
  ln: { severity: "error", suggestion: "Use `shx ln`, or avoid symlinks in scripts." },
  chmod: {
    severity: "warning",
    suggestion: "Use `shx chmod`; note Windows ignores POSIX permissions anyway.",
  },
  which: {
    severity: "error",
    suggestion: "Windows uses `where`. Use `npm-which` or a small Node script.",
  },
  sleep: {
    severity: "error",
    suggestion: 'Use the `sleep` npm package or `node -e "setTimeout(()=>{},1000)"`.',
  },
  grep: {
    severity: "warning",
    suggestion: "Not on Windows. Use a Node script or a cross-platform search tool.",
  },
  sed: {
    severity: "warning",
    suggestion: "Not on Windows. Use `replace-in-file` or a Node script.",
  },
  awk: { severity: "warning", suggestion: "Not on Windows. Use a Node script." },
  export: {
    severity: "error",
    suggestion: "`export` is shell-only. Use `cross-env` to set env vars portably.",
  },
  pwd: {
    severity: "warning",
    suggestion: "Not a cmd.exe builtin. Use `node -p process.cwd()` if you need it.",
  },
  printenv: {
    severity: "warning",
    suggestion: "Not on Windows. Use `node -p process.env`.",
  },
};

/** Human-readable catalogue of every rule, for docs and introspection. */
export const RULE_DOCS: { id: string; severity: Severity; summary: string }[] = [
  { id: "unix-command", severity: "error", summary: "Unix coreutils/builtins missing on Windows cmd.exe." },
  { id: "inline-env", severity: "error", summary: "Inline `VAR=value cmd` env assignment (needs cross-env)." },
  { id: "mkdir-p", severity: "error", summary: "`mkdir -p` treats `-p` as a folder name on Windows." },
  { id: "command-substitution", severity: "error", summary: "`$(...)` / backticks unsupported in cmd.exe." },
  { id: "env-var-ref", severity: "warning", summary: "`$VAR` / `${VAR}` syntax is POSIX-only (cmd uses %VAR%)." },
  { id: "single-quotes", severity: "warning", summary: "Single quotes are literal in cmd.exe." },
  { id: "dev-null", severity: "warning", summary: "`/dev/null` does not exist on Windows (it's `NUL`)." },
  { id: "semicolon-separator", severity: "warning", summary: "`;` does not separate commands in cmd.exe." },
];
