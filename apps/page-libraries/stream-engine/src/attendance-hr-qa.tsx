import { createStreamEngineClient } from "@g2-client/stream-engine/client";
import { ConfigProvider } from "@g2-platform/pc-ui";
import { createApp, defineComponent, reactive, ref } from "vue";

import { ATTENDANCE_CONTROLS, HR_CONTROLS, attendanceHrDefaults } from "./components/attendance-hr-catalog";
import { renderFormControl } from "./form-controls";
import type { FormSchemaItem } from "./form-schema";

const doors = [
  { id: "door-1", doorCode: "D-001", name: "东门", typeName: "人员门禁", areaName: "一层" },
  { id: "door-2", doorCode: "D-002", name: "西门", typeName: "人员门禁", areaName: "二层" },
];
const lots = [
  { id: "lot-1", code: "P-001", name: "地面停车场" },
  { id: "lot-2", code: "P-002", name: "地下停车场" },
];
const requests: string[] = [];
const http = {
  get: async (url: string) => {
    requests.push(url);
    if (url.startsWith("/api/attendance/att/holiday/rule/list"))
      return {
        data: [
          { id: "half", name: "半天假" },
          { id: "full", name: "全天假" },
        ],
      };
    if (url.startsWith("/api/attendance/detail/type/"))
      return { data: { minimumLeaveTimeUnitConvert: { minimumLeaveTimeUnit: url.endsWith("half") ? "HALF_DAY" : "HOUR" } } };
    if (url.startsWith("/api/attendance/work/overtime/duration")) return { data: { name: "8", id: "duration-8" } };
    if (url.startsWith("/api/door/getDoorType")) return { data: [{ id: "type-1", doorTypeName: "人员门禁" }] };
    if (url.startsWith("/api/mdata/area/list")) return { data: [{ id: "area-1", name: "一层", children: [] }] };
    if (url.startsWith("/api/door/getDoorDevicePage")) return { data: { records: doors, total: doors.length } };
    if (url.startsWith("/api/park-management/parking-infos-page")) return { data: { records: lots, total: lots.length } };
    return { data: [] };
  },
  post: async () => ({ data: {} }),
  put: async () => ({ data: {} }),
  delete: async () => ({ data: {} }),
};
const client = createStreamEngineClient(http);
const fields: FormSchemaItem[] = [
  { id: "access", title: "门禁权限", name: "AccessPermission", valueType: "Object", props: {} },
  { id: "parking", title: "停车权限", name: "ParkingPermission", valueType: "Object", props: {} },
  { id: "service", title: "服务期限", name: "ServicePeriod", valueType: "Object", props: { params: "category" } },
];
const allFields: FormSchemaItem[] = [...ATTENDANCE_CONTROLS, ...HR_CONTROLS].map((control, index) => ({
  id: `qa-${index}`,
  title: control.title,
  name: control.name,
  valueType: control.valueType,
  ...attendanceHrDefaults(control),
}));
const auditFields: FormSchemaItem[] = [
  { id: "holiday", title: "请假类型", name: "VacationType", props: {} },
  { id: "leaveDate", title: "请假时间", name: "VacationDate", props: { params: "holiday" } },
  { id: "overtimeType", title: "加班类型", name: "OvertimeType", props: {} },
  { id: "overtimePeriod", title: "加班时间", name: "DateTimeRange", props: { format: "yyyy-MM-dd HH:mm:ss" } },
  { id: "overtimeLength", title: "加班时长", name: "OvertimeLength", props: { params: "overtimeType", params2: "overtimePeriod" } },
  { id: "legacyOvertimeLength", title: "旧表单加班时长", name: "OvertimeLength", props: {} },
];
const visibleFields = location.search.includes("audit=1") ? auditFields : location.search.includes("all=1") ? allFields : fields;

const App = defineComponent({
  setup() {
    const values = reactive<Record<string, unknown>>(
      location.search.includes("audit=1")
        ? {
            holiday: { id: "half", name: "半天假" },
            leaveDate: ["2026-09-24,AM", "2026-09-25,PM"],
            overtimeType: "WORK",
            overtimePeriod: ["2026-09-24 08:00:00", "2026-09-24 16:00:00"],
          }
        : { category: { label: "驻场人员", value: "ZCRY" } },
    );
    const readonly = ref(false);
    return () => (
      <ConfigProvider locale={{ locale: "zh-cn" }}>
        <main style={{ maxWidth: "1080px", margin: "24px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "20px" }}>考勤人事控件验收</h1>
          <button
            onClick={() => {
              readonly.value = !readonly.value;
            }}
          >
            切换{readonly.value ? "编辑" : "只读"}
          </button>
          {visibleFields.map((item) => (
            <section key={item.id} style={{ marginTop: "24px" }}>
              <h2 style={{ fontSize: "16px" }}>{item.title}</h2>
              {renderFormControl(
                item,
                values[String(item.id)],
                (next) => {
                  values[String(item.id)] = next;
                },
                { client, formValues: values, schemaItems: visibleFields, readonly: readonly.value },
              )}
            </section>
          ))}
          <pre id="values">{JSON.stringify(values, null, 2)}</pre>
          <pre id="requests">{requests.join("\n")}</pre>
        </main>
      </ConfigProvider>
    );
  },
});

createApp(App).mount("#app");
