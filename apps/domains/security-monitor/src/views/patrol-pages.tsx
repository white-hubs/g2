import type { SecurityMonitorClient } from "@g2-client/security-monitor/client";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getSecurityMonitorClient, getSecurityOuaaClient } from "../domain-context";
import { type SecurityRecord, normalizePage, normalizeRecord, recordId, text } from "./data";
import { defineAsyncSecurityPcUiComponent, securityPcUiMessage as message } from "./pc-ui-runtime";

import styles from "./security-monitor.module.css";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

const Button = defineAsyncSecurityPcUiComponent("Button");
const Form = defineAsyncSecurityPcUiComponent("Form");
const FormItem = defineAsyncSecurityPcUiComponent("FormItem");
const Image = defineAsyncSecurityPcUiComponent("Image");
const Input = defineAsyncSecurityPcUiComponent("Input");
const Modal = defineAsyncSecurityPcUiComponent("Modal");
const Page = defineAsyncSecurityPcUiComponent("Page");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const PopConfirm = defineAsyncSecurityPcUiComponent("PopConfirm");
const RangePicker = defineAsyncSecurityPcUiComponent("RangePicker");
const Select = defineAsyncSecurityPcUiComponent("Select");
const Space = defineAsyncSecurityPcUiComponent("Space");
const Spin = defineAsyncSecurityPcUiComponent("Spin");
const Switch = defineAsyncSecurityPcUiComponent("Switch");
const TabPane = defineAsyncSecurityPcUiComponent("TabPane");
const Table = defineAsyncSecurityPcUiComponent("Table");
const Tabs = defineAsyncSecurityPcUiComponent("Tabs");
const Tag = defineAsyncSecurityPcUiComponent("Tag");
const Textarea = defineAsyncSecurityPcUiComponent("Textarea");

const cell = (row: SecurityRecord, ...keys: string[]) => text(row, ...keys);

type PatrolPersonTargetType = "USER" | "DEPARTMENT" | "ROLE";

interface PatrolPersonConfig {
  id: string;
  messageTargetNotify: PatrolPersonTargetType;
  targetConfig: SecurityRecord[];
}

interface PatrolOption {
  label: string;
  value: string;
  record?: SecurityRecord;
}

const PATROL_PERSON_TARGET_OPTIONS: PatrolOption[] = [
  { label: "人员", value: "USER" },
  { label: "部门", value: "DEPARTMENT" },
  { label: "角色", value: "ROLE" },
];

