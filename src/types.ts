export type Severity = "error" | "warning";

/** A single portability problem found in one npm script. */
export interface Finding {
  /** The name of the npm script (the key in package.json "scripts"). */
  script: string;
  /** The full script body that was analyzed. */
  body: string;
  /** Stable identifier for the rule that produced this finding. */
  ruleId: string;
  /** How serious the problem is. */
  severity: Severity;
  /** Human-readable explanation of the problem. */
  message: string;
  /** A concrete, cross-platform fix. */
  suggestion: string;
  /** The offending snippet from the script. */
  match: string;
}

export interface Summary {
  errors: number;
  warnings: number;
  scripts: number;
  scriptsWithIssues: number;
}
