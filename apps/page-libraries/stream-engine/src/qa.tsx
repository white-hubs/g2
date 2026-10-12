import { createOuaaClient } from "@g2-client/ouaa/client";
import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import { createApp, h } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import FlowformList from "./pages/flowform-list";
import FormProcessDesign from "./pages/form-process-design";
import StreamEngineRender from "./pages/stream-engine-render";

const query = new URLSearchParams(location.search);
const reportEnabled = query.has("report");
const outsourceEnabled = query.has("outsource");
const designApplication = query.get("application") ?? "FAULT";
const listEnabled = query.has("list");
const schema = outsourceEnabled
  ? [
      { id: "device", name: "DeviceSelect", title: "改造对象", width: 100, show: true, props: { required: true } },
      { id: "company", name: "OutSourceCom", title: "委外公司", width: 100, show: true, props: { required: true, params: "device" } },
      { id: "mode", name: "OutSourceMode", title: "委外模式", width: 100, show: true, props: { required: true, params: "company" } },
      { id: "result", name: "OutSourceResult", title: "确认结果", width: 100, show: true, props: { required: true } },
    ]
  : reportEnabled
    ? [
        {
          id: "reportType",
          name: "WorKReportSelect",
          title: "汇报类型",
          width: 100,
          show: true,
          props: { required: true, showPrint: true },
        },
      ]
    : [
        { id: "field1", name: "UserPicker", title: "处理人员", width: 100, show: true, props: { multiple: false, required: true } },
        { id: "field2", name: "DeptPicker", title: "处理部门", width: 100, show: true, props: { multiple: false } },
        { id: "field3", name: "TextInput", title: "处理说明", width: 100, show: true, props: {} },
      ];
const signEnabled = query.has("sign");
const designEnabled = query.has("design");
const conditionsEnabled = query.has("conditions");
const designSchema = conditionsEnabled
  ? [
      {
        id: "number",
        name: "NumberInput",
        title: "数值",
        value: "",
        valueType: "Number",
        width: 100,
        props: { required: false, showPrint: true },
      },
      {
        id: "dept",
        name: "DeptPicker",
        title: "表单部门",
        value: [],
        valueType: "FormDept",
        width: 100,
        props: { required: false, showPrint: true },
      },
      {
        id: "select",
        name: "SelectInput",
        title: "工单范围",
        value: "",
        valueType: "String",
        width: 100,
        props: { required: false, options: ["一般", "紧急"], showPrint: true },
      },
    ]
  : designApplication === "WORK_PERMIT"
    ? [
        {
          id: "permitType",
          name: "WorkPermitTypeSelect",
          title: "作业类型",
          value: null,
          valueType: "Object",
          width: 100,
          props: { required: true, showPrint: true },
        },
        {
          id: "permitLevel",
          name: "WorkPermitLevelSelect",
          title: "作业等级",
          value: "",
          valueType: "String",
          width: 100,
          props: { required: true, params: "permitType", showPrint: true },
        },
        {
          id: "risk",
          name: "WorkPermitRiskCheckItems",
          title: "作业检查项",
          value: [],
          valueType: "Array",
          width: 100,
          props: { required: false, params: "permitType", params2: "permitLevel", showPrint: true },
        },
        {
          id: "acceptance",
          name: "WorkPermitAcceptanceItems",
          title: "作业验收项",
          value: [],
          valueType: "Array",
          width: 100,
          props: { required: false, params: "permitType", params2: "permitLevel", showPrint: true },
        },
      ]
    : designApplication === "PARKINGMANAGE"
      ? [
          {
            id: "parkingLevel",
            name: "ParkingLevelSelect",
            title: "违停程度",
            value: "",
            valueType: "String",
            width: 100,
            props: { showPrint: true },
          },
          {
            id: "plate",
            name: "ViolatorCarNumber",
            title: "车主车牌号码",
            value: "",
            valueType: "String",
            width: 100,
            props: { showPrint: true },
          },
          {
            id: "owner",
            name: "ViolatorName",
            title: "车主姓名",
            value: "",
            valueType: "String",
            width: 100,
            props: { params: "plate", showPrint: true },
          },
          {
            id: "phone",
            name: "ViolatorPhone",
            title: "车主联系方式",
            value: "",
            valueType: "String",
            width: 100,
            props: { params: "plate", showPrint: true },
          },
          {
            id: "lot",
            name: "ParkingLotSelect",
            title: "停车场选择",
            value: "",
            valueType: "String",
            width: 100,
            props: { showPrint: true },
          },
          {
            id: "color",
            name: "CarPlateColorSelect",
            title: "车牌颜色选择",
            value: "",
            valueType: "String",
            width: 100,
            props: { showPrint: true },
          },
        ]
      : [
          {
            id: "consumables",
            name: "ConsumablesOut",
            title: "耗材领用",
            value: "",
            valueType: "Array",
            baseOn: "Table",
            width: 100,
            props: { showPrint: true, hideLabel: true, required: false },
          },
          {
            id: "staff",
            name: "UserPicker",
            title: "人员选择",
            value: [],
            valueType: "getStaffList",
            width: 100,
            props: { multiple: false, required: false, showPrint: true },
          },
          {
            id: "phone",
            name: "TelPhone",
            title: "电话号码",
            value: "",
            valueType: "Number",
            width: 50,
            props: { required: false, showPrint: true },
          },
        ];
