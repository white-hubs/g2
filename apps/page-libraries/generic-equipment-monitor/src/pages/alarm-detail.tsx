import { Button, Image, PageLayout, Popconfirm, Space, Spin, TabPane, Table, Tabs, message } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, onMounted, ref } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import { canAssignOrHandle, canSuspend, formatHandlerResult } from "./alarm-record.model";
import AlarmAssignUsersModal, { type AssignUserRow } from "./components/alarm-assign-users-modal";
import AlarmHandleModal, { type AlarmHandlePayload } from "./components/alarm-handle-modal";
import AlarmSuspendModal from "./components/alarm-suspend-modal";
import { formatAlarmTime } from "./normalize-page";
import type { GemPageProps } from "./page-props";

import styles from "./alarm-detail.module.css";

function unwrapRecord(raw: unknown): Record<string, unknown> {
  let current = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (let depth = 0; depth < 3; depth += 1) {
    const data = current.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      break;
    }
    current = data as Record<string, unknown>;
  }
  return current;
}

function unwrapList(raw: unknown): Record<string, unknown>[] {
  const root = unwrapRecord(raw);
  const data = root.data;
  const list = (root.list || root.records || (Array.isArray(data) ? data : undefined) || (Array.isArray(raw) ? raw : [])) as unknown[];
  return list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function formatDuration(value: unknown): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds / 60) % 60);
  const rest = Math.min(59, Math.ceil(seconds % 60));
  return `${hours > 0 ? `${String(hours).padStart(2, "0")}时` : ""}${String(minutes).padStart(2, "0")}分${String(rest).padStart(2, "0")}秒`;
}

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "--" : String(value);
}

function fileUrl(file: Record<string, unknown>): string {
  return String(file.path ?? file.url ?? file.extranetFilePath ?? file.intranetFilePath ?? "");
}

function videoFileUrl(file: Record<string, unknown>): string {
  const local = String(file.intranetFilePath ?? file.path ?? file.url ?? file.extranetFilePath ?? "");
  const external = String(file.extranetFilePath ?? local);
  const path = globalThis.location?.protocol === "http:" ? local : external;
  const session = String((globalThis as Record<string, unknown>).videoSession ?? "");
  return path && session && !path.includes("session=")
    ? `${path}${path.includes("?") ? "&" : "?"}session=${encodeURIComponent(session)}`
    : path;
}

function renderFiles(files: unknown) {
  const list = Array.isArray(files)
    ? files.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
  if (list.length === 0) {
    return "--";
  }
  return (
    <Space wrap>
      {list.map((item, index) => (
        <Image key={String(item.id ?? index)} width={100} src={fileUrl(item)} />
      ))}
    </Space>
  );
}

