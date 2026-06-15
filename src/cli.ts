#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { analyzePackageJson, summarize } from "./analyze.js";
import type { Finding } from "./types.js";
import { c, setColor } from "./color.js";

interface Options {
  json: boolean;
  strict: boolean;
  quiet: boolean;
  color: boolean;
  help: boolean;
  version: boolean;
  path: string | undefined;
}

function getVersion(): string {
  try {
    const url = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(url, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    json: false,
    strict: false,
    quiet: false,
    color: process.stdout.isTTY === true && !("NO_COLOR" in process.env),
    help: false,
    version: false,
    path: undefined,
  };
  for (const arg of argv) {
    switch (arg) {
      case "--json": opts.json = true; break;
      case "--strict": opts.strict = true; break;
      case "--quiet": opts.quiet = true; break;
      case "--no-color": opts.color = false; break;
      case "--color": opts.color = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      case "-v":
      case "--version": opts.version = true; break;
      default:
        if (!arg.startsWith("-") && opts.path === undefined) opts.path = arg;
        break;
    }
  }
  return opts;
}

const HELP = `portascript — lint package.json scripts for Windows-breaking shell

Usage:
  portascript [path] [options]

Arguments:
  path            A package.json file or a directory containing one
                  (default: ./package.json)

Options:
  --json          Output findings as JSON
  --strict        Exit non-zero on warnings too (not just errors)
  --quiet         Only show errors, hide warnings
  --no-color      Disable colored output
  -v, --version   Print version
  -h, --help      Show this help

Exit codes:
  0  clean (or only warnings without --strict)
  1  portability problems found
  2  usage error (e.g. package.json not found)`;

function resolvePackageJson(input: string | undefined): string {
  const target = input ?? ".";
  if (existsSync(target) && statSync(target).isDirectory()) {
    return join(target, "package.json");
  }
  return target;
}

function printHuman(findings: Finding[], opts: Options, totalScripts: number): void {
  const shown = opts.quiet ? findings.filter((f) => f.severity === "error") : findings;
  console.log(c.bold(`portascript v${getVersion()}`) + "\n");

  if (shown.length === 0) {
    console.log(c.green("\u2714 No Windows portability problems found."));
    return;
  }

  const byScript = new Map<string, Finding[]>();
  for (const f of shown) {
    const list = byScript.get(f.script) ?? [];
    list.push(f);
    byScript.set(f.script, list);
  }

  for (const [script, list] of byScript) {
    const hasError = list.some((f) => f.severity === "error");
    const icon = hasError ? c.red("\u2716") : c.yellow("\u26a0");
    console.log(`${icon} ${c.bold(script)}  ${c.dim(`(${list.length})`)}`);
    console.log(`  ${c.dim(list[0]!.body)}`);
    for (const f of list) {
      const tag = f.severity === "error" ? c.red("error  ") : c.yellow("warning");
      console.log(`    ${tag} ${c.cyan(f.ruleId)}  ${f.message}`);
      console.log(`           ${c.dim("fix:")} ${f.suggestion}`);
    }
    console.log("");
  }

  const s = summarize(findings, totalScripts);
  console.log(
    c.dim("Summary: ") +
      c.red(`${s.errors} error${s.errors === 1 ? "" : "s"}`) +
      ", " +
      c.yellow(`${s.warnings} warning${s.warnings === 1 ? "" : "s"}`) +
      c.dim(` across ${s.scriptsWithIssues}/${s.scripts} scripts.`),
  );
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  setColor(opts.color);

  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }
  if (opts.version) {
    console.log(getVersion());
    process.exit(0);
  }

  const pkgPath = resolvePackageJson(opts.path);
  if (!existsSync(pkgPath)) {
    console.error(c.red(`error: ${pkgPath} not found.`));
    process.exit(2);
  }

  let pkg: { scripts?: Record<string, unknown> };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (err) {
    console.error(c.red(`error: could not parse ${pkgPath}: ${(err as Error).message}`));
    process.exit(2);
  }

  const totalScripts = pkg.scripts ? Object.keys(pkg.scripts).length : 0;
  const findings = analyzePackageJson(pkg);

  if (opts.json) {
    const s = summarize(findings, totalScripts);
    console.log(JSON.stringify({ version: getVersion(), summary: s, findings }, null, 2));
  } else {
    printHuman(findings, opts, totalScripts);
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  if (errors > 0 || (opts.strict && warnings > 0)) process.exit(1);
  process.exit(0);
}

main();
