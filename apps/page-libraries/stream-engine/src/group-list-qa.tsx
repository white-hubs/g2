import { createOuaaClient } from "@g2-client/ouaa/client";
import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import { createApp, h } from "vue";

import type { FormSchemaItem } from "./form-schema";
import StreamEngineRender from "./pages/stream-engine-render";

const query = new URLSearchParams(location.search);
const detail = query.has("detail");
const missingArchive = query.has("missingArchive");
const requests: { method: string; url: string; body?: unknown }[] = [];
const uploads: string[] = [];
Object.assign(window, { groupListQa: { requests, uploads } });

const staff = { id: "qa-staff", name: "测试发起人", organizations: [{ id: "qa-dept", name: "设备部" }] };
if (!sessionStorage.getItem("GH-UserInfo")) sessionStorage.setItem("GH-UserInfo", JSON.stringify({ id: staff.id, name: staff.name }));

const children: FormSchemaItem[] = [
  { id: "sponsor", name: "SponsorInput", title: "发起人", width: 100, props: { required: true } },
  { id: "text", name: "TextInput", title: "默认单行", width: 100, props: { defaultValue: "每行默认内容" } },
  { id: "textarea", name: "TextareaInput", title: "默认多行", width: 100, props: { defaultValue: "每行默认\n第二行" } },
  { id: "date", name: "DateTime", title: "默认月份", width: 100, props: { format: "yyyy-MM", defaultValue: "2025-12-01 12:00:00" } },
  { id: "now", name: "DateTime", title: "当前日期", width: 100, props: { format: "yyyy-MM-dd", autoCurrentTime: true } },
  { id: "user", name: "UserPicker", title: "默认人员", width: 100, props: { defaultValue: true, multiple: false } },
  { id: "department", name: "DeptPicker", title: "默认部门", width: 100, props: { defaultValue: true, multiple: false } },
  { id: "files", name: "FileUpload", title: "行附件", width: 100, props: {} },
  { id: "count", name: "NumberInput", title: "附件数量", width: 100, props: { params: "files", precision: 0 } },
  { id: "permit", name: "WorkPermitTypeSelect", title: "作业类型", width: 100, props: { required: false } },
];
const schema: FormSchemaItem[] = [
  { id: "group", name: "GroupList", title: "作业记录", width: 100, props: { items: children, closeAdd: false, closeAddChild: false } },
];
const formPerms = [...schema, ...children].map((item) => ({ id: item.id, perm: "E" }));
const process = {
  id: "root",
  props: { formPerms },
  children: { id: "approval", props: { formPerms, operateAlias: [{ code: "PASS", alias: "同意" }] } },
};
const flow = { flowKey: "qa-group-flow", formJson: JSON.stringify(schema), flowJson: JSON.stringify(process) };
const savedRows = [1, 2].map((index) => ({
  sponsorId: staff.id,
  subDataId: `saved-${index}`,
  sponsor: { id: staff.id, name: staff.name },
  text: `历史内容${index}`,
  textarea: "历史多行",
  date: "2024-03",
  now: "2024-03-01",
  user: [{ id: staff.id, name: staff.name }],
  department: [{ id: "qa-dept", name: "设备部" }],
  files: Array.from({ length: index }, (_, fileIndex) => ({
    id: `saved-file-${index}-${fileIndex}`,
    name: `附件${index}-${fileIndex}.txt`,
  })),
  count: 99,
}));
const task = {
  id: "qa-task",
  key: "approval",
  flowKey: flow.flowKey,
  data: JSON.stringify({ group: savedRows }),
  properties: { formJson: JSON.stringify(schema), processJson: JSON.stringify(process) },
  processInstanceRunningInfo: { status: "RUNNING", operateAlias: [{ code: "PASS", name: "同意" }] },
};

const client = createStreamEngineClient({
  get: async (url) => {
    requests.push({ method: "GET", url });
    if (url.includes("form-flow-business/type")) return { data: flow };
    if (url.includes("task/form/id")) return { data: task };
    if (url.includes("user-under-tenant/")) return { data: missingArchive ? { id: staff.id, name: "" } : staff };
    if (url.includes("work-permit-types/names")) return { data: [{ id: 1, typeName: "动火作业" }] };
    return { data: [] };
  },
  post: async (url, body) => {
    requests.push({ method: "POST", url, body });
    return { data: {} };
  },
  put: async (url, body) => {
    requests.push({ method: "PUT", url, body });
    return { data: {} };
  },
  delete: async (url) => {
    requests.push({ method: "DELETE", url });
    return { data: {} };
  },
});
const ouaa = createOuaaClient({
  get: async (url) => (url.includes("organizations") || url.includes("departments") ? staff.organizations : []),
  post: async () => ({ records: [staff], total: 1 }),
  put: async () => ({}),
});
const fileClient: FileClient = {
  getFile: async () => ({}),
  getFileInfo: async () => ({}),
  uploadFile: async () => ({}),
  uploadBusinessFile: async () => ({ path: "/qa-file" }),
  uploadSceneFile: async ({ file }) => {
    const name = file instanceof File ? file.name : "附件";
    uploads.push(name);
    return { id: `uploaded-${uploads.length}`, name };
  },
  persistSceneFiles: async () => {},
};

createApp({
  render: () =>
    h(StreamEngineRender, {
      title: "作业记录",
      type: detail ? "detail" : "add",
      businessType: "WORK_PERMIT",
      processInstanceId: detail ? "qa-process" : "",
      getClient: async () => client,
      getOuaaClient: async () => ouaa,
      getFileClient: async () => fileClient,
    }),
}).mount("#app");
