let enabled = true;

export function setColor(on: boolean): void {
  enabled = on;
}

function wrap(code: number, s: string): string {
  return enabled ? `\x1b[${code}m${s}\x1b[0m` : s;
}

export const c = {
  red: (s: string) => wrap(31, s),
  yellow: (s: string) => wrap(33, s),
  green: (s: string) => wrap(32, s),
  cyan: (s: string) => wrap(36, s),
  dim: (s: string) => wrap(2, s),
  bold: (s: string) => wrap(1, s),
};
