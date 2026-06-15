import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeScript,
  analyzeScripts,
  analyzePackageJson,
} from "../dist/index.js";

function ids(findings) {
  return findings.map((f) => f.ruleId).sort();
}

test("flags rm as a unix-command error", () => {
  const f = analyzeScript("clean", "rm -rf dist");
  assert.equal(f.length, 1);
  assert.equal(f[0].ruleId, "unix-command");
  assert.equal(f[0].severity, "error");
});

test("does not flag rimraf (substring of rm)", () => {
  assert.deepEqual(analyzeScript("clean", "rimraf dist"), []);
});

test("does not flag shx rm (the rm is an argument)", () => {
  assert.deepEqual(analyzeScript("clean", "shx rm -rf dist"), []);
});

test("flags inline env assignment", () => {
  const f = analyzeScript("build", "NODE_ENV=production webpack");
  assert.ok(f.some((x) => x.ruleId === "inline-env"));
});

test("does not flag cross-env usage", () => {
  const f = analyzeScript("build", "cross-env NODE_ENV=production webpack");
  assert.deepEqual(f, []);
});

test("flags mkdir -p but not plain mkdir", () => {
  assert.ok(analyzeScript("a", "mkdir -p build/x").some((x) => x.ruleId === "mkdir-p"));
  assert.deepEqual(analyzeScript("b", "mkdir build"), []);
});

test("flags command substitution as error", () => {
  const f = analyzeScript("v", "echo $(git rev-parse HEAD)");
  assert.ok(f.some((x) => x.ruleId === "command-substitution"));
});

test("flags env-var reference as warning", () => {
  const f = analyzeScript("v", "echo $HOME");
  const ref = f.find((x) => x.ruleId === "env-var-ref");
  assert.ok(ref);
  assert.equal(ref.severity, "warning");
});

test("flags /dev/null redirect", () => {
  assert.ok(analyzeScript("q", "node x.js > /dev/null").some((x) => x.ruleId === "dev-null"));
});

test("does not flag a fully portable script", () => {
  assert.deepEqual(analyzeScript("ok", "tsc && node dist/cli.js && jest"), []);
});

test("splits on && and analyzes each segment", () => {
  const f = analyzeScript("multi", "rm -rf dist && cp a b");
  assert.deepEqual(ids(f), ["unix-command", "unix-command"]);
});

test("analyzeScripts and analyzePackageJson agree", () => {
  const scripts = { clean: "rm -rf dist", build: "tsc" };
  const a = analyzeScripts(scripts);
  const b = analyzePackageJson({ scripts });
  assert.deepEqual(a, b);
  assert.equal(a.length, 1);
});

test("ignores non-string script values", () => {
  assert.deepEqual(analyzeScripts({ weird: 123 }), []);
});
