# 登录 → 工作台首屏性能/体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩短「打开登录页 → 用户看见工作台首屏壳」的等待与卡顿感，并收紧记住密码默认行为；不改工作台子应用业务、不做 MF 打包大改。

**Architecture:** 登录页减重（背景 + LoginPage 拆包）→ 启动调度（FRONTEND_CONFIG 不挡登录）→ 登录成功临界区只保留 chrome/权限/导航 → 验证码与跳转过渡反馈 → 记住密码环境开关。`systemTitle` 本地缓存 + nginx 固定值占位，BFF/运维平台留 TODO。

**Tech Stack:** Vue 3 + TSX（pc-auth）、Shell PC（Vite/MF）、localStorage、Vitest、cwebp。

**Grill 锁定范围（2026-07-24）：**

| #   | 项                    | 决策                                                              |
| --- | --------------------- | ----------------------------------------------------------------- |
| 1   | 登录背景              | 压缩 &lt;300KB + 占位/渐进加载                                    |
| 2   | LoginPage             | 账号登录默认；手机/微信/忘记密码按需拆包                          |
| 3   | 跳转门槛              | 跳转前：`pcChrome` + 权限 + 导航；Messaging/RTC/Logo/租户列表后置 |
| 4   | 顶栏显示名            | JWT 占位，资料接口后补                                            |
| 5   | FRONTEND_CONFIG       | 静态兜底先出登录；字典并行；qiankun 注册前就绪                    |
| 5b  | systemTitle           | 普通本地缓存优先；nginx 固定值；TODO→BFF/运维平台                 |
| 6   | 验证码                | loading/防重复/失败提示 only                                      |
| 7   | 工作台预取            | 不做                                                              |
| 8   | MF/localhost:8081     | 不做；容器端口                                                    |
| 9   | 工作台首屏 / `@` 别名 | 不做                                                              |
| 10  | 记住密码              | `VITE_`/环境开关，默认关；开则仍 AES                              |
| 11  | 登录过渡              | 验证码通过后到主壳可见前有进度反馈                                |

**Out of scope:** cube-workbench-app 卡片 API/骨架、应用名 `@`、MF glue 合并、免滑块风控、工作台 entry prefetch。

---

## File map

| 区域       | 文件                                                          | 职责                                                     |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| 背景资源   | `apps/platforms/pc-auth/src/assets/login-background.webp`     | 压缩替换                                                 |
| 登录 UI    | `apps/platforms/pc-auth/src/components/LoginPage.tsx` (+ css) | 渐进背景、拆包、记住密码开关、验证码 loading、过渡态钩子 |
| 登录子页   | `PhoneLogin.tsx` / `WechatLogin.tsx` / `ForgotPassword.tsx`   | 保持独立，改为动态 import 入口                           |
| 记住我     | `remember-me.ts` (+ test)                                     | 环境开关；关则只记账号或不记密码                         |
| 标题缓存   | 新建 `system-title-cache.ts` (+ test)；LoginPage / shell 接线 | localStorage 缓存；固定值来源                            |
| 验证码     | `SliderCaptcha.tsx` / LoginPage 提交态                        | loading 覆盖全阶段                                       |
| Shell 启动 | `apps/shells/pc/src/main.ts`                                  | FRONTEND_CONFIG 并行；onLoginSuccess 临界区；过渡 status |
| Shell 静态 | `apps/shells/pc/index.html`                                   | 扩展静态兜底（systemName/homeEntry）                     |
| 环境变量   | `pc-auth` / `shells/pc` 的 `vite-env.d.ts`、`.env*.example`   | `VITE_PC_AUTH_REMEMBER_PASSWORD` 等                      |

---

### Task 1: 压缩登录背景 + 渐进加载

**Files:**

- Modify: `apps/platforms/pc-auth/src/assets/login-background.webp`
- Modify: `apps/platforms/pc-auth/src/components/LoginPage.tsx`
- Modify: `apps/platforms/pc-auth/src/components/LoginPage.css`（若有；否则现有 css 文件）
- Test: 目视/体积断言（可选脚本或文档记录 before/after bytes）

