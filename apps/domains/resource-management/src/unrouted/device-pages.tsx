import type { AreaNode, CategoryNode, ResourceListPage } from "@g2-contract/resource-management";
import { computed, defineComponent, reactive, ref, watch, type DefineComponent } from "vue";

import { getResourceManagementClient, getResourceRuntime } from "../domain-context";
import {
  Button,
  Image,
  Page,
  PageLayout,
  RadioGroup,
  Spin,
  Tabs,
  TabPane,
  Tag,
  Tree,
  message,
  usePcForm,
  usePcTable,
  dayjs,
  type PcTableColumn,
} from "../pc-ui-runtime";

type DeviceRow = Record<string, unknown>;
type PageKind = "device-list" | "device-record" | "device-alarm" | "device-daily-report" | "alarm-daily-report";
const client = () => getResourceManagementClient();
const display = (item: unknown): string => (item === null || item === undefined || item === "" ? "--" : String(item));
const date = (item: unknown, format = "YYYY-MM-DD HH:mm:ss"): string => (item ? dayjs(item as string).format(format) : "--");
const alarmMediaUrl = (item: DeviceRow): string => {
  const path = location.protocol === "http:" ? item.intranetFilePath : item.extranetFilePath;
  const session = (window as Window & { videoSession?: string }).videoSession;
  if (!path) return "";
  return session ? `${String(path)}${String(path).includes("?") ? "&" : "?"}session=${encodeURIComponent(session)}` : String(path);
};
const alarmSnapshots = (device: DeviceRow): DeviceRow[] => {
  const snapshots = Array.isArray(device.snapshots) ? (device.snapshots as DeviceRow[]) : [];
  const properties = Array.isArray(device.productPropVoList) ? (device.productPropVoList as DeviceRow[]) : [];
  const constraints = Array.isArray(device.dataConstraint) ? (device.dataConstraint as DeviceRow[]) : [];
  return properties.flatMap((property) => {
    const current = snapshots.find((snapshot) => snapshot.key === property.propCode);
    if (!current) return [];
    const configured = constraints.find((constraint) => constraint.value === current.val);
    return [{ ...current, name: property.name, unitName: property.unitName, value: configured?.label ?? current.val }];
  });
};
const period = (item: unknown): string | undefined =>
  Array.isArray(item) && item.length === 2
    ? item
        .map((entry) =>
          typeof entry === "string" ? entry : ((entry as { format?: (pattern: string) => string }).format?.("YYYY-MM-DD") ?? String(entry)),
        )
        .join(",")
    : undefined;
const columnsFrom = (pairs: [string, string][]): PcTableColumn[] =>
  pairs.map(([title, dataIndex]) => ({
    title,
    dataIndex,
    ellipsis: true,
    align: "center",
    customRender: ({ text }) =>
      ["createTime", "alarmTime", "operatorTime", "executeTime"].includes(dataIndex)
        ? date(text, title === "日期" ? "YYYY-MM-DD" : undefined)
        : [
              "totalNumber",
              "normalNumber",
              "offlineNumber",
              "alarmNumber",
              "totalNum",
              "suspendNum",
              "progressConfirmedNum",
              "unConfirmedNum",
              "handlerNum",
            ].includes(dataIndex)
          ? String(text ?? 0)
          : display(text),
  }));

