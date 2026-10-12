const cdpPort = process.env.CDP_PORT || "9224";
const appPort = process.env.APP_PORT || "5197";
const targets = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()) as {
  type?: string;
  url?: string;
  webSocketDebuggerUrl: string;
}[];
const target = targets.find((item) => item.type === "page" && item.url?.startsWith(`http://127.0.0.1:${appPort}/`));
if (!target) throw new Error("未找到安全舆情浏览器页面");
const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map<number, (value: unknown) => void>();
const errors: string[] = [];
socket.onmessage = (event) => {
  const message = JSON.parse(String(event.data)) as { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown };
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message.result);
    pending.delete(message.id);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(message.params));
  if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") errors.push(JSON.stringify(message.params));
};
await new Promise<void>((resolve) => {
  socket.onopen = () => resolve();
});
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<unknown>((resolve) => {
    const callId = ++id;
    pending.set(callId, resolve);
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression: string) =>
  ((await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as { result?: { value?: unknown } }).result
    ?.value;
await send("Runtime.enable");
await send("Page.enable");
const visit = async (path: string) => {
  await send("Page.navigate", { url: `http://127.0.0.1:${appPort}${path}` });
  await wait(900);
};
const results: Record<string, unknown> = {};
await visit("/d/security-opinion-monitoring/opinions");
results.opinions = await evaluate(
  `({ title: document.body.innerText.includes('舆情列表'), row: document.body.innerText.includes('安全生产正面报道'), chineseRange: [...document.querySelectorAll('.ant-picker-range input')].every(x => /开始时间|结束时间/.test(x.placeholder)) })`,
);
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.trim() === '详情')?.click()`);
await wait(250);
results.detail = await evaluate(
  `({ open: document.body.innerText.includes('舆情详情'), content: document.body.innerText.includes('安全生产工作有序开展'), sentiment: [...document.querySelectorAll('.ant-tag')].some(x => x.textContent?.trim() === '正面') })`,
);
for (const path of ["alerts", "sources", "keywords", "statistics", "review-reports", "recycle-bin"]) {
  await visit(`/d/security-opinion-monitoring/${path}`);
  results[path] = {
    text: String(await evaluate("document.body.innerText.slice(0, 600)")),
    canvas: await evaluate("document.querySelectorAll('canvas').length"),
  };
}
await visit("/d/security-opinion-monitoring/alerts");
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.trim() === '舆情详情')?.click()`);
await wait(250);
results.alertOpinionDetail = await evaluate(
  `({ open: document.body.innerText.includes('舆情详情'), content: document.body.innerText.includes('安全生产工作有序开展') })`,
);
await visit("/d/security-opinion-monitoring/sources");
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.replace(/\\s/g, '') === '新增')?.click()`);
await wait(250);
results.sourceModal = await evaluate(
  `({ open: document.body.innerText.includes('添加信源'), fields: ['信源名称','URL地址','采集频率','每次最多采集条数'].every(x => document.body.innerText.includes(x)) })`,
);
const calls = await evaluate("window.apiCalls");
console.log(JSON.stringify({ results, calls, errors }, null, 2));
const data = results as Record<
  string,
  {
    title?: boolean;
    row?: boolean;
    chineseRange?: boolean;
    open?: boolean;
    fields?: boolean;
    content?: boolean;
    sentiment?: boolean;
    text?: string;
    canvas?: number;
  }
>;
const passed =
  data.opinions?.title &&
  data.opinions?.row &&
  data.opinions?.chineseRange &&
  data.detail?.open &&
  data.detail?.content &&
  data.detail?.sentiment &&
  data.alerts?.text?.includes("预警管理") &&
  data.sources?.text?.includes("信源管理") &&
  data.keywords?.text?.includes("关键词配置") &&
  data.statistics?.text?.includes("128") &&
  Number(data.statistics?.canvas) >= 4 &&
  data["review-reports"]?.text?.includes("复盘报告") &&
  data["recycle-bin"]?.text?.includes("已过滤舆情") &&
  data.alertOpinionDetail?.open &&
  data.alertOpinionDetail?.content &&
  data.sourceModal?.open &&
  data.sourceModal?.fields &&
  errors.length === 0;
if (!passed) process.exitCode = 1;
socket.close();
