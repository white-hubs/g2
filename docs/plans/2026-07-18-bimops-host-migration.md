# Bimops 主应用迁移 Implementation Plan

> **勘误（2026-07-19，ADR-0049）**：本计划正文里凡出现 `.vue` / Vue SFC 交付物，一律改为 **`defineComponent` + TSX（`.tsx`）+ CSS Modules**。细节与门禁见独立计划 [`docs/plans/2026-07-19-forbid-vue-sfc-use-tsx.md`](./2026-07-19-forbid-vue-sfc-use-tsx.md)。下文示例路径未逐字改写，以 ADR-0049 为准。

> **For agentic workers:** Use `/Users/dg/.claude/skills/executing-plans/SKILL.md`（含 review checkpoint）或直接按任务顺序逐条执行本计划。步骤用 `- [ ]` 复选框跟踪进度。

**Goal:** 把 `legacy/bimops-fe-web-migrate`（旧仓 PC 门户宿主）迁入 g2，落地为 `@g2-shell/pc` + 5 个独立发版 Platform（pc-auth/pc-chrome/pc-messaging/pc-rtc/pc-ai-assistant）+ 支撑基础设施（composition 契约扩展、http/logger 平台、版本注册表），双轨与现网 bimops 并行。

**Architecture:** Shell 自持鉴权状态机/框架布局/路由表/装载编排；具体页面内容与门面装饰经 Platform 按 Profile 装载；菜单/路由 100% 域自持契约，后端收窄为 functionCode 平铺集合；Composition Profile 拆成源 Profile + 版本注册表 + 已解析 Profile 三层。

**Tech Stack:** Bun workspaces + Turborepo、Vue 3.5、Vite 8、`@module-federation/vite`、Pinia、Zod（schema 校验）、bun test（逻辑）/ Vitest（Vue UI）、oxlint/oxfmt。

**ADR 基线：** `docs/adr/0001`–`0048`（全部已落盘，本计划是它们的执行层）。每个任务标注对应 ADR 编号；文末附完整覆盖矩阵。

---

## 阶段总览

| 阶段 | 内容                                                                        | 依赖       |
| ---- | --------------------------------------------------------------------------- | ---------- |
| 0    | 基线核对（0001-0026 已满足确认，零代码）                                    | 无         |
| 1    | Composition 契约/schema 扩展（Platform 契约、menuContribution、版本注册表） | 0          |
| 2    | 共享基础设施包（logger、依赖治理、http client、token provider、错误契约）   | 1          |
| 3    | `@g2-platform/pc-auth`                                                      | 1, 2       |
| 4    | `@g2-platform/pc-chrome`                                                    | 1, 2       |
| 5    | `@g2-platform/pc-messaging` + `@g2-platform/pc-rtc`                         | 1, 2       |
| 6    | `@g2-platform/pc-ai-assistant`                                              | 1, 2       |
| 7    | Shell 集成（qiankun 桥、路由装配、inline override、functionCode）           | 3, 4, 5, 6 |
| 8    | 调试工具链（本地覆盖、契约测试 harness、死代码清理）                        | 1          |
| 9    | CI 接线                                                                     | 全部       |

---

## 阶段 0：基线核对（零代码）

### Task 0.1: 确认 ADR-0001–0026 已被现有骨架满足

**Files:** 无修改，只运行验证命令。

- [x] **Step 1: 确认无 ghcloud workspace 依赖（ADR-0001）**

```bash
grep -r "workspace:" apps/*/*/package.json packages/*/package.json | grep -v "@g2-"
```

Expected: 空输出（没有任何 `@ghcloud/*` 或跨仓 workspace 依赖）。

**实际结果（2026-07-18 已执行）：** 空输出，符合预期。

- [x] **Step 2: 确认目录分组与包 scope（ADR-0004/0005）**

```bash
ls apps/shells apps/domains apps/platforms apps/standalone packages
```

Expected: 与 `docs/adr/0004` 描述一致，所有 `apps/*/*` 下的 `package.json` name 字段前缀为 `@g2-shell/`、`@g2-domain/`、`@g2-platform/`、`@g2-standalone/`。

**实际结果（2026-07-18 已执行）：** `apps/shells/{h5,pc}`、`apps/domains/{poc-inline-pc,poc-remote-pc}`、`apps/platforms/{h5-stub,pc-stub}`、`apps/standalone/`（空）、`packages/{composition-contract,composition-loader,composition-schema,config}`，符合预期。

- [x] **Step 3: 确认三件套骨架门禁仍通过（ADR-0014）**

```bash
bun install
bun run validate:compositions
bunx turbo run build --filter=@g2-platform/pc-stub --filter=@g2-domain/poc-remote-pc --filter=@g2-domain/poc-inline-pc --filter=@g2-shell/pc
bun test
```

Expected: 全部命令 exit code 0。

**实际结果（2026-07-18 已执行）：** 全部 exit code 0——`bun install` 无变更；`validate:compositions` 对 `demo.pc.yaml` 校验 OK；`turbo build` 三件套 + shell 全部构建成功（7/7 任务，含缓存命中）；`bun test` 13 个测试全过（6 个文件，30 个 `expect()`，含一个此前未在计划里提及但已存在的 `tooling/commitlint` 测试，属于既有基线，不属于本计划新增范围）。

- [x] **Step 4: 记录结论**

若以上全部通过，Phase 0 通过，不产生任何 diff，直接进入 Phase 1。若发现偏差，先修偏差再继续（偏差修复不在本计划任务列表中，属于骨架维护）。

**结论：Phase 0 已于 2026-07-18 完成核对，全部通过，未产生任何代码 diff。可直接从 Phase 1 开始实施。**

---

## 阶段 1：Composition 契约 / Schema 扩展

这是后续所有 Platform/Domain 任务的地基。全部完成才能开始阶段 2+。

### Task 1.1: Platform 契约类型（ADR-0030）

**Files:**

- Modify: `packages/composition-contract/src/types.ts`
- Test: `packages/composition-contract/src/types.test.ts`

- [x] **Step 1: 写类型定义**

```typescript
// packages/composition-contract/src/types.ts（在现有 DomainModule 之后追加）
import type { App } from "vue";
import type { Router } from "vue-router";

export type EventName = string;
export interface EventBus {
  publish: (event: EventName, payload?: unknown) => void;
  subscribe: (event: EventName, handler: (payload: unknown) => void) => () => void;
}

export type AuthHeaderProvider = () => Record<string, string>;

/** 按需动态加载另一个 Platform 暴露的模块（MF exposes 路径），供 Platform-to-Platform 消费库能力（如 http client）用；
 * 由 Shell 用真实 MF loader 实现并通过 ctx 注入，Platform 自己不持有 MF loader 实例。 */
export type PlatformLoader = (platformName: string, exposedPath: string) => Promise<unknown>;

export interface PlatformContext {
  bus: EventBus;
  getAuthHeaders: AuthHeaderProvider;
  loadPlatform: PlatformLoader;
}

export type PlatformInstall = (app: App, router: Router, ctx: PlatformContext, config?: Record<string, unknown>) => void | Promise<void>;

export interface PlatformModule {
  label?: string;
  slots?: Record<string, unknown>; // Vue Component，用 unknown 避免契约包强依赖具体渲染函数类型
  install?: PlatformInstall;
}
```

- [x] **Step 2: 写失败测试**

```typescript
// packages/composition-contract/src/types.test.ts
import { describe, expect, test } from "bun:test";
import type { PlatformModule } from "./types";

describe("PlatformModule shape", () => {
  test("label/slots/install 均为可选字段", () => {
    const empty: PlatformModule = {};
    const withLabel: PlatformModule = { label: "x" };
    const withSlots: PlatformModule = { slots: { "chrome.topBar": {} } };
    const withInstall: PlatformModule = { install: async () => {} };
    expect(empty).toBeDefined();
    expect(withLabel.label).toBe("x");
    expect(Object.keys(withSlots.slots ?? {})).toContain("chrome.topBar");
    expect(typeof withInstall.install).toBe("function");
  });
});
```

- [x] **Step 3: 运行确认通过**

```bash
bun test packages/composition-contract/src/types.test.ts
```

Expected: PASS（这一步是类型形状确认，不是 red-green，因为类型定义本身无运行时逻辑；测试作用是防止未来重构悄悄破坏这个公开形状）。

- [x] **Step 4: Commit**

```bash
git add packages/composition-contract/src/types.ts packages/composition-contract/src/types.test.ts
git commit -m "feat(composition-contract): add PlatformModule/PlatformContext types"
```

### Task 1.2: `assertPlatformModule` + 假 harness（ADR-0037）

**Files:**

- Create: `packages/composition-contract/src/assert-platform-module.ts`
- Create: `packages/composition-contract/src/assert-platform-module.test.ts`
- Create: `packages/composition-contract/src/test-harness.ts`
- Modify: `packages/composition-contract/src/index.ts`

- [x] **Step 1: 写失败测试**

```typescript
// packages/composition-contract/src/assert-platform-module.test.ts
import { describe, expect, test } from "bun:test";
import { assertPlatformModule } from "./assert-platform-module";

describe("assertPlatformModule", () => {
  test("接受只有 install 的模块", () => {
    const result = assertPlatformModule({ install: async () => {} });
    expect(result.ok).toBe(true);
  });

  test("接受只有 slots 的模块", () => {
    const result = assertPlatformModule({ slots: { "chrome.topBar": {} } });
    expect(result.ok).toBe(true);
  });

  test("接受空对象（label/slots/install 全部可选）", () => {
    const result = assertPlatformModule({});
    expect(result.ok).toBe(true);
  });

  test("拒绝非对象输入", () => {
    const result = assertPlatformModule(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("must be an object");
    }
  });

  test("拒绝 slots 字段类型错误（非对象）", () => {
    const result = assertPlatformModule({ slots: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("slots");
    }
  });

  test("拒绝 install 字段类型错误（非函数）", () => {
    const result = assertPlatformModule({ install: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("install");
    }
  });
});
```

- [x] **Step 2: 运行确认失败（模块不存在）**

```bash
bun test packages/composition-contract/src/assert-platform-module.test.ts
```

Expected: FAIL，报 `Cannot find module './assert-platform-module'`。

- [x] **Step 3: 写实现**

```typescript
// packages/composition-contract/src/assert-platform-module.ts
import type { PlatformModule } from "./types";

export type AssertPlatformModuleResult = { ok: true; module: PlatformModule } | { ok: false; errors: string[] };

export function assertPlatformModule(input: unknown): AssertPlatformModuleResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["platform module must be an object"] };
  }
  const mod = input as Partial<PlatformModule>;
  const errors: string[] = [];
  if (mod.slots !== undefined && (typeof mod.slots !== "object" || mod.slots === null || Array.isArray(mod.slots))) {
    errors.push("platform module 'slots' must be an object map when present");
  }
  if (mod.install !== undefined && typeof mod.install !== "function") {
    errors.push("platform module 'install' must be a function when present");
  }
  if (mod.label !== undefined && typeof mod.label !== "string") {
    errors.push("platform module 'label' must be a string when present");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, module: mod as PlatformModule };
}
```

- [x] **Step 4: 运行确认通过**

```bash
bun test packages/composition-contract/src/assert-platform-module.test.ts
```

Expected: 全部 6 个测试 PASS。

- [x] **Step 5: 写共享假 harness（供各 Platform 包自测 install 逻辑用）**

```typescript
// packages/composition-contract/src/test-harness.ts
import type { App } from "vue";
import type { Router } from "vue-router";
import type { EventBus, PlatformContext } from "./types";

export interface FakeBus extends EventBus {
  published: { event: string; payload: unknown }[];
}

export function createFakeBus(): FakeBus {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const published: FakeBus["published"] = [];
  return {
    published,
    publish(event, payload) {
      published.push({ event, payload });
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
  };
}

export function createFakePlatformContext(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    bus: overrides.bus ?? createFakeBus(),
    getAuthHeaders: overrides.getAuthHeaders ?? (() => ({})),
    loadPlatform:
      overrides.loadPlatform ??
      (async () => {
        throw new Error("createFakePlatformContext: loadPlatform not stubbed for this test, pass an override");
      }),
  };
}

/** 极简 fake App，仅满足 install(app, router, ctx) 签名调用需要；不做真实 Vue 挂载。 */
export function createFakeApp(): App {
  return {
    use: () => undefined,
    provide: () => undefined,
    component: () => undefined,
    config: { globalProperties: {} },
  } as unknown as App;
}

export function createFakeRouter(): Router {
  const routes: unknown[] = [];
  return {
    addRoute: (route: unknown) => routes.push(route),
    removeRoute: () => undefined,
    beforeEach: () => () => undefined,
    push: async () => undefined,
  } as unknown as Router;
}
```

- [x] **Step 6: 导出新增内容**

```typescript
// packages/composition-contract/src/index.ts（新增导出，保留已有导出）
export type { DomainInstall, DomainModule, DomainRoutes } from "./types";
export { assertDomainModule, type AssertDomainModuleResult } from "./assert-domain-module";
export type { AuthHeaderProvider, EventBus, EventName, PlatformContext, PlatformInstall, PlatformModule } from "./types";
export { assertPlatformModule, type AssertPlatformModuleResult } from "./assert-platform-module";
export { createFakeApp, createFakeBus, createFakePlatformContext, createFakeRouter, type FakeBus } from "./test-harness";
```

- [x] **Step 7: Commit**

```bash
git add packages/composition-contract/src/
git commit -m "feat(composition-contract): add assertPlatformModule and shared test harness"
```

### Task 1.3: `menuContribution` 域契约字段（ADR-0036）

**Files:**

- Modify: `packages/composition-contract/src/types.ts`
- Modify: `packages/composition-contract/src/assert-domain-module.ts`
- Modify: `packages/composition-contract/src/assert-domain-module.test.ts`

- [x] **Step 1: 写失败测试（追加到现有文件）**

```typescript
// packages/composition-contract/src/assert-domain-module.test.ts（追加）
test("接受带 menuContribution 的域模块", () => {
  const result = assertDomainModule({
    routes: [],
    menuContribution: [
      {
        label: "示例菜单",
        iconKey: "demo",
        path: "/poc-inline",
        functionCode: "demo:view",
        children: [],
      },
    ],
  });
  expect(result.ok).toBe(true);
});

test("拒绝 menuContribution 非数组", () => {
  const result = assertDomainModule({ routes: [], menuContribution: "nope" });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors[0]).toContain("menuContribution");
  }
});

test("拒绝 menuContribution 节点缺 label", () => {
  const result = assertDomainModule({ routes: [], menuContribution: [{ path: "/x" }] });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors[0]).toContain("label");
  }
});
```

- [x] **Step 2: 运行确认失败**

```bash
bun test packages/composition-contract/src/assert-domain-module.test.ts
```

Expected: 新增 3 个测试 FAIL（`menuContribution` 字段不存在于类型/校验逻辑）。

- [x] **Step 3: 补类型定义**

```typescript
// packages/composition-contract/src/types.ts（在 DomainModule 之前追加）
export interface MenuContributionNode {
  label: string;
  iconKey?: string;
  path?: string;
  functionCode?: string;
  children?: MenuContributionNode[];
}

export interface DomainModule {
  routes: DomainRoutes;
  install?: DomainInstall;
  menuContribution?: MenuContributionNode[];
}
```

- [x] **Step 4: 补校验逻辑**

```typescript
// packages/composition-contract/src/assert-domain-module.ts
import type { DomainModule, MenuContributionNode } from "./types";

export type AssertDomainModuleResult = { ok: true; module: DomainModule } | { ok: false; errors: string[] };

function validateMenuNode(node: unknown, path: string): string[] {
  if (!node || typeof node !== "object") {
    return [`${path} must be an object`];
  }
  const n = node as Partial<MenuContributionNode>;
  const errors: string[] = [];
  if (typeof n.label !== "string" || n.label.length === 0) {
    errors.push(`${path}.label must be a non-empty string`);
  }
  if (n.children !== undefined) {
    if (!Array.isArray(n.children)) {
      errors.push(`${path}.children must be an array when present`);
    } else {
      n.children.forEach((child, index) => {
        errors.push(...validateMenuNode(child, `${path}.children[${index}]`));
      });
    }
  }
  return errors;
}

export function assertDomainModule(input: unknown): AssertDomainModuleResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["domain module must be an object"] };
  }
  const mod = input as Partial<DomainModule>;
  if (!Array.isArray(mod.routes)) {
    return { ok: false, errors: ["domain module must expose routes array"] };
  }
  if (mod.menuContribution !== undefined) {
    if (!Array.isArray(mod.menuContribution)) {
      return { ok: false, errors: ["domain module 'menuContribution' must be an array when present"] };
    }
    const errors = mod.menuContribution.flatMap((node, index) => validateMenuNode(node, `menuContribution[${index}]`));
    if (errors.length > 0) {
      return { ok: false, errors };
    }
  }
  return { ok: true, module: mod as DomainModule };
}
```

- [x] **Step 5: 运行确认通过**

```bash
bun test packages/composition-contract/src/assert-domain-module.test.ts
```

Expected: 全部测试（旧 + 新增 3 个）PASS。

- [x] **Step 6: Commit**

```bash
git add packages/composition-contract/src/types.ts packages/composition-contract/src/assert-domain-module.ts packages/composition-contract/src/assert-domain-module.test.ts
git commit -m "feat(composition-contract): add menuContribution field to domain contract"
```

### Task 1.4: Schema 扩展 —— Platform `config`、inline `allowOverride`（ADR-0030 / 0042）

**Files:**

- Modify: `packages/composition-schema/src/validate-composition-profile.ts`
- Modify: `packages/composition-schema/src/validate-composition-profile.test.ts`

- [x] **Step 1: 写失败测试（追加）**

```typescript
// packages/composition-schema/src/validate-composition-profile.test.ts（追加）
test("接受带 config 的 platform 条目", () => {
  const yaml = `
facade: pc
env: demo
platform:
  - name: pcAuth
    entry: "http://localhost:5010/mf-manifest.json"
    config:
      strategies: ["standard"]
inline: []
remotes: []
`;
  const result = validateCompositionProfile(yaml);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const platform = result.profile.platform[0] as { config?: Record<string, unknown> };
    expect(platform.config).toEqual({ strategies: ["standard"] });
  }
});

test("接受带 allowOverride 的 inline 条目，默认 false", () => {
  const yamlWithout = `
facade: pc
env: demo
platform: []
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes: []
`;
  const result = validateCompositionProfile(yamlWithout);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const inline = result.profile.inline[0] as { allowOverride?: boolean };
    expect(inline.allowOverride).toBe(false);
  }
});

test("接受 allowOverride: true 的 inline 条目", () => {
  const yamlWith = `
facade: pc
env: demo
platform: []
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
    allowOverride: true
remotes: []
`;
  const result = validateCompositionProfile(yamlWith);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const inline = result.profile.inline[0] as { allowOverride?: boolean };
    expect(inline.allowOverride).toBe(true);
  }
});

test("拒绝 profile 里出现 tenant 字段（ADR-0044 负向约束）", () => {
  const yaml = `
facade: pc
env: demo
tenant: acme
platform: []
inline: []
remotes: []
`;
  const result = validateCompositionProfile(yaml);
  expect(result.ok).toBe(false);
});
```

- [x] **Step 2: 运行确认失败**

```bash
bun test packages/composition-schema/src/validate-composition-profile.test.ts
```

Expected: 前 3 个新测试 FAIL（`config`/`allowOverride` 当前会被 zod 的 strict 模式拒绝或直接丢弃取决于当前 schema 是否 strict；第 4 个测试如果当前 schema 本身就是非 strict 会误通过——需要在实现里显式加 `.strict()`）。

- [x] **Step 3: 修改 schema**

```typescript
// packages/composition-schema/src/validate-composition-profile.ts
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const namedPackageRef = z.object({
  name: z.string().min(1),
  package: z.string().min(1),
});

const namedEntryRef = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
});

const platformItem = z.union([
  namedPackageRef.extend({ config: z.record(z.string(), z.unknown()).optional() }),
  namedEntryRef.extend({ config: z.record(z.string(), z.unknown()).optional() }),
]);

const inlineItem = z.object({
  name: z.string().min(1),
  package: z.string().min(1),
  basePath: z.string().min(1),
  allowOverride: z.boolean().default(false),
});

const remoteItem = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
  basePath: z.string().min(1),
});

export const compositionProfileSchema = z
  .object({
    facade: z.enum(["pc", "h5"]),
    env: z.string().min(1),
    sharedPolicy: z.string().optional(),
    platform: z.array(platformItem).default([]),
    inline: z.array(inlineItem).default([]),
    remotes: z.array(remoteItem).default([]),
  })
  .strict();

export type CompositionProfile = z.infer<typeof compositionProfileSchema>;

export type ValidateCompositionProfileResult = { ok: true; profile: CompositionProfile } | { ok: false; errors: string[] };

export function validateCompositionProfile(input: string | unknown): ValidateCompositionProfileResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = parseYaml(input);
    } catch (error) {
      return {
        ok: false,
        errors: [`yaml parse error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  const parsed = compositionProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    };
  }
  return { ok: true, profile: parsed.data };
}
```

- [x] **Step 4: 运行确认通过**

```bash
bun test packages/composition-schema/src/validate-composition-profile.test.ts
```

Expected: 全部测试 PASS（含新增的 4 个）。

- [x] **Step 5: Commit**

```bash
git add packages/composition-schema/src/
git commit -m "feat(composition-schema): add platform config, inline allowOverride, reject tenant field"
```

### Task 1.5: Slot 冲突校验 —— 静态部分（ADR-0034）

Slot 冲突分两处检测：**package 类型引用**（本地 workspace 包，能在校验时静态 import 检查）走 schema 层；**entry 类型引用**（远程 MF）只能在真正加载后于运行时检测，属于阶段 7 的 `compose-from-profile.ts` 改动（见 Task 7.5）。本任务只做静态部分。

**Files:**

- Create: `packages/composition-loader/src/detect-slot-conflicts.ts`
- Create: `packages/composition-loader/src/detect-slot-conflicts.test.ts`
- Modify: `packages/composition-loader/src/index.ts`

- [x] **Step 1: 写失败测试**

```typescript
// packages/composition-loader/src/detect-slot-conflicts.test.ts
import { describe, expect, test } from "bun:test";
import { detectStaticSlotConflicts } from "./detect-slot-conflicts";

