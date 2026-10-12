const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "application/javascript",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function contentTypeForPath(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) {
    return "application/octet-stream";
  }
  const ext = filePath.slice(dot).toLowerCase();
  return EXTENSION_CONTENT_TYPES[ext] ?? "application/octet-stream";
}