- [x] **Step 1:** 用 `cwebp -q 85` 把源图压到 **&lt;300KB**，覆盖 `src/assets/login-background.webp`；before 1,189,486 → after 34,138 bytes。
- [x] **Step 2:** LoginPage：先渲染无大图/低成本底色的壳，再 `new Image()` / CSS 加载 webp，onload 后加 class 显示（避免挡住表单首绘）。
- [x] **Step 3:** 跑 `pc-auth` 相关 vitest 冒烟；确认登录页仍显示背景。（LoginPage.vitest 15 passed）

---

### Task 2: LoginPage 按需拆包

**Files:**

- Modify: `LoginPage.tsx`
- Possibly thin wrappers if needed for `defineAsyncComponent`
- Test: `LoginPage.vitest.ts`（账号登录路径不加载手机/微信模块——可用动态 import mock 计数，或至少保证默认 tab 单测仍绿）

- [x] **Step 1:** 将 Phone / Wechat / ForgotPassword 改为 `defineAsyncComponent(() => import(...))`（或等价懒加载）。
- [x] **Step 2:** 默认 `activeMethod === "password"` 路径不触发其它 chunk。
- [x] **Step 3:** 更新/补充 vitest；`bun`/`vitest` 跑 pc-auth LoginPage 测试。

---

### Task 3: systemTitle 缓存 + nginx 固定值占位

**Files:**

- Create: `apps/platforms/pc-auth/src/system-title-cache.ts`
- Create: `apps/platforms/pc-auth/src/system-title-cache.test.ts`
- Modify: LoginPage（读缓存 → 展示；成功拿到固定值后写入）
- Modify: shell 侧若需同步 `document.title`（与 FRONTEND_CONFIG.systemName 协调）
- Comment/TODO: 未来 BFF/运维平台

- [x] **Step 1:** 实现 `loadSystemTitle(storage)` / `saveSystemTitle(storage, title)`，key 如 `g2-pc-auth:system-title`（**不**绑用户/租户）。
- [x] **Step 2:** 解析顺序：缓存 → 本次「固定值」（可先 `import.meta.env.VITE_PC_AUTH_SYSTEM_TITLE` 或 nginx 注入的 `window` 字段，与部署约定写清）→ 组件 default。
- [x] **Step 3:** 代码注释 TODO：线上改由 BFF/运维管理平台下发。
- [x] **Step 4:** 单测覆盖缓存读写与优先级。

---

### Task 4: FRONTEND_CONFIG 不挡登录安装

**Files:**

- Modify: `apps/shells/pc/src/main.ts`
- Modify: `apps/shells/pc/index.html`（补 `systemName` 等最小静态字段，可选）
- Test: 现有 `frontend-config.test.ts`；必要时加「并行调度」行为测或手工验收步骤

- [x] **Step 1:** `loadFrontendConfig` 与 `runPlatformInstalls(unauthenticated)` **重叠启动**（Promise 并行）；登录 Platform 安装不再 `await` 字典完成。
- [x] **Step 2:** 在 `registerLegacyMicroApps` / `resolveWorkbenchEntry` 使用前 `await frontendConfigPromise`（确保 microApps/homeEntry 可被覆盖）。
- [x] **Step 3:** 失败仍保留静态兜底（现有 catch 语义）。
- [ ] **Step 4:** 本地/release 冒烟：冷开 `/login` 表单可交互时间不差于改前；进主壳后微应用清单仍来自字典。

---

### Task 5: 缩短 onLoginSuccess 临界区 + 显示名

**Files:**

- Modify: `apps/shells/pc/src/main.ts`（`ensureAuthenticatedShell` / `onLoginSuccess` / `platform-load-policy` 若需拆必装集）
- Possibly: `platform-load-policy.ts` 增加「跳转前子集」vs deferred 名单
- Test: 若有 bootstrap 相关测则更新；否则加聚焦单测/手工清单