describe("detectStaticSlotConflicts", () => {
  test("无冲突时返回空数组", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "pcChrome", slots: ["chrome.topBar"] },
      { name: "pcAuth", slots: ["auth.login"] },
    ]);
    expect(conflicts).toEqual([]);
  });

  test("两个条目声明同一个 slot 名时报冲突，包含两方名字和 slot 名", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "pcChrome", slots: ["chrome.topBar"] },
      { name: "pcChromeTenantX", slots: ["chrome.topBar"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].slot).toBe("chrome.topBar");
    expect(conflicts[0].claimants).toEqual(["pcChrome", "pcChromeTenantX"]);
  });

  test("三个条目里两个冲突、一个不冲突，只报冲突的那组", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "a", slots: ["s1"] },
      { name: "b", slots: ["s1"] },
      { name: "c", slots: ["s2"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].slot).toBe("s1");
  });
});
```

- [x] **Step 2: 运行确认失败**

```bash
bun test packages/composition-loader/src/detect-slot-conflicts.test.ts
```

Expected: FAIL，模块不存在。

- [x] **Step 3: 写实现**

```typescript
// packages/composition-loader/src/detect-slot-conflicts.ts
export interface SlotClaimant {
  name: string;
  slots: string[];
}

export interface SlotConflict {
  slot: string;
  claimants: string[];
}

export function detectStaticSlotConflicts(claimants: SlotClaimant[]): SlotConflict[] {
  const bySlot = new Map<string, string[]>();
  for (const claimant of claimants) {
    for (const slot of claimant.slots) {
      const owners = bySlot.get(slot) ?? [];
      owners.push(claimant.name);
      bySlot.set(slot, owners);
    }
  }
  const conflicts: SlotConflict[] = [];
  for (const [slot, owners] of bySlot) {
    if (owners.length > 1) {
      conflicts.push({ slot, claimants: owners });
    }
  }
  return conflicts;
}

