const targets = (await (await fetch("http://127.0.0.1:9223/json")).json()) as {
  type?: string;
  url?: string;
  webSocketDebuggerUrl: string;
}[];
const target = targets.find((item) => item.type === "page" && item.url?.startsWith("http://127.0.0.1:5196/"));
if (!target) throw new Error("未找到安全人员管理浏览器页面");
const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map<number, (value: unknown) => void>();
const errors: string[] = [];
socket.onmessage = (event) => {
  const message = JSON.parse(String(event.data)) as { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown };
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message.result);
    pending.delete(message.id);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(message.params));
  if (message.method === "Runtime.consoleAPICalled" && (message.params?.type === "error" || message.params?.type === "warning"))
    errors.push(JSON.stringify(message.params));
};
await new Promise<void>((resolve) => {
  socket.onopen = () => resolve();
});
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<unknown>((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression: string) => {
  const result = (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as {
    result?: { value?: unknown };
  };
  return result.result?.value;
};
await send("Runtime.enable");
await send("Page.enable");
const visit = async (path: string) => {
  await send("Page.navigate", { url: `http://127.0.0.1:5196${path}` });
  await wait(900);
};

await visit("/d/safety-personnel-management/home");
const home = (await evaluate(
  `(() => {
    const card = [...document.querySelectorAll('section')].find((node) => node.textContent?.includes('安全部'));
    const header = card?.querySelector('header');
    const avatar = card?.querySelector('[aria-label$="头像"]');
    const headerIcon = header?.querySelector('svg[aria-hidden="true"]');
    const style = header ? getComputedStyle(header) : null;
    return {
      title: document.body.innerText.includes('安全部'),
      member: document.body.innerText.includes('张安全'),
      labels: document.body.innerText.includes('部门：--') && document.body.innerText.includes('电话：--'),
      headerBackground: style?.backgroundColor,
      avatarInitial: avatar?.textContent,
      headerIcon: Boolean(headerIcon),
      cardWidth: card?.getBoundingClientRect().width,
    };
  })()`,
)) as {
  title: boolean;
  member: boolean;
  labels: boolean;
  headerBackground?: string;
  avatarInitial?: string;
  headerIcon: boolean;
  cardWidth?: number;
};
const homeCapture = (await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })) as { data?: string };
if (homeCapture.data) {
  await Bun.write("home-browser-check.png", Uint8Array.fromBase64(homeCapture.data));
}

