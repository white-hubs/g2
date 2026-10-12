const cdpPort = process.env.CDP_PORT || "9227";
const appPort = process.env.APP_PORT || "5201";
const targets = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()) as {
  type?: string;
  url?: string;
  webSocketDebuggerUrl: string;
}[];
const target = targets.find((item) => item.type === "page" && item.url?.startsWith(`http://127.0.0.1:${appPort}/`));
if (!target) throw new Error("未找到消防管理浏览器页面");
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
  await wait(1100);
};
const results: Record<string, unknown> = {};

await visit("/d/fire-management/fire-device-list");
results.deviceList = await evaluate(`({
  title: document.body.innerText.includes('设备监测'),
  tabs: ['设备区域','设备状态','产品品类','我的收藏'].every(x => document.body.innerText.includes(x)),
  card: document.body.innerText.includes('1_购物广场1F感烟探测器_8'),
  online: document.body.innerText.includes('在线'),
  area: document.body.innerText.includes('海鲜广场-海鲜广场1层'),
  panel: document.body.innerText.includes('面板配置'),
  fullscreen: document.body.innerText.replace(/\\s/g, '').includes('全屏'),
  pagination: document.body.innerText.includes('共 1 条数据'),
  buttons: [...document.querySelectorAll('button')].map(x => x.innerText.trim()).filter(Boolean),
  layout: (() => {
    const left = document.querySelector('aside')?.getBoundingClientRect();
    const cards = [...document.querySelectorAll('div')].filter(x => String(x.className).includes('previewPanel_') && x.getBoundingClientRect().height > 150).map(x => x.getBoundingClientRect());
    const image = [...document.images].find(x => String(x.className).includes('thumb_'));
    const cardGrid = [...document.querySelectorAll('div')].find(x => String(x.className).includes('cardData_'));
    const gap = cardGrid ? Number.parseFloat(getComputedStyle(cardGrid).columnGap) : 0;
    return { leftWidth: left?.width || 0, cardWidth: cards[0]?.width || 0, gap, imageLoaded: Boolean(image?.naturalWidth) };
  })()
})`);
await evaluate(
  `[...document.querySelectorAll('*')].find(x => x.children.length === 0 && x.textContent?.trim() === '设备状态')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
);
await wait(350);
results.statusFilter = await evaluate(
  `({ online: document.body.innerText.includes('设备在线'), offline: document.body.innerText.includes('设备离线') })`,
);
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.trim() === '面板配置')?.click()`);
await wait(350);
results.panelDrawer = await evaluate(
  `({ open: Boolean(document.querySelector('.ant-drawer-open, .ant-drawer-content-wrapper')), save: document.body.innerText.replace(/\\s/g, '').includes('保存') })`,
);
await visit("/d/fire-management/fire-device-list");
await evaluate(
  `[...document.querySelectorAll('*')].find(x => x.children.length === 0 && x.textContent?.trim() === '更多>')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
);
await wait(600);
results.deviceDetail = await evaluate(
  `({ path: location.pathname, title: document.body.innerText.includes('设备信息'), tabs: ['设备信息','历史数据','组态','关联监控'].every(x => document.body.innerText.includes(x)) })`,
);

for (const [path, marker] of [
  ["fire-host-config", "主机配置"],
  ["fire-host-control", "消防主机远程控制"],
  ["fire-point-management", "消防配置管理"],
  ["fire-point-statistics", "点位统计"],
  ["fire-event-records", "事件记录"],
  ["fire-operation-records", "操作记录"],
] as const) {
  await visit(`/d/fire-management/${path}`);
  results[path] = { marker, text: String(await evaluate("document.body.innerText.slice(0, 1400)")) };
}
for (const [path, marker] of [
  ["alarm-record", "报警记录"],
  ["alarm-config", "报警配置"],
  ["alarm-handle-statistics", "处理统计"],
  ["fire-analysis", "消防分析"],
  ["overview", "数据总览"],
  ["alarm-statistic", "报警统计"],
  ["message-notice", "消息配置"],
  ["equipment-association", "关联设备"],
] as const) {
  await visit(`/d/fire-management/${path}`);
  results[`menu-${path}`] = { marker, text: String(await evaluate("document.body.innerText.slice(0, 1400)")) };
}
await visit("/d/fire-management/equipment-association");
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.trim() === '关联设备')?.click()`);
await wait(500);
results.equipmentAssociationModal = await evaluate(`({
  open: Boolean(document.querySelector('.ant-modal')) && Boolean(document.querySelector('input[placeholder="请输入设备名称或型号"]')),
  query: [...document.querySelectorAll('button')].some(x => x.innerText.replace(/\\s/g, '') === '查询'),
  confirm: [...document.querySelectorAll('button')].some(x => x.innerText.trim() === '确 定')
})`);
const calls = await evaluate("window.apiCalls");
console.log(JSON.stringify({ results, calls, errors }, null, 2));
const data = results as Record<
  string,
  {
    title?: boolean;
    tabs?: boolean;
    card?: boolean;
    online?: boolean;
    offline?: boolean;
    area?: boolean;
    panel?: boolean;
    fullscreen?: boolean;
    pagination?: boolean;
    open?: boolean;
    save?: boolean;
    query?: boolean;
    confirm?: boolean;
    path?: string;
    marker?: string;
    text?: string;
    layout?: { leftWidth: number; cardWidth: number; gap: number; imageLoaded: boolean };
  }
>;
const routesPassed = [
  "fire-host-config",
  "fire-host-control",
  "fire-point-management",
  "fire-point-statistics",
  "fire-event-records",
  "fire-operation-records",
].every((key) => Boolean(data[key]?.text?.includes(data[key]?.marker || "")));
const menuRoutesPassed = [
  "alarm-record",
  "alarm-config",
  "alarm-handle-statistics",
  "fire-analysis",
  "overview",
  "alarm-statistic",
  "message-notice",
  "equipment-association",
].every((key) => Boolean(data[`menu-${key}`]?.text?.includes(data[`menu-${key}`]?.marker || "")));
const passed =
  data.deviceList?.title &&
  data.deviceList?.tabs &&
  data.deviceList?.card &&
  data.deviceList?.online &&
  data.deviceList?.area &&
  data.deviceList?.panel &&
  data.deviceList?.fullscreen &&
  data.deviceList?.pagination &&
  data.statusFilter?.online &&
  data.statusFilter?.offline &&
  Number(data.deviceList?.layout?.leftWidth) >= 395 &&
  Number(data.deviceList?.layout?.cardWidth) === 380 &&
  Number(data.deviceList?.layout?.gap) >= 18 &&
  data.deviceList?.layout?.imageLoaded &&
  data.panelDrawer?.open &&
  data.panelDrawer?.save &&
  data.deviceDetail?.path === "/d/fire-management/fire-device-detail" &&
  data.deviceDetail?.title &&
  data.deviceDetail?.tabs &&
  data.equipmentAssociationModal?.open &&
  data.equipmentAssociationModal?.query &&
  data.equipmentAssociationModal?.confirm &&
  routesPassed &&
  menuRoutesPassed &&
  errors.length === 0;
if (!passed) process.exitCode = 1;
socket.close();