export function formatSlotConflictError(conflict: SlotConflict): string {
  return `slot "${conflict.slot}" claimed by multiple platforms: ${conflict.claimants.join(", ")} — remove one, or confirm whether these should be the same platform`;
}
```

- [x] **Step 4: 运行确认通过**

```bash
bun test packages/composition-loader/src/detect-slot-conflicts.test.ts
```

Expected: PASS。

- [x] **Step 5: 导出**

```typescript
// packages/composition-loader/src/index.ts（追加）
export { buildCompositionPlan, type CompositionPlan, type CompositionRef, type EntryRef, type PackageRef } from "./build-composition-plan";
export { detectStaticSlotConflicts, formatSlotConflictError, type SlotClaimant, type SlotConflict } from "./detect-slot-conflicts";
```

- [x] **Step 6: Commit**

```bash
git add packages/composition-loader/src/
git commit -m "feat(composition-loader): add static slot conflict detection"
```

### Task 1.6: 版本注册表 + 已解析 Profile（ADR-0043 / 0048）

**Files:**

- Create: `packages/composition-registry/package.json`
- Create: `packages/composition-registry/tsconfig.json`
- Create: `packages/composition-registry/src/types.ts`
- Create: `packages/composition-registry/src/resolve-profile.ts`
- Create: `packages/composition-registry/src/resolve-profile.test.ts`
- Create: `packages/composition-registry/src/index.ts`
- Create: `compositions/registry/demo.registry.yaml`

- [x] **Step 1: 新建包骨架**

```json
// packages/composition-registry/package.json
{
  "name": "@g2-composition/registry",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/schema": "workspace:*",
    "yaml": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

```json
// packages/composition-registry/tsconfig.json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }
```

- [x] **Step 2: 写失败测试**

```typescript
// packages/composition-registry/src/resolve-profile.test.ts
import { describe, expect, test } from "bun:test";
import { resolveProfile } from "./resolve-profile";

describe("resolveProfile", () => {
  test("把 platform entry 的逻辑名换成注册表里的具体地址", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    const registry = { pcAuth: "http://localhost:5010/mf-manifest.json", backendApi: "https://api.demo.example.com" };
    const resolved = resolveProfile(source, registry);
    expect(resolved.platform[0]).toMatchObject({ name: "pcAuth", entry: "http://localhost:5010/mf-manifest.json" });
  });

  test("registry 里找不到对应逻辑名时报错，列出缺失的逻辑名", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    expect(() => resolveProfile(source, {})).toThrow(/pcAuth/);
  });

  test("resolveBaseUrl 从注册表按 backendApi 逻辑名取值，缺失时返回 undefined（走同源默认）", () => {
    const registry = { backendApi: "https://api.demo.example.com" };
    expect(resolveBaseUrlFromRegistry(registry)).toBe("https://api.demo.example.com");
    expect(resolveBaseUrlFromRegistry({})).toBeUndefined();
  });
});
```

（注意：上面第三个 test 用到的 `resolveBaseUrlFromRegistry` 需要一并从 `./resolve-profile` import，写完整测试文件时把 import 语句一起加上：`import { resolveBaseUrlFromRegistry, resolveProfile } from "./resolve-profile";`）

- [x] **Step 3: 运行确认失败**

```bash
bun test packages/composition-registry/src/resolve-profile.test.ts
```

Expected: FAIL，模块不存在。

- [x] **Step 4: 写类型与实现**

```typescript
// packages/composition-registry/src/types.ts
export interface SourcePlatformItem {
  name: string;
  logicalName: string;
  config?: Record<string, unknown>;
}
export interface SourceInlineItem {
  name: string;
  package: string;
  basePath: string;
  allowOverride?: boolean;
}
export interface SourceRemoteItem {
  name: string;
  logicalName: string;
  basePath: string;
}
export interface SourceProfile {
  facade: "pc" | "h5";
  env: string;
  platform: SourcePlatformItem[];
  inline: SourceInlineItem[];
  remotes: SourceRemoteItem[];
}

export type Registry = Record<string, string>;

export interface ResolvedPlatformItem {
  name: string;
  entry: string;
  config?: Record<string, unknown>;
}
export interface ResolvedInlineItem {
  name: string;
  package: string;
  basePath: string;
  allowOverride: boolean;
}
export interface ResolvedRemoteItem {
  name: string;
  entry: string;
  basePath: string;
}
export interface ResolvedProfile {
  facade: "pc" | "h5";
  env: string;
  platform: ResolvedPlatformItem[];
  inline: ResolvedInlineItem[];
  remotes: ResolvedRemoteItem[];
  backendApiBaseUrl?: string;
}
```

```typescript
// packages/composition-registry/src/resolve-profile.ts
import type { Registry, ResolvedProfile, SourceProfile } from "./types";

export function resolveProfile(source: SourceProfile, registry: Registry): ResolvedProfile {
  const missing: string[] = [];

  const platform = source.platform.map((item) => {
    const entry = registry[item.logicalName];
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "", config: item.config };
    }
    return { name: item.name, entry, config: item.config };
  });

  const remotes = source.remotes.map((item) => {
    const entry = registry[item.logicalName];
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "", basePath: item.basePath };
    }
    return { name: item.name, entry, basePath: item.basePath };
  });

  if (missing.length > 0) {
    throw new Error(`registry missing entries for logical name(s): ${missing.join(", ")}`);
  }

  return {
    facade: source.facade,
    env: source.env,
    platform,
    inline: source.inline.map((item) => ({ ...item, allowOverride: item.allowOverride ?? false })),
    remotes,
    backendApiBaseUrl: resolveBaseUrlFromRegistry(registry),
  };
}

export function resolveBaseUrlFromRegistry(registry: Registry): string | undefined {
  return registry.backendApi;
}
```

- [x] **Step 5: 运行确认通过**

```bash
bun test packages/composition-registry/src/resolve-profile.test.ts
```

Expected: 全部 3 个测试 PASS。

- [x] **Step 6: 导出 + 建示例注册表文件**

```typescript
// packages/composition-registry/src/index.ts
export { resolveBaseUrlFromRegistry, resolveProfile } from "./resolve-profile";
export type {
  Registry,
  ResolvedInlineItem,
  ResolvedPlatformItem,
  ResolvedProfile,
  ResolvedRemoteItem,
  SourceInlineItem,
  SourcePlatformItem,
  SourceProfile,
  SourceRemoteItem,
} from "./types";
```

```yaml
# compositions/registry/demo.registry.yaml
# 环境: demo — 逻辑名 -> 具体 entry/地址；本文件走 git 管控，回滚 = 改指针 + 重新生成已解析 Profile（ADR-0043）
pcStub: "http://localhost:5001/mf-manifest.json"
pocRemotePc: "http://localhost:5002/mf-manifest.json"
pcAuth: "http://localhost:5010/mf-manifest.json"
pcChrome: "http://localhost:5011/mf-manifest.json"
pcMessaging: "http://localhost:5012/mf-manifest.json"
pcRtc: "http://localhost:5013/mf-manifest.json"
pcAiAssistant: "http://localhost:5014/mf-manifest.json"
httpPlatform: "http://localhost:5015/mf-manifest.json"
backendApi: "" # 空字符串表示同源默认（ADR-0048），非同源部署时填具体地址
```

- [x] **Step 7: Commit**

```bash
git add packages/composition-registry/ compositions/registry/
git commit -m "feat(composition-registry): add source profile / registry / resolved profile split"
```

### Task 1.9: Composition Profile 分组展示元数据（ADR-0036 补充）

ADR-0036 明确"需要展示分组时用 Composition Profile 的分组展示元数据（纯文案/排序，运营改配置）"——旧仓"应用分组"这种把多个业务应用聚成一类展示（如 NavTopLink 里的应用切换入口）的需求，在 g2 里改成 Profile 里一份纯展示用的分组清单，不涉权限、不涉后端。

**Files:**

- Modify: `packages/composition-schema/src/validate-source-profile.ts`
- Modify: `packages/composition-schema/src/validate-source-profile.test.ts`
- Modify: `apps/shells/pc/src/stores/portal-navigation.ts`
- Modify: `apps/shells/pc/src/stores/portal-navigation.test.ts`

- [x] **Step 1: 写失败测试（schema 部分）**

```typescript
// packages/composition-schema/src/validate-source-profile.test.ts（追加）
test("接受 displayGroups 分组展示元数据，platform/inline/remotes 条目可选引用 group key", () => {
  const yaml = `
facade: pc
env: demo
displayGroups:
  - key: admin-tools
    label: 管理工具
    order: 1
platform:
  - name: pcAuth
    logicalName: pcAuth
inline: []
remotes: []
`;
  const result = validateSourceProfile(yaml);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.profile.displayGroups).toEqual([{ key: "admin-tools", label: "管理工具", order: 1 }]);
  }
});

test("displayGroups 缺 label 时报错", () => {
  const yaml = `
facade: pc
env: demo
displayGroups:
  - key: x
    order: 1
platform: []
inline: []
remotes: []
`;
  const result = validateSourceProfile(yaml);
  expect(result.ok).toBe(false);
});
```

- [x] **Step 2: 运行确认失败**

```bash
bun test packages/composition-schema/src/validate-source-profile.test.ts
```

- [x] **Step 3: 扩展 schema**

```typescript
// packages/composition-schema/src/validate-source-profile.ts（在 sourceProfileSchema 定义前追加）
const displayGroupItem = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    order: z.number().default(0),
  })
  .strict();

// sourceProfileSchema 的 z.object({...}) 内新增一行字段：
// displayGroups: z.array(displayGroupItem).default([]),
```

把这个字段加进 `sourceProfileSchema` 的对象定义里（与 `platform`/`inline`/`remotes` 同级）。

- [x] **Step 4: 运行确认通过**

```bash
bun test packages/composition-schema/src/validate-source-profile.test.ts
```

- [x] **Step 5: `usePortalNavigationStore` 消费分组元数据 —— 写失败测试**

```typescript
// apps/shells/pc/src/stores/portal-navigation.test.ts（追加）
test("setDisplayGroups 记录分组文案/顺序；resolveGroupLabel 按 key 查文案，查不到时原样返回 key", () => {
  setActivePinia(createPinia());
  const store = usePortalNavigationStore();
  store.setDisplayGroups([{ key: "admin-tools", label: "管理工具", order: 1 }]);
  expect(store.resolveGroupLabel("admin-tools")).toBe("管理工具");
  expect(store.resolveGroupLabel("unknown-key")).toBe("unknown-key");
});
```

- [x] **Step 6: 运行确认失败，然后实现**

```bash
bun test apps/shells/pc/src/stores/portal-navigation.test.ts
```

```typescript
// apps/shells/pc/src/stores/portal-navigation.ts（在 usePortalNavigationStore 内追加）
const displayGroups = ref<{ key: string; label: string; order: number }[]>([]);

function setDisplayGroups(groups: { key: string; label: string; order: number }[]): void {
  displayGroups.value = groups;
}

function resolveGroupLabel(key: string): string {
  return displayGroups.value.find((g) => g.key === key)?.label ?? key;
}

// return 语句里追加导出：setDisplayGroups, resolveGroupLabel
```

- [x] **Step 7: 运行确认通过**

```bash
bun test apps/shells/pc/src/stores/portal-navigation.test.ts packages/composition-schema/src/validate-source-profile.test.ts
```

- [x] **Step 8: Commit**

```bash
git add packages/composition-schema/src apps/shells/pc/src/stores
git commit -m "feat(composition-schema,shell-pc): add display-group metadata for domain/platform grouping (ADR-0036)"
```

### Task 1.7: `demo.pc.yaml` 迁移为源 Profile 形态

**Files:**

- Modify: `compositions/demo.pc.yaml`
- Modify: `packages/composition-schema/src/validate-composition-profile.ts`（新增一个 source-profile 专用 schema，与现有 resolved 形态区分）
- Create: `packages/composition-schema/src/validate-source-profile.ts`
- Create: `packages/composition-schema/src/validate-source-profile.test.ts`

现有 `compositionProfileSchema` 校验的是**已解析**形态（直接含 `entry`）。源 Profile 用 `logicalName` 代替 `entry`/`package`（`inline` 条目因为是本地包引用，`package` 字段本身就是"逻辑名"，不需要走注册表解析，维持不变）。

- [x] **Step 1: 写失败测试**

```typescript
// packages/composition-schema/src/validate-source-profile.test.ts
import { describe, expect, test } from "bun:test";
import { validateSourceProfile } from "./validate-source-profile";

describe("validateSourceProfile", () => {
  test("接受只含逻辑名的 platform/remotes 条目", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: pcStub
    logicalName: pcStub
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes:
  - name: pocRemotePc
    logicalName: pocRemotePc
    basePath: /poc-remote
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(true);
  });

  test("拒绝 platform 条目里出现 entry 字段（源 Profile 不应该有具体地址）", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: pcStub
    entry: "http://localhost:5001/mf-manifest.json"
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(false);
  });
});
```

- [x] **Step 2: 运行确认失败**

```bash
bun test packages/composition-schema/src/validate-source-profile.test.ts
```

- [x] **Step 3: 写实现**

```typescript
// packages/composition-schema/src/validate-source-profile.ts
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const sourcePlatformItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const sourceInlineItem = z
  .object({
    name: z.string().min(1),
    package: z.string().min(1),
    basePath: z.string().min(1),
    allowOverride: z.boolean().default(false),
  })
  .strict();

const sourceRemoteItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
    basePath: z.string().min(1),
  })
  .strict();

export const sourceProfileSchema = z
  .object({
    facade: z.enum(["pc", "h5"]),
    env: z.string().min(1),
    sharedPolicy: z.string().optional(),
    platform: z.array(sourcePlatformItem).default([]),
    inline: z.array(sourceInlineItem).default([]),
    remotes: z.array(sourceRemoteItem).default([]),
  })
  .strict();

export type SourceProfileParsed = z.infer<typeof sourceProfileSchema>;
export type ValidateSourceProfileResult = { ok: true; profile: SourceProfileParsed } | { ok: false; errors: string[] };

export function validateSourceProfile(input: string | unknown): ValidateSourceProfileResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = parseYaml(input);
    } catch (error) {
      return { ok: false, errors: [`yaml parse error: ${error instanceof Error ? error.message : String(error)}`] };
    }
  }
  const parsed = sourceProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
  }
  return { ok: true, profile: parsed.data };
}
```

- [x] **Step 4: 运行确认通过**

```bash
bun test packages/composition-schema/src/validate-source-profile.test.ts
```

- [x] **Step 5: 导出**

```typescript
// packages/composition-schema/src/index.ts（追加）
export { validateSourceProfile, type SourceProfileParsed, type ValidateSourceProfileResult } from "./validate-source-profile";
```

- [x] **Step 6: 改写 `compositions/demo.pc.yaml` 为源 Profile 形态**

```yaml
# compositions/demo.pc.yaml
facade: pc
env: demo
platform:
  - name: pcStub
    logicalName: pcStub
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes:
  - name: pocRemotePc
    logicalName: pocRemotePc
    basePath: /poc-remote
```

- [x] **Step 7: 加一个 CLI 生成命令，把源 Profile + 注册表解析成已解析 Profile 落盘**

```typescript
// packages/composition-schema/src/cli.ts（在现有 validate 逻辑之后追加一个子命令；查看现有 cli.ts 实现后按其现有参数解析方式接入，不要重写整个文件）
// 新增：`bun run --filter @g2-composition/schema resolve -- --profile compositions/demo.pc.yaml --registry compositions/registry/demo.registry.yaml --out compositions/.resolved/demo.pc.resolved.json`
```

因为 `cli.ts` 当前实现未在本计划中完整摘录，实现前先执行 `cat packages/composition-schema/src/cli.ts` 读出现有参数解析方式，按同样的风格新增 `resolve` 子命令，逻辑为：读 `--profile`（源 Profile YAML）→ `validateSourceProfile` → 读 `--registry`（YAML，解析成 `Record<string,string>`）→ 调 `@g2-composition/registry` 的 `resolveProfile` → JSON.stringify 写到 `--out`。

- [x] **Step 8: Commit**

```bash
git add compositions/demo.pc.yaml packages/composition-schema/src/
git commit -m "feat(composition-schema): add source profile schema, migrate demo.pc.yaml"
```

### Task 1.8: `compositions/.resolved/` 加入 gitignore，Shell 消费已解析产物

**Files:**

- Modify: `.gitignore`
- Modify: `apps/shells/pc/src/main.ts`
- Modify: `apps/shells/pc/src/compose-from-profile.ts`
- Modify: `apps/shells/pc/src/compose-from-profile.test.ts`

已解析 Profile 是部署产物（Task 1.6/1.7 已定义生成方式），不进版本控制。

- [x] **Step 1: 更新 `.gitignore`**

```
# 追加到现有 .gitignore
compositions/.resolved/
```

- [x] **Step 2: 改 `compose-from-profile.ts` 接收已解析形态而非重新解析 YAML**

当前 `composeFromProfile` 直接吃 `CompositionProfile`（即已解析形态的类型，只是字段命名目前叫 `entry`）。改动点：把入参类型从 `@g2-composition/schema` 的 `CompositionProfile` 换成 `@g2-composition/registry` 的 `ResolvedProfile`，并把 `platform.kind === "entry" | "package"` 的判断逻辑简化——已解析 Profile 里 platform 统一只有 `entry`（`package` 形式的 platform 引用在这次改造里不再支持，行内 Platform 目前唯一用途是 dev 期 `pc-stub`，未来若要恢复 `package` 形式 platform，需要另开决策，本计划不预支）。

先写失败测试（在 `compose-from-profile.test.ts` 顶部把 `demoYaml` 换成 resolved 形态的对象，不再是 YAML 字符串）：

```typescript
// apps/shells/pc/src/compose-from-profile.test.ts（把文件顶部的 demoYaml 替换为下面这段，其余测试体内 profile 的取值方式相应改为直接使用对象而不再调用 parseProfileText）
import { describe, expect, test } from "bun:test";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ResolvedProfile } from "@g2-composition/registry";
import { composeFromProfile } from "./compose-from-profile";

const demoProfile: ResolvedProfile = {
  facade: "pc",
  env: "demo",
  platform: [{ name: "pcStub", entry: "http://localhost:5001/mf-manifest.json" }],
  inline: [{ name: "poc-inline-pc", package: "@g2-domain/poc-inline-pc", basePath: "/poc-inline", allowOverride: false }],
  remotes: [{ name: "pocRemotePc", entry: "http://localhost:5002/mf-manifest.json", basePath: "/poc-remote" }],
};
```

原文件里所有 `parseProfileText(demoYaml)` 的调用改成直接用 `demoProfile`（深拷贝一份避免测试间互相污染，如 `structuredClone(demoProfile)`）。

- [x] **Step 3: 运行确认失败**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
```

Expected: FAIL（`composeFromProfile` 当前签名吃 `CompositionProfile`，字段形状不完全一致，且 `parseProfileText` 已被移除但如果 `main.ts` 还在用会报类型错）。

- [x] **Step 4: 改 `compose-from-profile.ts` 实现**

把文件顶部 import 的 `CompositionProfile`/`validateCompositionProfile` 换成 `@g2-composition/registry` 的 `ResolvedProfile`；`composeFromProfile` 签名参数类型改为 `ResolvedProfile`；`parseProfileText` 函数整体删除（不再需要在 Shell 内解析源 YAML，那是部署期生成步骤的职责，见 Task 1.7 Step 7 的 CLI）；`plan.platforms`/`plan.inline`/`plan.remotes` 的具体字段读取逻辑保持不变（`ResolvedProfile` 的字段形状和原来 `CompositionPlan` 基本一致，只是不再区分 `kind: "entry"|"package"`，platform 统一走 `entry`）。

- [x] **Step 5: 运行确认通过**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
```

- [x] **Step 6: 改 `main.ts` 消费构建期生成的已解析 Profile JSON**

```typescript
// apps/shells/pc/src/main.ts
import { createPinia } from "pinia";
import { createApp, h, reactive } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { ResolvedProfile } from "@g2-composition/registry";

import resolvedProfileJson from "../../../../compositions/.resolved/demo.pc.resolved.json?raw";
import App from "./App";
import { composeFromProfile } from "./compose-from-profile";

async function bootstrap() {
  const profile = JSON.parse(resolvedProfileJson) as ResolvedProfile;
  const composition = await composeFromProfile(profile);
  // ...其余逻辑不变
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre>${String(error)}</pre>`;
});
```

- [x] **Step 7: 在 `package.json` 的 `dev`/`build` 脚本前置生成步骤**

```json
// apps/shells/pc/package.json（scripts 字段改动）
{
  "scripts": {
    "prebuild": "bun run --filter @g2-composition/schema resolve -- --profile ../../../compositions/demo.pc.yaml --registry ../../../compositions/registry/demo.registry.yaml --out ../../../compositions/.resolved/demo.pc.resolved.json",
    "predev": "bun run prebuild",
    "dev": "vite --port 5100 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5100 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  }
}
```

- [x] **Step 8: 手动验证一次完整链路**

```bash
bun run --filter @g2-shell/pc prebuild
cat compositions/.resolved/demo.pc.resolved.json
```

Expected: 输出一份 JSON，`platform[0].entry` 是 `http://localhost:5001/mf-manifest.json`（来自注册表解析，不是源 Profile 里手写的）。

- [x] **Step 9: Commit**

```bash
git add .gitignore apps/shells/pc/ compositions/demo.pc.yaml
git commit -m "refactor(shell-pc): consume resolved profile instead of parsing source yaml at runtime"
```

**阶段 1 实施结论（2026-07-18 已完成，TDD 方式逐任务红-绿-提交）：**

- 全部 9 个任务（1.1–1.6、1.7、1.9、1.8）已完成，`bun test`（38 pass / 0 fail）、`bun run validate:compositions`、`bun run --filter @g2-composition/schema resolve -- ...` 三项完成标准均已验证通过；`turbo build` 三件套+shell 全绿。
- **执行顺序偏差**：实际执行顺序为 1.1→1.6→**1.7→1.9**→1.8（而非本文档物理排列的 1.6→1.9→1.7）。原因：Task 1.9 标注"Modify: validate-source-profile.ts"，但该文件是 Task 1.7 才创建的，先做 1.9 会因文件不存在直接失败；按依赖关系调整为先 1.7 后 1.9，两个任务本身内容不变。
- **发现的实现细节 / 与文档描述的微小出入**：
  - `packages/composition-schema/src/cli.ts` 的 `resolve` 子命令里，`--profile`/`--registry`/`--out` 路径统一相对 workspace 根目录解析（而非调用方 cwd），因为 `bun run --filter <pkg> <script>` 实测会把 cwd 切到目标包目录，若按调用方 cwd 解析会导致完成标准里给出的示例命令（相对 `compositions/...` 路径）无法工作。
  - CLI 默认的 `validate` 子命令改为使用 `validateSourceProfile`（而非旧的 `validateCompositionProfile`），因为 `demo.pc.yaml` 迁移后已是源 Profile 形态。
  - `packages/composition-registry/package.json` 未按文档保留对 `@g2-composition/schema` 的依赖：该依赖在 registry 包源码里未被实际使用，且加上后会与新增的 `schema → registry`（resolve 子命令需要）依赖形成循环，故移除。
  - `apps/shells/pc/src/stores/portal-navigation.ts` 在本仓库中原本不存在（文档假设它已存在并"追加"逻辑），本次按 Task 1.9 描述的行为从零新建，仅包含 `displayGroups`/`setDisplayGroups`/`resolveGroupLabel` 三者。
- 已按每个任务的 commit message 逐任务提交（9 个 commit，未合并攒批）。

---

## 阶段 2：共享基础设施包

### Task 2.1: `@g2-shared/logger`（ADR-0035）

**Files:**

- Create: `packages/shared-logger/package.json`
- Create: `packages/shared-logger/tsconfig.json`
- Create: `packages/shared-date/package.json`（日期格式化封装，供 logger 与 pc-auth 共用，避免直接 `import dayjs`）
- Create: `packages/shared-date/src/index.ts`
- Create: `packages/shared-logger/src/logger.ts`
- Create: `packages/shared-logger/src/logger.test.ts`
- Create: `packages/shared-logger/src/index.ts`

- [ ] **Step 1: 先建 `@g2-shared/date` 极薄封装（logger 的 prefix 需要格式化时间戳）**

```json
// packages/shared-date/package.json
{
  "name": "@g2-shared/date",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  },
  "dependencies": { "dayjs": "catalog:" },
  "devDependencies": { "typescript": "catalog:" }
}
```

> 若 root `package.json` 的 `catalog` 里还没有 `dayjs`，先加一条（版本参照旧仓 bimops `package.json` 里已使用的 dayjs 版本，执行前跑 `grep '"dayjs"' /Users/dg/work-ghy/ghcloud/legacy/bimops-fe-web-migrate/package.json` 确认版本号再落到 catalog）。

```typescript
// packages/shared-date/src/index.ts
import dayjs from "dayjs";

export function formatTimestamp(date: Date, pattern = "YYYY-MM-DD HH:mm:ss"): string {
  return dayjs(date).format(pattern);
}
```

```json
// packages/shared-date/tsconfig.json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }
```

- [ ] **Step 2: 写 logger 失败测试**

```typescript
// packages/shared-logger/src/logger.test.ts
import { describe, expect, test } from "bun:test";
import { createLogger } from "./logger";

describe("createLogger", () => {
  test("每个级别调用底层 console 对应方法，签名是 (message, context?)", () => {
    const calls: { level: string; args: unknown[] }[] = [];
    const fakeConsole = {
      debug: (...args: unknown[]) => calls.push({ level: "debug", args }),
      info: (...args: unknown[]) => calls.push({ level: "info", args }),
      warn: (...args: unknown[]) => calls.push({ level: "warn", args }),
      error: (...args: unknown[]) => calls.push({ level: "error", args }),
    };
    const logger = createLogger("test-scope", { console: fakeConsole });

    logger.debug("hello");
    logger.info("world", { a: 1 });
    logger.warn("careful");
    logger.error("boom", { code: 500 });

    expect(calls).toHaveLength(4);
    expect(calls[0].level).toBe("debug");
    expect(calls[1].args[1]).toEqual({ a: 1 });
    expect(calls[3].args[1]).toEqual({ code: 500 });
  });

  test("每条日志前缀包含 scope 名字", () => {
    const calls: unknown[] = [];
    const logger = createLogger("pc-auth", {
      console: { debug: () => {}, info: (...a: unknown[]) => calls.push(a), warn: () => {}, error: () => {} },
    });
    logger.info("hi");
    expect(String(calls[0]?.[0])).toContain("pc-auth");
  });

  test("不再存在 fault 级别（旧仓遗留、语义不明，已废弃）", () => {
    const logger = createLogger("x");
    expect((logger as Record<string, unknown>).fault).toBeUndefined();
  });
});
```

- [ ] **Step 3: 运行确认失败**

```bash
bun test packages/shared-logger/src/logger.test.ts
```

- [ ] **Step 4: 写实现**

```typescript
// packages/shared-logger/src/logger.ts
import { formatTimestamp } from "@g2-shared/date";

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

interface ConsoleLike {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface CreateLoggerOptions {
  console?: ConsoleLike;
}

const LEVELS: (keyof Logger)[] = ["debug", "info", "warn", "error"];

export function createLogger(scope: string, options: CreateLoggerOptions = {}): Logger {
  const target = options.console ?? console;
  const logger = {} as Logger;
  for (const level of LEVELS) {
    logger[level] = (message: string, context?: Record<string, unknown>) => {
      const prefix = `${formatTimestamp(new Date())} [${level.toUpperCase()}] [${scope}]`;
      if (context !== undefined) {
        target[level](prefix, message, context);
      } else {
        target[level](prefix, message);
      }
    };
  }
  return logger;
}
```

```json
// packages/shared-logger/package.json
{
  "name": "@g2-shared/logger",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  },
  "dependencies": { "@g2-shared/date": "workspace:*" },
  "devDependencies": { "typescript": "catalog:" }
}
```

```json
// packages/shared-logger/tsconfig.json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }
```

```typescript
// packages/shared-logger/src/index.ts
export { createLogger, type CreateLoggerOptions, type Logger } from "./logger";
```

- [ ] **Step 5: 运行确认通过**

```bash
bun test packages/shared-logger/src/logger.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared-date packages/shared-logger
git commit -m "feat(shared): add @g2-shared/date and @g2-shared/logger"
```

### Task 2.2: 三方依赖治理检查脚本（ADR-0041）

**Files:**

- Create: `tooling/dependency-governance/package.json`
- Create: `tooling/dependency-governance/src/check-dependencies.ts`
- Create: `tooling/dependency-governance/src/check-dependencies.test.ts`
- Create: `tooling/dependency-governance/whitelist.json`
- Modify: `package.json`（根，新增 `check:deps` 脚本）
- Modify: `.gitlab-ci.yml`

- [ ] **Step 1: 写白名单文件**

```json
// tooling/dependency-governance/whitelist.json
{
  "baseline": ["vue", "vue-router", "pinia", "vite", "typescript", "zod", "yaml"],
  "encapsulatedBy": {
    "dayjs": ["@g2-shared/date"]
  }
}
```

> `ant-design-vue`/`vant`（ADR-0012）与 `qiankun`（ADR-0031）本轮暂不加进白名单——本计划里 pc-chrome/pc-auth 的组件先不依赖 antdv（Task 3.3/4.3 已注明视觉细节留后续迭代），`qiankun` 要等 Task 7.1 真正给 `@g2-shell/pc` 加这条依赖时再补进白名单（该任务里有单独一步处理，避免在还没引入的时候就预先开洞）。**现状更新（2026-07-19）**：`qiankun` 已在 Task 7.1 落地时按计划补进 `baseline`；`ant-design-vue` 已通过新增的 `exposedBy` 字段（`{"ant-design-vue": ["@g2-platform/pc-ui"]}`）登记放行——即 ADR-0041 第二条收敛路径「经 platform 重新暴露」，新建的 `@g2-platform/pc-ui` 是登记里唯一允许直接声明该依赖的包，其余包仍不能在自己 `package.json` 里声明它。`vant`（H5 侧）本轮仍未引入，保持空白。这一步只交付了组件库基础设施包本身（`@g2-platform/pc-ui`），pc-chrome/pc-auth 等消费方改用其中组件属于后续迭代，不在本次变更范围内。

- [ ] **Step 2: 写失败测试**

```typescript
// tooling/dependency-governance/src/check-dependencies.test.ts
import { describe, expect, test } from "bun:test";
import { checkPackageDependencies } from "./check-dependencies";

describe("checkPackageDependencies", () => {
  test("基线依赖直接放行", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-shell/pc", dependencies: { vue: "*" } },
      { baseline: ["vue"], encapsulatedBy: {} },
    );
    expect(violations).toEqual([]);
  });

  test("非基线依赖若该包本身就是白名单里登记的封装方，放行", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-shared/date", dependencies: { dayjs: "*" } },
      { baseline: ["vue"], encapsulatedBy: { dayjs: ["@g2-shared/date"] } },
    );
    expect(violations).toEqual([]);
  });

  test("非基线依赖，且当前包不在该库的封装方列表里，报违规", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-auth", dependencies: { dayjs: "*" } },
      { baseline: ["vue"], encapsulatedBy: { dayjs: ["@g2-shared/date"] } },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("dayjs");
    expect(violations[0]).toContain("@g2-platform/pc-auth");
  });

  test("库完全不在白名单任何地方出现，报违规并提示需要质询", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-rtc", dependencies: { lodash: "*" } },
      { baseline: ["vue"], encapsulatedBy: {} },
    );
    expect(violations[0]).toContain("lodash");
    expect(violations[0]).toContain("not in baseline or any encapsulation whitelist");
  });
});
```

- [ ] **Step 3: 运行确认失败**

```bash
bun test tooling/dependency-governance/src/check-dependencies.test.ts
```

- [ ] **Step 4: 写实现**

```typescript
// tooling/dependency-governance/src/check-dependencies.ts
export interface Whitelist {
  baseline: string[];
  encapsulatedBy: Record<string, string[]>;
}

export interface PackageJsonLike {
  name: string;
  dependencies?: Record<string, string>;
}

export function checkPackageDependencies(pkg: PackageJsonLike, whitelist: Whitelist): string[] {
  const violations: string[] = [];
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    if (dep.startsWith("@g2-")) {
      continue; // 内部 workspace 包不受本治理规则约束
    }
    if (whitelist.baseline.includes(dep)) {
      continue;
    }
    const encapsulators = whitelist.encapsulatedBy[dep];
    if (encapsulators === undefined) {
      violations.push(`"${dep}" is not in baseline or any encapsulation whitelist (declared by ${pkg.name})`);
      continue;
    }
    if (!encapsulators.includes(pkg.name)) {
      violations.push(
        `"${dep}" must only be declared by its encapsulation whitelist (${encapsulators.join(", ") || "none"}), not by ${pkg.name}`,
      );
    }
  }
  return violations;
}
```

- [ ] **Step 5: 运行确认通过**

```bash
bun test tooling/dependency-governance/src/check-dependencies.test.ts
```

- [ ] **Step 6: 写扫描全仓的 CLI 入口**

```typescript
// tooling/dependency-governance/src/cli.ts
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { checkPackageDependencies, type Whitelist } from "./check-dependencies";

const whitelist = JSON.parse(readFileSync(new URL("../whitelist.json", import.meta.url), "utf-8")) as Whitelist;
const packageJsonPaths = globSync("{apps,packages,tooling}/**/package.json", { exclude: ["**/node_modules/**", "**/dist/**"] });

let hasViolation = false;
for (const path of packageJsonPaths) {
  const pkg = JSON.parse(readFileSync(path, "utf-8")) as { name: string; dependencies?: Record<string, string> };
  const violations = checkPackageDependencies(pkg, whitelist);
  for (const violation of violations) {
    hasViolation = true;
    console.error(`[dependency-governance] ${path}: ${violation}`);
  }
}

if (hasViolation) {
  process.exit(1);
}
console.log("[dependency-governance] all package.json dependencies comply with the whitelist");
```

```json
// tooling/dependency-governance/package.json
{
  "name": "@g2-tooling/dependency-governance",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "check": "bun ./src/cli.ts", "test": "bun test" },
  "devDependencies": { "typescript": "catalog:" }
}
```

- [ ] **Step 7: 挂到根脚本与 CI**

```json
// package.json（根，scripts 追加一行）
"check:deps": "bun run --filter @g2-tooling/dependency-governance check"
```

```yaml
# .gitlab-ci.yml（verify job 的 script 里，在 bun run lint 之后追加一行）
- bun run check:deps
```

- [ ] **Step 8: 手动运行一次确认现有仓库全绿**

```bash
bun run check:deps
```

Expected: `all package.json dependencies comply with the whitelist`（现有包只依赖 vue/vue-router/pinia/vite/typescript/zod/yaml，均在 baseline 里）。

- [ ] **Step 9: Commit**

```bash
git add tooling/dependency-governance package.json .gitlab-ci.yml
git commit -m "feat(tooling): add third-party dependency governance check"
```

### Task 2.3: `@g2-platform/http`（ADR-0045）

**Files:**

- Create: `apps/platforms/http/package.json`
- Create: `apps/platforms/http/tsconfig.json`
- Create: `apps/platforms/http/vite.config.ts`
- Create: `apps/platforms/http/index.html`
- Create: `apps/platforms/http/src/middleware.ts`
- Create: `apps/platforms/http/src/middleware.test.ts`
- Create: `apps/platforms/http/src/create-http-client.ts`
- Create: `apps/platforms/http/src/create-http-client.test.ts`
- Create: `apps/platforms/http/src/errors.ts`
- Create: `apps/platforms/http/src/errors.test.ts`
- Create: `apps/platforms/http/src/platform.ts`
- Create: `apps/platforms/http/src/main.ts`

这是本阶段最大的任务，拆成 4 个子部分：错误类（0047 一半）→ 中间件管道（0045）→ 完整客户端（整合 0045/0046/0047）→ Platform 导出（0030 slots，这个 platform 本身不需要 UI slot，只导出 `install`? 不——http client 是给别的 platform "import" 的库能力，不是"install 副作用"，它应该通过 MF `exposes` 直接暴露一个工厂函数，不走 `PlatformModule.install`，因为它是"被消费的库"，不是"往 app 上挂副作用的能力"）。

- [ ] **Step 1: 标准异常类 —— 写失败测试**

```typescript
// apps/platforms/http/src/errors.test.ts
import { describe, expect, test } from "bun:test";
import { HttpServiceError, normalizeErrorResponse } from "./errors";

describe("HttpServiceError / normalizeErrorResponse", () => {
  test("从新式后端错误 JSON（{code, message}）归一化", () => {
    const error = normalizeErrorResponse(401, { code: "AUTH_EXPIRED", message: "token expired" });
    expect(error).toBeInstanceOf(HttpServiceError);
    expect(error.errorCode).toBe("AUTH_EXPIRED");
    expect(error.errorMessage).toBe("token expired");
    expect(error.httpStatus).toBe(401);
  });

  test("从旧式后端错误 JSON（{error_description}）归一化", () => {
    const error = normalizeErrorResponse(500, { error_description: "boom" });
    expect(error.errorCode).toBe("500");
    expect(error.errorMessage).toBe("boom");
  });

  test("既没有已知字段时，用 http status 兜底", () => {
    const error = normalizeErrorResponse(503, {});
    expect(error.errorCode).toBe("503");
    expect(error.errorMessage).toContain("503");
  });

  test("errorDetail 保留原始响应体供上层需要时展开", () => {
    const body = { code: "X", message: "y", details: { field: "phone" } };
    const error = normalizeErrorResponse(400, body);
    expect(error.errorDetail).toEqual(body);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/http/src/errors.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/platforms/http/src/errors.ts
export class HttpServiceError extends Error {
  public readonly httpStatus: number;
  public readonly errorCode: string;
  public readonly errorMessage: string;
  public readonly errorDetail: unknown;

  public constructor(httpStatus: number, errorCode: string, errorMessage: string, errorDetail: unknown) {
    super(`[${errorCode}] ${errorMessage}`);
    this.name = "HttpServiceError";
    this.httpStatus = httpStatus;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.errorDetail = errorDetail;
  }
}

export function normalizeErrorResponse(httpStatus: number, body: unknown): HttpServiceError {
  const record = (body ?? {}) as Record<string, unknown>;
  if (typeof record.code === "string" && typeof record.message === "string") {
    return new HttpServiceError(httpStatus, record.code, record.message, body);
  }
  if (typeof record.error_description === "string") {
    return new HttpServiceError(httpStatus, String(httpStatus), record.error_description, body);
  }
  return new HttpServiceError(httpStatus, String(httpStatus), `request failed with status ${httpStatus}`, body);
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/platforms/http/src/errors.test.ts
```

- [ ] **Step 5: 中间件管道 —— 写失败测试**

```typescript
// apps/platforms/http/src/middleware.test.ts
import { describe, expect, test } from "bun:test";
import { composeMiddleware, type Middleware } from "./middleware";

describe("composeMiddleware", () => {
  test("按声明顺序洋葱式包裹，前置逻辑先进后出", () => {
    const trace: string[] = [];
    const mw1: Middleware = async (req, next) => {
      trace.push("mw1:before");
      const res = await next(req);
      trace.push("mw1:after");
      return res;
    };
    const mw2: Middleware = async (req, next) => {
      trace.push("mw2:before");
      const res = await next(req);
      trace.push("mw2:after");
      return res;
    };
    const finalHandler = async (req: Request) => {
      trace.push("handler");
      return new Response("ok");
    };
    const composed = composeMiddleware([mw1, mw2], finalHandler);
    return composed(new Request("http://x")).then(() => {
      expect(trace).toEqual(["mw1:before", "mw2:before", "handler", "mw2:after", "mw1:after"]);
    });
  });

  test("空中间件列表直接调用 finalHandler", async () => {
    const composed = composeMiddleware([], async () => new Response("direct"));
    const res = await composed(new Request("http://x"));
    expect(await res.text()).toBe("direct");
  });
});
```

- [ ] **Step 6: 运行确认失败**

```bash
bun test apps/platforms/http/src/middleware.test.ts
```

- [ ] **Step 7: 写实现**

```typescript
// apps/platforms/http/src/middleware.ts
export type NextFn = (request: Request) => Promise<Response>;
export type Middleware = (request: Request, next: NextFn) => Promise<Response>;

export function composeMiddleware(middlewares: Middleware[], finalHandler: NextFn): NextFn {
  return middlewares.reduceRight<NextFn>((next, middleware) => (request) => middleware(request, next), finalHandler);
}
```

- [ ] **Step 8: 运行确认通过**

```bash
bun test apps/platforms/http/src/middleware.test.ts
```

- [ ] **Step 9: 完整客户端（整合鉴权头注入 ADR-0046 + 错误归一化 ADR-0047）—— 写失败测试**

```typescript
// apps/platforms/http/src/create-http-client.test.ts
import { describe, expect, test } from "bun:test";
import { createHttpClient } from "./create-http-client";
import { HttpServiceError } from "./errors";

function fakeFetch(responses: Record<string, { status: number; body: unknown }>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init });
    const match = responses[url];
    if (!match) {
      throw new Error(`no fake response registered for ${url}`);
    }
    return new Response(JSON.stringify(match.body), { status: match.status, headers: { "content-type": "application/json" } });
  };
  return { fn, calls };
}

describe("createHttpClient", () => {
  test("成功响应直接返回解析后的 JSON body", async () => {
    const { fn } = fakeFetch({ "http://api.test/x": { status: 200, body: { ok: true } } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}) });
    const result = await client.get("http://api.test/x");
    expect(result).toEqual({ ok: true });
  });

  test("每次请求前调用 getAuthHeaders 取最新值，不缓存", async () => {
    const { fn, calls } = fakeFetch({ "http://api.test/x": { status: 200, body: {} } });
    let token = "token-1";
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({ Authorization: `Bearer ${token}` }) });
    await client.get("http://api.test/x");
    token = "token-2";
    await client.get("http://api.test/x");
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe("Bearer token-2");
  });

  test("失败响应抛出标准化异常，不吞、不触发副作用", async () => {
    const { fn } = fakeFetch({ "http://api.test/x": { status: 401, body: { code: "AUTH_EXPIRED", message: "expired" } } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}) });
    await expect(client.get("http://api.test/x")).rejects.toBeInstanceOf(HttpServiceError);
  });

  test("baseUrl 配置时自动拼接相对路径", async () => {
    const { fn, calls } = fakeFetch({ "http://api.test/api/x": { status: 200, body: {} } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}), baseUrl: "http://api.test" });
    await client.get("/api/x");
    expect(calls[0].url).toBe("http://api.test/api/x");
  });
});
```

- [ ] **Step 10: 运行确认失败**

```bash
bun test apps/platforms/http/src/create-http-client.test.ts
```

- [ ] **Step 11: 写实现**

```typescript
// apps/platforms/http/src/create-http-client.ts
import { normalizeErrorResponse } from "./errors";
import { composeMiddleware, type Middleware } from "./middleware";

export interface HttpClient {
  get: (url: string, init?: RequestInit) => Promise<unknown>;
  post: (url: string, body?: unknown, init?: RequestInit) => Promise<unknown>;
  put: (url: string, body?: unknown, init?: RequestInit) => Promise<unknown>;
  delete: (url: string, init?: RequestInit) => Promise<unknown>;
}

export interface CreateHttpClientOptions {
  fetchImpl?: typeof fetch;
  getAuthHeaders: () => Record<string, string>;
  baseUrl?: string;
  middlewares?: Middleware[];
}

function resolveUrl(baseUrl: string | undefined, url: string): string {
  if (!baseUrl || /^https?:\/\//.test(url)) {
    return url;
  }
  return `${baseUrl}${url}`;
}

export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  const authMiddleware: Middleware = async (request, next) => {
    const headers = new Headers(request.headers);
    for (const [key, value] of Object.entries(options.getAuthHeaders())) {
      headers.set(key, value);
    }
    return next(new Request(request, { headers }));
  };

  const pipeline = composeMiddleware([authMiddleware, ...(options.middlewares ?? [])], async (request) => fetchImpl(request));

  async function request(method: string, url: string, body?: unknown, init?: RequestInit): Promise<unknown> {
    const headers = new Headers(init?.headers);
    if (body !== undefined) {
      headers.set("content-type", "application/json");
    }
    const req = new Request(resolveUrl(options.baseUrl, url), {
      ...init,
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const response = await pipeline(req);
    const contentType = response.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      throw normalizeErrorResponse(response.status, parsed);
    }
    return parsed;
  }

  return {
    get: (url, init) => request("GET", url, undefined, init),
    post: (url, body, init) => request("POST", url, body, init),
    put: (url, body, init) => request("PUT", url, body, init),
    delete: (url, init) => request("DELETE", url, undefined, init),
  };
}
```

- [ ] **Step 12: 运行确认通过**

```bash
bun test apps/platforms/http/src/create-http-client.test.ts
```

- [ ] **Step 13: 登出副作用走 `ctx.bus`（ADR-0047 后半句）——业务层用法示例，写一份使用说明测试**

```typescript
// apps/platforms/http/src/platform.ts
import type { PlatformContext } from "@g2-composition/contract";
import { createHttpClient, type HttpClient } from "./create-http-client";
import { HttpServiceError } from "./errors";

export const AUTH_LOGOUT_REQUESTED = "auth:logout-requested";

/**
 * 供业务 client 模块使用的辅助：当捕获到 401 且业务判定这次确实代表会话失效时，
 * 调用本函数广播登出事件；http 客户端自身不做这个判断（ADR-0047）。
 */
export function requestLogoutIfSessionExpired(ctx: PlatformContext, error: unknown): void {
  if (error instanceof HttpServiceError && error.httpStatus === 401) {
    ctx.bus.publish(AUTH_LOGOUT_REQUESTED, { errorCode: error.errorCode });
  }
}

export function createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient {
  return createHttpClient({ getAuthHeaders: ctx.getAuthHeaders, baseUrl });
}
```

```typescript
// apps/platforms/http/src/main.ts（MF exposes 入口，仅用于本地 dev 预览页；真正被消费的是 createHttpClientForPlatform）
import { createApp } from "vue";

createApp({ template: `<p>@g2-platform/http (library remote, no UI)</p>` }).mount("#app");
```

- [ ] **Step 14: 包骨架与 MF 配置**

```json
// apps/platforms/http/package.json
{
  "name": "@g2-platform/http",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5015 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5015 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "vue": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

```typescript
// apps/platforms/http/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5015, strictPort: true, origin: "http://localhost:5015" },
  preview: { port: 5015, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "httpPlatform",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: {
        "./client": "./src/platform.ts",
        "./errors": "./src/errors.ts",
      },
      shared: { vue: { singleton: true } },
    }),
  ],
});
```

```html
<!-- apps/platforms/http/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```json
// apps/platforms/http/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

- [ ] **Step 15: Commit**

```bash
git add apps/platforms/http
git commit -m "feat(platform-http): add @g2-platform/http with middleware pipeline, token provider auth, standardized errors"
```

---

## 阶段 3：`@g2-platform/pc-auth`（ADR-0027/0028）

### Task 3.1: 包骨架

**Files:**

- Create: `apps/platforms/pc-auth/package.json`
- Create: `apps/platforms/pc-auth/tsconfig.json`
- Create: `apps/platforms/pc-auth/vite.config.ts`
- Create: `apps/platforms/pc-auth/index.html`

```json
// apps/platforms/pc-auth/package.json
{
  "name": "@g2-platform/pc-auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5010 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5010 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "@g2-shared/logger": "workspace:*",
    "vue": "catalog:",
    "vue-router": "catalog:"
  },
  "devDependencies": {
    "@g2-platform/http": "workspace:*",
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

> `@g2-platform/http` 放在 `devDependencies` 而不是 `dependencies`——pc-auth 只需要它的 **TypeScript 类型**（`HttpClient` 接口），运行时通过 `ctx.loadPlatform("httpPlatform", "client")` 动态加载真实实现（见下方 Task 3.3），不产生构建期打包耦合。`devDependencies` 只影响本地类型解析，不代表"生产不需要它"，这个包本身依然会作为独立 MF remote 部署，只是 pc-auth 不静态 `import` 它的运行时代码。

```typescript
// apps/platforms/pc-auth/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5010, strictPort: true, origin: "http://localhost:5010" },
  preview: { port: 5010, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "pcAuth",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: {
        "./platform": "./src/platform.ts",
      },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
```

```json
// apps/platforms/pc-auth/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

```html
<!-- apps/platforms/pc-auth/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 1: Commit 骨架**

```bash
git add apps/platforms/pc-auth
git commit -m "chore(platform-pc-auth): scaffold package"
```

### Task 3.2: 认证策略扩展点（ADR-0028）

**Files:**

- Create: `apps/platforms/pc-auth/src/auth-strategy.ts`
- Create: `apps/platforms/pc-auth/src/auth-strategy.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/platforms/pc-auth/src/auth-strategy.test.ts
import { describe, expect, test } from "bun:test";
import { createAuthStrategyRegistry, type AuthStrategy } from "./auth-strategy";

describe("createAuthStrategyRegistry", () => {
  test("按 config.strategies 声明的 id 列表启用对应策略，未声明的策略不启用", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    const casSso: AuthStrategy = { id: "cas-sso", tryLogin: async () => ({ token: "t", tenant: "" }) };
    const registry = createAuthStrategyRegistry([standard, casSso], { strategies: ["standard"] });
    expect(registry.enabled.map((s) => s.id)).toEqual(["standard"]);
  });

  test("config 未声明 strategies 时，默认只启用 standard", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    const casSso: AuthStrategy = { id: "cas-sso", tryLogin: async () => null };
    const registry = createAuthStrategyRegistry([standard, casSso], {});
    expect(registry.enabled.map((s) => s.id)).toEqual(["standard"]);
  });

  test("引用了未注册的策略 id 时抛错，报出具体 id", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    expect(() => createAuthStrategyRegistry([standard], { strategies: ["not-registered"] })).toThrow(/not-registered/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-auth/src/auth-strategy.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/platforms/pc-auth/src/auth-strategy.ts
export interface AuthResult {
  token: string;
  tenant: string;
}

export interface AuthStrategy {
  id: string;
  /** 静默尝试免登；不适用当前请求时返回 null，不抛错。 */
  tryLogin: (context: { query: URLSearchParams }) => Promise<AuthResult | null>;
}

export interface AuthStrategyConfig {
  strategies?: string[];
}

export interface AuthStrategyRegistry {
  enabled: AuthStrategy[];
}

export function createAuthStrategyRegistry(all: AuthStrategy[], config: AuthStrategyConfig): AuthStrategyRegistry {
  const requested = config.strategies ?? ["standard"];
  const byId = new Map(all.map((s) => [s.id, s]));
  const enabled = requested.map((id) => {
    const strategy = byId.get(id);
    if (!strategy) {
      throw new Error(`auth strategy "${id}" is not registered`);
    }
    return strategy;
  });
  return { enabled };
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/platforms/pc-auth/src/auth-strategy.test.ts
```

- [ ] **Step 5: 实现"standard"（账密登录）与"cas-sso"（对齐旧仓 `verify-auth`）两个具体策略**

```typescript
// apps/platforms/pc-auth/src/strategies/cas-sso.ts
import type { AuthStrategy } from "../auth-strategy";
import type { HttpClient } from "@g2-platform/http/client";

export function createCasSsoStrategy(http: HttpClient): AuthStrategy {
  return {
    id: "cas-sso",
    async tryLogin({ query }) {
      const code = query.get("code");
      const ticket = query.get("ticket");
      if (!code && !ticket) {
        return null;
      }
      const body = code
        ? await http.post("/ouaa/public/get/accesstoken/exchange", { grant_type: "ms_accesstoken_code", code })
        : await http.post("/ouaa/public/cas/login", { ticket });
      const result = body as { access_token: string; refresh_token?: string; tenant?: string };
      return { token: result.access_token, tenant: result.tenant ?? "" };
    },
  };
}
```

```typescript
// apps/platforms/pc-auth/src/strategies/standard.ts
import type { AuthStrategy } from "../auth-strategy";

/** 标准账密登录本身走独立的登录表单提交（见 Task 3.3），不需要在 tryLogin 里做静默尝试，这里返回 null 即可。 */
export const standardStrategy: AuthStrategy = {
  id: "standard",
  async tryLogin() {
    return null;
  },
};
```

> 注：旧仓 `getTokenByAuthCode`/`casLogin` 的确切请求路径与字段名，实现前需要现场核对 `/Users/dg/work-ghy/ghcloud/prod/cube/apps/auth/service/src/auth.service.ts` 的真实方法签名（本计划撰写时已确认该文件存在，但未逐行摘录全部方法，实现该 Step 前先读一遍该文件确认参数形状，不要凭空假设字段名）。

- [ ] **Step 5b: 模块级响应式单例持有"已启用策略列表"，由 `install(config)` 在拿到 Profile 配置后组装（http client 通过 `ctx.loadPlatform` 动态取得，不静态 import）——写失败测试**

```typescript
// apps/platforms/pc-auth/src/auth-strategy.test.ts（追加）
test("setEnabledStrategies / getEnabledStrategies 是模块级单例，供 slot 组件读取", () => {
  const strategy: AuthStrategy = { id: "standard", tryLogin: async () => null };
  setEnabledStrategies([strategy]);
  expect(getEnabledStrategies()).toEqual([strategy]);
});
```

- [ ] **Step 5c: 运行确认失败，然后补实现**

```bash
bun test apps/platforms/pc-auth/src/auth-strategy.test.ts
```

```typescript
// apps/platforms/pc-auth/src/auth-strategy.ts（在文件末尾追加）
import { ref } from "vue";

const enabledStrategiesRef = ref<AuthStrategy[]>([]);

export function setEnabledStrategies(strategies: AuthStrategy[]): void {
  enabledStrategiesRef.value = strategies;
}

export function getEnabledStrategies(): AuthStrategy[] {
  return enabledStrategiesRef.value;
}
```

```bash
bun test apps/platforms/pc-auth/src/auth-strategy.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/platforms/pc-auth/src
git commit -m "feat(platform-pc-auth): add pluggable auth strategy registry with standard/cas-sso strategies"
```

### Task 3.3: 登录页 / verify-auth 页内容组件（`slots`）

**Files:**

- Create: `apps/platforms/pc-auth/src/components/LoginPage.vue`
- Create: `apps/platforms/pc-auth/src/components/VerifyAuthPage.vue`
- Create: `apps/platforms/pc-auth/src/platform.ts`
- Create: `apps/platforms/pc-auth/src/platform.test.ts`
- Create: `apps/platforms/pc-auth/src/main.ts`

- [ ] **Step 1: 写 `platform.ts` 的失败测试（先验证契约形状，UI 细节留给 Vitest 任务）**

```typescript
// apps/platforms/pc-auth/src/platform.test.ts
import { describe, expect, test } from "bun:test";
import { assertPlatformModule } from "@g2-composition/contract";
import { platformModule } from "./platform";

describe("pc-auth platform module", () => {
  test("符合 PlatformModule 契约，暴露 auth.login 与 auth.verifyAuth 两个 slot", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(Object.keys(platformModule.slots ?? {})).toEqual(["auth.login", "auth.verifyAuth"]);
  });

  test("label 标识自己", () => {
    expect(platformModule.label).toBe("pc-auth");
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-auth/src/platform.test.ts
```

- [ ] **Step 3: 写 `LoginPage.vue`（内容对齐旧仓 `views/login/login.vue` 的标准账密表单，去掉 qiankun/mf-root 特有依赖，鉴权提交改走 Shell 注入的 `ctx.getAuthHeaders` 对应的登录接口调用方式）**

登录表单字段与提交逻辑参照旧仓 `/Users/dg/work-ghy/ghcloud/legacy/bimops-fe-web-migrate/src/views/login/components/login-form.vue`（账号密码）与 `login-phone.vue`（手机号+验证码），实现前先读这两个文件确认具体字段名与校验规则，按以下契约port：

```vue
<!-- apps/platforms/pc-auth/src/components/LoginPage.vue -->
<template>
  <div class="pc-auth-login">
    <form @submit.prevent="handleSubmit">
      <input v-model="account" placeholder="账号" autocomplete="username" />
      <input v-model="password" type="password" placeholder="密码" autocomplete="current-password" />
      <button type="submit" :disabled="submitting">登录</button>
      <p v-if="errorMessage" class="pc-auth-login-error">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { createLogger } from "@g2-shared/logger";
import type { PlatformContext } from "@g2-composition/contract";
import type { HttpClientModule } from "../http-client-module";

const props = defineProps<{ ctx: PlatformContext; onLoginSuccess: (result: { token: string; tenant: string }) => void }>();

const logger = createLogger("pc-auth");
const account = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  submitting.value = true;
  errorMessage.value = "";
  try {
    const httpModule = (await props.ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
    const http = httpModule.createHttpClientForPlatform(props.ctx);
    const result = (await http.post("/ouaa/authenticated/login", { account: account.value, password: password.value })) as {
      access_token: string;
      tenant?: string;
    };
    props.onLoginSuccess({ token: result.access_token, tenant: result.tenant ?? "" });
  } catch (error) {
    logger.error("login failed", { error: String(error) });
    errorMessage.value = "账号或密码错误";
  } finally {
    submitting.value = false;
  }
}
</script>
```

需要新增一个纯类型文件描述 `httpPlatform` 的 `./client` 暴露形状（避免到处 `as unknown` 强转）：

```typescript
// apps/platforms/pc-auth/src/http-client-module.ts
import type { HttpClient } from "@g2-platform/http/client";
import type { PlatformContext } from "@g2-composition/contract";

export interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}
```

> `/ouaa/authenticated/login` 是占位路径，实现前必须现场核对 `/Users/dg/work-ghy/ghcloud/prod/cube/apps/auth/service/src/auth.service.ts` 与旧仓 `login-form.vue` 里实际调用的接口路径/字段名，不要直接照抄本计划里的占位字符串上线。

- [ ] **Step 4: 写 `VerifyAuthPage.vue`（对齐旧仓 `views/verify-auth/verify-auth.vue`，改为消费 `cas-sso` 策略）**

```vue
<!-- apps/platforms/pc-auth/src/components/VerifyAuthPage.vue -->
<template>
  <div class="pc-auth-verify">
    <p v-if="loading">鉴权验证中…</p>
    <div v-else>
      <p>抱歉，您暂无权限访问此页面。</p>
      <button @click="$emit('go-login')">回登录页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getEnabledStrategies } from "../auth-strategy";

defineProps<{ onLoginSuccess: (result: { token: string; tenant: string }) => void }>();
defineEmits<{ "go-login": [] }>();

const loading = ref(true);

onMounted(async () => {
  const query = new URLSearchParams(window.location.search);
  for (const strategy of getEnabledStrategies()) {
    const result = await strategy.tryLogin({ query });
    if (result) {
      loading.value = false;
      return result; // 由外层 onLoginSuccess 消费，见下方说明
    }
  }
  loading.value = false;
});
</script>
```

> 上面 `return result` 出现在 `onMounted` 回调里不会真正把值传给任何人（`onMounted` 的返回值被忽略）——这是写计划时暴露的一个真实逻辑漏洞，实现该 Step 时必须改成 `props.onLoginSuccess(result); return;`，不能留 `return result` 这种看起来合理但实际不生效的写法。定稿版本：

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getEnabledStrategies } from "../auth-strategy";

