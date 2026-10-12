export interface RuntimeCommonFallbackViolation {
  file: string;
  packageName: string;
}

/**
 * Vite MF emits this canonical share-cache key only when a consumer has put a
 * local implementation in its chunk. Merely declaring a runtime provider in
 * the manifest does not match it, so this checks the actual emitted JS.
 */
export function findRuntimeCommonFallbacks(
  file: string,
  source: string,
  packageNames: readonly string[],
): RuntimeCommonFallbackViolation[] {
  return packageNames.flatMap((packageName) => (source.includes(`canonical:\`default:${packageName}\``) ? [{ file, packageName }] : []));
}
