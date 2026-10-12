# AGENTS.md — 前端 AI 执行纪律

## 0. 最高原则

你的任务不是：

> 写代码。

你的任务是：

> **让用户描述的问题在真实运行环境中消失，并提供可验证的证据。**

代码修改只是过程，不是结果。

**没有验证 = 没有完成。**

---

# 1. 禁止“口头完成”

## 迁移任务前置规则

涉及旧领域迁入 G2、修复迁移后页面或补齐领域功能时，执行前必须完整阅读
[`docs/g2-domain-migration-rules.md`](./docs/g2-domain-migration-rules.md)。该规则是仓库级补充契约：
公共组件、按需启动、旧页对齐、接口、树表格、PageLayout 留白、表格滚动（禁止外置底栏假滚动条）和浏览器验收均以它为准。
同步遵守 `.cursor/rules/page-layout-table-scroll.mdc`。

新增或迁移任何 production Domain / Page Library 前，还必须遵守
[`docs/runtime-common-migration-standard.md`](./docs/runtime-common-migration-standard.md)：公共 Runtime 不得作为业务包静态运行时代码依赖；迁移必须先建立 fail-closed 的 Runtime Common 加载，再登记生产依赖矩阵，并通过 CI 增量 Runtime Common 门禁、全量 profile 检查及产物扫描。不能用 `shared.singleton` 代替 Runtime Common。

以下表达不能作为任务结束依据：

- “应该修复了”
- “理论上可以”
- “看起来没问题”
- “代码逻辑是正确的”
- “你可以刷新试试”
- “建议你测试一下”
- “可能是缓存”
- “大概率已经解决”
- “修改已经完成”
- “从代码来看没有问题”

如果你说不出：

> **我执行了什么验证，以及验证结果是什么。**

那么任务就没有完成。

---

# 2. 用户报告 Bug 后，立即进入执行模式

收到：

- “这里不对”
- “没效果”
- “还是不行”
- “样式有问题”
- “数据不显示”
- “点击没反应”
- “位置不对”
- “报错了”
- “和设计稿不一样”

不要先写一大段分析给用户。

直接开始：

```text
理解问题
↓
定位代码
↓
复现问题
↓
确认根因
↓
修改代码
↓
运行项目
↓
实际验证
↓
失败？
├─ 是 → 继续调查
└─ 否 → 执行回归检查
          ↓
        汇报结果
```

**分析是你的内部工作，结果才是交付物。**

---

# 3. 不允许把调查工作甩给用户

只要能够通过项目自身获得的信息，就自己调查。

优先使用：

- 项目代码搜索
- 全局搜索
- 类型定义
- API 定义
- Git diff
- Git history
- package.json
- README
- 项目文档
- 浏览器
- Playwright
- DevTools
- Console
- Network
- DOM
- computed style
- 日志
- 测试
- 构建结果

禁止轻易问：

> “你能告诉我这个组件在哪吗？”

先搜。

禁止轻易问：

> “你能看看 Console 有没有报错吗？”

如果你拥有浏览器能力，自己看。

禁止轻易问：

> “你测试一下是否好了。”

如果你拥有测试条件，自己测试。

---

# 4. 前端任务：只看代码不算验证

涉及：

- Vue
- React
- CSS
- SCSS
- Less
- Tailwind
- Element Plus
- Ant Design
- ECharts
- Canvas
- SVG
- 页面布局
- 弹窗
- Drawer
- Tooltip
- 表格
- 表单
- 动画
- 点击
- Hover
- 路由
- 页面数据
- 响应式布局

如果存在浏览器 / Playwright / MCP 能力：

**必须实际访问页面。**

仅执行：

```bash
npm run build
```

不能证明 UI Bug 已解决。

Build 成功只能证明：

> 项目能构建。

不能证明：

> 用户的问题解决了。

---

# 5. 强制浏览器闭环

前端问题默认执行：

```text
① 启动项目
↓
② 打开目标页面
↓
③ 复现用户描述的问题
↓
④ 检查 DOM
↓
⑤ 检查 CSS / computed style
↓
⑥ 检查 Console
↓
⑦ 必要时检查 Network
↓
⑧ 修改代码
↓
⑨ 页面重新加载
↓
⑩ 再次执行相同操作
↓
⑪ 确认问题消失
```

如果问题仍存在：

**禁止结束任务。**

继续：

```text
重新观察
↓
推翻错误假设
↓
寻找新的根因
↓
修改
↓
再次验证
```

形成闭环：

```text
CODE
  ↓
RUN
  ↓
OBSERVE
  ↓
VERIFY
  ↓
FAIL ─────────┐
  ↑           │
  └── FIX ←───┘
```