- [x] **Step 1:** 跳转前只 `ensure`：`httpPlatform`（已有）+ `pcChrome` + `pcAuth`；**不要**在临界区 await `pcMessaging`/`pcRtc`。
- [x] **Step 2:** 跳转前 await：`loadFunctionCodes` + `loadPortalNavigationFromOuaa`（导航）。
- [x] **Step 3:** `loadUserDisplayName` / `loadTenantLogo` / `loadTenantMineList` / Messaging/RTC：`router.push` 之后或 `scheduleDeferredPreload` / `void` 并行。
- [x] **Step 4:** 显示名：登录时已有 JWT name；资料接口后补，不挡跳转。
- [ ] **Step 5:** 验收：登录成功后更快见到顶栏+工作台容器；控制台仍能看到后置 platform 加载。

---

### Task 6: 验证码阶段 loading + 登录过渡反馈

**Files:**

- Modify: `LoginPage.tsx`、`SliderCaptcha.tsx`（如需）
- Modify: `apps/shells/pc/src/main.ts` / bootstrap status（`setBootstrapStatus`）
- Test: LoginPage / SliderCaptcha vitest 补充「提交中不可重复点」

- [x] **Step 1:** 点登录且协议通过后，立即进入 submitting/busy（含 captcha 展示期间），防重复 `show()`。
- [x] **Step 2:** captcha success → performLogin 期间保持 busy；结束或失败再释放。
- [x] **Step 3:** `onLoginSuccess` 开始到主壳可交互前：`setBootstrapStatus({ title: '正在进入系统…', kind: 'loading' })`（文案可微调），完成后清除。
- [x] **Step 4:** 单测 + 手工走一遍滑块登录。

---

### Task 7: 记住密码环境开关（默认关）

**Files:**

- Modify: `remember-me.ts`、`remember-me.test.ts`、`LoginPage.tsx`、`LoginPage.vitest.ts`
- Modify: `apps/platforms/pc-auth/src/vite-env.d.ts`（若无则创建）
- Modify: `.env.development.example` / 部署文档一句

- [x] **Step 1:** 增加 `VITE_PC_AUTH_REMEMBER_PASSWORD`（默认 `false`/`undefined` → 关）。
- [x] **Step 2:** 关闭时：`saveRememberedLogin` 不写密码（或只写账号）；加载时忽略已存密码字段；勾选「记住我」语义=记住账号（保持 UI 文案或轻微提示，避免大改 UI）。
- [x] **Step 3:** 开启时：维持现有 AES 密码存储行为。
- [x] **Step 4:** 单测两种开关；默认关用例必须通过。

---

### Task 8: 回归与收尾

- [x] **Step 1:** `pc-auth` + `shells/pc` 相关测试全绿。
- [ ] **Step 2:** release 环境手跑：登录页加载、滑块、进工作台；确认 Messaging/RTC 后置无功能回归（消息/RTC 入口延迟可接受）。
- [x] **Step 3:** 更新本 plan 复选框；如需再补 agent 调研报告附注。
- [x] **Step 4:** 仅在用户明确要求时 commit。

---

## 手工验收清单

1. 冷缓存打开 `/login`：表单先于大背景完整显示；背景最终仍在。
2. Network：默认账号登录不下载 Phone/Wechat/Forgot 大 chunk（或明显延后到点击）。
3. 字典接口慢时，登录页仍可交互。
4. 登录后尽快见顶栏；权限/导航正确；租户列表/Logo 可稍后出现。
5. 验证码弹出期间按钮为 loading，不能连点出双弹层。
6. 默认环境下记住我不落密码；打开 env 后才加密存密码。

## 风险

- 后置 `pcMessaging`/`pcRtc`：登录后极短窗口消息/RTC 不可用——可接受需产品知晓。
- qiankun 注册前未等字典：必须严格 await，否则 microApps 清单为空。
- 背景压缩过度：设计验收看一眼即可回调质量参数。