const deviceColumns: PcTableColumn[] = [
  { title: "设备编号", dataIndex: "deviceCode", ellipsis: true, width: 180, fixed: "left" },
  { title: "设备名称", dataIndex: "deviceName", ellipsis: true, width: 180 },
  { title: "产品品类", dataIndex: "deviceProdCategoryName", ellipsis: true, width: 180 },
  { title: "所在区域", dataIndex: "areaName", ellipsis: true, width: 180 },
  {
    title: "状态",
    dataIndex: "deviceStatus",
    ellipsis: true,
    width: 180,
    customRender: ({ text }) => <Tag color={text ? "success" : "default"}>{text ? "在线" : "离线"}</Tag>,
  },
];
const recordColumns: PcTableColumn[] = [
  ...columnsFrom([
    ["操作时间", "createTime"],
    ["设备编号", "code"],
    ["设备名称", "name"],
  ]).map((column, index) => ({ ...column, width: index === 1 ? 200 : 180 })),
  { title: "产品品类", dataIndex: "productCategoryName", width: 180 },
  { title: "设备属性", dataIndex: "attributeName", width: 180 },
  {
    title: "操作内容",
    dataIndex: "id",
    width: 200,
    customRender: ({ record }) => {
      const row = record as { originalValue?: { name?: string; value?: string }; expectedValue?: { value?: string } };
      return row.originalValue
        ? `${display(row.originalValue.name)}从【${display(row.originalValue.value)}】调整为【${display(row.expectedValue?.value)}】`
        : "--";
    },
  },
  { title: "操作人", dataIndex: "createBy", width: 180 },
  {
    title: "操作结果",
    dataIndex: "executeResult",
    width: 200,
    customRender: ({ text }) =>
      ({
        ARRIVAL: "命令送达给物联网平台",
        ISSUING: "下发中",
        SUCCESS: "成功",
        FAIL: "失败",
        EXPIRED: "超时",
      })[String(text) as "ARRIVAL" | "ISSUING" | "SUCCESS" | "FAIL" | "EXPIRED"] ?? "--",
  },
];
const alarmColumns = columnsFrom([
  ["报警编号", "code"],
  ["报警时间", "alarmTime"],
  ["报警对象", "alarmTargetName"],
  ["产品品类", "deviceProdCategoryName"],
  ["所属区域", "areaName"],
  ["设备健康值", "alarmThreshold"],
  ["处理状态", "alarmStatusName"],
]).map((column, index) => ({ ...column, width: 180, ...(index < 2 ? { fixed: "left" as const } : {}) }));
const deviceReportColumns = columnsFrom([
  ["日期", "createTime"],
  ["所属医院", "tenantName"],
  ["产品品类", "deviceProdCategoryName"],
  ["数量", "totalNumber"],
  ["在线数量", "normalNumber"],
  ["离线数量", "offlineNumber"],
  ["报警次数", "alarmNumber"],
]);
const alarmReportColumns = columnsFrom([
  ["日期", "createTime"],
  ["所属医院", "tenantName"],
  ["产品品类", "deviceProdCategoryName"],
  ["报警数量", "totalNum"],
  ["待接收数量", "suspendNum"],
  ["处理中数量", "progressConfirmedNum"],
  ["已挂起次数", "unConfirmedNum"],
  ["已处理次数", "handlerNum"],
]);
const titles: Record<PageKind, string> = {
  "device-list": "设备列表",
  "device-record": "设备日志",
  "device-alarm": "设备报警",
  "device-daily-report": "设备日报表",
  "alarm-daily-report": "报警日报表",
};

