export interface PageLibraryViolation {
  file: string;
  rule: string;
}

const RULES: [string, RegExp][] = [
  ["must not depend on a Domain", /(?:@g2-domain\/|apps\/domains\/)/u],
  ["must not depend on a Shell", /(?:@g2-shell\/|apps\/shells\/)/u],
  ["must not own Vue Router navigation", /\b(?:createRouter|useRouter)\s*\(|\brouter\.push\s*\(/u],
  ["must not read or write browser auth storage", /\b(?:sessionStorage|localStorage)\b/u],
];

export function checkPageLibrarySource(file: string, source: string): PageLibraryViolation[] {
  return RULES.flatMap(([rule, pattern]) => (pattern.test(source) ? [{ file, rule }] : []));
}
