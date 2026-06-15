# portascript

> Lint your `package.json` scripts for non-portable shell that silently breaks on Windows.

[![CI](https://github.com/mokhless2/portascript/actions/workflows/ci.yml/badge.svg)](https://github.com/mokhless2/portascript/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/portascript.svg)](https://www.npmjs.com/package/portascript)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A huge number of npm packages quietly break for Windows contributors because their
scripts assume a POSIX shell — `rm -rf`, `cp`, inline `NODE_ENV=production …`,
`$(...)`, single quotes, `/dev/null`. The fixes are well known (`cross-env`,
`rimraf`, `shx`), but nothing tells you *where* the problems are. `portascript`
does: it reads your scripts, flags the non-portable bits, and names the fix.

- **Zero runtime dependencies.** Just Node.
- **CI-friendly.** Non-zero exit code when problems are found.
- **Library + CLI.** Use it as a tool or import the analyzer.
- **Low noise.** Cross-platform tools (`node`, `tsc`, `eslint`, `vite`, …) and
  Windows-safe operators like `&&` are *not* flagged.

## Install

```bash
# one-off
npx portascript

# or as a dev dependency
npm install --save-dev portascript
```

## Usage

```bash
# lint ./package.json
portascript

# lint a specific file or directory
portascript ./packages/core

# machine-readable output
portascript --json

# treat warnings as failures too (good for CI)
portascript --strict
```

### Example output

Running it against a typical Unix-only setup:

```text
✖ build  (2)
  NODE_ENV=production webpack && cp src/index.html dist/
    error   inline-env  Inline env assignment `NODE_ENV=production` is ignored by Windows cmd.exe.
           fix: Use `cross-env` (npm i -D cross-env): `cross-env NODE_ENV=production <command>`.
    error   unix-command  `cp` is a Unix command that isn't available in Windows cmd.exe.
           fix: Use `shx cp`, `copyfiles`, or `cpy-cli`.

⚠ lint  (1)
  eslint 'src/**/*.ts'
    warning single-quotes  Single quotes are passed literally by cmd.exe; only double quotes group arguments.
           fix: Use double quotes, or run the command through a Node script.

Summary: 5 errors, 2 warnings across 6/8 scripts.
```

### In CI

Add it as a step so a Windows-breaking script can never land:

```yaml
- run: npx portascript --strict
```

### Exit codes

| Code | Meaning                                              |
| ---- | --------------------------------------------------- |
| `0`  | Clean (or only warnings, without `--strict`)        |
| `1`  | Portability problems found                          |
| `2`  | Usage error (e.g. `package.json` not found)         |

## Rules

| Rule                   | Severity | What it catches                                              |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `unix-command`         | error    | `rm`, `cp`, `mv`, `cat`, `touch`, `ln`, `which`, `sleep`, `export`, … |
| `inline-env`           | error    | `VAR=value cmd` env assignment (needs `cross-env`)           |
| `mkdir-p`              | error    | `mkdir -p` — `cmd.exe` treats `-p` as a folder name          |
| `command-substitution` | error    | `$(...)` and backticks                                       |
| `env-var-ref`          | warning  | `$VAR` / `${VAR}` (cmd uses `%VAR%`)                          |
| `single-quotes`        | warning  | single quotes are literal in `cmd.exe`                       |
| `dev-null`             | warning  | `/dev/null` (Windows uses `NUL`)                             |
| `semicolon-separator`  | warning  | `;` doesn't chain commands in `cmd.exe`                      |

**Intentionally not flagged:** `&&` and `||` work in modern Windows `cmd.exe`,
and portable JS-based tools run everywhere, so they stay quiet to keep the
signal high.

## Programmatic API

```ts
import { analyzePackageJson, analyzeScript } from "portascript";

const findings = analyzeScript("clean", "rm -rf dist");
// [{ script: "clean", ruleId: "unix-command", severity: "error", ... }]

import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const all = analyzePackageJson(pkg);
```

Exported: `analyzeScript`, `analyzeScripts`, `analyzePackageJson`, `summarize`,
`UNIX_COMMANDS`, `RULE_DOCS`, plus the `Finding` / `Severity` types.

## How it works (and its limits)

`portascript` uses a lightweight, heuristic tokenizer — it splits scripts on
shell operators and inspects each command. It is deliberately **not** a full
shell parser, because npm scripts are short and the goal is high-signal hints,
not perfect POSIX emulation. Edge cases like operators inside quotes may not be
parsed exactly; please open an issue with any false positives or misses.

## Contributing

```bash
npm install
npm run build
npm test
```

PRs welcome — new rules are easy to add in `src/rules.ts` and `src/analyze.ts`.

## License

MIT