await visit("/d/safety-personnel-management/personnel");
const personnel = (await evaluate(
  `({ title: document.body.innerText.includes('人员管理'), row: document.body.innerText.includes('张安全'), buttons: [...document.querySelectorAll('button')].map(x => x.innerText) })`,
)) as { title: boolean; row: boolean; buttons: string[] };
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.replace(/\\s/g, '') === '安全履历')?.click()`);
await wait(400);
const resumeDrawer = (await evaluate(
  `(() => {
    const drawer = document.querySelector('.ant-drawer');
    const query = [...(drawer?.querySelectorAll('button') ?? [])].find(x => x.innerText.replace(/\\s/g, '') === '查询');
    const placeholders = [...(drawer?.querySelectorAll('.ant-picker-range input') ?? [])].map(x => x.getAttribute('placeholder'));
    const queryStyle = query ? getComputedStyle(query) : null;
    return {
      open: document.body.innerText.includes('安全履历 · 张安全'),
      chinesePlaceholder: placeholders.includes('开始日期') && placeholders.includes('结束日期'),
      primaryQuery: queryStyle?.backgroundColor === 'rgb(22, 119, 255)',
      primaryQueryClass: query?.classList.contains('ant-btn-primary') === true,
    };
  })()`,
)) as { open: boolean; chinesePlaceholder: boolean; primaryQuery: boolean; primaryQueryClass: boolean };
await evaluate(
  `[...document.querySelectorAll('.ant-tabs-tab')].find(x => x.textContent?.includes('巡查巡更任务'))?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
);
await wait(250);
const resumeTableBordered = (await evaluate(
  `(() => { const table = document.querySelector('.safety-resume-task-table .ant-table-container'); return Boolean(table && getComputedStyle(table).borderLeftWidth !== '0px'); })()`,
)) as boolean;
await evaluate(`document.querySelector('.ant-drawer-close')?.click()`);
await wait(200);
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.replace(/\\s/g, '') === '新增人员')?.click()`);
await wait(300);
const modal = (await evaluate(
  `({ open: document.body.innerText.includes('选择人员'), fields: document.body.innerText.includes('名称') && document.body.innerText.includes('联系电话') && document.body.innerText.includes('部门') && document.body.innerText.includes('岗位') })`,
)) as { open: boolean; fields: boolean };
await visit("/d/safety-personnel-management/committee");
const committee = (await evaluate(
  `({ title: document.body.innerText.includes('安委会管理'), row: document.body.innerText.includes('安全生产委员会') })`,
)) as { title: boolean; row: boolean };
await evaluate(`[...document.querySelectorAll('button')].find(x => x.innerText.replace(/\\s/g, '') === '新增')?.click()`);
await wait(300);
const committeeDrawer = (await evaluate(
  `(() => {
    const card = document.querySelector('.ant-upload-select-picture-card');
    return { open: document.body.innerText.includes('新增安委会'), uploadCard: Boolean(card), uploadText: card?.textContent?.trim() === '+上传' };
  })()`,
)) as { open: boolean; uploadCard: boolean; uploadText: boolean };
await evaluate(`document.querySelector('.ant-drawer-close')?.click()`);
await wait(200);
await visit("/d/safety-personnel-management/certificates");
const certificate = (await evaluate(
  `({ title: document.body.innerText.includes('证书管理'), row: document.body.innerText.includes('注册安全工程师') })`,
)) as { title: boolean; row: boolean };
await evaluate(`[...document.querySelectorAll('button')].filter(x => x.innerText.replace(/\\s/g, '') === '新增').at(-1)?.click()`);
await wait(300);
const certificateDrawer = (await evaluate(
  `(() => {
    const employee = document.querySelector('input[placeholder="请选择员工"]');
    const picker = document.querySelector('.ant-drawer .ant-picker');
    const row = employee?.closest('div[class*="row"]');
    const field = employee?.parentElement?.parentElement;
    const dateInput = picker?.querySelector('input');
    dateInput?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    dateInput?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    dateInput?.click();
    return {
      open: document.body.innerText.includes('新增证书'),
      employeeWidth: employee?.getBoundingClientRect().width ?? 0,
      rowWidth: row?.getBoundingClientRect().width ?? 0,
      fieldWidth: field?.getBoundingClientRect().width ?? 0,
      chinesePlaceholder: picker?.querySelector('input')?.getAttribute('placeholder') === '请选择日期',
    };
  })()`,
)) as { open: boolean; employeeWidth: number; rowWidth: number; fieldWidth: number; chinesePlaceholder: boolean };
await wait(200);
const calendarText = (await evaluate(
  `document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')?.textContent ?? ''`,
)) as string;
const chineseCalendar = calendarText.includes("年") || calendarText.includes("月");
await visit("/d/safety-personnel-management/key-personnel");
const keyPerson = (await evaluate(
  `({ title: document.body.innerText.includes('重点人员信息管理'), row: document.body.innerText.includes('李重点'), risk: document.body.innerText.includes('高风险') })`,
)) as { title: boolean; row: boolean; risk: boolean };
await visit("/d/safety-personnel-management/key-personnel/statistics");
const statistics = (await evaluate(
  `({
    title: document.body.innerText.includes('统计分析看板'),
    total: document.body.innerText.includes('12'),
    chartCount: document.querySelectorAll('canvas').length,
  })`,
)) as { title: boolean; total: boolean; chartCount: number };
const calls = (await evaluate(`window.apiCalls`)) as { method?: string; args?: unknown[] }[];
const pageDebug = await evaluate(
  `({ url: location.href, title: document.title, text: document.body.innerText.slice(0, 1000), html: document.body.innerHTML.slice(0, 1000) })`,
);
console.log(
  JSON.stringify(
    {
      home,
      personnel,
      resumeDrawer,
      resumeTableBordered,
      modal,
      committee,
      committeeDrawer,
      certificate,
      certificateDrawer,
      chineseCalendar,
      calendarText: calendarText.slice(0, 100),
      keyPerson,
      statistics,
      calls,
      errors,
      pageDebug,
    },
    null,
    2,
  ),
);
const passed =
  home.title &&
  home.member &&
  home.labels &&
  home.headerBackground === "rgb(22, 119, 255)" &&
  home.avatarInitial === "张" &&
  home.headerIcon &&
  home.cardWidth === 450 &&
  personnel.title &&
  personnel.row &&
  resumeDrawer.open &&
  resumeDrawer.chinesePlaceholder &&
  resumeDrawer.primaryQueryClass &&
  resumeTableBordered &&
  modal.open &&
  modal.fields &&
  committee.title &&
  committee.row &&
  committeeDrawer.open &&
  committeeDrawer.uploadCard &&
  committeeDrawer.uploadText &&
  certificate.title &&
  certificate.row &&
  certificateDrawer.open &&
  certificateDrawer.employeeWidth > 250 &&
  certificateDrawer.fieldWidth > 250 &&
  certificateDrawer.chinesePlaceholder &&
  chineseCalendar &&
  keyPerson.title &&
  keyPerson.row &&
  keyPerson.risk &&
  statistics.title &&
  statistics.total &&
  statistics.chartCount >= 3 &&
  calls.some((call) => call.method === "getKeyPersonAreaSupervisorStats") &&
  errors.length === 0;
if (!passed) process.exitCode = 1;
socket.close();