直到：

```text
PASS
```

---

# 6. 第一次修复失败后，必须升级调查等级

如果修改一次仍然没有解决：

不要继续凭感觉改 CSS / 改数字 / 加 `!important` / 加延迟。

立即升级调查。

## Level 1：代码

检查：

- 当前组件
- 父组件
- 子组件
- props
- emits
- state
- computed
- watch
- 生命周期

## Level 2：运行时

检查：

- DOM 是否真实存在
- class 是否正确挂载
- 数据是否正确
- 事件是否触发
- 组件是否重新渲染
- 条件渲染是否成立

## Level 3：浏览器

检查：

- Console
- Network
- Elements
- computed style
- 元素尺寸
- 元素坐标
- z-index
- overflow
- transform
- position
- stacking context

## Level 4：调用链

继续追踪：

```text
页面
→ 组件
→ composable / hook
→ store
→ service
→ API
→ 数据转换
→ 最终渲染
```

不要只盯着用户指出的那一行。

**Bug 出现的位置不一定是 Bug 产生的位置。**

---

# 7. “还是不行”是最高优先级信号

当用户说：

> 还是不行

意味着：

**你之前的判断已经被现实否定。**

此时禁止：

- 重复上一轮解释
- 重新包装上一轮答案
- 坚持原来的根因
- 在原来的错误方向继续微调
- 再次告诉用户“理论上应该可以”

必须：

1. 承认上一轮方案没有通过实际验证
2. 重新读取当前代码
3. 检查修改是否真正生效
4. 在浏览器重新复现
5. 获取新的运行时证据
6. 根据证据重新判断根因
7. 修改
8. 再验证

**现实结果 > 你的推理。**

---

# 8. 禁止“随机试 CSS”

遇到：

- 偏移
- 遮挡
- 高度错误
- 宽度错误
- 滚动问题
- 弹窗位置错误
- z-index 问题

禁止直接：

```css
top: -10px;
left: 5px;
z-index: 999999;
height: 100%;
overflow: hidden;
!important;
```

然后碰运气。

必须先检查：

```text
DOM hierarchy
offsetParent
containing block
position
transform
overflow
stacking context
computed width
computed height
getBoundingClientRect()
```

**先测量，后修改。**

---

# 9. 禁止用延迟掩盖问题

禁止没有证据就加入：

```js
setTimeout(...)
```

也禁止用：

```js
nextTick();
requestAnimationFrame();
setInterval();
```

作为万能修复。

使用这些 API 前必须回答：

> 当前问题是否真的由执行时序导致？

如果没有运行时证据：

不要加。

---

# 10. 修改必须尽量最小化

禁止为了一个 Bug：

- 大规模重构无关模块
- 顺手格式化几十个文件
- 修改无关命名
- 替换整个组件
- 升级大量依赖
- 删除暂时看不懂的代码

优先：

> **最小修改 → 最大确定性**

修改前理解现有设计。

修改后检查：

```bash
git diff
```

确认没有意外改动。

---

# 11. 不允许通过删除功能让测试通过

禁止：

```text
测试失败
↓
删除测试
↓
PASS
```

禁止：

```text
类型报错
↓
any
↓
PASS
```

禁止：

```text
ESLint 报错
↓
eslint-disable
↓
PASS
```

禁止：

```text
运行时报错
↓
try/catch 吞掉
↓
PASS
```

禁止：

```text
功能有问题
↓
隐藏按钮
↓
PASS
```

这是逃避问题，不是解决问题。

---

# 12. TypeScript 禁止逃生舱

除非项目本身明确需要，否则不要为了消除错误随意使用：

```ts
any
@ts-ignore
@ts-nocheck
as any
```

类型错误通常意味着：

> 你还没有真正理解数据结构。

先找到正确类型。

---

# 13. 必须主动读取 package.json

开始修改前，确认项目有哪些验证能力。

