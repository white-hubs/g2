function segment(): string {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

/** 旧页 `guid()`：仅用于前端行标识，提交前会被剔除。 */
export function guid(): string {
  return `${segment()}${segment()}-${segment()}-${segment()}-${segment()}-${segment()}${segment()}${segment()}`;
}