const processJson = {
  id: "root",
  type: "ROOT",
  name: "发起人",
  props: {},
  children: {
    id: "approval1",
    parentId: "root",
    type: "APPROVAL",
    name: "审批人",
    props: {
      assignedType: "ASSIGN_USER",
      assignedUser: [{ id: "u3", name: "超级管理员3" }],
      nobody: { handler: "TO_PASS", assignedUser: [] },
      opinion: true,
      sign: signEnabled,
      formPerms: schema.map((item) => ({ id: item.id, perm: "E" })),
    },
  },
};
const conditionProcess = {
  id: "root",
  type: "ROOT",
  name: "发起人",
  props: {},
  children: {
    id: "conditions",
    parentId: "root",
    type: "CONDITIONS",
    name: "条件分支",
    props: {},
    children: { id: "join", type: "EMPTY", name: "", parentId: "conditions" },
    branchs: [
      {
        id: "condition1",
        parentId: "conditions",
        type: "CONDITION",
        name: "条件1",
        props: {
          groupsType: "OR",
          groups: [
            {
              groupType: "AND",
              cids: ["number"],
              conditions: [{ id: "number", title: "数值", name: "NumberInput", valueType: "Number", compare: "=", value: [0] }],
            },
          ],
        },
      },
      {
        id: "condition2",
        parentId: "conditions",
        type: "CONDITION",
        name: "条件2",
        props: {
          groupsType: "OR",
          groups: [
            {
              groupType: "AND",
              cids: ["root"],
              conditions: [{ id: "root", title: "发起人", valueType: "User", compare: "=", value: [{ id: "u3", name: "超级管理员3" }] }],
            },
          ],
        },
      },
    ],
  },
};
const task = {
  id: "task1",
  key: "approval1",
  flowKey: "flow1",
  data: JSON.stringify(
    outsourceEnabled
      ? { device: [{ id: "device-1", name: "水泵" }], company: null, mode: null, result: null }
      : { field1: [{ id: "u3", name: "超级管理员3" }], field2: [{ id: "d1", name: "总办" }], field3: "待处理" },
  ),
  properties: { formJson: JSON.stringify(schema), processJson: JSON.stringify(processJson) },
  processInstanceRunningInfo: {
    operateAlias: [
      { code: "PASS", name: "同意" },
      { code: "REJECT", name: "驳回" },
    ],
    status: "RUNNING",
  },
};
const flow = { flowKey: "flow1", formJson: JSON.stringify(schema), flowJson: JSON.stringify(processJson) };
const line = [
  {
    nodeKey: "root",
    nodeName: "发起人",
    assigneeList: [],
    taskOperations: [{ operation: { type: "SUBMIT", operator: { name: "超级管理员3" }, createTime: 1788940888865 } }],
  },
  {
    nodeKey: "approval1",
    nodeName: "审批人",
    approvalCommentConfig: { supportText: true, supportHandwrittenSignature: signEnabled },
    assigneeList: [{ id: "u3", name: "超级管理员3", preReduceSign: false }],
    preAddSign: true,
    taskOperations: [
      {
        operation: {
          type: "PASS",
          operator: { name: "超级管理员3" },
          createTime: 1788940888865,
          approvalOpinion: { text: "已核查", sign: signEnabled ? "sign-existing" : "" },
        },
        feedbackLogs: [{ feedbackUser: "超级管理员3", feedbackTime: 1788940888865, feedbackInfo: "已留言", fileVOList: [] }],
      },
    ],
  },
];
const delay = Number(query.get("delay") ?? 0);
const uploads: Array<{ name: string; type: string; sceneCode: string; persisted: boolean }> = [];
(window as Window & { qaSignUploads?: typeof uploads }).qaSignUploads = uploads;
const fileClient: FileClient = {
  getFile: async () => ({
    data: {
      path: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E%3Cpath d='M10 28 Q30 2 45 25 T100 15' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E",
    },
  }),
  getFileInfo: async () => ({}),
  uploadFile: async () => ({}),
  uploadBusinessFile: async () => ({ path: "/qa-sign.png" }),
  uploadSceneFile: async (payload) => {
    uploads.push({
      name: payload.file instanceof File ? payload.file.name : "",
      type: payload.file.type,
      sceneCode: payload.sceneCode,
      persisted: false,
    });
    return { id: "sign-uploaded", path: "/qa-sign.png" };
  },
  persistSceneFiles: async () => {
    if (uploads.at(-1)) uploads[uploads.length - 1]!.persisted = true;
  },
};
const users = { records: [{ id: "u3", name: "超级管理员3", organizations: [{ name: "总办" }], mobile: "15682559328" }], total: 1 };
const departments = [{ id: "d1", name: "总办" }];
const designPosts: Array<{ url: string; payload: unknown }> = [];
(window as Window & { qaDesignPosts?: typeof designPosts }).qaDesignPosts = designPosts;
const listRequests: string[] = [];
const navigations: Array<{ page: string; query?: Record<string, string | undefined> }> = [];
(window as Window & { qaListRequests?: string[]; qaNavigations?: typeof navigations }).qaListRequests = listRequests;
(window as Window & { qaNavigations?: typeof navigations }).qaNavigations = navigations;
const listRows = [
  {
    id: "form-1",
    name: "公开报修",
    type: "FLOW_FORM",
    typeName: "表单+流程",
    application: "FAULT",
    status: "IN_USE",
    statusName: "使用中",
    enable: true,
    publicForm: 1,
    businessType: "FAULT",
    qrCodeUrl: "http://localhost:5107/streamengineH5/public-form/?processType=ADD",
    remark: "设备故障报修",
  },
];
const client = createStreamEngineClient({
  get: async (url) => {
    listRequests.push(url);
    return url.includes("form-flow/type/list")
      ? {
          data: [
            { value: "FLOW_FORM", name: "表单+流程" },
            { value: "FORM", name: "表单" },
            { value: "FLOW", name: "流程" },
          ],
        }
      : url.includes("form-flow/status/list")
        ? {
            data: [
              { value: "IN_USE", name: "使用中" },
              { value: "DRAFT", name: "草稿" },
            ],
          }
        : url.includes("form-flow/page")
          ? { data: { records: listRows, total: 1 } }
          : url.includes("form-flow/qr-code")
            ? {
                data: {
                  path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
                },
              }
            : url.includes("form-flow/application/list")
              ? {
                  data: [
                    { code: "ATTENDANCE_MANAGEMENT", name: "考勤管理" },
                    { code: "PERSONNELMANAGEMENT", name: "人事管理" },
                    { code: "OFFICIAL_MANAGEMENT", name: "行政管理" },
                    { code: "PROPERTY_MANAGEMENT", name: "资产管理" },
                    { code: "WORK_PERMIT", name: "作业管理" },
                    { code: "WORK_REPORT", name: "工作汇报" },
                    { code: "OUTSOURCE_REPAIR", name: "委外维修" },
                    { code: "SMALLENFINEERING", name: "小散工程" },
                    { code: "HIDDENDANGER", name: "隐患排查" },
                    { code: "FAULT", name: "故障报修" },
                    { code: "PARKINGMANAGE", name: "停车管理" },
                    { code: "COMPLAINT", name: "投诉建议" },
                    { code: "RETROFIT", name: "更新改造" },
                  ],
                }
              : url.includes("authenticated/role/list-by-product")
                ? { data: [{ id: "role-1", name: "维修角色" }] }
                : url.includes("/api/ouaa/roles")
                  ? { data: { records: [{ id: "role-1", name: "维修角色" }], total: 1 } }
                  : url.includes("authenticated/position/list")
                    ? { data: [{ id: "position-1", name: "工程主管" }] }
                    : url.includes("appointment/page")
                      ? { data: { records: [{ id: "appointment-1", name: "维修岗" }], total: 1 } }
                      : url.includes("authenticated/organizations/list")
                        ? { data: departments }
                        : url.includes("organizations/postAndPosition")
                          ? {
                              data: {
                                postList: [{ id: "appointment-1", name: "维修岗" }],
                                positionList: [{ id: "position-1", name: "工程主管" }],
                              },
                            }
                          : url.includes("work-permit-types/names")
                            ? { data: [{ id: 1, typeName: "动火作业" }] }
                            : url.includes("work-permit-types/levels")
                              ? { data: ["一级"] }
                              : url.includes("risk-check-items/page")
                                ? { data: { records: [{ id: 11, itemName: "检查灭火器", aiRecognitionEnabled: true }], total: 1 } }
                                : url.includes("acceptance-items/page")
                                  ? { data: { records: [{ id: 12, itemName: "验收现场", aiRecognitionEnabled: false }], total: 1 } }
                                  : url.includes("park-management/vehicle/page")
                                    ? {
                                        data: {
                                          records: [{ vehicleNo: "粤A12345", customerName: "张三", customerMobile: "13800138000" }],
                                          total: 1,
                                        },
                                      }
                                    : url.includes("park-management/parking-infos")
                                      ? { data: [{ code: "P1", name: "东停车场" }] }
                                      : url.includes("outsource/company/list")
                                        ? { data: [{ id: "company-1", name: "华东维保" }] }
                                        : url.includes("outsource/model/listByCompany")
                                          ? { data: [{ id: "mode-1", name: "现场维修" }] }
                                          : url.includes("project/apply/nameList")
                                            ? { data: [{ ApplyId: "project-1", projectName: "道路整修" }] }
                                            : url.includes("form-flow/qa-form")
                                              ? {
                                                  data: {
                                                    id: "qa-form",
                                                    name: "组件对照",
                                                    application: designApplication,
                                                    formJson: JSON.stringify(designSchema),
                                                    flowJson: JSON.stringify(conditionsEnabled ? conditionProcess : processJson),
                                                  },
                                                }
                                              : url.includes("report-type-page")
                                                ? {
                                                    data: {
                                                      records: [
                                                        { id: "daily", name: "日报", status: 1 },
                                                        { id: "retired", name: "已停用类型", status: 0 },
                                                      ],
                                                      total: 2,
                                                    },
                                                  }
                                                : url.includes("form-flow-business/type")
                                                  ? { data: flow }
                                                  : url.includes("task/form/id")
                                                    ? { data: task }
                                                    : url.includes("historical/path/line") || url.includes("print/node")
                                                      ? { data: line }
                                                      : url.includes("staff/list")
                                                        ? { data: users }
                                                        : url.includes("first/task/active")
                                                          ? { data: false }
                                                          : { data: [] };
  },
  post: async (url, payload) => {
    designPosts.push({ url, payload });
    return { data: {} };
  },
  put: async (url, payload) => {
    designPosts.push({ url, payload });
    return { data: {} };
  },
  delete: async (url) => {
    designPosts.push({ url, payload: undefined });
    return { data: {} };
  },
});
const ouaa = createOuaaClient({
  get: async (url) =>
    url.includes("terminal-application-groups")
      ? []
      : url.includes("organizations") || url.includes("departments")
        ? departments
        : url.includes("user-under-tenant/page")
          ? users
          : [],
  post: async () => users,
  put: async () => ({}),
});

const qaApp = createApp({
  render: () =>
    listEnabled
      ? h(FlowformList, {
          getClient: async () => client,
          getOuaaClient: async () => ouaa,
          onClose: () => {
            navigations.push({ page: "FlowformList" });
          },
          onNavigate: (intent: (typeof navigations)[number]) => {
            navigations.push(intent);
          },
        })
      : designEnabled
        ? h(FormProcessDesign, {
            title: "组件对照",
            formId: "qa-form",
            formType: "FLOW_FORM",
            getClient: async () => client,
            getOuaaClient: async () => ouaa,
          })
        : h(StreamEngineRender, {
            title: "工单详情",
            type: "detail",
            businessType: outsourceEnabled ? "OUTSOURCE_REPAIR" : "FAULT",
            processInstanceId: "process1",
            getClient: async () => {
              if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
              return client;
            },
            getOuaaClient: async () => ouaa,
            getFileClient: async () => fileClient,
          }),
});
const qaRouter = createRouter({ history: createWebHistory(), routes: [{ path: "/qa.html", component: { render: () => null } }] });
qaApp.use(qaRouter);
void qaRouter.isReady().then(() => qaApp.mount("#app"));