function guid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/gu, (char) => {
    const random = Math.trunc(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function sanitizeLineInput(value: string): string {
  return value.replace(/[, ]/gu, "");
}

function patrolPersonTypeLabel(type: unknown): string {
  if (type === "DEPARTMENT") {
    return "部门";
  }
  if (type === "ROLE") {
    return "角色";
  }
  return "用户";
}

function patrolPersonName(person: SecurityRecord, targetType: unknown): string {
  if (targetType === "DEPARTMENT") {
    return String(person.departmentName ?? "");
  }
  if (targetType === "ROLE") {
    return String(person.roleName ?? "");
  }
  return String(person.userName ?? "");
}

function patrolPersonId(person: SecurityRecord, targetType: unknown): string {
  if (targetType === "DEPARTMENT") {
    return cell(person, "departmentId", "id").replace(/^--$/u, "");
  }
  if (targetType === "ROLE") {
    return cell(person, "roleId", "id").replace(/^--$/u, "");
  }
  return cell(person, "userId", "id").replace(/^--$/u, "");
}

function patrolPersonValue(person: SecurityRecord, targetType: unknown): string {
  return patrolPersonId(person, targetType) || cell(person, "id", "userId", "departmentId", "roleId").replace(/^--$/u, "");
}

function usePagedLoader(loader: (api: SecurityMonitorClient, query: Record<string, unknown>) => Promise<unknown>) {
  const rows = ref<SecurityRecord[]>([]);
  const loading = ref(false);
  const page = reactive({ pageNumber: 1, pageSize: 10, total: 0, keyword: "", period: "", cameraPatrolLineId: "" });
  const load = async (): Promise<void> => {
    loading.value = true;
    try {
      const api = await getSecurityMonitorClient();
      const result = normalizePage(await loader(api, page));
      rows.value = result.records;
      page.total = result.total;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "数据加载失败");
      rows.value = [];
      page.total = 0;
    } finally {
      loading.value = false;
    }
  };
  return { rows, loading, page, load };
}

export const PatrolLinePage = defineComponent({
  name: "SecurityMonitorPatrolLinePage",
  setup() {
    const router = useRouter();
    const { rows, loading, page, load } = usePagedLoader((api, query) => api.listPatrolLines(query));
    const tableViewportRef = ref<HTMLElement>();
    const tableBodyHeight = ref(320);
    let tableResizeObserver: ResizeObserver | undefined;

    const updateTableBodyHeight = (): void => {
      const tableViewport = tableViewportRef.value;
      if (!(tableViewport instanceof HTMLElement)) {
        return;
      }
      const header = tableViewport.querySelector(".ant-table-thead");
      const headerHeight = header instanceof HTMLElement ? header.getBoundingClientRect().height : 55;
      tableBodyHeight.value = Math.max(160, Math.floor(tableViewport.clientHeight - headerHeight));
    };

    const columns = [
      { title: "路线名称", dataIndex: "name", width: 160, ellipsis: true },
      { title: "监控点数", dataIndex: "cameraNum", width: 100 },
      { title: "创建人员", dataIndex: "createByName", width: 120, ellipsis: true },
      { title: "建议巡逻时间", dataIndex: "patrolProposalTime", width: 140 },
      { title: "创建时间", dataIndex: "createTime", width: 180 },
      { title: "巡逻次数", dataIndex: "patrolNum", width: 100 },
      { title: "最近巡逻时间", dataIndex: "patrolLastTime", width: 180 },
      { title: "巡逻人员", dataIndex: "patrolUserNames", width: 140, ellipsis: true },
      {
        title: "是否启用",
        dataIndex: "enabled",
        width: 100,
        customRender: ({ record }: { record: SecurityRecord }) => (
          <Switch
            checked={Boolean(record.enabled)}
            onChange={async (checked: boolean) => {
              await (await getSecurityMonitorClient()).togglePatrolLine(recordId(record), checked);
              message.success("操作成功");
              await load();
            }}
          />
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        fixed: "right" as const,
        width: 280,
        customRender: ({ record }: { record: SecurityRecord }) => (
          <Space class={styles.planActions} size={4}>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/patrolLineDetail?id=${recordId(record)}`)}>
              详情
            </Button>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/addLine?id=${recordId(record)}`)}>
              编辑
            </Button>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/implementPatro?id=${recordId(record)}`)}>
              巡逻
            </Button>
            <PopConfirm
              title="确认删除该巡逻路线？"
              onConfirm={async () => {
                await (await getSecurityMonitorClient()).deletePatrolLine(recordId(record));
                message.success("删除成功");
                await load();
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];
    onMounted(async () => {
      await nextTick();
      updateTableBodyHeight();
      if (tableViewportRef.value) {
        tableResizeObserver = new ResizeObserver(() => updateTableBodyHeight());
        tableResizeObserver.observe(tableViewportRef.value);
      }
      window.addEventListener("resize", updateTableBodyHeight);
      await load();
      await nextTick();
      updateTableBodyHeight();
    });
    onBeforeUnmount(() => {
      tableResizeObserver?.disconnect();
      window.removeEventListener("resize", updateTableBodyHeight);
    });
    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => router.push("/d/security-monitor/addLine")}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <div class={styles.listPageContent}>
          <div class={styles.filterBar}>
            <Input
              class={styles.search}
              value={page.keyword}
              allowClear
              placeholder="请输入线路名称"
              onUpdate:value={(value: string) => (page.keyword = value)}
              onPressEnter={() => {
                page.pageNumber = 1;
                void load();
              }}
            />
            <Button type="primary" onClick={() => void load()}>
              查询
            </Button>
            <Button
              onClick={() => {
                page.keyword = "";
                page.pageNumber = 1;
                void load();
              }}
            >
              重置
            </Button>
          </div>
          <div ref={tableViewportRef} class={styles.listPageTable}>
            <Table
              rowKey={(row: SecurityRecord) => recordId(row)}
              columns={columns}
              dataSource={rows.value}
              loading={loading.value}
              pagination={false}
              scroll={{ x: 1500, y: tableBodyHeight.value }}
            />
          </div>
        </div>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => <PageLayout title="巡逻线路" v-slots={slots} />;
  },
});

export const PatrolLineEditorPage = defineComponent({
  name: "SecurityMonitorPatrolLineEditorPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = String(route.query.id ?? "");
    const saving = ref(false);
    const deviceModal = ref(false);
    const deviceRows = ref<SecurityRecord[]>([]);
    const selectedDeviceIds = ref<string[]>([]);
    const personOptions = reactive<Record<PatrolPersonTargetType, PatrolOption[]>>({
      USER: [],
      DEPARTMENT: [],
      ROLE: [],
    });
    const model = reactive({
      name: "",
      patrolProposalTime: "",
      enabled: true,
      deviceModifyParams: [] as SecurityRecord[],
      personModifyParams: [] as PatrolPersonConfig[],
    });

    const toOption = (row: SecurityRecord, type: PatrolPersonTargetType): PatrolOption => {
      const optionId = String(row.id ?? row.userId ?? row.departmentId ?? row.roleId ?? "");
      const name = cell(row, "name", "userName", "username", "departmentName", "roleName", "aliasName");
      const record =
        type === "DEPARTMENT"
          ? ({
              ...row,
              id: optionId,
              departmentId: row.departmentId ?? optionId,
              departmentName: row.departmentName ?? name,
            } as SecurityRecord)
          : type === "ROLE"
            ? ({ ...row, id: optionId, roleId: row.roleId ?? optionId, roleName: row.roleName ?? name } as SecurityRecord)
            : ({ ...row, id: optionId, userId: row.userId ?? optionId, userName: row.userName ?? row.username ?? name } as SecurityRecord);
      return { label: name, value: optionId, record };
    };

    const loadPersonOptions = async (): Promise<void> => {
      try {
        const api = await getSecurityOuaaClient();
        const [users, departments, roles] = await Promise.allSettled([
          api.listUsers({ pageNumber: 1, pageSize: 1000, keyword: "" }),
          api.getOrganizations({ enabled: true }),
          api.getRoles(),
        ]);
        if (users.status === "fulfilled") {
          personOptions.USER = normalizePage(users.value)
            .records.map((row) => toOption(row, "USER"))
            .filter((item) => item.value);
        }
        if (departments.status === "fulfilled") {
          const departmentRows: SecurityRecord[] = [];
          const visit = (items: unknown): void => {
            for (const item of Array.isArray(items) ? items : normalizePage(items).records) {
              departmentRows.push(item);
              visit(item.children);
            }
          };
          visit(departments.value);
          personOptions.DEPARTMENT = departmentRows.map((row) => toOption(row, "DEPARTMENT")).filter((item) => item.value);
        }
        if (roles.status === "fulfilled") {
          personOptions.ROLE = normalizePage(roles.value)
            .records.map((row) => toOption(row, "ROLE"))
            .filter((item) => item.value);
        }
      } catch {
        message.error("加载巡逻人员选项失败");
      }
    };

    const load = async (): Promise<void> => {
      if (!id) return;
      const data = normalizeRecord(await (await getSecurityMonitorClient()).getPatrolLine(id));
      model.name = String(data.name ?? "");
      model.patrolProposalTime = String(data.patrolProposalTime ?? "");
      model.enabled = data.enabled !== false;
      const people = Array.isArray(data.cameraPatrolPersonVOS) ? data.cameraPatrolPersonVOS : [];
      model.personModifyParams = people.map((item: SecurityRecord) => ({
        id: String(item.id ?? guid()),
        messageTargetNotify: String(item.authType ?? "USER") as PatrolPersonTargetType,
        targetConfig: (Array.isArray(item.authConfig) ? item.authConfig : []).map((config: unknown) =>
          typeof config === "string" || typeof config === "number" ? ({ id: String(config) } as SecurityRecord) : normalizeRecord(config),
        ),
      }));
      const devices = Array.isArray(data.cameraPatrolDeviceVOS) ? data.cameraPatrolDeviceVOS : [];
      model.deviceModifyParams = devices.map((item: SecurityRecord, index: number) => ({
        sort: item.sort ?? index + 1,
        deviceId: item.deviceId,
        deviceCode: item.deviceCode,
        deviceName: item.deviceName,
        area: item.area,
        areaName: item.areaNames ?? item.areaName,
      }));
    };

    const chooseDevices = async (): Promise<void> => {
      const result = normalizePage(await (await getSecurityMonitorClient()).listVideoDevices({ pageNumber: 1, pageSize: 1000 }));
      deviceRows.value = result.records;
      selectedDeviceIds.value = model.deviceModifyParams.map((item) => String(item.deviceId));
      deviceModal.value = true;
    };

    const addPerson = (): void => {
      model.personModifyParams.push({
        id: guid(),
        messageTargetNotify: "USER",
        targetConfig: [],
      });
    };

    const removePerson = (personId: string): void => {
      model.personModifyParams = model.personModifyParams.filter((item) => item.id !== personId);
    };

    const selectedPersonValues = (person: PatrolPersonConfig): string[] =>
      person.targetConfig.map((item) => patrolPersonValue(item, person.messageTargetNotify)).filter(Boolean);

    const updatePersonTargetConfig = (person: PatrolPersonConfig, values: string[]): void => {
      const optionMap = new Map(personOptions[person.messageTargetNotify].map((option) => [option.value, option]));
      person.targetConfig = values.map((value) => optionMap.get(value)?.record ?? ({ id: value } as SecurityRecord));
    };

    const save = async (): Promise<void> => {
      if (!model.name.trim()) {
        return void message.warning("请输入路线名称");
      }
      if (!model.patrolProposalTime.trim()) {
        return void message.warning("请输入建议巡逻时间");
      }
      if (model.personModifyParams.length === 0) {
        return void message.warning("请添加巡更人员");
      }
      if (model.personModifyParams.some((item) => item.targetConfig.length === 0)) {
        return void message.warning("请添加巡更人员");
      }
      if (model.deviceModifyParams.length === 0) {
        return void message.warning("请添加视频巡逻点");
      }
      saving.value = true;
      try {
        const api = await getSecurityMonitorClient();
        const payload = {
          id: id || undefined,
          name: model.name,
          patrolProposalTime: model.patrolProposalTime,
          enabled: model.enabled,
          deviceModifyParams: model.deviceModifyParams,
          personModifyParams: model.personModifyParams.map((item) => ({
            id: item.id,
            authType: item.messageTargetNotify,
            authConfig: item.targetConfig,
          })),
        };
        if (id) {
          await api.updatePatrolLine(id, payload);
        } else {
          await api.createPatrolLine(payload);
        }
        message.success(id ? "修改成功" : "添加成功");
        await router.push("/d/security-monitor/patrolLine");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void loadPersonOptions();
      void load();
    });
    const slots = {
      "layout-content": () => (
        <div class={styles.patrolLineEditor}>
          <Form>
            <div class={styles.patrolLineEditorTop}>
              <div class={styles.patrolLineEditorField}>
                <span class={styles.requiredLabel}>路线名称：</span>
                <Input
                  maxlength={20}
                  value={model.name}
                  placeholder="输入路线名称"
                  onUpdate:value={(value: string) => (model.name = sanitizeLineInput(value))}
                />
              </div>
              <div class={styles.patrolLineEditorField}>
                <span class={styles.requiredLabel}>建议巡逻时间：</span>
                <Input
                  maxlength={20}
                  value={model.patrolProposalTime}
                  placeholder="输入巡逻时间"
                  onUpdate:value={(value: string) => (model.patrolProposalTime = sanitizeLineInput(value))}
                />
              </div>
            </div>
            <div class={styles.patrolLineEditorRow}>
              <span class={styles.requiredLabel}>巡逻人员：</span>
              <Button type="primary" onClick={addPerson}>
                添加 +
              </Button>
            </div>
            <div class={styles.patrolPersonEditorList}>
              {model.personModifyParams.map((person) => (
                <div class={styles.patrolPersonEditorItem} key={person.id}>
                  <Select
                    value={person.messageTargetNotify}
                    options={PATROL_PERSON_TARGET_OPTIONS}
                    onUpdate:value={(value: PatrolPersonTargetType) => {
                      person.messageTargetNotify = value;
                      person.targetConfig = [];
                    }}
                  />
                  <Select
                    mode="multiple"
                    value={selectedPersonValues(person)}
                    options={personOptions[person.messageTargetNotify]}
                    placeholder={`请选择${patrolPersonTypeLabel(person.messageTargetNotify)}`}
                    onUpdate:value={(value: string[]) => updatePersonTargetConfig(person, value)}
                  />
                  <Button type="link" danger onClick={() => removePerson(person.id)}>
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <div class={styles.patrolLineEditorRow}>
              <span class={styles.requiredLabel}>视频巡逻点：</span>
              <Button type="primary" onClick={() => void chooseDevices()}>
                添加巡逻点
              </Button>
            </div>
          </Form>
          <Table
            class={styles.patrolLineEditorTable}
            rowKey="deviceId"
            pagination
            bordered
            size="small"
            scroll={{ y: 300 }}
            dataSource={model.deviceModifyParams}
            columns={[
              { title: "巡逻序号", customRender: ({ index }: { index: number }) => index + 1 },
              { title: "视频巡逻点", dataIndex: "deviceName" },
              { title: "所属区域", dataIndex: "areaName" },
              {
                title: "操作",
                customRender: ({ record }: { record: SecurityRecord }) => (
                  <PopConfirm
                    title="是否移除当前选中？"
                    cancelText="取消"
                    okText="确定"
                    onConfirm={() =>
                      (model.deviceModifyParams = model.deviceModifyParams.filter((item) => item.deviceId !== record.deviceId))
                    }
                  >
                    <Button type="link" danger>
                      移除
                    </Button>
                  </PopConfirm>
                ),
              },
            ]}
          />
          <Modal
            open={deviceModal.value}
            title="选择摄像机"
            width={760}
            onCancel={() => (deviceModal.value = false)}
            onOk={() => {
              model.deviceModifyParams = deviceRows.value
                .filter((row) => selectedDeviceIds.value.includes(String(row.deviceId ?? row.id)))
                .map((row, index) => ({
                  sort: index + 1,
                  deviceId: row.deviceId ?? row.id,
                  deviceCode: row.code ?? row.deviceCode,
                  deviceName: row.deviceName ?? row.name,
                  area: row.areaId ?? row.area,
                  areaName: row.areaName ?? row.areaNames,
                }));
              deviceModal.value = false;
            }}
          >
            <Table
              rowKey={(row: SecurityRecord) => String(row.deviceId ?? row.id)}
              dataSource={deviceRows.value}
              pagination={{ pageSize: 8 }}
              rowSelection={{
                selectedRowKeys: selectedDeviceIds.value,
                onChange: (keys: (string | number)[]) => (selectedDeviceIds.value = keys.map(String)),
              }}
              columns={[
                { title: "设备名称", customRender: ({ record }: { record: SecurityRecord }) => cell(record, "deviceName", "name") },
                { title: "所属区域", customRender: ({ record }: { record: SecurityRecord }) => cell(record, "areaName", "areaNames") },
              ]}
            />
          </Modal>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>返回</Button>
          <Button type="primary" loading={saving.value} onClick={() => void save()}>
            保存
          </Button>
        </Space>
      ),
    };
    return () => <PageLayout title={id ? "编辑巡逻路线" : "新增巡逻路线"} v-slots={slots} />;
  },
});

export const PatrolLineDetailPage = defineComponent({
  name: "SecurityMonitorPatrolLineDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const detail = ref<SecurityRecord>({});
    onMounted(async () => {
      detail.value = normalizeRecord(await (await getSecurityMonitorClient()).getPatrolLine(String(route.query.id ?? "")));
    });
    const devices = () => (Array.isArray(detail.value.cameraPatrolDeviceVOS) ? detail.value.cameraPatrolDeviceVOS : []);
    const patrolPeople = () => {
      if (Array.isArray(detail.value.patrolPerson)) {
        return detail.value.patrolPerson;
      }
      if (Array.isArray(detail.value.cameraPatrolPersonVOS)) {
        return detail.value.cameraPatrolPersonVOS;
      }
      return [];
    };
    const renderPatrolPeople = () => {
      const people = patrolPeople();
      if (people.length === 0) {
        return "--";
      }
      return (
        <span class={styles.patrolPersonList}>
          {people.map((item: SecurityRecord, index: number) => {
            const authType = item.authType;
            const configs = Array.isArray(item.authConfig) ? item.authConfig : [];
            return (
              <span class={styles.patrolPersonGroup} key={String(item.id ?? index)}>
                <span class={styles.patrolPersonType}>{patrolPersonTypeLabel(authType)}:</span>
                {configs.map((config: unknown, configIndex: number) => {
                  const name =
                    typeof config === "string" || typeof config === "number"
                      ? String(config)
                      : patrolPersonName(normalizeRecord(config), authType);
                  return <Tag key={`${String(item.id ?? index)}-${configIndex}`}>{name}</Tag>;
                })}
              </span>
            );
          })}
        </span>
      );
    };
    const slots = {
      "layout-content": () => (
        <div class={styles.patrolLineDetail}>
          <div class={styles.patrolLineDetailRow}>
            <div class={styles.patrolLineDetailCol}>
              <span>路线名称：{cell(detail.value, "name")}</span>
            </div>
            <div class={styles.patrolLineDetailCol}>
              <span>建议巡逻时间：{cell(detail.value, "patrolProposalTime")}</span>
            </div>
          </div>
          <div class={styles.patrolLineDetailFullRow}>
            <span>巡逻人员：</span>
            {renderPatrolPeople()}
          </div>
          <div class={styles.patrolLineDetailFullRow}>
            <span>视频巡逻点：</span>
          </div>
          <Table
            class={styles.patrolLineDetailTable}
            rowKey="deviceId"
            pagination={false}
            bordered
            size="small"
            dataSource={devices()}
            columns={[
              { title: "巡逻序号", customRender: ({ index }: { index: number }) => index + 1 },
              { title: "设备名称", dataIndex: "deviceName" },
              { title: "所属区域", customRender: ({ record }: { record: SecurityRecord }) => cell(record, "areaNames", "areaName") },
            ]}
          />
        </div>
      ),
      "footer-btn": () => <Button onClick={() => router.back()}>返回</Button>,
    };
    return () => <PageLayout title="巡逻路线详情" v-slots={slots} />;
  },
});

function createPatrolRecordPage(title: string) {
  return defineComponent({
    name: `SecurityMonitor${title}Page`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const { rows, loading, page, load } = usePagedLoader((api, query) => api.listPatrolRecords({ ...route.query, ...query }));
      const dates = ref<unknown[]>([]);
      const lines = ref<SecurityRecord[]>([]);
      const columns = [
        { title: "巡逻时间", dataIndex: "patrolTime" },
        { title: "巡逻路线名称", dataIndex: "cameraPatrolLineName" },
        { title: "巡逻人员", dataIndex: "userName" },
        { title: "巡逻耗时", dataIndex: "duration" },
        { title: "巡逻点数", dataIndex: "num" },
        { title: "本次巡逻点数", dataIndex: "completeNum" },
        { title: "异常数", dataIndex: "abnormalNum" },
        {
          title: "操作",
          width: 90,
          customRender: ({ record }: { record: SecurityRecord }) => (
            <Button type="link" onClick={() => router.push(`/d/security-monitor/recordDetail?id=${recordId(record)}`)}>
              详情
            </Button>
          ),
        },
      ];
      onMounted(async () => {
        const raw = await (await getSecurityMonitorClient()).listAllPatrolLines({});
        lines.value = normalizePage(raw).records;
        page.cameraPatrolLineId = String(route.query.cameraPatrolLineId ?? "");
        page.period = String(route.query.period ?? "");
        await load();
      });
      const slots = {
        "layout-content": () => (
          <div class={styles.patrolRecordListContent}>
            <div class={styles.filterBar}>
              <span>巡逻时间：</span>
              <RangePicker
                value={dates.value}
                onUpdate:value={(value: unknown[]) => {
                  dates.value = value ?? [];
                  page.period =
                    Array.isArray(value) && value.length === 2
                      ? value.map((item: any) => item?.format?.("YYYY-MM-DD") ?? String(item)).join(",")
                      : "";
                }}
              />
              <span>巡逻路线：</span>
              <Select
                style={{ width: "220px" }}
                allowClear
                placeholder="请选择巡逻路线"
                value={page.cameraPatrolLineId || undefined}
                options={lines.value.map((row) => ({ label: cell(row, "name"), value: recordId(row) }))}
                onUpdate:value={(value: string) => (page.cameraPatrolLineId = value ?? "")}
              />
              <Button
                type="primary"
                onClick={() => {
                  page.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  dates.value = [];
                  page.period = "";
                  page.cameraPatrolLineId = "";
                  page.pageNumber = 1;
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey={(row: SecurityRecord) => recordId(row)}
              columns={columns}
              dataSource={rows.value}
              loading={loading.value}
              pagination={false}
            />
          </div>
        ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return () => <PageLayout title={title} v-slots={slots} />;
    },
  });
}

export const PatrolRecordPage = createPatrolRecordPage("巡逻记录");
export const PatrolRouteRecordPage = createPatrolRecordPage("巡逻路线记录");

export const PatrolRecordDetailPage = defineComponent({
  name: "SecurityMonitorPatrolRecordDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = String(route.query.id ?? "");
    const detail = ref<SecurityRecord>({});
    const devices = ref<SecurityRecord[]>([]);
    const abnormalities = ref<SecurityRecord[]>([]);
    const activeTab = ref("record");
    onMounted(async () => {
      const api = await getSecurityMonitorClient();
      const [detailRaw, devicesRaw, abnormalRaw] = await Promise.all([
        api.getPatrolRecord(id),
        api.listPatrolRecordDevices(id),
        api.listPatrolAbnormalRecords(id),
      ]);
      detail.value = normalizeRecord(detailRaw);
      devices.value = normalizePage(devicesRaw).records;
      abnormalities.value = normalizePage(abnormalRaw).records;
    });
    const slots = {
      "layout-content": () => (
        <>
          <Tabs activeKey={activeTab.value} onChange={(key: string) => (activeTab.value = key)}>
            <TabPane key="record" tab="巡逻记录">
              <h3>基本信息</h3>
              <div class={styles.description}>
                <div class={styles.descriptionItem}>
                  巡逻时间<strong>{cell(detail.value, "patrolTime")}</strong>
                </div>
                <div class={styles.descriptionItem}>
                  路线名称<strong>{cell(detail.value, "cameraPatrolLineName", "name")}</strong>
                </div>
                <div class={styles.descriptionItem}>
                  巡逻点数<strong>{cell(detail.value, "num")}</strong>
                </div>
                <div class={styles.descriptionItem}>
                  本次巡逻点数<strong>{cell(detail.value, "completeNum")}</strong>
                </div>
                <div class={styles.descriptionItem}>
                  巡逻人员<strong>{cell(detail.value, "userName")}</strong>
                </div>
                <div class={styles.descriptionItem}>
                  任务耗时<strong>{cell(detail.value, "duration")}</strong>
                </div>
              </div>
              <h3>巡逻记录</h3>
              <Table
                rowKey={(row: SecurityRecord) => recordId(row)}
                pagination={false}
                dataSource={devices.value}
                columns={[
                  { title: "巡逻序号", dataIndex: "sort" },
                  { title: "设备名称", dataIndex: "deviceName" },
                  { title: "所属区域", dataIndex: "areaNames" },
                  {
                    title: "巡逻状态",
                    customRender: ({ record }: { record: SecurityRecord }) => (
                      <Tag color={record.status === "CAMERA_PATROL_COMPLETE" ? "green" : "default"}>
                        {record.status === "CAMERA_PATROL_COMPLETE"
                          ? "已巡"
                          : record.status === "CAMERA_PATROL_UNKNOWN"
                            ? "未巡"
                            : cell(record, "statusName", "status")}
                      </Tag>
                    ),
                  },
                  { title: "异常数", dataIndex: "abnormalNum" },
                ]}
              />
            </TabPane>
            <TabPane key="abnormal" tab="异常情况">
              <Table
                rowKey={(row: SecurityRecord, index: number) => recordId(row) || String(index)}
                pagination={false}
                dataSource={abnormalities.value}
                columns={[
                  { title: "巡逻序号", dataIndex: "sort" },
                  { title: "异常情况说明", dataIndex: "remark" },
                  {
                    title: "现场照片",
                    customRender: ({ record }: { record: SecurityRecord }) => {
                      let files: SecurityRecord[] = [];
                      try {
                        files = Array.isArray(record.filePathList) ? record.filePathList : JSON.parse(String(record.filePathList ?? "[]"));
                      } catch {
                        files = [];
                      }
                      return (
                        <Space wrap>
                          {files.map((file) => (
                            <Image width={100} src={String(file.extranetFilePath ?? file.intranetFilePath ?? "")} />
                          ))}
                        </Space>
                      );
                    },
                  },
                  { title: "巡逻点", dataIndex: "deviceName" },
                ]}
              />
            </TabPane>
          </Tabs>
        </>
      ),
      "footer-btn": () => <Button onClick={() => router.back()}>返回</Button>,
    };
    return () => <PageLayout title="巡逻记录详情" v-slots={slots} />;
  },
});

export const PatrolExecutionPage = defineComponent({
  name: "SecurityMonitorPatrolExecutionPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = String(route.query.id ?? "");
    const line = ref<SecurityRecord>({});
    const devices = ref<SecurityRecord[]>([]);
    const current = ref<SecurityRecord>({});
    const visited = ref<SecurityRecord[]>([]);
    const submitting = ref(false);
    const capturing = ref(false);
    const abnormalOpen = ref(false);
    const remark = ref("");
    const snapshots = ref<SecurityRecord[]>([]);
    const now = (): string => {
      const date = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };
    onMounted(async () => {
      line.value = normalizeRecord(await (await getSecurityMonitorClient()).getPatrolLine(id));
      devices.value = Array.isArray(line.value.cameraPatrolDeviceVOS) ? line.value.cameraPatrolDeviceVOS : [];
      if (devices.value.length > 0) {
        selectDevice(devices.value[0]);
      }
    });
    const selectDevice = (device: SecurityRecord): void => {
      current.value = device;
      const deviceId = String(device.deviceId ?? device.id);
      if (!visited.value.some((item) => String(item.deviceId) === deviceId)) {
        visited.value.push({
          deviceId: device.deviceId ?? device.id,
          deviceCode: device.deviceCode ?? device.code,
          deviceName: device.deviceName ?? device.name,
          area: device.area ?? device.areaId,
          areaNames: device.areaNames ?? device.areaName,
          sort: visited.value.length + 1,
          patrolTime: now(),
          result: "CAMERA_PATROL_NORMAL",
          status: "CAMERA_PATROL_COMPLETE",
          deviceRemarksModifyParams: [],
        });
      }
    };
    const capture = async (): Promise<void> => {
      const deviceId = current.value.deviceId ?? current.value.id;
      if (!deviceId) {
        return;
      }
      capturing.value = true;
      snapshots.value = [];
      try {
        const raw = await (await getSecurityMonitorClient()).capturePatrolSnapshot({ deviceId });
        const snapshot = normalizeRecord(raw);
        if (Object.keys(snapshot).length > 0) {
          snapshots.value.push(snapshot);
        }
      } catch (error) {
        message.warning(error instanceof Error ? `${error.message}，可继续上报异常` : "异常截图失败，可继续上报异常");
      } finally {
        capturing.value = false;
        abnormalOpen.value = true;
      }
    };
    const saveAbnormal = async (): Promise<void> => {
      if (!remark.value.trim()) {
        return void message.warning("请输入情况说明");
      }
      const currentDeviceId = current.value.deviceId ?? current.value.id;
      const target = visited.value.find((item) => String(item.deviceId) === String(currentDeviceId));
      if (!target) {
        return;
      }
      const list = Array.isArray(target.deviceRemarksModifyParams) ? target.deviceRemarksModifyParams : [];
      target.deviceRemarksModifyParams = [
        ...list,
        {
          sort: list.length + 1,
          remark: remark.value.trim(),
          filePathList: JSON.stringify(
            snapshots.value.map((item) => ({
              fileId: item.id,
              extranetFilePath: item.previewUrl,
              intranetFilePath: item.previewUrl,
            })),
          ),
        },
      ];
      target.result = "CAMERA_PATROL_ABNORMAL";
      abnormalOpen.value = false;
      remark.value = "";
      snapshots.value = [];
      await submit();
    };
    const closeAbnormal = (): void => {
      abnormalOpen.value = false;
      remark.value = "";
      snapshots.value = [];
    };
    const submit = async (): Promise<void> => {
      submitting.value = true;
      try {
        const unvisited = devices.value.filter(
          (device) => !visited.value.some((item) => String(item.deviceId) === String(device.deviceId ?? device.id)),
        );
        const payload = {
          cameraPatrolLineId: id,
          cameraPatrolLineName: line.value.name,
          patrolTime: visited.value[0]?.patrolTime ?? now(),
          completeTime: now(),
          deviceModifyParams: [
            ...visited.value,
            ...unvisited.map((device, index) => ({
              deviceId: device.deviceId ?? device.id,
              deviceCode: device.deviceCode ?? device.code,
              deviceName: device.deviceName ?? device.name,
              area: device.area ?? device.areaId,
              areaNames: device.areaNames ?? device.areaName,
              sort: visited.value.length + index + 1,
              patrolTime: "",
              result: "CAMERA_PATROL_UNKNOWN",
              status: "CAMERA_PATROL_UNKNOWN",
              deviceRemarksModifyParams: [],
            })),
          ],
        };
        await (await getSecurityMonitorClient()).startPatrol(payload);
        message.success("巡逻结果提交成功");
        await router.push("/d/security-monitor/patrolRecord");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "巡逻结果提交失败");
      } finally {
        submitting.value = false;
      }
    };
    const slots = {
      "layout-content": () => (
        <Spin spinning={capturing.value} tip="异常截图中，请耐心等待……">
          <div class={styles.patrolExecution}>
            <div class={styles.patrolPlayer}>
              {current.value.deviceId ? (
                <>
                  <div class={styles.selectedName}>{cell(current.value, "deviceName", "name")}</div>
                  <CubePlayer deviceId={String(current.value.deviceId)} control />
                </>
              ) : (
                <div class={styles.emptyPlayer}>暂无视频巡逻点</div>
              )}
            </div>
            <div class={styles.patrolSide}>
              <div class={styles.patrolSideTitle}>
                视频巡逻点（<span>{devices.value.length}</span>）
              </div>
              <Table
                rowKey="deviceId"
                size="small"
                dataSource={devices.value}
                pagination={false}
                columns={[
                  { title: "序号", width: 70, customRender: ({ index }: { index: number }) => index + 1 },
                  {
                    title: "视频巡逻点",
                    customRender: ({ record }: { record: SecurityRecord }) => (
                      <Button type="link" onClick={() => selectDevice(record)}>
                        {cell(record, "deviceName", "name")}
                      </Button>
                    ),
                  },
                  {
                    title: "结果",
                    width: 90,
                    customRender: ({ record }: { record: SecurityRecord }) => {
                      const visitedRow = visited.value.find((item) => String(item.deviceId) === String(record.deviceId));
                      return visitedRow ? (
                        <Tag color={visitedRow.result === "CAMERA_PATROL_ABNORMAL" ? "red" : "green"}>
                          {visitedRow.result === "CAMERA_PATROL_ABNORMAL" ? "异常" : "正常"}
                        </Tag>
                      ) : (
                        <Tag>未巡</Tag>
                      );
                    },
                  },
                ]}
              />
              <div class={styles.patrolActions}>
                <Button type="primary" disabled={!current.value.deviceId} loading={capturing.value} onClick={() => void capture()}>
                  异常截图
                </Button>
                <PopConfirm title="是否确认结束巡逻？" onConfirm={() => void submit()}>
                  <Button type="primary" loading={submitting.value}>
                    结束巡逻
                  </Button>
                </PopConfirm>
              </div>
            </div>
          </div>
          <Modal open={abnormalOpen.value} title="异常上报" onCancel={closeAbnormal} onOk={saveAbnormal}>
            <Form layout="vertical">
              <FormItem label="巡逻点">
                <Input value={cell(current.value, "deviceName", "name")} disabled />
              </FormItem>
              <FormItem label="情况说明" required>
                <Textarea value={remark.value} maxlength={300} rows={4} onUpdate:value={(value: string) => (remark.value = value)} />
              </FormItem>
              <FormItem label="抓拍照片">
                <Space wrap>
                  {snapshots.value.map((item) => (
                    <Image width={100} src={String(item.previewUrl ?? "")} />
                  ))}
                </Space>
              </FormItem>
            </Form>
          </Modal>
        </Spin>
      ),
      "footer-btn": () => <Button onClick={() => router.back()}>返回</Button>,
    };
    return () => <PageLayout title="视频巡逻" v-slots={slots} />;
  },
});

export const PatrolStatisticsPage = defineComponent({
  name: "SecurityMonitorPatrolStatisticsPage",
  setup() {
    const router = useRouter();
    const { rows, loading, page, load } = usePagedLoader((api, query) => api.listPatrolStatistics(query));
    const dates = ref<unknown[]>([]);
    const exporting = ref(false);
    onMounted(load);
    const doExport = async (): Promise<void> => {
      exporting.value = true;
      try {
        const raw = await (
          await getSecurityMonitorClient()
        ).exportPatrolStatistics({ period: page.period, keyword: page.keyword, applicationCode: "SECURITY_MONITORING" });
        const blob =
          raw instanceof Blob
            ? raw
            : new Blob([raw as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "巡逻路线统计.xlsx";
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exporting.value = false;
      }
    };
    const slots = {
      "layout-header": () => (
        <Button type="primary" loading={exporting.value} onClick={() => void doExport()}>
          导出
        </Button>
      ),
      "layout-content": () => (
        <>
          <div class={styles.filterBar}>
            <span>巡逻时间：</span>
            <RangePicker
              value={dates.value}
              onUpdate:value={(value: unknown[]) => {
                dates.value = value ?? [];
                page.period =
                  Array.isArray(value) && value.length === 2
                    ? value.map((item: any) => item?.format?.("YYYY-MM-DD") ?? String(item)).join(",")
                    : "";
              }}
            />
            <Input
              class={styles.search}
              value={page.keyword}
              allowClear
              placeholder="请输入路线名称"
              onUpdate:value={(value: string) => (page.keyword = value)}
              onPressEnter={() => void load()}
            />
            <Button
              type="primary"
              onClick={() => {
                page.pageNumber = 1;
                void load();
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                dates.value = [];
                page.period = "";
                page.keyword = "";
                page.pageNumber = 1;
                void load();
              }}
            >
              重置
            </Button>
          </div>
          <Table
            rowKey={(row: SecurityRecord) => recordId(row)}
            loading={loading.value}
            dataSource={rows.value}
            pagination={false}
            columns={[
              { title: "路线名称", dataIndex: "name" },
              { title: "摄像机数", dataIndex: "cameraNum" },
              { title: "巡逻人员", dataIndex: "patrolUserNames" },
              {
                title: "巡逻次数",
                customRender: ({ record }: { record: SecurityRecord }) => (
                  <Button
                    type="link"
                    onClick={() => router.push(`/d/security-monitor/patrol/record?cameraPatrolLineId=${recordId(record)}`)}
                  >
                    {cell(record, "patrolNum")}
                  </Button>
                ),
              },
              { title: "异常数", dataIndex: "abnormalNum" },
            ]}
          />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => <PageLayout title="巡逻统计" v-slots={slots} />;
  },
});
