export function getVideoAccessMode(): string {
  const config = (window as { config?: { feature?: { videoAccessMode?: string } } }).config;
  return config?.feature?.videoAccessMode ?? "H5S";
}