const props = defineProps<{ onLoginSuccess: (result: { token: string; tenant: string }) => void }>();
defineEmits<{ "go-login": [] }>();

const loading = ref(true);

onMounted(async () => {
  const query = new URLSearchParams(window.location.search);
  for (const strategy of getEnabledStrategies()) {
    const result = await strategy.tryLogin({ query });
    if (result) {
      props.onLoginSuccess(result);
      return;
    }
  }
  loading.value = false;
});
</script>
```

- [ ] **Step 5: 写 `platform.ts`（`install` 时按 Profile 的 `config.strategies` 组装策略单例）**

```typescript
// apps/platforms/pc-auth/src/platform.ts
import type { PlatformModule } from "@g2-composition/contract";
import { createAuthStrategyRegistry, setEnabledStrategies } from "./auth-strategy";
import { standardStrategy } from "./strategies/standard";
import { createCasSsoStrategy } from "./strategies/cas-sso";
import LoginPage from "./components/LoginPage.vue";
import VerifyAuthPage from "./components/VerifyAuthPage.vue";
import type { HttpClientModule } from "./http-client-module";

export const platformModule: PlatformModule = {
  label: "pc-auth",
  slots: {
    "auth.login": LoginPage,
    "auth.verifyAuth": VerifyAuthPage,
  },
  install: async (_app, _router, ctx, config) => {
    const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
    const http = httpModule.createHttpClientForPlatform(ctx);
    const registry = createAuthStrategyRegistry([standardStrategy, createCasSsoStrategy(http)], config ?? {});
    setEnabledStrategies(registry.enabled);
  },
};

export default platformModule;
```

- [ ] **Step 6: 运行确认通过**

```bash
bun test apps/platforms/pc-auth/src/platform.test.ts
```

- [ ] **Step 7: 写 Vitest UI 测试确认 slot 组件可挂载（ADR-0013）**

```typescript
// apps/platforms/pc-auth/src/components/LoginPage.vitest.ts
import { describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { createFakePlatformContext } from "@g2-composition/contract";
import LoginPage from "./LoginPage.vue";

describe("LoginPage", () => {
  test("渲染账号密码表单，提交前禁止空账号", async () => {
    const wrapper = mount(LoginPage, {
      props: { ctx: createFakePlatformContext(), onLoginSuccess: () => {} },
    });
    expect(wrapper.find("input[placeholder='账号']").exists()).toBe(true);
    expect(wrapper.find("input[placeholder='密码']").exists()).toBe(true);
  });
});
```

> 本任务是 Vitest 首次在 g2 里真正用于 Vue 组件测试；执行前先确认根 `package.json`/各包是否已装 `vitest` + `@vue/test-utils` + `vitest.config.ts`（当前仓库检索未发现任何 vitest 配置），若未配置，本 Step 前先补一个最小 `vitest.config.ts`（复用 `@vitejs/plugin-vue`）与根 `devDependencies` 里的 `vitest`/`@vue/test-utils`（版本落 `catalog`）。

- [ ] **Step 8: `main.ts`（本地 dev 预览用）**

```typescript
// apps/platforms/pc-auth/src/main.ts
import { createApp } from "vue";
import { createFakePlatformContext } from "@g2-composition/contract";
import LoginPage from "./components/LoginPage.vue";

createApp(LoginPage, { ctx: createFakePlatformContext(), onLoginSuccess: (r: unknown) => console.log(r) }).mount("#app");
```

- [ ] **Step 9: Commit**

```bash
git add apps/platforms/pc-auth
git commit -m "feat(platform-pc-auth): add login/verify-auth slot content components"
```

### Task 3.4: check-password-modal（全局 install 挂载，ADR-0028 归属决定）

**Files:**

- Create: `apps/platforms/pc-auth/src/components/CheckPasswordModal.vue`
- Create: `apps/platforms/pc-auth/src/install-check-password.ts`
- Create: `apps/platforms/pc-auth/src/install-check-password.test.ts`
- Modify: `apps/platforms/pc-auth/src/platform.ts`

- [ ] **Step 1: 写失败测试（只测试挂载判定逻辑，不测 UI）**

```typescript
// apps/platforms/pc-auth/src/install-check-password.test.ts
import { describe, expect, test } from "bun:test";
import { shouldShowPasswordExpiredModal } from "./install-check-password";

describe("shouldShowPasswordExpiredModal", () => {
  test("密码过期且强制修改时显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: true }, "/index")).toBe(true);
  });

  test("密码过期但不强制、且用户本次会话已选择暂不修改时不显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: false, dismissedThisSession: true }, "/index")).toBe(
      false,
    );
  });

  test("不在 /index 路由时不显示（对齐旧仓仅在首页触发的行为）", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: true }, "/about")).toBe(false);
  });

  test("密码未过期时不显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: false, passwordForced: false }, "/index")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-auth/src/install-check-password.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/platforms/pc-auth/src/install-check-password.ts
export interface PasswordState {
  passwordExpired: boolean;
  passwordForced: boolean;
  dismissedThisSession?: boolean;
}

export function shouldShowPasswordExpiredModal(state: PasswordState, currentPath: string): boolean {
  if (currentPath !== "/index") {
    return false;
  }
  if (!state.passwordExpired) {
    return false;
  }
  if (state.passwordForced) {
    return true;
  }
  return !state.dismissedThisSession;
}
```

- [ ] **Step 4: 运行确认通过 + 写 modal 组件 + 接进 `install`**

```bash
bun test apps/platforms/pc-auth/src/install-check-password.test.ts
```

```vue
<!-- apps/platforms/pc-auth/src/components/CheckPasswordModal.vue -->
<template>
  <div v-if="visible" class="pc-auth-password-modal" role="alertdialog">
    <p>密码过期，请及时修改！</p>
    <button v-if="!forced" @click="dismiss">暂不修改</button>
    <button @click="goModify">去修改</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; forced: boolean }>();
