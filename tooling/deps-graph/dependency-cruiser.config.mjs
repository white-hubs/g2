/** @type {import("dependency-cruiser").IConfiguration} */
const DOMAIN_PATH = "^apps/domains";

const DOMAIN_FORBIDDEN_NPM = [
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
];

function npmPathPattern(names) {
  const escaped = names.map((n) => n.replaceAll("/", "\\/").replaceAll(".", "\\."));
  return `(^|/)node_modules/(${escaped.join("|")})(/|$)`;
}

const domainForbiddenNpm = DOMAIN_FORBIDDEN_NPM.map((name) => ({
  name: `domain-no-direct-${name.replaceAll("@", "").replaceAll("/", "-")}`,
  comment: `domains must not import "${name}"; use @g2-platform/* library Platform via loadPlatform/ensure (ADR-0040/0041/0045/0056), or encapsulate first.`,
  severity: "error",
  from: { path: DOMAIN_PATH },
  to: { path: npmPathPattern([name]) },
}));

export default {
  forbidden: [
    ...domainForbiddenNpm,
    {
      name: "domain-no-peer-domain-pkg",
      comment: "domains must not import other @g2-domain/* packages; share via contracts or library Platforms (ADR-0056).",
      severity: "error",
      from: { path: DOMAIN_PATH },
      to: { path: "(^|/)node_modules/@g2-domain/" },
    },
    {
      name: "non-shell-no-qiankun",
      comment: "only @g2-shell/pc may import qiankun (temporary bridge, ADR-0031); new code must not add qiankun.",
      severity: "error",
      from: { pathNot: "^apps/shells/pc(/|$)" },
      to: { path: npmPathPattern(["qiankun"]) },
    },
    {
      name: "apps-no-tooling",
      comment: "apps runtime/src must not depend on tooling/* (ADR-0004/0056). vite.config may use @g2-tooling/mf-vite.",
      severity: "error",
      from: {
        path: "^apps/",
        pathNot: "(^|/)(node_modules/|vite\\.config\\.|vitest\\.config\\.)",
      },
      to: { path: "^tooling/" },
    },
    {
      name: "no-g2-shared-runtime",
      comment:
        "@g2-shared/* is retired; use library Platforms (datePlatform/loggerPlatform/resourcePlatform/…) via loadPlatform (ADR-0056).",
      severity: "error",
      from: { path: "^(apps|packages)/" },
      to: { path: "(^|/)node_modules/@g2-shared/|^packages/shared-" },
    },
    {
      name: "no-g2-client-value-import",
      comment:
        "shell/platform/domain must not value-import @g2-client/*; use PlatformContext.ensureClient + import type from @g2-contract/* (ADR-0057).",
      severity: "error",
      from: { path: "^apps/(shells|platforms|domains)/" },
      to: {
        path: "(^|/)node_modules/@g2-client/|^apps/clients/",
        dependencyTypesNot: ["type-only"],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "(^|/)node_modules",
    },
    exclude: {
      path: "(^|/)(dist|\\.turbo|coverage)(/|$)",
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
  },
};
