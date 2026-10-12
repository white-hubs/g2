import { createOuaaClient } from "@g2-client/ouaa/client";
import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import { createApp, h } from "vue";

import type { FormSchemaItem } from "./form-schema";
import StreamEngineRender from "./pages/stream-engine-render";
import { targetObjectName, targetObjectValue, type TargetObjectKind, type TargetObjectRow } from "./target-object-model";

const query = new URLSearchParams(location.search);
const callType = query.get("callType") ?? "INTERNAL";
const readonly = query.has("readonly");
const mode = query.get("kind") ?? "target";
const businessType =
  mode === "rectify" ? "PROJECT_REFORM" : mode === "device" ? "RETROFIT" : mode === "outsource" ? "OUTSOURCE_REPAIR" : "FAULT";
const requests: Array<{ method: string; url: string; body?: unknown }> = [];
const submissions: unknown[] = [];
Object.assign(window, { targetQaRequests: requests, targetQaSubmissions: submissions });

const schema: FormSchemaItem[] = [
  {
    id: "target",
    name:
      mode === "rectify"
        ? "RectifyTargetSelect"
        : mode === "related"
          ? "RelatedDeviceSelect"
          : ["device", "outsource"].includes(mode)
            ? "DeviceSelect"
            : "TargetObjectSelect",
    title: mode === "rectify" ? "整改对象" : "故障对象",
    width: 100,
    show: true,
    props: {
      required: true,
      showPrint: true,
      ...(mode === "related" ? { multiple: true } : {}),
      ...(mode === "outsource" ? { outSource: true } : {}),
      ...(query.has("withType") ? { params: "objectType" } : {}),
    },
  },
];
if (query.has("withType"))
  schema.unshift({
    id: "objectType",
    name: "SelectInput",
    title: "对象类型",
    width: 100,
    show: true,
    props: {
      required: false,
      options: [
        { label: "小散工程", value: "SMALL_ENGINEERING" },
        { label: "设备", value: "DEVICE" },
      ],
    },
  });
const perms = schema.map((item) => ({ id: item.id, perm: readonly ? "R" : "E" }));
const process = { id: "root", props: { formPerms: perms, outerFormPerms: perms } };
const areaRows = [
  { id: "area-1", name: "北区", code: "A-1", children: [{ id: "area-3", name: "泵房", code: "A-3" }] },
  { id: "area-2", name: "南区", code: "A-2" },
];
const patrolRows: TargetObjectRow[] = [
  { id: "patrol-1", patrolLocationName: "北门巡更点", area: [{ id: "area-1", name: "北区" }], code: "P-1" },
  { id: "patrol-2", patrolLocationName: "南门巡更点", area: [{ id: "area-2", name: "南区" }], code: "P-2" },
];
const siteRows: TargetObjectRow[] = [
  { id: "site-1", name: "北区消防栓", typeId: "type-1", typeName: "消防", receiveDepId: "dep-1", depName: "维护部", areaName: "北区" },
  { id: "site-2", name: "南区配电柜", typeId: "type-2", typeName: "电气", receiveDepId: "dep-2", depName: "电气部", areaName: "南区" },
];
const deviceRows: TargetObjectRow[] = Array.from({ length: 12 }, (_, index) => ({
  id: `device-${index + 1}`,
  name: `循环泵${index + 1}`,
  code: `D-${index + 1}`,
  productId: "product-1",
  categoryCode: "mechanical-pump",
  tagCodes: ["critical"],
  productInfo: { name: "水泵产品", productCategory: { name: "水泵" } },
  department: { id: "dep-1", name: "维护部" },
  area: { id: "area-1", pathName: "北区/泵房" },
}));
const propertyRows: TargetObjectRow[] = [
  {
    id: "property-1",
    name: "办公打印机",
    typeId: "asset-type-1",
    typeName: "办公设备",
    receiveDepId: "dep-1",
    receiveDepName: "维护部",
    areaName: "北区",
  },
];
const stallRows: TargetObjectRow[] = [
  {
    id: "stall-1",
    name: "北区档位",
    type: "stall-type-1",
    typeName: "商铺",
    areaId: "area-1",
    areaNames: "北区/商铺区",
    deptNames: ["维护部", "管理部"],
  },
];
const riskRows: TargetObjectRow[] = [
  { id: "risk-1", name: "消防设备风险源", typeCode: "fire-equipment", typeName: "消防设备", receiveDepName: "维护部", areaName: "北区" },
];
const projectRows: TargetObjectRow[] = [
  { id: "project-1", projectName: "道路整修", projectTypeName: "日常维修", depId: "dep-1", depName: "维护部", status: "UNDERWAY" },
];
const fixtures: Record<TargetObjectKind, TargetObjectRow[]> = {
  AREA: areaRows,
  DEVICE: deviceRows,
  PROPERTY: propertyRows,
  STALL: stallRows,
  SITE_POINT: siteRows,
  PATROL_POINT: patrolRows,
  RISK_SOURCE: riskRows,
  SMALL_ENGINEERING: projectRows,
};
const restoredKind = (query.get("targetType") ??
  (mode === "rectify" ? "SMALL_ENGINEERING" : mode === "target" ? "PATROL_POINT" : "DEVICE")) as TargetObjectKind;