const emit = defineEmits<{ dismiss: []; "go-modify": [] }>();
function dismiss() {
  emit("dismiss");
}
function goModify() {
  emit("go-modify");
}
</script>
```

```typescript
// apps/platforms/pc-auth/src/platform.ts（在已有 slots 定义之后追加 install）
import { createApp, h, reactive } from "vue";
import type { App, PlatformContext } from "@g2-composition/contract";
import type { Router } from "vue-router";
import CheckPasswordModal from "./components/CheckPasswordModal.vue";
import { shouldShowPasswordExpiredModal, type PasswordState } from "./install-check-password";
import { createAuthStrategyRegistry, setEnabledStrategies } from "./auth-strategy";
import { standardStrategy } from "./strategies/standard";
import { createCasSsoStrategy } from "./strategies/cas-sso";
import type { HttpClientModule } from "./http-client-module";

function mountCheckPasswordModal(app: App, router: Router, ctx: PlatformContext): void {
  const state = reactive<PasswordState>({ passwordExpired: false, passwordForced: false, dismissedThisSession: false });
  ctx.bus.subscribe("auth:session-ready", (payload) => {
    const session = payload as PasswordState;
    Object.assign(state, session);
  });

  const mountPoint = document.createElement("div");
  document.body.appendChild(mountPoint);
  const modalApp = createApp({
    setup() {
      return () =>
        h(CheckPasswordModal, {
          visible: shouldShowPasswordExpiredModal(state, router.currentRoute.value.path),
          forced: state.passwordForced,
          onDismiss: () => {
            state.dismissedThisSession = true;
          },
          onGoModify: () => {
            ctx.bus.publish("navigate-intent", { code: "PERSON-MANAGE", path: "/portal/legacy-personal/modify-password" });
          },
        });
    },
  });
  modalApp.mount(mountPoint);
}

export const platformModule: PlatformModule = {
  label: "pc-auth",
  slots: {
    "auth.login": LoginPage,
    "auth.verifyAuth": VerifyAuthPage,
  },
  install: async (app, router, ctx, config) => {
    const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
    const http = httpModule.createHttpClientForPlatform(ctx);
    const registry = createAuthStrategyRegistry([standardStrategy, createCasSsoStrategy(http)], config ?? {});
    setEnabledStrategies(registry.enabled);
    mountCheckPasswordModal(app, router, ctx);
  },
};

export default platformModule;
```

> 这里把 Task 3.3 Step 5 的策略组装逻辑和本任务的 `mountCheckPasswordModal` 合并进**同一个** `install` 里——本计划书写时先分两个任务讲清楚各自的逻辑，实施时这两段代码合并进同一份 `platform.ts` 文件、同一个 `install` 函数体，不能像两个任务分别展示的那样各自定义一份 `platformModule` 互相覆盖。`navigate-intent` 事件与旧仓 `MFRootEventNameEnum.MF_ROOT_TO_APPLICATION` 语义对应——目标微应用/域这一轮不存在接收方是预期状态（对齐 ADR-0029 的"能力先就位、域消费方后到"）。

- [ ] **Step 5: Commit**

```bash
git add apps/platforms/pc-auth/src
git commit -m "feat(platform-pc-auth): add check-password-modal as install-mounted global component"
```

---

## 阶段 4：`@g2-platform/pc-chrome`（ADR-0027/0033/0036）

### Task 4.1: 包骨架

**Files:**

- Create: `apps/platforms/pc-chrome/package.json`
- Create: `apps/platforms/pc-chrome/tsconfig.json`
- Create: `apps/platforms/pc-chrome/vite.config.ts`
- Create: `apps/platforms/pc-chrome/index.html`

- [ ] **Step 1: 写包骨架**

```json
// apps/platforms/pc-chrome/package.json
{
  "name": "@g2-platform/pc-chrome",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5011 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5011 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "@g2-shared/logger": "workspace:*",
    "vue": "catalog:",
    "vue-router": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

```typescript
// apps/platforms/pc-chrome/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5011, strictPort: true, origin: "http://localhost:5011" },
  preview: { port: 5011, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "pcChrome",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: {
        "./platform": "./src/platform.ts",
      },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
```

```json
// apps/platforms/pc-chrome/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

```html
<!-- apps/platforms/pc-chrome/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```bash
mkdir -p apps/platforms/pc-chrome/src/components
```

- [ ] **Step 2: Commit**

```bash
git add apps/platforms/pc-chrome
git commit -m "chore(platform-pc-chrome): scaffold package"
```

### Task 4.2: Shell 侧门户编排 store（menuContribution 聚合，ADR-0036，取代旧 `useChildApplication`）

这个 store 归 **Shell**（`@g2-shell/pc`），不是 pc-chrome 自己的（阶段 0 已定的边界：pc-chrome 只管展示槛位，编排逻辑在 Shell）。放在这里做是因为 pc-chrome 的组件强依赖它，必须先有它才能写 pc-chrome 组件的测试。

**Files:**

- Create: `apps/shells/pc/src/stores/portal-navigation.ts`
- Create: `apps/shells/pc/src/stores/portal-navigation.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/stores/portal-navigation.test.ts
import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";
import { usePortalNavigationStore } from "./portal-navigation";

describe("usePortalNavigationStore", () => {
  test("registerMenuContribution 把域的菜单树并入导航结构，带上 domainName 前缀避免多个域路径撞车", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("poc-inline-pc", [{ label: "示例", path: "/poc-inline", children: [] }]);
    expect(store.menuTree).toHaveLength(1);
    expect(store.menuTree[0]).toMatchObject({ label: "示例", path: "/poc-inline", domainName: "poc-inline-pc" });
  });

  test("同一个域重复注册时替换而不是重复追加（支持 inline override/热更新场景）", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("d1", [{ label: "v1", path: "/d1", children: [] }]);
    store.registerMenuContribution("d1", [{ label: "v2", path: "/d1", children: [] }]);
    expect(store.menuTree).toHaveLength(1);
    expect(store.menuTree[0].label).toBe("v2");
  });

  test("findByPath 递归匹配当前路径对应的菜单节点，最长前缀优先", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("d1", [{ label: "父", path: "/d1", children: [{ label: "子", path: "/d1/detail", children: [] }] }]);
    const match = store.findByPath("/d1/detail");
    expect(match?.label).toBe("子");
  });

  test("findByPath 无匹配时返回 undefined", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    expect(store.findByPath("/nowhere")).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/stores/portal-navigation.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/stores/portal-navigation.ts
import type { MenuContributionNode } from "@g2-composition/contract";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface NavigationMenuNode extends Omit<MenuContributionNode, "children"> {
  domainName: string;
  children?: NavigationMenuNode[];
}

function decorate(nodes: MenuContributionNode[], domainName: string): NavigationMenuNode[] {
  return nodes.map((node) => ({
    ...node,
    domainName,
    children: node.children ? decorate(node.children, domainName) : undefined,
  }));
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function findBestMatch(nodes: NavigationMenuNode[], path: string): NavigationMenuNode | undefined {
  let best: { node: NavigationMenuNode; score: number } | undefined;
  const target = normalizePath(path);
  const visit = (list: NavigationMenuNode[]) => {
    for (const node of list) {
      if (node.path) {
        const candidate = normalizePath(node.path);
        const isExact = candidate === target;
        const isPrefix = target.startsWith(`${candidate}/`);
        if (isExact || isPrefix) {
          const score = candidate.length;
          if (!best || score > best.score) {
            best = { node, score };
          }
        }
      }
      if (node.children) {
        visit(node.children);
      }
    }
  };
  visit(nodes);
  return best?.node;
}

export const usePortalNavigationStore = defineStore("portalNavigation", () => {
  const byDomain = ref(new Map<string, NavigationMenuNode[]>());

  function registerMenuContribution(domainName: string, nodes: MenuContributionNode[]): void {
    byDomain.value.set(domainName, decorate(nodes, domainName));
    // 触发 Map 引用变化以驱动依赖 menuTree 的响应式更新
    byDomain.value = new Map(byDomain.value);
  }

  const menuTree = ref<NavigationMenuNode[]>([]);
  function recomputeMenuTree(): NavigationMenuNode[] {
    return Array.from(byDomain.value.values()).flat();
  }

  function findByPath(path: string): NavigationMenuNode | undefined {
    return findBestMatch(recomputeMenuTree(), path);
  }

  return {
    get menuTree() {
      return recomputeMenuTree();
    },
    registerMenuContribution,
    findByPath,
  };
});
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/shells/pc/src/stores/portal-navigation.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/shells/pc/src/stores
git commit -m "feat(shell-pc): add portal navigation store aggregating domain menuContribution"
```

### Task 4.3: `chrome.topBar` slot + `chrome.topBar.actions` 嵌套贡献点（ADR-0033）

跨 Platform 通信统一走 `ctx.bus`（ADR-0030），不允许 `pc-ai-assistant` 之类的其他 Platform 直接 `import` `pc-chrome` 的模块——那样会在构建期产生 Platform 间的静态耦合，违背"各自独立发版"的初衷（ADR-0027）。贡献点注册表因此设计成：注册表状态是 pc-chrome 内部的响应式单例，只能通过 `install` 时订阅 `ctx.bus` 上的 `chrome:register-top-bar-action` 事件来"喂"数据，其它 Platform 只管往总线上发事件，不知道、也不需要知道 pc-chrome 内部是怎么存这份状态的。

**Files:**

- Create: `apps/platforms/pc-chrome/src/components/TopBar.vue`
- Create: `apps/platforms/pc-chrome/src/top-bar-actions-registry.ts`
- Create: `apps/platforms/pc-chrome/src/top-bar-actions-registry.test.ts`
- Create: `apps/platforms/pc-chrome/src/platform.ts`
- Create: `apps/platforms/pc-chrome/src/platform.test.ts`

- [ ] **Step 1: 写贡献点注册表的失败测试**

```typescript
// apps/platforms/pc-chrome/src/top-bar-actions-registry.test.ts
import { describe, expect, test } from "bun:test";
import { createFakeBus } from "@g2-composition/contract";
import { createTopBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

describe("createTopBarActionsRegistry", () => {
  test("按注册顺序排列图标贡献", () => {
    const registry = createTopBarActionsRegistry();
    registry.register({ id: "search", component: {} });
    registry.register({ id: "ai-assistant", component: {} });
    expect(registry.list().map((a) => a.id)).toEqual(["search", "ai-assistant"]);
  });

  test("重复 id 注册时报错（这是独占型贡献点，同一个 id 只能有一个来源）", () => {
    const registry = createTopBarActionsRegistry();
    registry.register({ id: "search", component: {} });
    expect(() => registry.register({ id: "search", component: {} })).toThrow(/search/);
  });
});

describe("wireTopBarActionsRegistryToBus", () => {
  test("订阅总线上的 chrome:register-top-bar-action 事件，收到后注册进本地 registry", () => {
    const bus = createFakeBus();
    const registry = createTopBarActionsRegistry();
    wireTopBarActionsRegistryToBus(bus, registry);
    bus.publish("chrome:register-top-bar-action", { id: "ai-assistant", component: { name: "AiChatEntry" } });
    expect(registry.list().map((a) => a.id)).toEqual(["ai-assistant"]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-chrome/src/top-bar-actions-registry.test.ts
```

- [ ] **Step 3: 写实现（`list()` 返回响应式数组，供 `TopBar.vue` 在新贡献到达时自动重渲染）**

```typescript
// apps/platforms/pc-chrome/src/top-bar-actions-registry.ts
import type { EventBus } from "@g2-composition/contract";
import { reactive } from "vue";

export interface TopBarAction {
  id: string;
  component: unknown;
}

export interface TopBarActionsRegistry {
  register: (action: TopBarAction) => void;
  list: () => TopBarAction[];
}

export function createTopBarActionsRegistry(): TopBarActionsRegistry {
  const actions = reactive<TopBarAction[]>([]);
  return {
    register(action) {
      if (actions.some((existing) => existing.id === action.id)) {
        throw new Error(`top-bar action "${action.id}" already registered by another platform`);
      }
      actions.push(action);
    },
    list() {
      return actions;
    },
  };
}

export function wireTopBarActionsRegistryToBus(bus: EventBus, registry: TopBarActionsRegistry): () => void {
  return bus.subscribe("chrome:register-top-bar-action", (payload) => {
    registry.register(payload as TopBarAction);
  });
}

/** 模块级单例：pc-chrome 自己的 install 负责把它接到总线上；TopBar.vue 从这里读，不直接依赖 install 时机。 */
export const topBarActionsRegistry = createTopBarActionsRegistry();
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/platforms/pc-chrome/src/top-bar-actions-registry.test.ts
```

- [ ] **Step 5: 写 `TopBar.vue`（对齐旧仓 `NavTopLink.vue` 布局，读 Shell 提供的鉴权/租户信息通过 props，不直接依赖 Shell 内部 store 类型）**

组件内部结构参照 `/Users/dg/work-ghy/ghcloud/legacy/bimops-fe-web-migrate/src/components/NavTopLink/NavTopLink.vue`：左侧 Logo + 应用入口，右侧动态渲染 `topBarActionsRegistry.list()` 里的每个贡献 + 租户切换 + 用户菜单。实现前读一遍该文件确认具体 DOM 结构/class 命名，保持视觉对齐（ADR-0012 antdv 组件库经 platform 引入，这个任务先写不依赖 antdv 的最简结构，UI 视觉细节留给"实施阶段迭代"，不在本计划里逐像素还原）。**现状更新（2026-07-19）**：antdv 经 platform 暴露的基础设施（`@g2-platform/pc-ui`）已经建好，可供后续迭代改造本组件；但本条目描述的 `TopBar.vue` 当前实现仍是这里写的最简结构，尚未改接 `@g2-platform/pc-ui`——那属于后续单独的视觉还原任务，不在本次基础设施变更范围内：

```vue
<!-- apps/platforms/pc-chrome/src/components/TopBar.vue -->
<template>
  <div class="pc-chrome-top-bar">
    <div class="pc-chrome-top-bar-left">
      <span class="pc-chrome-logo">{{ tenantName }}</span>
    </div>
    <div class="pc-chrome-top-bar-right">
      <component :is="action.component" v-for="action in actions" :key="action.id" />
      <span class="pc-chrome-user">{{ userName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { topBarActionsRegistry } from "../top-bar-actions-registry";

defineProps<{ tenantName: string; userName: string }>();
const actions = topBarActionsRegistry.list();
</script>
```

- [ ] **Step 6: 写 `platform.ts` 契约测试**

```typescript
// apps/platforms/pc-chrome/src/platform.test.ts
import { describe, expect, test } from "bun:test";
import { assertPlatformModule } from "@g2-composition/contract";
import { platformModule } from "./platform";

describe("pc-chrome platform module", () => {
  test("符合 PlatformModule 契约，暴露 chrome.topBar slot", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(Object.keys(platformModule.slots ?? {})).toContain("chrome.topBar");
  });
});
```

- [ ] **Step 7: 运行确认失败再写实现**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
```

```typescript
// apps/platforms/pc-chrome/src/platform.ts（先写 topBar 部分，Task 4.4/4.5 会继续在这个文件追加 sideMenu/tabs slot）
import type { PlatformModule } from "@g2-composition/contract";
import TopBar from "./components/TopBar.vue";
import { topBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

export const platformModule: PlatformModule = {
  label: "pc-chrome",
  slots: {
    "chrome.topBar": TopBar,
  },
  install: async (_app, _router, ctx) => {
    wireTopBarActionsRegistryToBus(ctx.bus, topBarActionsRegistry);
  },
};

export default platformModule;
```

- [ ] **Step 8: 运行确认通过 + Commit**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
git add apps/platforms/pc-chrome/src
git commit -m "feat(platform-pc-chrome): add chrome.topBar slot with nested actions contribution point"
```

### Task 4.4: `chrome.sideMenu` slot（对齐旧仓 `menuList.vue`，读 `usePortalNavigationStore`）

**Files:**

- Create: `apps/platforms/pc-chrome/src/components/SideMenu.vue`
- Modify: `apps/platforms/pc-chrome/src/platform.ts`
- Modify: `apps/platforms/pc-chrome/src/platform.test.ts`

- [ ] **Step 1: 扩展契约测试**

```typescript
// apps/platforms/pc-chrome/src/platform.test.ts（追加一个 expect）
expect(Object.keys(platformModule.slots ?? {})).toEqual(["chrome.topBar", "chrome.sideMenu"]);
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
```

- [ ] **Step 3: 写 `SideMenu.vue`**（依赖树结构对齐旧仓 `menuList.vue` 的递归子菜单渲染，数据源从 props 传入的 `menuTree`，而不是自己查 Shell 的 Pinia store——保持 pc-chrome 组件对 Shell 内部实现无感，由 Shell 在挂载时把 `usePortalNavigationStore().menuTree` 作为 prop 传下去）：

```vue
<!-- apps/platforms/pc-chrome/src/components/SideMenu.vue -->
<template>
  <nav class="pc-chrome-side-menu">
    <ul>
      <li v-for="node in menuTree" :key="`${node.domainName}:${node.path}`">
        <a href="javascript:void(0)" :class="{ active: activePath === node.path }" @click="$emit('navigate', node.path)">
          {{ node.label }}
        </a>
        <ul v-if="node.children?.length">
          <li v-for="child in node.children" :key="`${child.domainName}:${child.path}`">
            <a href="javascript:void(0)" :class="{ active: activePath === child.path }" @click="$emit('navigate', child.path)">
              {{ child.label }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation";

defineProps<{ menuTree: NavigationMenuNode[]; activePath: string }>();
defineEmits<{ navigate: [path: string] }>();
</script>
```

> `@g2-shell/pc/stores/portal-navigation` 这个 import 路径意味着 pc-chrome **反向依赖了 Shell 的类型**——这是故意的类型层依赖（只导入 type，不产生运行时耦合），比在 pc-chrome 里重新定义一份 `NavigationMenuNode` 结构更不容易漂移。若 `@g2-shell/pc` 的 `package.json` `exports` 字段目前只导出 `"."`，需要在这一步给它加一条 `"./stores/portal-navigation": "./src/stores/portal-navigation.ts"` 的子路径导出。

- [ ] **Step 4: 补 Shell 的 exports**

```json
// apps/shells/pc/package.json（exports 字段，若原本没有 exports 字段则新增）
"exports": {
  ".": "./src/main.ts",
  "./stores/portal-navigation": "./src/stores/portal-navigation.ts"
}
```

- [ ] **Step 5: 更新 `platform.ts`**

```typescript
// apps/platforms/pc-chrome/src/platform.ts（保留 Task 4.3 已加的 install，只新增 chrome.sideMenu slot，不要把 install 丢了）
import type { PlatformModule } from "@g2-composition/contract";
import SideMenu from "./components/SideMenu.vue";
import TopBar from "./components/TopBar.vue";
import { topBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

export const platformModule: PlatformModule = {
  label: "pc-chrome",
  slots: {
    "chrome.topBar": TopBar,
    "chrome.sideMenu": SideMenu,
  },
  install: async (_app, _router, ctx) => {
    wireTopBarActionsRegistryToBus(ctx.bus, topBarActionsRegistry);
  },
};

export default platformModule;
```

- [ ] **Step 6: 运行确认通过 + Commit**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
git add apps/platforms/pc-chrome apps/shells/pc/package.json
git commit -m "feat(platform-pc-chrome): add chrome.sideMenu slot backed by Shell portal navigation store"
```

### Task 4.5: `chrome.tabs` slot（对齐旧仓 `NavTabs.vue`）

**Files:**

- Create: `apps/platforms/pc-chrome/src/components/Tabs.vue`
- Modify: `apps/platforms/pc-chrome/src/platform.ts`
- Modify: `apps/platforms/pc-chrome/src/platform.test.ts`

- [ ] **Step 1: 扩展契约测试**

```typescript
// apps/platforms/pc-chrome/src/platform.test.ts（把 Task 4.4 加的那行 expect 换成三个 slot）
expect(Object.keys(platformModule.slots ?? {})).toEqual(["chrome.topBar", "chrome.sideMenu", "chrome.tabs"]);
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
```

- [ ] **Step 3: 写 `Tabs.vue`（对齐旧仓 `NavTabs.vue` 的多标签页/关闭其他/关闭到右侧交互，数据源是 props 传入的 `tabsPane` 列表，不自己持有状态）**

```vue
<!-- apps/platforms/pc-chrome/src/components/Tabs.vue -->
<template>
  <div class="pc-chrome-tabs">
    <span v-for="tab in tabs" :key="tab.id" :class="{ active: tab.id === activeId }" @click="$emit('activate', tab.id)">
      {{ tab.label }}
      <button v-if="tabs.length > 1" @click.stop="$emit('close', tab.id)">×</button>
    </span>
  </div>
</template>

<script setup lang="ts">
export interface TabItem {
  id: string;
  label: string;
}
defineProps<{ tabs: TabItem[]; activeId: string }>();
defineEmits<{ activate: [id: string]; close: [id: string] }>();
</script>
```

- [ ] **Step 4: 更新 `platform.ts`（保留 Task 4.3/4.4 已有的 `install`，只新增 `chrome.tabs` slot）**

```typescript
// apps/platforms/pc-chrome/src/platform.ts
import type { PlatformModule } from "@g2-composition/contract";
import SideMenu from "./components/SideMenu.vue";
import Tabs from "./components/Tabs.vue";
import TopBar from "./components/TopBar.vue";
import { topBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

export const platformModule: PlatformModule = {
  label: "pc-chrome",
  slots: {
    "chrome.topBar": TopBar,
    "chrome.sideMenu": SideMenu,
    "chrome.tabs": Tabs,
  },
  install: async (_app, _router, ctx) => {
    wireTopBarActionsRegistryToBus(ctx.bus, topBarActionsRegistry);
  },
};

export default platformModule;
```

- [ ] **Step 5: 运行确认通过 + Commit**

```bash
bun test apps/platforms/pc-chrome/src/platform.test.ts
git add apps/platforms/pc-chrome
git commit -m "feat(platform-pc-chrome): add chrome.tabs slot"
```

---

## 阶段 5：`@g2-platform/pc-messaging` + `@g2-platform/pc-rtc`（ADR-0029/0038）

### Task 5.1: `@g2-platform/pc-messaging` —— 总线消费方（不拥有总线本体）

**Files:**

- Create: `apps/platforms/pc-messaging/package.json`
- Create: `apps/platforms/pc-messaging/tsconfig.json`
- Create: `apps/platforms/pc-messaging/vite.config.ts`
- Create: `apps/platforms/pc-messaging/index.html`
- Create: `apps/platforms/pc-messaging/src/handlers.ts`
- Create: `apps/platforms/pc-messaging/src/handlers.test.ts`
- Create: `apps/platforms/pc-messaging/src/platform.ts`
- Create: `apps/platforms/pc-messaging/src/main.ts`

- [ ] **Step 0: 包骨架**

```json
// apps/platforms/pc-messaging/package.json
{
  "name": "@g2-platform/pc-messaging",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5012 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5012 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "vue": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

```typescript
// apps/platforms/pc-messaging/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5012, strictPort: true, origin: "http://localhost:5012" },
  preview: { port: 5012, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "pcMessaging",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: { "./platform": "./src/platform.ts" },
      shared: { vue: { singleton: true } },
    }),
  ],
});
```

```json
// apps/platforms/pc-messaging/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

```html
<!-- apps/platforms/pc-messaging/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```typescript
// apps/platforms/pc-messaging/src/main.ts
import { createApp } from "vue";
createApp({ template: `<p>@g2-platform/pc-messaging (no visible UI, install-only platform)</p>` }).mount("#app");
```

- [ ] **Step 1: 写失败测试**

```typescript
// apps/platforms/pc-messaging/src/handlers.test.ts
import { describe, expect, test } from "bun:test";
import { createFakeBus } from "@g2-composition/contract";
import { registerMessagingHandlers } from "./handlers";

describe("registerMessagingHandlers", () => {
  test("订阅 terminal-message 事件，收到后发布 notification:show 供 UI 层消费", () => {
    const bus = createFakeBus();
    registerMessagingHandlers(bus);
    bus.publish("terminal-message", { applicationName: "示例应用", msgContent: "你有新消息" });
    const shown = bus.published.find((p) => p.event === "notification:show");
    expect(shown?.payload).toMatchObject({ title: "示例应用", description: "你有新消息" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-messaging/src/handlers.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/platforms/pc-messaging/src/handlers.ts
import type { EventBus } from "@g2-composition/contract";

export function registerMessagingHandlers(bus: EventBus): void {
  bus.subscribe("terminal-message", (payload) => {
    const data = payload as { applicationName: string; msgContent: string; id?: string };
    bus.publish("notification:show", { title: data.applicationName, description: data.msgContent, sourceId: data.id });
  });
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/platforms/pc-messaging/src/handlers.test.ts
```

- [ ] **Step 5: `platform.ts`**

```typescript
// apps/platforms/pc-messaging/src/platform.ts
import type { PlatformModule } from "@g2-composition/contract";
import { registerMessagingHandlers } from "./handlers";

export const platformModule: PlatformModule = {
  label: "pc-messaging",
  install: async (_app, _router, ctx) => {
    registerMessagingHandlers(ctx.bus);
  },
};

export default platformModule;
```

- [ ] **Step 6: Commit**

```bash
git add apps/platforms/pc-messaging
git commit -m "feat(platform-pc-messaging): subscribe generic notification handler on shared bus"
```

### Task 5.2: `@g2-platform/pc-rtc` —— 标准可拔插能力，本轮必须真实可用（ADR-0029）

**Files:**

- Create: `apps/platforms/pc-rtc/package.json`
- Create: `apps/platforms/pc-rtc/tsconfig.json`
- Create: `apps/platforms/pc-rtc/vite.config.ts`
- Create: `apps/platforms/pc-rtc/index.html`
- Create: `apps/platforms/pc-rtc/src/handlers.ts`
- Create: `apps/platforms/pc-rtc/src/handlers.test.ts`
- Create: `apps/platforms/pc-rtc/src/platform.ts`
- Create: `apps/platforms/pc-rtc/src/main.ts`

- [ ] **Step 0: 包骨架**

```json
// apps/platforms/pc-rtc/package.json
{
  "name": "@g2-platform/pc-rtc",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5013 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5013 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "vue": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

```typescript
// apps/platforms/pc-rtc/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5013, strictPort: true, origin: "http://localhost:5013" },
  preview: { port: 5013, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "pcRtc",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: { "./platform": "./src/platform.ts" },
      shared: { vue: { singleton: true } },
    }),
  ],
});
```

```json
// apps/platforms/pc-rtc/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

