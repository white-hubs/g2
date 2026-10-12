import type { IConfiguration } from "dependency-cruiser";

// Re-export config used by CLI (Node/depcruise). Tests import createBoundaryRuleSet for fixtures.
import config from "../dependency-cruiser.config.mjs";

export const DOMAIN_FORBIDDEN_NPM = [
  "dayjs",
  "moment",
  "date-fns",
  "luxon",
  "axios",
  "ky",
  "wretch",
  "got",
  "superagent",
  "request",
  "ant-design-vue",
  "antd",
  "echarts",
  "crypto-js",
  "pinyin-pro",
  "lodash",
  "lodash-es",
  "underscore",
  "ramda",
  "uuid",
  "nanoid",
  "shortid",
  "qs",
  "query-string",
  "js-cookie",
  "js-base64",
  "localforage",
  "rxjs",
  "@vueuse/core",
  "ahooks",
  "vue-request",
] as const;

/**
 * `enforceSharedRetirement` 默认开启（ADR-0056 终态）；传 `false` 仅供迁移夹具对照。
 * 全仓 CLI 使用的 `dependency-cruiser.config.mjs` 已内嵌同名规则，与本默认一致。
 */
export function createBoundaryRuleSet(options?: { enforceSharedRetirement?: boolean }): IConfiguration {
  const base = structuredClone(config) as IConfiguration;
  const enforce = options?.enforceSharedRetirement !== false;
  const hasSharedRule = (base.forbidden ?? []).some((rule) => rule.name === "no-g2-shared-runtime");
  if (!enforce && hasSharedRule) {
    base.forbidden = (base.forbidden ?? []).filter((rule) => rule.name !== "no-g2-shared-runtime");
  }
  if (enforce && !hasSharedRule) {
    base.forbidden = [
      ...(base.forbidden ?? []),
      {
        name: "no-g2-shared-runtime",
        comment:
          "@g2-shared/* is retired; use library Platforms (datePlatform/loggerPlatform/resourcePlatform/…) via loadPlatform (ADR-0056).",
        severity: "error",
        from: { path: "^(apps|packages)/" },
        to: { path: "(^|/)node_modules/@g2-shared/|^packages/shared-" },
      },
    ];
  }
  return base;
}