const restoredRows = mode === "outsource" ? [{ id: "outsource-1", name: "委外水泵" }] : [fixtures[restoredKind]![0]!];
const restored = targetObjectValue(restoredRows, restoredKind, {
  compact: ["rectify", "device", "outsource"].includes(mode),
  array: mode !== "target",
});
Object.assign(window, { targetQaExpectedName: targetObjectName(restoredRows[0]!) });
const pageRows = (
  rows: TargetObjectRow[],
  params: Record<string, unknown> | URLSearchParams,
): { data: { records: TargetObjectRow[]; total: number } } => {
  const get = (key: string) => (params instanceof URLSearchParams ? params.get(key) : params[key]);
  const number = Number(get("pageNumber") ?? 1);
  const size = Number(get("pageSize") ?? 10);
  return { data: { records: rows.slice((number - 1) * size, number * size), total: rows.length } };
};
const match = (row: TargetObjectRow, key: string, params: URLSearchParams, field = key): boolean =>
  !params.get(key) || row[field] === params.get(key);
const client = createStreamEngineClient({
  get: async (url) => {
    requests.push({ method: "GET", url });
    const request = new URL(url, location.origin);
    const params = request.searchParams;
    if (request.pathname === "/api/flow/form-flow-business/type")
      return {
        data: {
          id: "target-flow",
          callType,
          application: businessType,
          applicationName: "故障报修",
          businessType,
          formJson: JSON.stringify(schema),
          flowJson: JSON.stringify(process),
        },
      };
    if (request.pathname.includes("/process/task/form/id/"))
      return {
        data: {
          id: "task-1",
          key: "root",
          properties: { formJson: JSON.stringify(schema), processJson: JSON.stringify(process) },
          data: JSON.stringify({ target: restored, objectType: "SMALL_ENGINEERING" }),
        },
      };
    if (request.pathname === "/api/mdata/area/list") return { data: areaRows };
    if (request.pathname === "/api/device-center/things/product/list/all") return { data: [{ id: "product-1", prodName: "水泵产品" }] };
    if (request.pathname === "/api/device-center/iot/product/category-tree")
      return { data: [{ categoryCode: "mechanical", categoryName: "机电", children: [{ categoryCode: "pump", categoryName: "水泵" }] }] };
    if (request.pathname === "/api/device-center/tag/customer/list") return { data: [{ tagCode: "critical", tagName: "重点设备" }] };
    if (request.pathname === "/api/property/classify/getAssemblyClassifyPage")
      return { data: { records: [{ id: "asset-type-1", name: "办公设备" }], total: 1 } };
    if (request.pathname === "/api/mdata/stall-category/list") return { data: [{ id: "stall-type-1", name: "商铺" }] };
    if (request.pathname === "/api/dictionary/getCascadeDictionaryItem")
      return { data: [{ code: "fire", name: "消防", nextList: [{ code: "fire-equipment", name: "消防设备" }] }] };
    if (request.pathname === "/api/maintain/inspect/sceneTypeList")
      return {
        data: [
          { id: "type-1", name: "消防" },
          { id: "type-2", name: "电气" },
        ],
      };
    if (request.pathname === "/api/maintain/patrol/location/page") {
      const records = patrolRows.filter(
        (row) =>
          String(row.patrolLocationName).includes(params.get("keyword") ?? "") &&
          (!params.get("areaId") || (row.area as Array<{ id: string }>).some((area) => area.id === params.get("areaId"))),
      );
      return pageRows(records, params);
    }
    if (request.pathname === "/api/maintain/inspect/pointList") {
      return pageRows(
        siteRows.filter(
          (row) =>
            String(row.name).includes(params.get("pointName") ?? "") && match(row, "typeId", params) && match(row, "receiveDepId", params),
        ),
        params,
      );
    }
    if (request.pathname === "/api/property/property/detailed/getPropertyDetailedPage") {
      return pageRows(
        propertyRows.filter(
          (row) =>
            String(row.name).includes(params.get("keyword") ?? "") && match(row, "typeId", params) && match(row, "receiveDepId", params),
        ),
        params,
      );
    }
    if (request.pathname === "/api/mdata/stall/page") {
      return pageRows(
        stallRows.filter(
          (row) => String(row.name).includes(params.get("keyword") ?? "") && match(row, "type", params) && match(row, "areaId", params),
        ),
        params,
      );
    }
    if (request.pathname === "/api/property/risk/source/ledger/page") {
      return pageRows(
        riskRows.filter((row) => String(row.name).includes(params.get("keyword") ?? "") && match(row, "typeCode", params)),
        params,
      );
    }
    if (request.pathname === "/api/loose-works/project/schedule/list") {
      return pageRows(
        projectRows.filter(
          (row) =>
            String(row.projectName).includes(params.get("keyword") ?? "") && match(row, "depId", params) && match(row, "status", params),
        ),
        params,
      );
    }
    if (request.pathname === "/api/maintain/outsource/device/list") {
      return pageRows(
        [{ deviceId: "outsource-1", deviceName: "委外水泵", deviceCode: "OD-1", deviceCategory: "机电", areaName: "北区" }].filter((row) =>
          row.deviceName.includes(params.get("keyword") ?? ""),
        ),
        params,
      );
    }
    return { data: [] };
  },
  post: async (url, body) => {
    requests.push({ method: "POST", url, body });
    if (url === "/api/device-center/device/instance/page") {
      const params = body as Record<string, unknown>;
      const records = deviceRows.filter(
        (row) =>
          String(row.name).includes(String(params.keyword ?? "")) &&
          (!params.productId || row.productId === params.productId) &&
          (!params.categoryCode || row.categoryCode === params.categoryCode) &&
          (!params.anyMatchedAreaId || (row.area as { id: string }).id === params.anyMatchedAreaId) &&
          (!params.anyMatchedDepartmentId || (row.department as { id: string }).id === params.anyMatchedDepartmentId) &&
          (!Array.isArray(params.tagCodes) || params.tagCodes.every((tag) => (row.tagCodes as string[]).includes(String(tag)))),
      );
      return pageRows(records, params);
    }
    if (url === "/api/flow/form-flows/first/submit") submissions.push(body);
    return { data: {} };
  },
  put: async () => ({}),
  delete: async () => ({}),
});
const ouaa = createOuaaClient({
  get: async (url) => {
    requests.push({ method: "GET", url });
    return {
      data: [
        { id: "dep-1", name: "维护部" },
        { id: "dep-2", name: "电气部" },
      ],
    };
  },
  post: async () => ({}),
  put: async () => ({}),
});

createApp({
  render: () =>
    h(StreamEngineRender, {
      title: "故障报修",
      type: readonly ? "detail" : "add",
      businessType,
      processInstanceId: readonly ? "process-1" : "",
      notOperates: readonly,
      getClient: async () => client,
      getOuaaClient: async () => ouaa,
    }),
}).mount("#app");