```html
<!-- apps/platforms/pc-rtc/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```typescript
// apps/platforms/pc-rtc/src/main.ts
import { createApp } from "vue";
createApp({ template: `<p>@g2-platform/pc-rtc (no visible UI yet, event routing only)</p>` }).mount("#app");
```

- [ ] **Step 1: 写失败测试**

```typescript
// apps/platforms/pc-rtc/src/handlers.test.ts
import { describe, expect, test } from "bun:test";
import { createFakeBus } from "@g2-composition/contract";
import { registerRtcHandlers } from "./handlers";

describe("registerRtcHandlers", () => {
  test("收到 headquarters-alarm 事件后，发布 navigate-intent，目标是具体业务域路径（域消费方本轮可能不存在，属预期状态）", () => {
    const bus = createFakeBus();
    registerRtcHandlers(bus);
    bus.publish("headquarters-alarm", {
      businessPrincipal: JSON.stringify({
        applicationCode: "genericEquipmentMonitor",
        alarmTargetKey: "dev-1",
        businessKey: "bk-1",
        id: "alarm-1",
      }),
    });
    const navigate = bus.published.find((p) => p.event === "navigate-intent");
    expect(navigate?.payload).toMatchObject({
      code: "genericEquipmentMonitor",
      path: "/portal/genericEquipmentMonitor/alarmDetail?businessKey=bk-1&type=detail&deviceId=dev-1&id=alarm-1",
    });
  });

  test("收到 rtc-call-received 事件后，发布 rtc:incoming-call 供 UI 层展示来电通知", () => {
    const bus = createFakeBus();
    registerRtcHandlers(bus);
    bus.publish("rtc-call-received", { name: "张三" });
    const incoming = bus.published.find((p) => p.event === "rtc:incoming-call");
    expect(incoming?.payload).toMatchObject({ name: "张三" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-rtc/src/handlers.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/platforms/pc-rtc/src/handlers.ts
import type { EventBus } from "@g2-composition/contract";

function buildAlarmDetailPath(alarm: { applicationCode: string; alarmTargetKey: string; businessKey: string; id: string }): string {
  const query = new URLSearchParams({ businessKey: alarm.businessKey, type: "detail", deviceId: alarm.alarmTargetKey, id: alarm.id });
  return `/portal/${alarm.applicationCode}/alarmDetail?${query.toString()}`;
}

export function registerRtcHandlers(bus: EventBus): void {
  bus.subscribe("headquarters-alarm", (payload) => {
    const data = payload as { businessPrincipal: string };
    const alarm = JSON.parse(data.businessPrincipal) as {
      applicationCode: string;
      alarmTargetKey: string;
      businessKey: string;
      id: string;
    };
    bus.publish("navigate-intent", { code: alarm.applicationCode, path: buildAlarmDetailPath(alarm) });
  });

  bus.subscribe("rtc-call-received", (payload) => {
    bus.publish("rtc:incoming-call", payload);
  });

  bus.subscribe("rtc-call-end", () => {
    bus.publish("rtc:call-ended", undefined);
  });
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/platforms/pc-rtc/src/handlers.test.ts
```

- [ ] **Step 5: `platform.ts`**

```typescript
// apps/platforms/pc-rtc/src/platform.ts
import type { PlatformModule } from "@g2-composition/contract";
import { registerRtcHandlers } from "./handlers";

export const platformModule: PlatformModule = {
  label: "pc-rtc",
  install: async (_app, _router, ctx) => {
    registerRtcHandlers(ctx.bus);
  },
};

export default platformModule;
```

> 报警弹窗/RTC 通话具体 UI（iframe 承载的报警弹窗、通话界面）依赖 `@ghcloud/cube-alarm-modal`/`@ghcloud/cube-rtc`/`@ghcloud/desktop-client-ui`，按 ADR-0001 不能直接依赖，需要重建；重建这些具体 UI 组件的详细任务不在本计划范围内列出完整代码（涉及 WebRTC SDK 选型、iframe 通信协议等超出本轮 grill 已钉决策的实现细节），实现时先完成本任务里的事件路由骨架（已经是真实可用的能力，符合 ADR-0029"能力先就位"要求），UI 部分作为本 Task 的后续迭代补齐，不阻塞其他阶段。

- [ ] **Step 6: Commit**

```bash
git add apps/platforms/pc-rtc
git commit -m "feat(platform-pc-rtc): add rtc/alarm event routing on shared bus"
```

### Task 5.3: 崩溃采集钩子（ADR-0038）

**Files:**

- Create: `apps/shells/pc/src/crash-reporting.ts`
- Create: `apps/shells/pc/src/crash-reporting.test.ts`
- Modify: `apps/shells/pc/src/main.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/crash-reporting.test.ts
import { describe, expect, test } from "bun:test";
import { installCrashReporting } from "./crash-reporting";

describe("installCrashReporting", () => {
  test("window.onerror 触发时调用 logger.error", () => {
    const calls: unknown[][] = [];
    const fakeLogger = { error: (...args: unknown[]) => calls.push(args), debug: () => {}, info: () => {}, warn: () => {} };
    const fakeTarget = { onerror: null as unknown, onunhandledrejection: null as unknown };
    installCrashReporting(fakeTarget as unknown as Window, fakeLogger);
    (fakeTarget.onerror as (message: string) => void)("boom");
    expect(calls[0][0]).toBe("uncaught error");
    expect(calls[0][1]).toMatchObject({ message: "boom" });
  });

  test("unhandledrejection 触发时调用 logger.error", () => {
    const calls: unknown[][] = [];
    const fakeLogger = { error: (...args: unknown[]) => calls.push(args), debug: () => {}, info: () => {}, warn: () => {} };
    const fakeTarget = { onerror: null as unknown, onunhandledrejection: null as unknown };
    installCrashReporting(fakeTarget as unknown as Window, fakeLogger);
    (fakeTarget.onunhandledrejection as (event: { reason: unknown }) => void)({ reason: "rejected" });
    expect(calls[0][0]).toBe("unhandled promise rejection");
    expect(calls[0][1]).toMatchObject({ reason: "rejected" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/crash-reporting.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/crash-reporting.ts
import type { Logger } from "@g2-shared/logger";

export function installCrashReporting(target: Window, logger: Logger): void {
  target.onerror = (message) => {
    logger.error("uncaught error", { message: String(message) });
  };
  target.onunhandledrejection = (event) => {
    logger.error("unhandled promise rejection", { reason: (event as { reason: unknown }).reason });
  };
}
```

- [ ] **Step 4: 运行确认通过 + 接进 `main.ts`**

```bash
bun test apps/shells/pc/src/crash-reporting.test.ts
```

```typescript
// apps/shells/pc/src/main.ts（bootstrap 函数开头追加两行）
import { createLogger } from "@g2-shared/logger";
import { installCrashReporting } from "./crash-reporting";

// 在 bootstrap() 函数体最开始处：
installCrashReporting(window, createLogger("shell-pc"));
```

- [ ] **Step 5: Commit**

```bash
git add apps/shells/pc/src/crash-reporting.ts apps/shells/pc/src/crash-reporting.test.ts apps/shells/pc/src/main.ts
git commit -m "feat(shell-pc): install self-built crash reporting hooks reusing logger channel"
```

---

## 阶段 6：`@g2-platform/pc-ai-assistant`（ADR-0033）

### Task 6.1: 包骨架 + `chrome.topBar.actions` 贡献

**Files:**

- Create: `apps/platforms/pc-ai-assistant/package.json`
- Create: `apps/platforms/pc-ai-assistant/tsconfig.json`
- Create: `apps/platforms/pc-ai-assistant/vite.config.ts`
- Create: `apps/platforms/pc-ai-assistant/index.html`
- Create: `apps/platforms/pc-ai-assistant/src/components/AiChatEntry.vue`
- Create: `apps/platforms/pc-ai-assistant/src/platform.ts`
- Create: `apps/platforms/pc-ai-assistant/src/platform.test.ts`
- Create: `apps/platforms/pc-ai-assistant/src/main.ts`

- [ ] **Step 0: 包骨架**

```json
// apps/platforms/pc-ai-assistant/package.json
{
  "name": "@g2-platform/pc-ai-assistant",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5014 --strictPort",
    "build": "vite build",
    "preview": "vite preview --port 5014 --strictPort",
    "typecheck": "vue-tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@g2-composition/contract": "workspace:*",
    "vue": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "@vitejs/plugin-vue": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vue-tsc": "catalog:"
  }
}
```

```typescript
// apps/platforms/pc-ai-assistant/vite.config.ts
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5014, strictPort: true, origin: "http://localhost:5014" },
  preview: { port: 5014, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vue(),
    federation({
      name: "pcAiAssistant",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: { "./platform": "./src/platform.ts" },
      shared: { vue: { singleton: true } },
    }),
  ],
});
```

```json
// apps/platforms/pc-ai-assistant/tsconfig.json
{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts", "vite.config.ts"] }
```

```html
<!-- apps/platforms/pc-ai-assistant/index.html -->
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```typescript
// apps/platforms/pc-ai-assistant/src/main.ts
import { createApp } from "vue";
import AiChatEntry from "./components/AiChatEntry.vue";
createApp(AiChatEntry).mount("#app");
```

- [ ] **Step 1: 写失败测试**

```typescript
// apps/platforms/pc-ai-assistant/src/platform.test.ts
import { describe, expect, test } from "bun:test";
import { assertPlatformModule, createFakeBus } from "@g2-composition/contract";
import { platformModule } from "./platform";

describe("pc-ai-assistant platform module", () => {
  test("符合 PlatformModule 契约", async () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(typeof platformModule.install).toBe("function");
  });

  test("install 时发布 chrome:register-top-bar-action 事件，不直接依赖 pc-chrome", async () => {
    const bus = createFakeBus();
    await platformModule.install?.({} as never, {} as never, { bus, getAuthHeaders: () => ({}) });
    const published = bus.published.find((p) => p.event === "chrome:register-top-bar-action");
    expect(published?.payload).toMatchObject({ id: "ai-assistant" });
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/platforms/pc-ai-assistant/src/platform.test.ts
```

- [ ] **Step 3: 写 `AiChatEntry.vue`（极简入口图标 + 抽屉占位，完整聊天能力对齐旧仓 `ai-chat-drawer-entry.vue` 的抽屉交互，具体 AI 后端协议本轮不深挖，见配套 handoff-backend-integration-wiring）**

```vue
<!-- apps/platforms/pc-ai-assistant/src/components/AiChatEntry.vue -->
<template>
  <div class="pc-ai-assistant-entry">
    <button @click="visible = !visible">AI 助手</button>
    <div v-if="visible" class="pc-ai-assistant-drawer">聊天能力接入中（占位，具体协议见后端接线专项）</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const visible = ref(false);
</script>
```

- [ ] **Step 4: 写 `platform.ts` —— 通过 `ctx.bus` 发布贡献意图，不直接 import pc-chrome**

```typescript
// apps/platforms/pc-ai-assistant/src/platform.ts
import type { PlatformModule } from "@g2-composition/contract";
import AiChatEntry from "./components/AiChatEntry.vue";

export const platformModule: PlatformModule = {
  label: "pc-ai-assistant",
  install: async (_app, _router, ctx) => {
    ctx.bus.publish("chrome:register-top-bar-action", { id: "ai-assistant", component: AiChatEntry });
  },
};

export default platformModule;
```

`pc-ai-assistant` 完全不依赖 `@g2-platform/pc-chrome`（`package.json` 不需要声明这条依赖），两者是独立发版单元，只通过 `ctx.bus` 上约定好的事件名字符串协作——谁先谁后都不会在构建期报错，只有 Profile 里的**装配顺序**决定运行时贡献能不能被接住：`pc-chrome` 的 `install`（Task 4.3）必须先于 `pc-ai-assistant` 的 `install` 运行（`ctx.bus` 是无缓冲的即时事件，`pc-chrome` 没订阅之前发布的事件会丢失），这也是阶段 7 Task 7.3 里强调 Profile `platform:` 列表顺序（`pcChrome` 排 `pcAiAssistant` 前面）的原因。

- [ ] **Step 5: 运行确认通过 + Commit**

```bash
bun test apps/platforms/pc-ai-assistant/src/platform.test.ts
git add apps/platforms/pc-ai-assistant
git commit -m "feat(platform-pc-ai-assistant): publish chrome topbar contribution via shared bus, no static cross-platform import"
```

---

## 阶段 7：Shell 集成

### Task 7.1: qiankun 临时兼容桥（ADR-0031）

**Files:**

- Create: `apps/shells/pc/src/qiankun-bridge.ts`
- Create: `apps/shells/pc/src/qiankun-bridge.test.ts`
- Modify: `apps/shells/pc/package.json`（新增 `qiankun` 依赖，走 catalog）

- [ ] **Step 1: 补 catalog 里的 `qiankun` 版本**

```bash
grep '"qiankun"' /Users/dg/work-ghy/ghcloud/legacy/bimops-fe-web-migrate/package.json
```

把查到的版本号加进根 `package.json` 的 `catalog` 字段（键名 `qiankun`），再给 `apps/shells/pc/package.json` 的 `dependencies` 加一行 `"qiankun": "catalog:"`。

- [ ] **Step 1b: 把 `qiankun` 补进依赖治理白名单（ADR-0041），否则 Task 2.2 的 `check:deps` 会因为这个新依赖报违规**

```json
// tooling/dependency-governance/whitelist.json（baseline 数组追加一项）
"baseline": ["vue", "vue-router", "pinia", "vite", "typescript", "zod", "yaml", "qiankun"]
```

> 直接加进 `baseline` 而不是走 `encapsulatedBy` 封装路径，理由是：ADR-0031 本身就是"选定 qiankun 作为临时兼容层技术基线"的决定（ADR-0041 的豁免条件是"该库已被本仓某条 ADR 选定为技术基线"），且它只应该被 `@g2-shell/pc` 一处消费——`checkPackageDependencies` 当前实现（Task 2.2）不区分"哪个包能用 baseline 依赖"，所有包都能自由使用 baseline 列表里的库；这是本计划自查发现的一个已知限制（baseline 目前是"全仓通用"粒度，不是"限定消费方"粒度），如果未来有其他包也想引入本不该碰的基线依赖，这个治理脚本目前拦不住，留作 Task 2.2 的已知局限，不在本次范围内加强（加强需要给 baseline 也支持按包限定，属于治理工具自身的迭代，不阻塞本轮迁移）。

- [ ] **Step 2: 写失败测试**

```typescript
// apps/shells/pc/src/qiankun-bridge.test.ts
import { describe, expect, test } from "bun:test";
import { buildMicroAppDescriptors } from "./qiankun-bridge";

describe("buildMicroAppDescriptors", () => {
  test("把旧 window.config.microApps 清单映射成 qiankun registerMicroApps 需要的形状，props 含五个必需字段", () => {
    const microApps = [{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }];
    const descriptors = buildMicroAppDescriptors(microApps, {
      permissionConfig: { menuConfig: [], functionCodes: [] },
      getAuth: () => ({ token: "t", tenant: "tn" }),
      getRoutes: () => [],
    });
    expect(descriptors[0]).toMatchObject({
      name: "legacy-personal",
      entry: "https://old.example.com/legacy-personal/",
      container: "#appContainer",
      activeRule: "/portal/legacy-personal/",
    });
    expect(descriptors[0].props).toMatchObject({ base: "/portal/legacy-personal/" });
    expect(Object.keys(descriptors[0].props)).toEqual(["router", "base", "permissionConfig", "routes", "auth"]);
  });
});
```

- [ ] **Step 3: 运行确认失败**

```bash
bun test apps/shells/pc/src/qiankun-bridge.test.ts
```

- [ ] **Step 4: 写实现**

```typescript
// apps/shells/pc/src/qiankun-bridge.ts
import type { Router } from "vue-router";

export interface LegacyMicroAppConfig {
  name: string;
  entry: string;
}

export interface MicroAppDescriptor {
  name: string;
  entry: string;
  container: string;
  activeRule: string;
  props: {
    router: Router | undefined;
    base: string;
    permissionConfig: { menuConfig: unknown[]; functionCodes: string[] };
    routes: unknown[];
    auth: { token: string; tenant: string };
  };
}

export interface QiankunBridgeDeps {
  permissionConfig: { menuConfig: unknown[]; functionCodes: string[] };
  getAuth: () => { token: string; tenant: string };
  getRoutes: () => unknown[];
  router?: Router;
}

export function buildMicroAppDescriptors(microApps: LegacyMicroAppConfig[], deps: QiankunBridgeDeps): MicroAppDescriptor[] {
  return microApps.map((item) => {
    const base = `/portal/${item.name}/`;
    return {
      name: item.name,
      entry: item.entry,
      container: "#appContainer",
      activeRule: base,
      props: {
        router: deps.router,
        base,
        permissionConfig: deps.permissionConfig,
        routes: deps.getRoutes(),
        auth: deps.getAuth(),
      },
    };
  });
}
```

- [ ] **Step 5: 运行确认通过**

```bash
bun test apps/shells/pc/src/qiankun-bridge.test.ts
```

- [ ] **Step 6: 在 `main.ts` 里接入 `registerMicroApps`（真实调用 qiankun API，来源清单先用一个本地占位常量，真实清单接入依赖后端/config 服务，属于后续任务）**

```typescript
// apps/shells/pc/src/main.ts（bootstrap 函数内追加，紧跟在 router 创建之后）
import { registerMicroApps, addGlobalUncaughtErrorHandler } from "qiankun";
import { buildMicroAppDescriptors, type LegacyMicroAppConfig } from "./qiankun-bridge";

// TODO(实施阶段): 真实清单来源是旧 window.config.microApps 或后端配置服务，本任务先留空数组，
// 接入真实清单是 Task 7.1 的后续小任务，不阻塞 qiankun 桥本身的机制验证。
const legacyMicroApps: LegacyMicroAppConfig[] = [];
if (legacyMicroApps.length > 0) {
  registerMicroApps(
    buildMicroAppDescriptors(legacyMicroApps, {
      permissionConfig: { menuConfig: [], functionCodes: [] },
      getAuth: () => ({ token: "", tenant: "" }),
      getRoutes: () => [],
      router,
    }),
  );
  addGlobalUncaughtErrorHandler(() => {
    console.error("qiankun micro app failed to load");
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/shells/pc/src/qiankun-bridge.ts apps/shells/pc/src/qiankun-bridge.test.ts apps/shells/pc/src/main.ts apps/shells/pc/package.json package.json
git commit -m "feat(shell-pc): add temporary qiankun compat bridge with legacy props contract"
```

### Task 7.2: 路由/布局装配 —— 把 pc-auth/pc-chrome 的 slots 接进 Shell 自己的路由表

**Files:**

- Modify: `apps/shells/pc/src/compose-from-profile.ts`
- Modify: `apps/shells/pc/src/App.ts`
- Create: `apps/shells/pc/src/routes.ts`
- Create: `apps/shells/pc/src/auth-guard.ts`
- Create: `apps/shells/pc/src/auth-guard.test.ts`
- Modify: `apps/shells/pc/src/main.ts`

- [ ] **Step 1: 鉴权守卫逻辑 —— 写失败测试**

```typescript
// apps/shells/pc/src/auth-guard.test.ts
import { describe, expect, test } from "bun:test";
import { createAuthGuard } from "./auth-guard";

describe("createAuthGuard", () => {
  test("白名单路由（login/verifyAuth）无条件放行", async () => {
    const guard = createAuthGuard({ getToken: () => undefined, whiteList: ["login", "verifyAuth"] });
    const next = (arg?: unknown) => arg;
    const result = await guard({ name: "login" } as never, {} as never, next as never);
    expect(result).toBeUndefined();
  });

  test("非白名单路由且无 token 时重定向到 login", async () => {
    const guard = createAuthGuard({ getToken: () => undefined, whiteList: ["login"] });
    let redirected: unknown;
    const next = (arg?: unknown) => {
      redirected = arg;
    };
    await guard({ name: "index" } as never, {} as never, next as never);
    expect(redirected).toMatchObject({ path: "/login", replace: true });
  });

  test("有 token 时放行", async () => {
    const guard = createAuthGuard({ getToken: () => "t", whiteList: ["login"] });
    let called = false;
    const next = () => {
      called = true;
    };
    await guard({ name: "index" } as never, {} as never, next as never);
    expect(called).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/auth-guard.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/auth-guard.ts
import type { NavigationGuardWithThis, RouteLocationNormalized } from "vue-router";

export interface AuthGuardDeps {
  getToken: () => string | undefined;
  whiteList: string[];
}

export function createAuthGuard(deps: AuthGuardDeps): NavigationGuardWithThis<undefined> {
  return async (to: RouteLocationNormalized, _from, next) => {
    if (deps.whiteList.includes(String(to.name))) {
      next();
      return;
    }
    if (!deps.getToken()) {
      next({ path: "/login", replace: true });
      return;
    }
    next();
  };
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/shells/pc/src/auth-guard.test.ts
```

- [ ] **Step 5: 写 `routes.ts`（Shell 自持路由表，`/login`/`/verify-auth` 内容来自 pc-auth slots，装载时机与其它 Platform 装载一致，都经 `composeFromProfile` 的 platform 列表统一处理——不需要为 pc-auth 单开特殊分支）**

```typescript
// apps/shells/pc/src/routes.ts
import type { RouteRecordRaw } from "vue-router";

export function buildBaseRoutes(loadAuthSlot: (slot: string) => Promise<unknown>): RouteRecordRaw[] {
  return [
    {
      path: "/login",
      name: "login",
      component: () => loadAuthSlot("auth.login"),
    },
    {
      path: "/verify-auth",
      name: "verifyAuth",
      component: () => loadAuthSlot("auth.verifyAuth"),
    },
    {
      path: "/",
      name: "home",
      redirect: "/index",
      component: () => import("./HomeView"),
      children: [
        { path: "/index", name: "index", component: () => import("./HomeView") },
        { path: "/about", name: "about", component: () => import("./HomeView") },
        { path: "/workbench", name: "workbench", component: () => import("./HomeView") },
        { path: "/portal:pathMatch(.*)", name: "portal", component: () => import("./HomeView") },
      ],
    },
  ];
}
```

> `/about`/`/workbench`/`/portal*` 目前先复用 `HomeView` 占位——这三个路由原本承载的内容（子应用容器、通用模块跳转）依赖尚未迁移的业务微应用，暂时保持占位不阻塞路由骨架搭建，实施时按 Task 7.1 的 qiankun 桥接入真实子应用容器（`child-app-container` 组件port）。

- [ ] **Step 6: 在 `compose-from-profile.ts` 里加一个 `loadPlatformSlot` 能力（platform 版的 `loadRemoteDomain`，用于 Shell 路由表动态引入 slot 内容）**

在现有 `composeFromProfile` 函数体里，`loadPlatformLabel` 定义之后新增一个平行的函数：

```typescript
// apps/shells/pc/src/compose-from-profile.ts（在 composeFromProfile 函数体内，loadPlatformLabel 定义之后追加）
const loadedPlatformModules = new Map<string, Promise<unknown>>();
async function loadPlatformModule(platformName: string): Promise<PlatformModule> {
  if (!loadedPlatformModules.has(platformName)) {
    loadedPlatformModules.set(platformName, loadRemote(platformName, "platform"));
  }
  const loaded = (await loadedPlatformModules.get(platformName)) as { platformModule?: PlatformModule; default?: PlatformModule };
  const asserted = assertPlatformModule(loaded.platformModule ?? loaded.default ?? loaded);
  if (!asserted.ok) {
    throw new Error(asserted.errors.join("; "));
  }
  return asserted.module;
}

async function loadPlatformSlot(platformName: string, slotKey: string): Promise<unknown> {
  const mod = await loadPlatformModule(platformName);
  const slot = mod.slots?.[slotKey];
  if (!slot) {
    throw new Error(`platform "${platformName}" does not expose slot "${slotKey}"`);
  }
  return slot;
}

/** 通用版："加载某个 Platform 暴露的任意 MF 路径"——不限定必须是 "./platform"，供 ctx.loadPlatform（Platform 互相消费彼此库能力，如 http client）使用。 */
async function loadPlatformExposed(platformName: string, exposedPath: string): Promise<unknown> {
  return loadRemote(platformName, exposedPath);
}
```

同时在文件顶部补 import：`import { assertPlatformModule, type PlatformModule } from "@g2-composition/contract";`，并在 `ComposeResult` 接口里新增字段导出这两个能力：

```typescript
export interface ComposeResult {
  plan: CompositionPlan;
  loadPlatformLabel: () => Promise<string | null>;
  loadPlatformSlot: (platformName: string, slotKey: string) => Promise<unknown>;
  loadPlatformExposed: (platformName: string, exposedPath: string) => Promise<unknown>;
  attachToRouter: (router: Router) => void;
  runPlatformInstalls: (app: App, router: Router, ctx: PlatformContext) => Promise<void>;
}
```

（`runPlatformInstalls` 见 Task 7.3，本步骤先只加类型声明占位，函数体在下一个任务补齐）。`composeFromProfile` 函数末尾的 `return { plan, loadPlatformLabel, attachToRouter }` 改成 `return { plan, loadPlatformLabel, loadPlatformSlot, loadPlatformExposed, attachToRouter, runPlatformInstalls }`。

- [ ] **Step 7: 写 `App.ts` 挖三个槛位（框架布局，见 CONTEXT.md Chrome 词条），并给每个槛位组件传上它需要的真实 props**

`chrome.sideMenu`（Task 4.4 的 `SideMenu.vue`）需要 `menuTree`/`activePath`；这两个数据源都已经是 Pinia store/vue-router 的响应式状态（`usePortalNavigationStore`、`useRoute()`），`App.ts` 的 `setup()` 运行时 Pinia 与 router 插件已经装好（`main.ts` 里 `app.use` 在 `app.mount` 之前），可以直接在这里取，不需要从 `main.ts` 一层层往下传 props。`chrome.tabs`（`Tabs.vue`）需要的 `tabsPane` 列表本轮暂时给空数组占位——旧仓 tab 管理逻辑依赖尚未迁移的业务微应用状态，交给 Task 7.1 qiankun 桥接入真实子应用后再补（不阻塞路由/布局骨架本身）。`chrome.topBar`（`TopBar.vue`）需要的 `tenantName`/`userName` 来自鉴权态，走 `authState` 从 `main.ts` 传入。

```typescript
// apps/shells/pc/src/App.ts
import { defineComponent, h, type PropType } from "vue";
import { RouterView, useRoute } from "vue-router";
import { usePortalNavigationStore } from "./stores/portal-navigation";

export default defineComponent({
  name: "ShellPcApp",
  props: {
    topBarSlot: { type: Object as PropType<unknown>, default: null },
    sideMenuSlot: { type: Object as PropType<unknown>, default: null },
    tabsSlot: { type: Object as PropType<unknown>, default: null },
    tenantName: { type: String, default: "" },
    userName: { type: String, default: "" },
  },
  setup(props) {
    const navStore = usePortalNavigationStore();
    const route = useRoute();

    return () =>
      h("div", { class: "shell-pc" }, [
        props.topBarSlot ? h(props.topBarSlot as never, { tenantName: props.tenantName, userName: props.userName }) : null,
        h("div", { class: "shell-pc-body", style: "display:flex" }, [
          props.sideMenuSlot ? h(props.sideMenuSlot as never, { menuTree: navStore.menuTree, activePath: route.path }) : null,
          h("div", { class: "shell-pc-content", style: "flex:1" }, [
            props.tabsSlot ? h(props.tabsSlot as never, { tabs: [], activeId: "" }) : null,
            h(RouterView),
          ]),
        ]),
      ]);
  },
});
```

- [ ] **Step 8: Shell 自持的真实事件总线实现（不是测试 harness）—— 写失败测试**

`@g2-composition/contract` 的 `createFakeBus`（Task 1.2）语义上是"测试用假实现"，生产代码不应该导入测试 harness。Shell 需要一份**真实**的总线实现，形状与 `FakeBus` 一致但归属不同（生产代码，不在契约包的测试导出里）。

```typescript
// apps/shells/pc/src/event-bus.test.ts
import { describe, expect, test } from "bun:test";
import { createEventBus } from "./event-bus";

describe("createEventBus", () => {
  test("publish 时同步调用所有已订阅的 handler", () => {
    const bus = createEventBus();
    const received: unknown[] = [];
    bus.subscribe("x", (payload) => received.push(payload));
    bus.publish("x", { a: 1 });
    expect(received).toEqual([{ a: 1 }]);
  });

  test("subscribe 返回的取消函数能正确解除订阅", () => {
    const bus = createEventBus();
    const received: unknown[] = [];
    const unsubscribe = bus.subscribe("x", (payload) => received.push(payload));
    unsubscribe();
    bus.publish("x", { a: 1 });
    expect(received).toEqual([]);
  });

  test("没有订阅者时 publish 不抛错", () => {
    const bus = createEventBus();
    expect(() => bus.publish("nobody-listening")).not.toThrow();
  });
});
```

- [ ] **Step 9: 运行确认失败**

```bash
bun test apps/shells/pc/src/event-bus.test.ts
```

- [ ] **Step 10: 写实现**

```typescript
// apps/shells/pc/src/event-bus.ts
import type { EventBus } from "@g2-composition/contract";

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  return {
    publish(event, payload) {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
  };
}
```

- [ ] **Step 11: 运行确认通过**

```bash
bun test apps/shells/pc/src/event-bus.test.ts
```

- [ ] **Step 12: 在 `main.ts` 里装配路由 + 守卫 + chrome slots + 真实总线**

```typescript
// apps/shells/pc/src/main.ts（把现有 bootstrap 函数体替换为下面这版，保留 crash reporting/qiankun 部分已在前面任务加的代码）
import { createPinia } from "pinia";
import { createApp, h, reactive } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { ResolvedProfile } from "@g2-composition/registry";
import type { PlatformContext } from "@g2-composition/contract";
import { createLogger } from "@g2-shared/logger";

import resolvedProfileJson from "../../../../compositions/.resolved/demo.pc.resolved.json?raw";
import App from "./App";
import { createAuthGuard } from "./auth-guard";
import { composeFromProfile } from "./compose-from-profile";
import { installCrashReporting } from "./crash-reporting";
import { createEventBus } from "./event-bus";
import { buildBaseRoutes } from "./routes";

async function bootstrap() {
  installCrashReporting(window, createLogger("shell-pc"));

  const profile = JSON.parse(resolvedProfileJson) as ResolvedProfile;
  const composition = await composeFromProfile(profile);

  const authState = reactive({ token: undefined as string | undefined, tenant: "" });
  const router = createRouter({
    history: createWebHistory(),
    routes: buildBaseRoutes((slot) => composition.loadPlatformSlot("pcAuth", slot)),
  });
  router.beforeEach(createAuthGuard({ getToken: () => authState.token, whiteList: ["login", "verifyAuth"] }));
  composition.attachToRouter(router);

  const ctx: PlatformContext = {
    bus: createEventBus(),
    getAuthHeaders: () => (authState.token ? { Authorization: `Bearer ${authState.token}`, tenant: authState.tenant } : {}),
    loadPlatform: composition.loadPlatformExposed,
  };

  const chromeSlots = reactive<{ topBar: unknown; sideMenu: unknown; tabs: unknown }>({
    topBar: null,
    sideMenu: null,
    tabs: null,
  });

  const app = createApp({
    setup() {
      return () =>
        h(App, {
          topBarSlot: chromeSlots.topBar,
          sideMenuSlot: chromeSlots.sideMenu,
          tabsSlot: chromeSlots.tabs,
          tenantName: authState.tenant,
          userName: "", // 用户姓名来自登录响应体，Task 7.7 接入 functionCode 时一并从登录结果里取，本任务先占空字符串不阻塞布局骨架
        });
    },
  });
  app.use(createPinia());
  app.use(router);

  await composition.runPlatformInstalls(app, router, ctx);

  const [topBar, sideMenu, tabs] = await Promise.all([
    composition.loadPlatformSlot("pcChrome", "chrome.topBar"),
    composition.loadPlatformSlot("pcChrome", "chrome.sideMenu"),
    composition.loadPlatformSlot("pcChrome", "chrome.tabs"),
  ]);
  chromeSlots.topBar = topBar;
  chromeSlots.sideMenu = sideMenu;
  chromeSlots.tabs = tabs;

  app.mount("#app");
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre>${String(error)}</pre>`;
});
```

- [ ] **Step 13: Commit**

```bash
git add apps/shells/pc/src
git commit -m "feat(shell-pc): wire auth guard, base routes, real event bus, and chrome/auth slot loading into bootstrap"
```

### Task 7.3: `runPlatformInstalls` 实现（阶段 4 装配顺序：pc-chrome 先于 pc-ai-assistant）

**Files:**

- Modify: `apps/shells/pc/src/compose-from-profile.ts`
- Modify: `apps/shells/pc/src/compose-from-profile.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/compose-from-profile.test.ts（追加一个 describe block）
describe("runPlatformInstalls", () => {
  test("按 Profile 里 platform 数组的声明顺序依次调用每个 platform 的 install", async () => {
    const order: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      platform: [
        { name: "first", entry: "http://x/first/mf-manifest.json" },
        { name: "second", entry: "http://x/second/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => ({
            platformModule: { install: async () => order.push(id.split("/")[0]) },
          }),
        }) as never,
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext());
    expect(order).toEqual(["first", "second"]);
  });
});
```

（顶部 import 需要追加 `createFakeApp, createFakePlatformContext, createFakeRouter` 来自 `@g2-composition/contract`，以及 `ResolvedProfile` 来自 `@g2-composition/registry`。）

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/compose-from-profile.ts（在 Task 7.2 Step 6 加的 loadPlatformSlot 之后追加）
async function runPlatformInstalls(app: App, router: Router, ctx: PlatformContext): Promise<void> {
  for (const platform of plan.platforms) {
    const mod = await loadPlatformModule(platform.name);
    if (mod.install) {
      await mod.install(app, router, ctx, platform.config);
    }
  }
}
```

（`plan.platforms` 的顺序天然等于 Profile YAML 里 `platform:` 数组的书写顺序——阶段 6 里 `pc-ai-assistant` 依赖 `pc-chrome` 已经 install 完成，实施时 `compositions/demo.pc.yaml` 的 `platform:` 列表必须把 `pcChrome` 排在 `pcAiAssistant` 前面，这是部署配置层面的约束，不是代码约束，需要在 Task 7.4 更新 Profile 时一并注意。）

- [ ] **Step 4: 运行确认通过 + Commit**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
git add apps/shells/pc/src/compose-from-profile.ts apps/shells/pc/src/compose-from-profile.test.ts
git commit -m "feat(shell-pc): implement runPlatformInstalls respecting profile declaration order"
```

### Task 7.4: 更新 `demo.pc.yaml` / 注册表纳入全部新 Platform

**Files:**

- Modify: `compositions/demo.pc.yaml`
- Modify: `compositions/registry/demo.registry.yaml`

- [ ] **Step 1: 更新源 Profile**

```yaml
# compositions/demo.pc.yaml
facade: pc
env: demo
platform:
  - name: pcStub
    logicalName: pcStub
  - name: httpPlatform
    logicalName: httpPlatform
  - name: pcChrome
    logicalName: pcChrome
  - name: pcAuth
    logicalName: pcAuth
    config:
      strategies: ["standard", "cas-sso"]
  - name: pcMessaging
    logicalName: pcMessaging
  - name: pcRtc
    logicalName: pcRtc
  - name: pcAiAssistant
    logicalName: pcAiAssistant
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes:
  - name: pocRemotePc
    logicalName: pocRemotePc
    basePath: /poc-remote
```

（`pcChrome` 排在 `pcAiAssistant` 前面，满足 Task 7.3 的装配顺序约束；`pcStub`/`httpPlatform` 排最前，因为其它 Platform 的 `install`/`slots` 内容可能依赖 http 客户端。）

- [ ] **Step 2: 确认注册表已包含全部逻辑名（Task 1.6 Step 6 已建好，本步骤核对一遍）**

```bash
cat compositions/registry/demo.registry.yaml
```

Expected: `pcStub`/`pocRemotePc`/`pcAuth`/`pcChrome`/`pcMessaging`/`pcRtc`/`pcAiAssistant`/`httpPlatform`/`backendApi` 九个键全部存在。

- [ ] **Step 3: 重新生成已解析 Profile 并校验**

```bash
bun run --filter @g2-composition/schema resolve -- --profile compositions/demo.pc.yaml --registry compositions/registry/demo.registry.yaml --out compositions/.resolved/demo.pc.resolved.json
cat compositions/.resolved/demo.pc.resolved.json
```

Expected: JSON 里 `platform` 数组含全部 7 个 platform 条目，`pcAuth` 条目带 `config: { strategies: [...] }`。

- [ ] **Step 4: Commit**

```bash
git add compositions/demo.pc.yaml
git commit -m "chore(compositions): register all bimops host platforms in demo profile"
```

### Task 7.5: 运行时 slot 冲突检测（entry 类型，ADR-0034 的运行时补充部分）

**Files:**

- Modify: `apps/shells/pc/src/compose-from-profile.ts`
- Modify: `apps/shells/pc/src/compose-from-profile.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/compose-from-profile.test.ts（追加）
test("runPlatformInstalls 前检测到两个 platform 声明同一个 slot 名时抛错", async () => {
  const profile: ResolvedProfile = {
    facade: "pc",
    env: "demo",
    platform: [
      { name: "a", entry: "http://x/a/mf-manifest.json" },
      { name: "b", entry: "http://x/b/mf-manifest.json" },
    ],
    inline: [],
    remotes: [],
  };
  const result = await composeFromProfile(profile, {
    createMf: () =>
      ({
        registerRemotes() {},
        loadRemote: async (id: string) => ({
          platformModule: { slots: { "chrome.topBar": {} } },
        }),
      }) as never,
  });
  await expect(result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext())).rejects.toThrow(
    /chrome\.topBar/,
  );
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
```

- [ ] **Step 3: 改 `runPlatformInstalls` 实现，先全部加载完模块拿到 slots 清单再校验**

```typescript
// apps/shells/pc/src/compose-from-profile.ts
import { detectStaticSlotConflicts, formatSlotConflictError } from "@g2-composition/loader";

async function runPlatformInstalls(app: App, router: Router, ctx: PlatformContext): Promise<void> {
  const modules = await Promise.all(plan.platforms.map(async (platform) => ({ platform, mod: await loadPlatformModule(platform.name) })));

  const conflicts = detectStaticSlotConflicts(
    modules.map(({ platform, mod }) => ({ name: platform.name, slots: Object.keys(mod.slots ?? {}) })),
  );
  if (conflicts.length > 0) {
    throw new Error(conflicts.map(formatSlotConflictError).join("; "));
  }

  for (const { platform, mod } of modules) {
    if (mod.install) {
      await mod.install(app, router, ctx, platform.config);
    }
  }
}
```

- [ ] **Step 4: 运行确认通过 + Commit**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
git add apps/shells/pc/src/compose-from-profile.ts apps/shells/pc/src/compose-from-profile.test.ts
git commit -m "feat(shell-pc): detect slot conflicts across loaded platforms before running installs"
```

### Task 7.6: inline override 轮询机制（ADR-0042）

**Files:**

- Create: `apps/shells/pc/src/inline-override.ts`
- Create: `apps/shells/pc/src/inline-override.test.ts`
- Modify: `apps/shells/pc/src/compose-from-profile.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/inline-override.test.ts
import { describe, expect, test } from "bun:test";
import { checkForNewerVersion } from "./inline-override";

describe("checkForNewerVersion", () => {
  test("轮询到的 buildVersion 与已渲染版本不同时返回 true", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => ({ metaData: { buildInfo: { buildVersion: "v2" } } }),
    });
    expect(hasNewer).toBe(true);
  });

  test("版本相同时返回 false", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => ({ metaData: { buildInfo: { buildVersion: "v1" } } }),
    });
    expect(hasNewer).toBe(false);
  });

  test("轮询失败时静默返回 false，不抛错（维持已渲染的内置版本）", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => {
        throw new Error("network error");
      },
    });
    expect(hasNewer).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/inline-override.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/inline-override.ts
export interface ManifestBuildInfo {
  metaData: { buildInfo: { buildVersion: string } };
}

export interface CheckForNewerVersionDeps {
  renderedVersion: string;
  fetchManifest: () => Promise<ManifestBuildInfo>;
}

export async function checkForNewerVersion(deps: CheckForNewerVersionDeps): Promise<boolean> {
  try {
    const manifest = await deps.fetchManifest();
    return manifest.metaData.buildInfo.buildVersion !== deps.renderedVersion;
  } catch {
    return false;
  }
}

export function startOverridePolling(deps: CheckForNewerVersionDeps & { onNewerVersion: () => void; intervalMs?: number }): () => void {
  const interval = setInterval(async () => {
    if (await checkForNewerVersion(deps)) {
      deps.onNewerVersion();
    }
  }, deps.intervalMs ?? 60_000);
  return () => clearInterval(interval);
}
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/shells/pc/src/inline-override.test.ts
```

- [ ] **Step 5: 在 `compose-from-profile.ts` 的 `attachToRouter` 逻辑里，对 `allowOverride: true` 的 inline 条目启动轮询（只在开启时才启动，不影响默认关闭的行为）**

```typescript
// apps/shells/pc/src/compose-from-profile.ts（attachToRouter 函数体内，处理 inline 条目的循环末尾追加）
import { startOverridePolling } from "./inline-override";

for (const inline of plan.inline) {
  // ...已有的路由挖洞逻辑保持不变...
  if (inline.allowOverride) {
    const matchingRemote = plan.remotes.find((remote) => remote.basePath === inline.basePath);
    if (matchingRemote) {
      startOverridePolling({
        renderedVersion: "inline", // 内置版本没有 buildVersion 概念，用固定字符串占位，只要 override remote 的版本号一出现就会判定为"有新版本"
        fetchManifest: async () => {
          const res = await fetch(matchingRemote.entry);
          return (await res.json()) as { metaData: { buildInfo: { buildVersion: string } } };
        },
        onNewerVersion: () => {
          console.info(`[inline-override] newer version detected for "${inline.name}", refresh to apply`);
          // 实施阶段：这里应该触发一个用户可见的"有新版本，点击刷新"提示 UI，而不是只打 console；
          // UI 部分依赖 pc-chrome 或 Shell 自己的通知机制，具体接哪个留给实施阶段决定，机制本身（检测+回调）已经完整。
        },
      });
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/shells/pc/src/inline-override.ts apps/shells/pc/src/inline-override.test.ts apps/shells/pc/src/compose-from-profile.ts
git commit -m "feat(shell-pc): add inline domain override polling per ADR-0042"
```

### Task 7.7: functionCode 拉取 + UX 级隐藏/禁用工具（ADR-0036）

**Files:**

- Create: `apps/shells/pc/src/stores/function-codes.ts`
- Create: `apps/shells/pc/src/stores/function-codes.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// apps/shells/pc/src/stores/function-codes.test.ts
import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";
import { useFunctionCodesStore } from "./function-codes";

describe("useFunctionCodesStore", () => {
  test("has() 在 codes 未加载时返回 false（保守：宁可多隐藏，不误放行）", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    expect(store.has("demo:view")).toBe(false);
  });

  test("setCodes 后 has() 能正确判断", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    store.setCodes(["demo:view", "demo:edit"]);
    expect(store.has("demo:view")).toBe(true);
    expect(store.has("demo:delete")).toBe(false);
  });

  test("isDomainVisible 复用同一套 code 集合，判断 domain:{name}:visible 约定", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    store.setCodes(["domain:fire-management:visible"]);
    expect(store.isDomainVisible("fire-management")).toBe(true);
    expect(store.isDomainVisible("other-domain")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test apps/shells/pc/src/stores/function-codes.test.ts
```

- [ ] **Step 3: 写实现**

```typescript
// apps/shells/pc/src/stores/function-codes.ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const useFunctionCodesStore = defineStore("functionCodes", () => {
  const codes = ref<Set<string>>(new Set());
  const loaded = ref(false);

  function setCodes(list: string[]): void {
    codes.value = new Set(list);
    loaded.value = true;
  }

  function has(code: string): boolean {
    return loaded.value && codes.value.has(code);
  }

  function isDomainVisible(domainName: string): boolean {
    return has(`domain:${domainName}:visible`);
  }

  return { setCodes, has, isDomainVisible, loaded };
});
```

- [ ] **Step 4: 运行确认通过**

```bash
bun test apps/shells/pc/src/stores/function-codes.test.ts
```

- [ ] **Step 5: 登录成功后拉取 functionCode（接进 pc-auth 的 `onLoginSuccess` 回调链路，登录接口的具体返回字段实现前需现场核对后端真实响应形状，不要假设字段名）**

```typescript
// apps/shells/pc/src/main.ts（LoginPage 的 onLoginSuccess 回调实现里追加，具体接口路径实施时核对）
// onLoginSuccess: async (result) => {
//   authState.token = result.token;
//   authState.tenant = result.tenant;
//   const http = createHttpClientForPlatform(ctx);
//   const codes = (await http.get("/ouaa/context/user/function-codes")) as string[];
//   useFunctionCodesStore().setCodes(codes);
//   router.push("/index");
// }
```

> 上面这段用注释块标注是因为它依赖 Task 7.2 里 `LoginPage` 的 `onLoginSuccess` prop 实际接线位置，实施时需要把这段逻辑真正写进 `main.ts` 里挂载 `auth.login` slot 组件时传入的 `onLoginSuccess` 实现（当前 Task 7.2 的 `routes.ts` 只挂了组件，没传 `onLoginSuccess` prop——这是本计划自查发现的一个衔接缺口，实施时在 Task 7.2 的路由 `component` 定义外面包一层，用 `h(slotComponent, { ctx, onLoginSuccess })` 显式传 props，而不是直接把 slot 组件当路由 `component` 用，因为 Vue Router 的 `component` 选项不支持直接传自定义 props）。

- [ ] **Step 6: Commit**

```bash
git add apps/shells/pc/src/stores/function-codes.ts apps/shells/pc/src/stores/function-codes.test.ts
git commit -m "feat(shell-pc): add functionCode store for UX-level visibility and domain-level gating"
```

---

## 阶段 8：调试工具链（ADR-0037）

### Task 8.1: 本地覆盖层 `*.local.yaml`

**Files:**

- Modify: `.gitignore`
- Create: `packages/composition-schema/src/merge-local-override.ts`
- Create: `packages/composition-schema/src/merge-local-override.test.ts`
- Create: `tooling/dev-filter/cli.ts`
- Create: `tooling/dev-filter/package.json`
- Modify: `package.json`

- [ ] **Step 1: `.gitignore` 追加**

```
compositions/*.local.yaml
```

- [ ] **Step 2: 写合并逻辑失败测试**

```typescript
// packages/composition-schema/src/merge-local-override.test.ts
import { describe, expect, test } from "bun:test";
import { mergeLocalOverride } from "./merge-local-override";
import type { SourceProfileParsed } from "./validate-source-profile";

describe("mergeLocalOverride", () => {
  test("按 name 覆盖 platform 条目的 logicalName", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    } as unknown as SourceProfileParsed;
    const merged = mergeLocalOverride(source, { platform: [{ name: "pcAuth", entry: "http://localhost:9999/mf-manifest.json" }] });
    expect((merged.platform[0] as unknown as { entry?: string }).entry).toBe("http://localhost:9999/mf-manifest.json");
  });

  test("覆盖层里没有对应 name 的条目时，源 Profile 条目原样保留", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    } as unknown as SourceProfileParsed;
    const merged = mergeLocalOverride(source, { platform: [] });
    expect(merged.platform[0]).toMatchObject({ name: "pcAuth", logicalName: "pcAuth" });
  });
});
```

- [ ] **Step 3: 运行确认失败**

```bash
bun test packages/composition-schema/src/merge-local-override.test.ts
```

- [ ] **Step 4: 写实现**

```typescript
// packages/composition-schema/src/merge-local-override.ts
import type { SourceProfileParsed } from "./validate-source-profile";

export interface LocalOverride {
  platform?: { name: string; entry: string }[];
}

export function mergeLocalOverride(source: SourceProfileParsed, override: LocalOverride): SourceProfileParsed {
  const overrideByName = new Map((override.platform ?? []).map((item) => [item.name, item.entry]));
  return {
    ...source,
    platform: source.platform.map((item) => {
      const overrideEntry = overrideByName.get(item.name);
      if (!overrideEntry) {
        return item;
      }
      return { ...item, entry: overrideEntry } as never; // 覆盖后这个条目携带 entry 而非 logicalName，仅用于本地 dev，不参与生产解析路径
    }),
  };
}
```

- [ ] **Step 5: 运行确认通过 + 导出**

```bash
bun test packages/composition-schema/src/merge-local-override.test.ts
```

```typescript
// packages/composition-schema/src/index.ts（追加）
export { mergeLocalOverride, type LocalOverride } from "./merge-local-override";
```

- [ ] **Step 6: 写自动生成 `turbo --filter` 列表的脚本**

```typescript
// tooling/dev-filter/cli.ts
import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";

interface SourceProfileLike {
  platform: { logicalName?: string }[];
  inline: { package: string }[];
  remotes: { logicalName?: string }[];
}

const logicalNameToPackage: Record<string, string> = {
  pcStub: "@g2-platform/pc-stub",
  httpPlatform: "@g2-platform/http",
  pcChrome: "@g2-platform/pc-chrome",
  pcAuth: "@g2-platform/pc-auth",
  pcMessaging: "@g2-platform/pc-messaging",
  pcRtc: "@g2-platform/pc-rtc",
  pcAiAssistant: "@g2-platform/pc-ai-assistant",
  pocRemotePc: "@g2-domain/poc-remote-pc",
};

const profilePath = process.argv[2] ?? "compositions/demo.pc.yaml";
const profile = parseYaml(readFileSync(profilePath, "utf-8")) as SourceProfileLike;

const packages = new Set<string>(["@g2-shell/pc"]);
for (const item of profile.platform) {
  if (item.logicalName && logicalNameToPackage[item.logicalName]) {
    packages.add(logicalNameToPackage[item.logicalName]);
  }
}
for (const item of profile.inline) {
  packages.add(item.package);
}
for (const item of profile.remotes) {
  if (item.logicalName && logicalNameToPackage[item.logicalName]) {
    packages.add(logicalNameToPackage[item.logicalName]);
  }
}

const filters = Array.from(packages)
  .map((name) => `--filter=${name}`)
  .join(" ");
console.log(filters);
```

```json
// tooling/dev-filter/package.json
{
  "name": "@g2-tooling/dev-filter",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "run": "bun ./cli.ts" },
  "devDependencies": { "yaml": "catalog:", "typescript": "catalog:" }
}
```

- [ ] **Step 7: 挂根脚本**

```json
// package.json（根，scripts 追加）
"dev:full": "turbo run dev $(bun run --filter @g2-tooling/dev-filter run --silent compositions/demo.pc.yaml)"
```

- [ ] **Step 8: 手动验证**

```bash
bun run --filter @g2-tooling/dev-filter run compositions/demo.pc.yaml
```

Expected: 输出一串 `--filter=@g2-shell/pc --filter=@g2-platform/pc-stub --filter=@g2-platform/http ...`，新增/删除 Profile 里的条目不需要手改这个脚本。

- [ ] **Step 9: Commit**

```bash
git add .gitignore packages/composition-schema/src tooling/dev-filter package.json
git commit -m "feat(tooling): add local composition override merge and auto dev-filter script"
```

### Task 8.2: 删除死代码分支

**Files:**

- Modify: `apps/shells/pc/src/compose-from-profile.ts`

- [ ] **Step 1: 确认这段代码此时确实无测试覆盖依赖**

```bash
grep -n 'pc-stub' apps/shells/pc/src/compose-from-profile.ts apps/shells/pc/src/compose-from-profile.test.ts
```

- [ ] **Step 2: 删除死分支**

在 `composeFromProfile` 函数体里找到：

```typescript
} else if (platform.package === "@g2-platform/pc-stub") {
  mf.registerRemotes([...]);
}
```

删除这个 `else if` 分支，只保留 `if (platform.kind === "entry")` 分支（因为经过阶段 1 的改造，`ResolvedProfile` 的 platform 条目已经统一只有 `entry` 字段，`package` 形式的 platform 引用不再存在于已解析形态里，这个分支天然失效，删除即可，不需要额外测试验证——已有测试套件全绿即证明删除安全）。

- [ ] **Step 3: 运行全部测试确认无回归**

```bash
bun test apps/shells/pc/src/compose-from-profile.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/shells/pc/src/compose-from-profile.ts
git commit -m "refactor(shell-pc): remove dead pc-stub package-kind branch superseded by resolved profile model"
```

---

## 阶段 9：CI 接线

### Task 9.1: 扩展 `.gitlab-ci.yml` 构建过滤器

**Files:**

- Modify: `.gitlab-ci.yml`

- [ ] **Step 1: 更新 verify job**

```yaml
# .gitlab-ci.yml
stages:
  - verify

variables:
  BUN_VERSION: "1.3.14"

default:
  image: oven/bun:${BUN_VERSION}
  interruptible: true

verify:
  stage: verify
  script:
    - bun install --frozen-lockfile
    - bun run fmt:check
    - bun run lint
    - bun run check:deps
    - bun test
    - bun run validate:compositions
    - bun run --filter @g2-composition/schema resolve -- --profile compositions/demo.pc.yaml --registry compositions/registry/demo.registry.yaml --out compositions/.resolved/demo.pc.resolved.json
    - bunx turbo run build --filter=@g2-platform/pc-stub --filter=@g2-platform/http --filter=@g2-platform/pc-auth --filter=@g2-platform/pc-chrome --filter=@g2-platform/pc-messaging --filter=@g2-platform/pc-rtc --filter=@g2-platform/pc-ai-assistant --filter=@g2-domain/poc-remote-pc --filter=@g2-domain/poc-inline-pc --filter=@g2-shell/pc
```

- [ ] **Step 2: 本地跑一遍等价命令确认全绿**

```bash
bun install --frozen-lockfile
bun run fmt:check
bun run lint
bun run check:deps
bun test
bun run validate:compositions
bun run --filter @g2-composition/schema resolve -- --profile compositions/demo.pc.yaml --registry compositions/registry/demo.registry.yaml --out compositions/.resolved/demo.pc.resolved.json
bunx turbo run build --filter=@g2-platform/pc-stub --filter=@g2-platform/http --filter=@g2-platform/pc-auth --filter=@g2-platform/pc-chrome --filter=@g2-platform/pc-messaging --filter=@g2-platform/pc-rtc --filter=@g2-platform/pc-ai-assistant --filter=@g2-domain/poc-remote-pc --filter=@g2-domain/poc-inline-pc --filter=@g2-shell/pc
```

- [ ] **Step 3: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "ci: wire new platforms into verify pipeline build filters"
```

---

## Out of Scope（明确不做，避免实施时范围蔓延）

- **ADR-0039** `@g2-platform/logger`（logger 从 `@g2-shared/*` 演进为 MF remote）：ADR 原文明确"过了本轮 pc-auth 迁移窗口后"才做，本计划全程只用 `@g2-shared/logger`（Task 2.1）。
- **ADR-0023/0024** fire-management 等真实业务域迁移：属于后续波次。
- **ADR-0037** 里提到的独立诊断工具（fetch 静态清单查看当前部署状态）：ADR 原文标注"留作 TODO，本轮不展开"。
- **发布流水线 per-remote CI 触发**（release-assembly 专项 Q1）：明确"未讨论，留给以后"，本计划的 Task 9.1 只扩展现有单一 verify job 的 build 覆盖范围，不新建按包触发的独立 pipeline。
- **OUAA 服务完整裁剪清单**：backend-integration 专项已明确"只钉原则，未钉方法级清单"，本计划涉及 OUAA 调用的每个任务都标注了"实施前现场核对接口路径"，不假设一份最终方法清单。
- **RTC 通话/报警弹窗具体 UI**（WebRTC SDK 选型、iframe 协议）：Task 5.2 已标注为后续迭代，本计划只做事件路由骨架。
- **AI 聊天真实后端协议**：Task 6.1 的 `AiChatEntry.vue` 是占位，真实协议见 backend-integration 专项里标注的"仍需专项调研"。
- **桌面客户端 Electron IPC 桥**：已在 grill 里确认不迁移。
- **H5 门面**：ADR-0020 冻结范围，本计划完全不涉及。
- **租户级细粒度客制**（ADR-0044）：明确留作未来扩展，本计划的 schema 不引入 `tenant` 字段（Task 1.4 Step 1 的第 4 个测试就是这个负向约束的回归防护）。

---

## ADR 覆盖矩阵

| ADR  | 标题（简）                           | 对应任务                                                                                                                                                                                                                  |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0001 | greenfield 无 ghcloud workspace 依赖 | Task 0.1 Step 1；全部新包依赖均走 catalog/workspace:\*                                                                                                                                                                    |
| 0002 | Bun+Turborepo                        | 已满足（Task 0.1）                                                                                                                                                                                                        |
| 0003 | 旧仓拓扑 as-is                       | 无需代码（边界规则）                                                                                                                                                                                                      |
| 0004 | apps 角色分组                        | Task 0.1 Step 2；新包均落在既有分组下                                                                                                                                                                                     |
| 0005 | `@g2-*` scope                        | 全部新包命名遵循（Task 2.1/2.3/3.1/4.1/5.1/5.2/6.1）                                                                                                                                                                      |
| 0006 | oxlint/oxfmt                         | 已满足，Task 2.2 新增检查未破坏既有配置                                                                                                                                                                                   |
| 0007 | Conventional Commits                 | 全部 Commit Step 遵循                                                                                                                                                                                                     |
| 0008 | husky                                | 已满足（此前会话已修复 bug）                                                                                                                                                                                              |
| 0009 | Vue/Vite/TS                          | 已满足                                                                                                                                                                                                                    |
| 0010 | MF via `@module-federation/vite`     | 全部新 Platform 的 `vite.config.ts`（Task 2.3/3.1/4.1/5.1/5.2/6.1）                                                                                                                                                       |
| 0011 | GitLab CI 最小可用                   | Task 9.1                                                                                                                                                                                                                  |
| 0012 | antdv/vant 经 platform               | Task 3.3/4.3 备注（视觉细节留实施迭代，不阻塞骨架）；**2026-07-19 更新**：antdv 基础设施已落地为 `@g2-platform/pc-ui`（`exposedBy` 治理登记），consumer 接入（pc-auth/pc-chrome 改用其中组件）仍留后续迭代；vant 尚未引入 |
| 0013 | bun test / Vitest 分轨               | Task 3.3 Step 7 首次引入 Vitest 配置                                                                                                                                                                                      |
| 0014 | PC 三件套门禁                        | Task 0.1 Step 3                                                                                                                                                                                                           |
| 0015 | 首个极薄 platform                    | 已满足（pc-stub 现状）                                                                                                                                                                                                    |
| 0016 | PoC 域长期夹具                       | 未改动，保持不变                                                                                                                                                                                                          |
| 0017 | Profile YAML + schema 校验           | Task 1.4/1.7                                                                                                                                                                                                              |
| 0018 | MF shared 单例白名单                 | 全部新 Platform vite 配置遵循（只 shared vue/vue-router/pinia）                                                                                                                                                           |
| 0019 | Shell Pinia store 根                 | Task 4.2/7.7（portal-navigation、function-codes 均挂在 Shell）                                                                                                                                                            |
| 0020 | 骨架仅 PC                            | 遵循，全程不涉及 H5                                                                                                                                                                                                       |
| 0021 | 域契约 routes+install                | 已满足，Task 1.3 在此基础扩展                                                                                                                                                                                             |
| 0022 | 骨架 grill 收口                      | 无需代码                                                                                                                                                                                                                  |
| 0023 | fire-management 首个迁移域           | Out of Scope                                                                                                                                                                                                              |
| 0024 | 迁移波次顺序                         | 无需代码（本计划即"host migration"波次本身）                                                                                                                                                                              |
| 0025 | 双轨并行                             | Task 7.1 qiankun 桥体现                                                                                                                                                                                                   |
| 0026 | 验证优先                             | 无需代码（过程原则）                                                                                                                                                                                                      |
| 0027 | bimops 拆分 shell+platform           | 阶段 3-7 整体                                                                                                                                                                                                             |
| 0028 | 鉴权状态机留 Shell                   | Task 3.2/3.3/7.2                                                                                                                                                                                                          |
| 0029 | RTC/报警标准可拔插                   | Task 5.2                                                                                                                                                                                                                  |
| 0030 | Platform 契约 slots/install/config   | Task 1.1/1.2/1.4                                                                                                                                                                                                          |
| 0031 | qiankun 临时桥                       | Task 7.1                                                                                                                                                                                                                  |
| 0032 | 静态应用注册表（已被 0036 取代）     | 无新任务，Task 4.2 直接按 0036 实现                                                                                                                                                                                       |
| 0033 | AI 助手 platform + chrome 贡献点     | Task 4.3/6.1                                                                                                                                                                                                              |
| 0034 | slot 冲突广播/独占                   | Task 1.5/7.5                                                                                                                                                                                                              |
| 0035 | logger 最小可用版                    | Task 2.1                                                                                                                                                                                                                  |
| 0036 | 域自持菜单/functionCode              | Task 1.3/1.9/4.2/7.7                                                                                                                                                                                                      |
| 0037 | 调试工具不进生产                     | Task 8.1/8.2                                                                                                                                                                                                              |
| 0038 | 自建崩溃采集                         | Task 5.3                                                                                                                                                                                                                  |
| 0039 | logger 演进为 platform remote        | Out of Scope（明确后置）                                                                                                                                                                                                  |
| 0040 | 三方库封装在 platform 包背后         | Task 2.1（date 封装）/2.3（无三方 HTTP 库）                                                                                                                                                                               |
| 0041 | 依赖治理关卡                         | Task 2.2                                                                                                                                                                                                                  |
| 0042 | inline override                      | Task 1.4/1.7/7.6                                                                                                                                                                                                          |
| 0043 | 版本注册表+已解析 Profile            | Task 1.6/1.7/1.8                                                                                                                                                                                                          |
| 0044 | 客制按部署形态分层                   | Task 1.4 Step 1 第 4 测试（负向约束）                                                                                                                                                                                     |
| 0045 | 统一 http 客户端                     | Task 2.3                                                                                                                                                                                                                  |
| 0046 | Token Provider 鉴权头                | Task 2.3 Step 9-12（`getAuthHeaders`）                                                                                                                                                                                    |
| 0047 | 标准化异常+登出走 bus                | Task 2.3 Step 1-4/13                                                                                                                                                                                                      |
| 0048 | baseURL 复用注册表                   | Task 1.6 Step 4（`resolveBaseUrlFromRegistry`）+ Task 1.7                                                                                                                                                                 |

**48/48 ADR 均有对应任务或明确的 Out of Scope 说明，无遗漏。**
