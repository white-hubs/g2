export const fireResistanceColors: Record<string, string> = {
  一级: "green",
  二级: "blue",
  三级: "orange",
  四级: "red",
};

export const getFireResistanceColor = (level: string): string => fireResistanceColors[level] ?? "default";
