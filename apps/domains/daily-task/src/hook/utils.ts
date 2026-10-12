// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
type ParamsType = Record<string, unknown>;

// 过滤空值属性（空字符串、undefined、null）
export function filterEmptyValues<T extends ParamsType>(params: T): Partial<T> {
  if (typeof params !== "object" || params === null) {
    throw new Error("Invalid input type. Expected an object.");
  }
  return Object.entries(params).reduce<Partial<T>>((acc, [key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      // @ts-expect-error: The key is guaranteed to be a keyof T due to the reduce initializer.
      acc[key as keyof T] = value;
    }
    return acc;
  }, {});
}