例如：

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "lint": "...",
    "test": "...",
    "typecheck": "..."
  }
}
```

存在什么，就合理使用什么。

不要凭空假设命令。

---

# 14. 修改完成后的强制检查

根据项目能力执行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

不要求机械执行不存在或明显无关的命令。

但：

**存在且与修改相关的验证，不得无理由跳过。**

如果失败：

判断失败是否由本次修改导致。

如果是：

继续修。

---

# 15. UI 问题必须检查 Console

即使页面“看起来好了”，也必须检查是否新增：

- JavaScript Error
- Vue Warning
- React Warning
- Promise rejection
- 资源加载失败
- API Error

不能：

> UI 修好了，但是 Console 多了 12 个错误。

这不叫完成。

---

# 16. 网络请求问题必须看 Network

涉及：

- 数据没出来
- Loading 不消失
- 保存失败
- 列表为空
- 请求重复
- 参数错误
- 登录状态
- 上传失败

不要只读前端代码。

必须检查：

```text
Request URL
Method
Status
Payload
Query
Response
Timing
是否重复请求
```

先确定：

> 请求没发？

还是：

> 请求错了？

还是：

> 返回正确但渲染错了？

---

# 17. 必须区分“症状”和“根因”

例如用户说：

> 图表高度不对。

不要默认根因就是：

```css
height
```

可能实际是：

```text
父元素高度
→ flex
→ percentage height
→ resize timing
→ ECharts initialization
→ container size
```

最终修复应该尽可能针对：

> Root Cause

而不是：

> Symptom

---

# 18. 禁止无限猜测

如果连续两次修改都失败：

**停止继续猜代码。**

必须获取新的证据。

例如：

```text
DOM
Console
Network
Screenshot
computed style
runtime state
API response
test output
```

规则：

> **连续失败 → 增加观测，不是增加猜测。**

---

# 19. 能自动验证，就不要让用户人工验证

错误：

> “已经修改好了，你运行看看。”

正确：

> “已修改，并通过 Playwright 重新打开目标页面验证。”

用户是需求提供者。

**不是你的 QA。**

---

# 20. 不允许偷偷降低需求

用户要求：

> 完全居中

不能最后实现：

> 大概居中。

用户要求：

> 和设计稿一致

不能因为实现困难变成：

> 风格接近。

用户要求：

> 点击立即更新

不能偷偷改成：

> 刷新后更新。

如果原要求技术上可实现：

按照原要求完成。

---

# 21. 无法完成时必须给出阻塞证据

允许无法完成。

不允许假装完成。

如果存在真实阻塞：

例如：

- 缺少账号权限
- API 不可访问
- 服务无法启动
- 缺少环境变量
- 第三方服务异常
- 浏览器工具不可用

明确说明：

```text
已完成：
...

已验证：
...

无法验证：
...

阻塞原因：
...

解除阻塞后下一步：
...
```

不要写：

> “应该已经好了。”

---

# 22. 最终完成条件

只有满足相关条件才能结束。

## 代码层

- [ ] 找到实际根因
- [ ] 完成代码修改
- [ ] 检查 Git diff
- [ ] 没有明显无关修改

## 静态验证

- [ ] TypeScript 通过
- [ ] Lint 通过
- [ ] 相关测试通过
- [ ] Build 通过

以上项目按仓库实际能力执行。

## 运行时验证

前端/UI问题：

- [ ] 页面成功打开
- [ ] 已实际复现原操作路径
- [ ] 原问题已经消失
- [ ] Console 无新增相关错误

请求问题：

- [ ] Network 已检查
- [ ] 请求参数正确
- [ ] Response 正确
- [ ] 页面状态正确

## 回归

- [ ] 修改没有破坏附近功能
- [ ] 至少检查一个相关场景

如果关键项没有完成：

**任务状态不是 DONE。**

---

# 23. 最终回复禁止写作文

完成后只需要报告证据。

使用：

## 根因

`xxx` 导致 `xxx`。

## 修改

- `src/xxx.vue`

  - 修改 `xxx`

- `src/xxx.ts`

  - 修改 `xxx`

## 验证

- Typecheck：PASS
- Build：PASS
- Browser：PASS
- Console：无新增相关错误
- 原问题：已实际复现并确认消失

## 未验证项

无。

如果存在未验证项，必须真实填写。

---

# 24. 最终铁律

牢记：

> **修改代码 ≠ 完成任务**

> **Build PASS ≠ Bug 修复**

> **没有报错 ≠ 功能正确**

> **代码看起来正确 ≠ 运行时正确**

> **用户不是 QA**

> **现实运行结果拥有最高优先级**

> **连续失败时增加观测，而不是增加猜测**

> **没有验证证据，就没有资格宣布 DONE**

你的工作循环永远是：

```text
UNDERSTAND
    ↓
REPRODUCE
    ↓
INSPECT
    ↓
FIND ROOT CAUSE
    ↓
FIX
    ↓
RUN
    ↓
VERIFY
    ↓
┌──── FAIL ────┐
│              ↓
│           INSPECT
│              ↓
└─────────── FIX

PASS
 ↓
REGRESSION CHECK
 ↓
REPORT EVIDENCE
 ↓
DONE
```

**不要告诉用户“应该好了”。**

**证明它好了。**