function makeDevicePage(kind: PageKind): DefineComponent {
  return defineComponent({
    name: `Unrouted${kind}`,
    setup() {
      const runtime = getResourceRuntime();
      const query = reactive({
        tenant: runtime.terminal === "kh-admin-web" ? (undefined as string | undefined) : runtime.tenant,
        keyword: "",
        category: undefined as string[] | undefined,
        area: undefined as string[] | undefined,
        period: undefined as unknown,
        executeResult: undefined as string | undefined,
        status: "",
      });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const tenants = ref<{ label: string; value: string }[]>([]);
      const categories = ref<CategoryNode[]>([]);
      const areas = ref<AreaNode[]>([]);
      const treeTab = ref("area");
      const alarmDetail = ref<{ id: string; businessKey: string; status: string }>();
      let version = 0;
      const columns: PcTableColumn[] = [
        ...(kind === "device-list"
          ? deviceColumns
          : kind === "device-record"
            ? recordColumns
            : kind === "device-alarm"
              ? alarmColumns
              : kind === "device-daily-report"
                ? deviceReportColumns
                : alarmReportColumns),
        ...(kind === "device-list" || kind === "device-alarm"
          ? [
              {
                title: "操作",
                dataIndex: "id",
                width: 120,
                fixed: "right" as const,
                customRender: ({ record }: { record: DeviceRow }) => (
                  <Button
                    type="link"
                    onClick={() => {
                      if (kind === "device-alarm")
                        alarmDetail.value = {
                          id: String(record.id ?? ""),
                          businessKey: String(record.businessKey ?? ""),
                          status: String(record.alarmStatus ?? ""),
                        };
                      else {
                        const id = String(record.deviceId ?? "");
                        history.pushState(
                          { current: location.pathname + location.search },
                          "",
                          `/portal/genericEquipmentMonitor/equipmentMoitorDetail?type=detail&deviceId=${encodeURIComponent(id)}`,
                        );
                        window.dispatchEvent(new PopStateEvent("popstate"));
                      }
                    }}
                  >
                    详情
                  </Button>
                ),
              },
            ]
          : []),
      ];
      const [PcTable, table] = usePcTable({
        columns,
        rowKey: "id",
        tableCode: `d/resource-management/${kind}`,
        pagination: false,
        autoFetch: false,
      });
      const categoryCode = (): string | undefined => query.category?.at(-1);
      const areaId = (): string | undefined => query.area?.at(-1);
      const loadOptions = async (tenant: string): Promise<void> => {
        categories.value = [];
        areas.value = [];
        if (!tenant) return;
        try {
          const [categoryRows, areaRows] = await Promise.all([client().listProductCategories(tenant), client().listAreas(tenant)]);
          if (query.tenant === tenant) {
            categories.value = categoryRows;
            areas.value = areaRows;
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : "筛选项加载失败");
        }
      };
      const load = async (): Promise<void> => {
        const current = ++version;
        if (!query.tenant) {
          table.setDataSource([]);
          page.total = 0;
          return;
        }
        table.loading.value = true;
        try {
          const base = { pageNumber: page.pageNumber, pageSize: page.pageSize, tenant: query.tenant };
          let result: ResourceListPage<DeviceRow>;
          if (kind === "device-list")
            result = await client().pageMonitoredDevices(
              {
                ...base,
                applicationCode: "OPERATING_ROOM",
                keyword: query.keyword,
                areaId: areaId(),
                deviceProdCategoryCodeConcat: categoryCode(),
              },
              query.tenant,
            );
          else if (kind === "device-record")
            result = await client().pageDeviceLogs(
              {
                ...base,
                period: period(query.period),
                executeResult: query.executeResult,
                deviceProdCategoryCodeConcat: categoryCode(),
              },
              query.tenant,
            );
          else if (kind === "device-alarm")
            result = await client().pageAlarms(
              {
                ...base,
                alarmStatus: query.status,
                areaIds: query.area?.join("-") ?? "",
                period: period(query.period),
                applicationCode: "OPERATING_ROOM",
              },
              query.tenant,
            );
          else if (kind === "device-daily-report")
            result = await client().pageMedicalDevices(
              {
                ...base,
                period: period(query.period),
                deviceProdCategoryCode: categoryCode(),
              },
              query.tenant,
            );
          else
            result = await client().pageMedicalAlarms(
              {
                ...base,
                period: period(query.period),
                deviceProdCategoryCode: categoryCode(),
              },
              query.tenant,
            );
          if (current === version) {
            table.setDataSource(result.records);
            page.total = result.total;
          }
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : `${titles[kind]}加载失败`);
        } finally {
          if (current === version) table.loading.value = false;
        }
      };
      const schema: Parameters<typeof usePcForm>[0]["schema"] = [
        {
          component: "Select",
          fieldName: "tenant",
          label: "所属医院",
          defaultValue: query.tenant,
          componentProps: { options: tenants, placeholder: "请选择所属医院", allowClear: false, style: { width: "180px" } },
        },
      ];
      if (kind === "device-list") {
        schema.push({
          component: "Input",
          fieldName: "keyword",
          label: "设备名称",
          defaultValue: "",
          componentProps: { placeholder: "请输入设备名称", style: { width: "180px" } },
        });
      } else {
        if (kind !== "device-alarm")
          schema.push({
            component: "Cascader",
            fieldName: "category",
            label: "产品品类",
            defaultValue: undefined,
            componentProps: {
              options: categories,
              fieldNames: { label: "categoryName", value: "categoryCode", children: "children" },
              placeholder: "请选择产品品类",
              changeOnSelect: true,
              style: { width: "180px" },
            },
          });
        if (kind === "device-record")
          schema.push({
            component: "Select",
            fieldName: "executeResult",
            label: "操作结果",
            defaultValue: undefined,
            componentProps: {
              options: [
                { label: "命令送达给物联网平台", value: "ARRIVAL" },
                { label: "下发中", value: "ISSUING" },
                { label: "成功", value: "SUCCESS" },
                { label: "失败", value: "FAIL" },
                { label: "超时", value: "EXPIRED" },
              ],
              placeholder: "请选择操作对象",
              allowClear: true,
              style: { width: "180px" },
            },
          });
        if (kind === "device-alarm") {
          schema.push({
            component: "Cascader",
            fieldName: "category",
            label: "产品品类",
            defaultValue: undefined,
            componentProps: {
              options: categories,
              fieldNames: { label: "categoryName", value: "categoryCode", children: "children" },
              placeholder: "请选择产品品类",
              changeOnSelect: true,
              style: { width: "180px" },
            },
          });
          schema.push({
            component: "Cascader",
            fieldName: "area",
            label: "所属区域",
            defaultValue: undefined,
            componentProps: {
              options: areas,
              fieldNames: { label: "name", value: "id", children: "children" },
              placeholder: "请选择所属区域",
              changeOnSelect: true,
              style: { width: "180px" },
            },
          });
        }
        schema.push({
          component: "RangePicker",
          fieldName: "period",
          label: kind === "device-alarm" ? "报警时间" : "时间范围",
          defaultValue: undefined,
          componentProps: { style: { width: "250px" } },
        });
      }
      const [PcForm] = usePcForm({
        layout: "horizontal",
        cache: false,
        syncStateRef: query,
        schema,
        handleSubmit: () => {
          page.pageNumber = 1;
          void load();
        },
        handleReset: () => {
          page.pageNumber = 1;
          query.status = "";
          void load();
        },
        handleValuesChange: (_values, changed) => {
          if (changed && "tenant" in changed) {
            query.tenant = typeof changed.tenant === "string" ? changed.tenant : undefined;
            query.category = undefined;
            query.area = undefined;
            page.pageNumber = 1;
            void loadOptions(query.tenant ?? "");
            void load();
          }
        },
      });
      void client()
        .listTenants()
        .then((rows) => {
          tenants.value = rows.map((row) => ({ label: row.name, value: row.code }));
          if (!query.tenant && rows[0]) query.tenant = rows[0].code;
          if (query.tenant) {
            void loadOptions(query.tenant);
            void load();
          }
        })
        .catch((error: unknown) => message.error(error instanceof Error ? error.message : "医院列表加载失败"));
      type TreeNode = { key: string; title: string; children?: TreeNode[] };
      const toTree = (items: AreaNode[] | CategoryNode[], category: boolean): TreeNode[] =>
        items.map((item) =>
          category
            ? {
                key: (item as CategoryNode).categoryCode,
                title: (item as CategoryNode).categoryName,
                children: (item as CategoryNode).children ? toTree((item as CategoryNode).children ?? [], true) : undefined,
              }
            : {
                key: (item as AreaNode).id,
                title: (item as AreaNode).name,
                children: (item as AreaNode).children ? toTree((item as AreaNode).children ?? [], false) : undefined,
              },
        );
      const showTree = computed(() => kind === "device-list");
      const slots = {
        "layout-content": () => (
          <>
            {kind === "device-alarm" && (
              <RadioGroup
                buttonStyle="solid"
                value={query.status}
                options={[
                  { label: "所有", value: "" },
                  { label: "待接收", value: "ALARM_UN_CONFIRMED" },
                  { label: "处理中", value: "ALARM_PROGRESS_CONFIRMED" },
                  { label: "已挂起", value: "ALARM_SUSPEND" },
                  { label: "已处理", value: "ALARM_HANDLER" },
                ]}
                onChange={(event: { target?: { value?: string } }) => {
                  query.status = event.target?.value ?? "";
                  page.pageNumber = 1;
                  void load();
                }}
              />
            )}
            <PcForm />
            {showTree.value ? (
              <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
                <div style={{ width: "220px", overflow: "auto", borderRight: "1px solid #eee", marginRight: "12px" }}>
                  <Tabs
                    activeKey={treeTab.value}
                    onChange={(key: string | number) => {
                      treeTab.value = String(key);
                    }}
                  >
                    <TabPane key="area" tab="所在区域">
                      <Tree
                        treeData={toTree(areas.value, false)}
                        onSelect={(keys) => {
                          query.area = keys.length ? [String(keys[0])] : undefined;
                          page.pageNumber = 1;
                          void load();
                        }}
                      />
                    </TabPane>
                    <TabPane key="category" tab="产品分类">
                      <Tree
                        treeData={toTree(categories.value, true)}
                        onSelect={(keys) => {
                          query.category = keys.length ? [String(keys[0])] : undefined;
                          page.pageNumber = 1;
                          void load();
                        }}
                      />
                    </TabPane>
                  </Tabs>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PcTable />
                </div>
              </div>
            ) : (
              <PcTable />
            )}
          </>
        ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            cachePageQuery={false}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return () =>
        alarmDetail.value ? (
          <DeviceAlarmDetail
            id={alarmDetail.value.id}
            businessKey={alarmDetail.value.businessKey}
            alarmStatus={alarmDetail.value.status}
            tenant={query.tenant ?? ""}
            onClose={() => {
              alarmDetail.value = undefined;
            }}
          />
        ) : (
          <PageLayout title={titles[kind]} v-slots={slots} />
        );
    },
  }) as DefineComponent;
}

export const DeviceList = makeDevicePage("device-list");
export const DeviceRecord = makeDevicePage("device-record");
export const DeviceAlarm = makeDevicePage("device-alarm");
export const DeviceDailyRecord = makeDevicePage("device-daily-report");
export const AlarmDailyRecord = makeDevicePage("alarm-daily-report");

export const DeviceAlarmDetail = defineComponent({
  name: "UnroutedDeviceAlarmDetail",
  props: {
    id: { type: String, required: true },
    businessKey: { type: String, required: true },
    alarmStatus: { type: String, required: true },
    tenant: { type: String, required: true },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const tab = ref("detail");
    const detail = ref<DeviceRow>({});
    const process = ref<DeviceRow[]>([]);
    const actions = ref<DeviceRow[]>([]);
    const records = ref<DeviceRow[]>([]);
    const media = ref<DeviceRow[]>([]);
    const snapshot = ref<DeviceRow[]>([]);
    const loading = ref(false);
    const executing = ref<string>();
    let version = 0;
    const load = async (name: string): Promise<void> => {
      const current = ++version;
      loading.value = true;
      try {
        if (name === "detail") {
          const [alarm, files, device] = await Promise.all([
            client().getAlarm(props.id, props.tenant),
            client().listAlarmMedia(props.businessKey),
            client().getNorthDeviceDetail(props.id, props.tenant),
          ]);
          if (current === version) {
            detail.value = alarm;
            media.value = files;
            snapshot.value = alarmSnapshots(device);
          }
        } else if (name === "actions") {
          const [list, history] = await Promise.all([
            client().listAlarmLinkActions(props.id, props.tenant),
            client().listAlarmLinkRecords(props.id, props.tenant),
          ]);
          if (current === version) {
            actions.value = list;
            records.value = history;
          }
        } else {
          const list = await client().listAlarmProcess(props.id, props.tenant);
          if (current === version) process.value = list;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "报警详情加载失败");
      } finally {
        if (current === version) loading.value = false;
      }
    };
    void load("detail");
    const execute = async (id: string): Promise<void> => {
      if (executing.value) return;
      executing.value = id;
      try {
        await client().executeAlarmAction(id, props.tenant);
        message.success("下发指令成功");
        await load("actions");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "执行失败");
      } finally {
        executing.value = undefined;
      }
    };
    const [ActionTable, actionTable] = usePcTable({
      columns: [
        ...columnsFrom([
          ["设备名称", "deviceName"],
          ["设备属性", "propName"],
          ["执行动作", "propValue"],
        ]),
        { title: "执行时机", dataIndex: "executeMode", customRender: ({ text }) => (text === "AUTOMATIC" ? "自动" : "手动") },
        {
          title: "操作",
          dataIndex: "id",
          customRender: ({ record }) => (
            <Button
              type="link"
              loading={executing.value === String((record as DeviceRow).id)}
              onClick={() => void execute(String((record as DeviceRow).id))}
            >
              执行
            </Button>
          ),
        },
      ],
      rowKey: "id",
      tableCode: "d/resource-management/alarm-actions",
      pagination: false,
      autoFetch: false,
    });
    const [RecordTable, recordTable] = usePcTable({
      columns: [
        ...columnsFrom([
          ["执行时间", "executeTime"],
          ["触发人", "operatorName"],
          ["设备名称", "deviceName"],
          ["设备属性", "propName"],
          ["执行动作", "propValue"],
        ]),
        {
          title: "执行结果",
          dataIndex: "executeStatus",
          customRender: ({ text }) =>
            ({ ARRIVAL: "下发成功", ISSUING: "下发中", SUCCESS: "执行成功", FAIL: "执行失败", EXPIRED: "执行超时" })[
              String(text) as "ARRIVAL" | "ISSUING" | "SUCCESS" | "FAIL" | "EXPIRED"
            ] ?? "--",
        },
      ],
      rowKey: "id",
      tableCode: "d/resource-management/alarm-action-records",
      pagination: false,
      autoFetch: false,
    });
    const [ProcessTable, processTable] = usePcTable({
      columns: columnsFrom([
        ["时间", "operatorTime"],
        ["操作人", "operatorByName"],
        ["处理内容", "operatorContent"],
      ]),
      rowKey: "id",
      tableCode: "d/resource-management/alarm-process",
      pagination: false,
      autoFetch: false,
    });
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <Tabs
            activeKey={tab.value}
            onChange={(key: string | number) => {
              tab.value = String(key);
              void load(tab.value);
            }}
          >
            <TabPane key="detail" tab="报警详情">
              <div style={{ padding: "16px" }}>
                {[
                  ["报警时间", date(detail.value.alarmTime)],
                  ["报警设备", display(detail.value.alarmTargetName)],
                  ["报警级别", display(detail.value.alarmLevelName)],
                  ["报警健康值", display(detail.value.alarmThreshold)],
                  ["报警区域", display(detail.value.areaName)],
                  ["处理人", display(detail.value.alarmHandlerName)],
                  ["超时状态", display(detail.value.alarmHandlerTimeoutStatusName)],
                  ["处理状态", display(detail.value.alarmStatusName)],
                ].map(([label, content]) => (
                  <div key={label} style={{ display: "inline-block", width: "33%", marginBottom: "14px" }}>
                    <b>{label}：</b>
                    {content}
                  </div>
                ))}
                {detail.value.alarmStatus === "ALARM_HANDLER" && (
                  <>
                    <h3>处理结果</h3>
                    {[
                      ["处理结果", display(detail.value.alarmHandlerResultName)],
                      ["处理说明", display((detail.value.handler as DeviceRow | undefined)?.alarmHandlerResultRemark)],
                      ["处理时间", date((detail.value.handler as DeviceRow | undefined)?.createTime)],
                      ["处理人员", display((detail.value.handler as DeviceRow | undefined)?.createUserName)],
                    ].map(([label, content]) => (
                      <div key={label} style={{ display: "inline-block", width: "50%", marginBottom: "14px" }}>
                        <b>{label}：</b>
                        {content}
                      </div>
                    ))}
                    <div>
                      现场图片：
                      {(Array.isArray((detail.value.handler as DeviceRow | undefined)?.fileVOS)
                        ? ((detail.value.handler as DeviceRow).fileVOS as DeviceRow[])
                        : []
                      )
                        .filter((item) => item.path)
                        .map((item) => (
                          <Image key={String(item.id)} src={String(item.path)} width={100} />
                        ))}
                    </div>
                  </>
                )}
                {detail.value.alarmStatus === "ALARM_SUSPEND" && (
                  <>
                    <h3>报警挂起</h3>
                    {[
                      ["预计处理时间", date((detail.value.suspend as DeviceRow | undefined)?.estimatedProcessTime)],
                      ["挂起原因", display((detail.value.suspend as DeviceRow | undefined)?.remark)],
                      ["挂起时间", date((detail.value.suspend as DeviceRow | undefined)?.createTime)],
                      ["操作挂起人员", display((detail.value.suspend as DeviceRow | undefined)?.createUserName)],
                    ].map(([label, content]) => (
                      <div key={label} style={{ display: "inline-block", width: "50%", marginBottom: "14px" }}>
                        <b>{label}：</b>
                        {content}
                      </div>
                    ))}
                    <div>
                      现场图片：
                      {(Array.isArray((detail.value.suspend as DeviceRow | undefined)?.fileVOS)
                        ? ((detail.value.suspend as DeviceRow).fileVOS as DeviceRow[])
                        : []
                      )
                        .filter((item) => item.path)
                        .map((item) => (
                          <Image key={String(item.id)} src={String(item.path)} width={100} />
                        ))}
                    </div>
                  </>
                )}
                <h3>报警录像</h3>
                {media.value.filter((item) => item.type === "VIDEOTAPE").length ? (
                  media.value
                    .filter((item) => item.type === "VIDEOTAPE")
                    .map((item) => <video key={String(item.id)} controls width={520} height={300} src={alarmMediaUrl(item)} />)
                ) : (
                  <p>暂无录像</p>
                )}
                <h3>报警抓拍</h3>
                {media.value.filter((item) => item.type === "PHOTOGRAPH").length ? (
                  media.value
                    .filter((item) => item.type === "PHOTOGRAPH")
                    .map((item) => <Image key={String(item.id)} width={520} height={300} src={alarmMediaUrl(item)} />)
                ) : (
                  <p>暂无抓拍</p>
                )}
                <h3>设备属性快照</h3>
                <div>
                  {snapshot.value.map((item) => (
                    <div key={String(item.key)}>
                      {display(item.name ?? item.key)}：{display(item.value ?? item.val)} {display(item.unitName)}
                    </div>
                  ))}
                </div>
              </div>
            </TabPane>
            <TabPane key="actions" tab="联动动作">
              <ActionTable />
              <h3>执行记录</h3>
              <RecordTable />
            </TabPane>
            <TabPane key="process" tab="处理记录">
              <ProcessTable />
            </TabPane>
          </Tabs>
        </Spin>
      ),
      "footer-page": () => <Button onClick={() => emit("close")}>返回</Button>,
    };
    actionTable.setDataSource(actions.value);
    recordTable.setDataSource(records.value);
    processTable.setDataSource(process.value);
    // Tab 数据异步返回时同步到公共表格。
    watch(actions, (rows) => actionTable.setDataSource(rows));
    watch(records, (rows) => recordTable.setDataSource(rows));
    watch(process, (rows) => processTable.setDataSource(rows));
    return () => <PageLayout title="报警详情" v-slots={slots} />;
  },
});
