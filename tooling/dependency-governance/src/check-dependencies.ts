export interface Whitelist {
  baseline: string[];
  encapsulatedBy: Record<string, string[]>;
  /**
   * 「经 platform 重新暴露」模式（ADR-0041 第二条收敛路径，先例见 ADR-0012 antdv/vant）：
   * key 是三方库名，value 是允许在自己 package.json 里直接声明该依赖的包名列表（通常是对应
   * 的 platform 包本身）。检查逻辑与 encapsulatedBy 相同（只有登记的包能声明），区别只在语义
   * 标注——encapsulatedBy 强调「对外不暴露原始接口」，exposedBy 强调「对外可以拿到原始接口，
   * 但消费方只能通过这个包 import，不能自己声明依赖」。
   */
  exposedBy?: Record<string, string[]>;
}

export interface PackageJsonLike {
  name: string;
  dependencies?: Record<string, string>;
}

export function checkPackageDependencies(pkg: PackageJsonLike, whitelist: Whitelist): string[] {
  const violations: string[] = [];
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    if (dep.startsWith("@g2-")) {
      continue;
    }
    if (whitelist.baseline.includes(dep)) {
      continue;
    }
    const registeredBy = whitelist.encapsulatedBy[dep] ?? whitelist.exposedBy?.[dep];
    if (registeredBy === undefined) {
      violations.push(`"${dep}" is not in baseline or any encapsulation whitelist (declared by ${pkg.name})`);
      continue;
    }
    if (!registeredBy.includes(pkg.name)) {
      violations.push(
        `"${dep}" must only be declared by its encapsulation whitelist (${registeredBy.join(", ") || "none"}), not by ${pkg.name}`,
      );
    }
  }
  return violations;
}