export default defineComponent({
  name: "GemAlarmDetail",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<GemPageProps["getOuaaClient"]> },
    getFileClient: { type: Function as PropType<GemPageProps["getFileClient"]> },
    getDictionaryClient: { type: Function as PropType<GemPageProps["getDictionaryClient"]> },
    applicationCode: { type: String, default: "" },
    alarmId: { type: String, default: "" },
    title: { type: String, default: "报警详情" },
  },
  setup(props) {
    const loading = ref(false);
    const detail = ref<Record<string, unknown>>({});
    const logs = ref<Record<string, unknown>[]>([]);
    const linkageActions = ref<Record<string, unknown>[]>([]);
    const linkageRecords = ref<Record<string, unknown>[]>([]);
    const videoFiles = ref<Record<string, unknown>[]>([]);
    const nearbyDevices = ref<Record<string, unknown>[]>([]);
    const error = ref("");
    const busy = ref(false);
    const activeKey = ref("baseInfo");
    const handleModalRef = ref<{ open: () => void } | null>(null);
    const suspendModalRef = ref<{ open: () => void } | null>(null);
    const assignModalRef = ref<{ open: () => void } | null>(null);

    const status = computed(() => detail.value.alarmStatus);
    const recordId = computed(() => String(detail.value.id ?? props.alarmId));
    const businessKey = computed(() => String(detail.value.businessKey ?? props.alarmId));

    async function load(): Promise<void> {
      if (!props.alarmId) {
        error.value = "缺少报警 id";
        return;
      }
      loading.value = true;
      error.value = "";
      try {
        const client = await props.getAlarmClient!();
        detail.value = unwrapRecord(await client.getAlarmRecordDetail(props.alarmId));
        const alarmRecordId = recordId.value;
        const eventId = businessKey.value;
        const [operatorLogs, actions, actionRecords, files, nearby] = await Promise.all([
          client.getAlarmOperatorRecords(alarmRecordId),
          eventId ? client.getAlarmLinkageActions(eventId) : Promise.resolve([]),
          eventId ? client.getAlarmLinkageExecuteRecords(eventId) : Promise.resolve([]),
          eventId ? client.getAlarmVideoEventFiles(eventId) : Promise.resolve([]),
          alarmRecordId ? client.getAlarmNearbyDevices({ alarmRecordId, pageNumber: 1, pageSize: 100 }) : Promise.resolve([]),
        ]);
        logs.value = unwrapList(operatorLogs);
        linkageActions.value = unwrapList(actions);
        linkageRecords.value = unwrapList(actionRecords);
        videoFiles.value = unwrapList(files);
        nearbyDevices.value = unwrapList(nearby);
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      } finally {
        loading.value = false;
      }
    }

    async function onAssignOk(users: AssignUserRow[]): Promise<void> {
      busy.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.assignAlarmRecord(props.alarmId, { assignUsers: users });
        message.success("操作成功！");
        await load();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "指派失败");
      } finally {
        busy.value = false;
      }
    }

    async function onSuspendOk(payload: { remark: string; estimatedProcessTime?: string; fileVOS?: unknown[] }): Promise<void> {
      busy.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.suspendAlarmRecord(props.alarmId, payload);
        message.success("操作成功！");
        await load();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "挂起失败");
      } finally {
        busy.value = false;
      }
    }

    async function onHandleOk(payload: AlarmHandlePayload): Promise<void> {
      busy.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.handleAlarmRecord(props.alarmId, payload);
        message.success("操作成功！");
        await load();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "处理失败");
      } finally {
        busy.value = false;
      }
    }

    async function repeatPush(): Promise<void> {
      const eventId = businessKey.value;
      if (!eventId) {
        message.error("报警业务标识异常");
        return;
      }
      busy.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.repeatPushAlarm(eventId);
        message.success("操作成功！");
      } catch (e) {
        message.error(e instanceof Error ? e.message : "再次推送失败");
      } finally {
        busy.value = false;
      }
    }

    onMounted(() => {
      void load();
    });

    const field = (label: string, value: unknown) => (
      <div class={styles.detailItem}>
        <span class={styles.fieldLabel}>{label}：</span>
        <span
          class={typeof value === "string" || typeof value === "number" ? styles.fieldValue : styles.fieldValueContent}
          title={typeof value === "string" ? value : undefined}
        >
          {value || "--"}
        </span>
      </div>
    );

    const notifyUsers = () => {
      const users = Array.isArray(detail.value.alarmNotifyUsers) ? detail.value.alarmNotifyUsers : [];
      return users.length > 0
        ? users
            .map((item) => (item && typeof item === "object" ? String((item as Record<string, unknown>).userName ?? "") : ""))
            .filter(Boolean)
            .join("、")
        : detail.value.alarmNotifyUsername;
    };

    const resultBlock = () => {
      const handler = unwrapRecord(detail.value.handler);
      if (detail.value.alarmStatus !== "ALARM_HANDLER") {
        return null;
      }
      return (
        <section>
          {sectionTitle("处理结果")}
          <div class={styles.resultGrid}>
            {field("处理结果", handler.alarmHandlerResultName || formatHandlerResult(handler.alarmHandlerResult))}
            {field("报警原因", unwrapRecord(handler.recordHandlerReason).alarmReason)}
            {field("处理说明", handler.alarmHandlerResultRemark)}
            {field("现场图片", renderFiles(handler.fileVOS))}
            {field("处理时间", formatAlarmTime(handler.createTime))}
            {field("处理人员", handler.createUserName)}
          </div>
        </section>
      );
    };

    const suspendBlock = () => {
      const suspend = unwrapRecord(detail.value.suspend);
      if (detail.value.alarmStatus !== "ALARM_SUSPEND") {
        return null;
      }
      return (
        <section>
          {sectionTitle("报警挂起")}
          <div class={styles.resultGrid}>
            {field("预计处理时间", formatAlarmTime(suspend.estimatedProcessTime))}
            {field("挂起原因", suspend.remark)}
            {field("现场图片", renderFiles(suspend.fileVOS))}
            {field("挂起时间", formatAlarmTime(suspend.createTime))}
            {field("操作挂起人员", suspend.createUserName)}
          </div>
        </section>
      );
    };

    const captureFiles = computed(() => videoFiles.value.filter((item) => String(item.type).toUpperCase() === "PHOTOGRAPH"));
    const videoRecords = computed(() => videoFiles.value.filter((item) => String(item.type).toUpperCase() === "VIDEOTAPE"));

    async function executeLinkage(record: Record<string, unknown>): Promise<void> {
      const id = record.id;
      if (!id) {
        return;
      }
      busy.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.executeAlarmLinkage({ eventIotDeviceId: id });
        message.success("下发指令成功！");
        linkageRecords.value = unwrapList(await client.getAlarmLinkageExecuteRecords(businessKey.value));
      } catch (e) {
        message.error(e instanceof Error ? e.message : "下发指令失败");
      } finally {
        busy.value = false;
      }
    }

    const sectionTitle = (title: string) => <h3 class={styles.sectionTitle}>{title}</h3>;

    const captureSection = () => (
      <section>
        {sectionTitle("现场抓拍")}
        {captureFiles.value.length > 0 ? (
          <div class={styles.mediaGrid}>
            {captureFiles.value.map((item, index) => (
              <Image class={styles.mediaItem} key={String(item.id ?? index)} src={videoFileUrl(item)} />
            ))}
          </div>
        ) : (
          <p class={styles.emptyText}>暂无抓拍</p>
        )}
        {sectionTitle("现场录像")}
        {videoRecords.value.length > 0 ? (
          <div class={styles.mediaGrid}>
            {videoRecords.value.map((item, index) => (
              <video class={styles.video} key={String(item.id ?? index)} controls>
                <source src={videoFileUrl(item)} type="video/mp4" />
              </video>
            ))}
          </div>
        ) : (
          <p class={styles.emptyText}>暂无录像</p>
        )}
      </section>
    );

    const linkageTab = () => (
      <section>
        {sectionTitle("设备联动")}
        <div class={styles.tableBox}>
          <Table
            size="small"
            bordered
            pagination={false}
            rowKey="id"
            dataSource={linkageActions.value}
            columns={[
              { title: "设备名称", dataIndex: "deviceName", key: "deviceName" },
              { title: "设备属性", dataIndex: "propName", key: "propName" },
              {
                title: "执行动作",
                key: "translatedValue",
                customRender: ({ record }: { record: Record<string, unknown> }) => text(record.translatedValue),
              },
              {
                title: "执行时机",
                dataIndex: "executeMode",
                key: "executeMode",
                customRender: ({ text: value }: { text: unknown }) => (String(value) === "AUTOMATIC" ? "自动" : "手动"),
              },
              {
                title: "操作",
                key: "action",
                customRender: ({ record }: { record: Record<string, unknown> }) =>
                  String(record.executeMode) === "AUTOMATIC" ? (
                    "--"
                  ) : (
                    <Button type="link" loading={busy.value} onClick={() => void executeLinkage(record)}>
                      执行
                    </Button>
                  ),
              },
            ]}
          />
        </div>
        {sectionTitle("联动日志")}
        <div class={styles.tableBox}>
          <Table
            size="small"
            bordered
            pagination={false}
            rowKey="id"
            dataSource={linkageRecords.value}
            columns={[
              {
                title: "执行时间",
                dataIndex: "executeTime",
                key: "executeTime",
                customRender: ({ text: value }: { text: unknown }) => formatAlarmTime(value),
              },
              {
                title: "触发人",
                dataIndex: "operatorName",
                key: "operatorName",
                customRender: ({ text: value }: { text: unknown }) => text(value),
              },
              {
                title: "设备名称",
                dataIndex: "deviceName",
                key: "deviceName",
                customRender: ({ text: value }: { text: unknown }) => text(value),
              },
              {
                title: "设备属性",
                dataIndex: "propName",
                key: "propName",
                customRender: ({ text: value }: { text: unknown }) => text(value),
              },
              {
                title: "执行动作",
                key: "translatedValue",
                customRender: ({ record }: { record: Record<string, unknown> }) => text(record.translatedValue),
              },
              {
                title: "执行结果",
                dataIndex: "executeStatusName",
                key: "executeStatus",
                customRender: ({ record }: { record: Record<string, unknown> }) => text(record.executeStatusName ?? record.executeStatus),
              },
            ]}
          />
        </div>
      </section>
    );

    const nearbyDevicesTab = () => (
      <section class={styles.tabPane}>
        <h3 class={styles.infoTitle}>附近设备</h3>
        <div class={styles.tableBox}>
          <Table
            size="small"
            bordered
            pagination={false}
            rowKey="id"
            dataSource={nearbyDevices.value}
            columns={[
              { title: "设备编号", dataIndex: "code", key: "code", customRender: ({ text: value }: { text: unknown }) => text(value) },
              { title: "设备名称", dataIndex: "name", key: "name", customRender: ({ text: value }: { text: unknown }) => text(value) },
              {
                title: "所属产品",
                key: "productName",
                customRender: ({ record }: { record: Record<string, unknown> }) => text(unwrapRecord(record.productInfo).name),
              },
              {
                title: "产品品类",
                key: "productCategory",
                customRender: ({ record }: { record: Record<string, unknown> }) =>
                  text(unwrapRecord(unwrapRecord(record.productInfo).productCategory).name),
              },
              {
                title: "设备状态",
                key: "status",
                customRender: ({ record }: { record: Record<string, unknown> }) => {
                  const online = unwrapRecord(record.status).onlineState;
                  return <span style={{ color: online ? "#52c41a" : "#ff4d4f" }}>{online ? "在线" : "离线"}</span>;
                },
              },
              {
                title: "直接可视",
                key: "occlusion",
                customRender: ({ record }: { record: Record<string, unknown> }) => {
                  const occlusion = record.occlusion;
                  return occlusion === undefined ? (
                    "--"
                  ) : (
                    <span style={{ color: occlusion ? "#ff4d4f" : "#1677ff" }}>{occlusion ? "否" : "是"}</span>
                  );
                },
              },
              {
                title: "操作",
                key: "action",
                customRender: ({ record }: { record: Record<string, unknown> }) => (
                  <Button
                    type="link"
                    onClick={() =>
                      props.onNavigatePage({ page: GEM_PAGE_KEYS.equipmentMonitorDetail, params: { id: String(record.id ?? "") } })
                    }
                  >
                    详情
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </section>
    );

    const slots = {
      "footer-btn": () => (
        <Space class={styles.footer}>
          <Popconfirm title="再次推送该报警？" onConfirm={() => void repeatPush()}>
            <Button loading={busy.value}>再次推送</Button>
          </Popconfirm>
          {canAssignOrHandle(status.value ?? detail.value.alarmStatusName) ? (
            <Button loading={busy.value} onClick={() => assignModalRef.value?.open()}>
              指派
            </Button>
          ) : null}
          {canSuspend(status.value ?? detail.value.alarmStatusName) ? (
            <Button loading={busy.value} onClick={() => suspendModalRef.value?.open()}>
              挂起
            </Button>
          ) : null}
          {canAssignOrHandle(status.value ?? detail.value.alarmStatusName) ? (
            <Button type="primary" loading={busy.value} onClick={() => handleModalRef.value?.open()}>
              处理
            </Button>
          ) : null}
          <Button onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmRecord })}>返回</Button>
        </Space>
      ),
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.page} data-page={GEM_PAGE_KEYS.alarmDetail}>
            {error.value ? <p style={{ color: "#c00" }}>{error.value}</p> : null}
            <Tabs class={styles.tabs} activeKey={activeKey.value} onChange={(key: string) => (activeKey.value = key)}>
              <TabPane key="baseInfo" tab="报警详情">
                <section class={styles.tabPane}>
                  <h3 class={styles.infoTitle}>报警信息</h3>
                  <div class={styles.detailGrid}>
                    {field("报警时间", formatAlarmTime(detail.value.alarmTime))}
                    {field("报警设备", detail.value.alarmTargetName)}
                    {field("报警级别", detail.value.alarmLevelName)}
                    {field("报警规则", detail.value.alarmEventName)}
                    {field("报警区域", detail.value.areaName)}
                    {field("处理时限", detail.value.timeoutProcessTimesName)}
                    {field("处理人", detail.value.alarmHandlerName)}
                    {field("报警通知人", notifyUsers())}
                    {field("超时状态", detail.value.alarmHandlerTimeoutStatusName)}
                    {field("处理状态", detail.value.alarmStatusName)}
                    {field("详细位置", detail.value.alarmTargetAddress)}
                    {field("任务耗时", formatDuration(detail.value.processingTime))}
                  </div>
                </section>
                {captureSection()}
                {resultBlock()}
                {suspendBlock()}
              </TabPane>
              <TabPane key="linkageAction" tab="联动动作">
                <div class={styles.tabPane}>{linkageTab()}</div>
              </TabPane>
              <TabPane key="handelRecord" tab="处理记录">
                <div class={styles.tabPane}>
                  {sectionTitle("处理流程记录")}
                  <div class={styles.tableBox}>
                    <Table
                      size="small"
                      bordered
                      pagination={false}
                      rowKey="id"
                      dataSource={logs.value}
                      columns={[
                        {
                          title: "时间",
                          key: "operatorTime",
                          customRender: ({ record }: { record: Record<string, unknown> }) =>
                            formatAlarmTime(record.operatorTime ?? record.operateTime ?? record.createTime),
                        },
                        {
                          title: "操作人",
                          key: "operatorByName",
                          customRender: ({ record }: { record: Record<string, unknown> }) =>
                            text(record.operatorByName ?? record.operatorName),
                        },
                        {
                          title: "处理内容",
                          key: "operatorContent",
                          customRender: ({ record }: { record: Record<string, unknown> }) =>
                            text(record.operatorContent ?? record.operateTypeName ?? record.content),
                        },
                      ]}
                    />
                  </div>
                </div>
              </TabPane>
              <TabPane key="nearbyEquipment" tab="附近设备">
                {nearbyDevicesTab()}
              </TabPane>
            </Tabs>
            <AlarmHandleModal
              ref={handleModalRef}
              applicationCode={props.applicationCode}
              getAlarmClient={props.getAlarmClient}
              getFileClient={props.getFileClient}
              getDictionaryClient={props.getDictionaryClient}
              onOk={(p) => void onHandleOk(p)}
            />
            <AlarmSuspendModal ref={suspendModalRef} getFileClient={props.getFileClient} onOk={(payload) => void onSuspendOk(payload)} />
            <AlarmAssignUsersModal ref={assignModalRef} getOuaaClient={props.getOuaaClient} onOk={(users) => void onAssignOk(users)} />
          </div>
        </Spin>
      ),
    };

    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
