import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { getSecurityMonitorClient } from "../domain-context";
import { type SecurityRecord, normalizePage, text } from "./data";
import { callSecurityPcUi, defineAsyncSecurityPcUiComponent, showSecurityPcUiMessage } from "./pc-ui-runtime";

import styles from "./security-monitor.module.css";

const APPLICATION_CODE = "SECURITY_MONITORING";
type RelationMode = "device" | "person";
const Button = defineAsyncSecurityPcUiComponent("Button");
const Input = defineAsyncSecurityPcUiComponent("Input");
const Modal = defineAsyncSecurityPcUiComponent("Modal");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const Space = defineAsyncSecurityPcUiComponent("Space");
const TabPane = defineAsyncSecurityPcUiComponent("TabPane");
const Table = defineAsyncSecurityPcUiComponent("Table");
const Tabs = defineAsyncSecurityPcUiComponent("Tabs");

function deviceId(row: SecurityRecord): string {
  return String(row.deviceId ?? row.id ?? "");
}

function userId(row: SecurityRecord): string {
  return String(row.userId ?? row.id ?? "");
}

function joinedNames(value: unknown, ...keys: string[]): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "--";
  }
  return value.map((item) => text(item as SecurityRecord, ...keys)).join("、");
}

export default defineComponent({
  name: "SecurityMonitoringPermissionPage",
  setup() {
    const notify = async (level: "error" | "success" | "warning", error: unknown, fallback: string): Promise<void> => {
      await showSecurityPcUiMessage(level, error instanceof Error ? error.message : fallback);
    };
    const mode = ref<RelationMode>("device");
    const loading = ref(false);
    const rows = ref<SecurityRecord[]>([]);
    const selectedKeys = ref<string[]>([]);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 500, total: 0 });
    const relationOpen = ref(false);
    const candidateLoading = ref(false);
    const candidates = ref<SecurityRecord[]>([]);
    const candidateKeys = ref<string[]>([]);
    const relationHosts = ref<SecurityRecord[]>([]);

    const rowKey = computed(() => (mode.value === "device" ? deviceId : userId));
    const candidateRowKey = computed(() => (mode.value === "device" ? userId : deviceId));

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const api = await getSecurityMonitorClient();
        const params = {
          applicationCode: APPLICATION_CODE,
          keyword: query.keyword,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        };
        const page = normalizePage(
          mode.value === "device" ? await api.listDeviceAuthorizations(params) : await api.listUserDeviceAuthorizations(params),
        );
        rows.value = page.records;
        query.total = page.total;
        selectedKeys.value = [];
      } catch (error) {
        await notify("error", error, "监控权限加载失败");
      } finally {
        loading.value = false;
      }
    };

    const openRelation = async (hosts?: SecurityRecord[]): Promise<void> => {
      const selectedHosts = hosts ?? rows.value.filter((row) => selectedKeys.value.includes(rowKey.value(row)));
      if (selectedHosts.length === 0) {
        await notify("warning", null, mode.value === "device" ? "请选择设备" : "请选择人员");
        return;
      }
      relationHosts.value = selectedHosts;
      relationOpen.value = true;
      candidateLoading.value = true;
      candidateKeys.value = [];
      try {
        const api = await getSecurityMonitorClient();
        const singleId = selectedHosts.length === 1 ? rowKey.value(selectedHosts[0]) : "";
        const page = normalizePage(
          mode.value === "device"
            ? await api.listUserDeviceAuthorizations({
                applicationCode: APPLICATION_CODE,
                deviceId: singleId,
                associated: false,
                pageNumber: 1,
                pageSize: 500,
              })
            : await api.listDeviceAuthorizations({
                applicationCode: APPLICATION_CODE,
                userId: singleId,
                associated: false,
                pageNumber: 1,
                pageSize: 500,
              }),
        );
        candidates.value = page.records;
      } catch (error) {
        relationOpen.value = false;
        await notify("error", error, "候选数据加载失败");
      } finally {
        candidateLoading.value = false;
      }
    };

    const saveRelation = async (): Promise<void> => {
      if (candidateKeys.value.length === 0) {
        await notify("warning", null, mode.value === "device" ? "请选择人员" : "请选择设备");
        return;
      }
      const candidateRows = candidates.value.filter((row) => candidateKeys.value.includes(candidateRowKey.value(row)));
      const hostDevices = mode.value === "device" ? relationHosts.value : candidateRows;
      const hostUsers = mode.value === "device" ? candidateRows : relationHosts.value;
      try {
        await (
          await getSecurityMonitorClient()
        ).assignDeviceAuthorization({
          securityDeviceId: hostDevices.map(deviceId),
          userList: hostUsers.map((row) => ({ userId: userId(row), userName: text(row, "userName", "name") })),
        });
        relationOpen.value = false;
        await notify("success", null, "关联成功");
        await load();
      } catch (error) {
        await notify("error", error, "关联失败");
      }
    };

    const clearRelations = async (hosts?: SecurityRecord[]): Promise<void> => {
      const selectedHosts = hosts ?? rows.value.filter((row) => selectedKeys.value.includes(rowKey.value(row)));
      if (selectedHosts.length === 0) {
        await notify("warning", null, mode.value === "device" ? "请选择设备" : "请选择人员");
        return;
      }
      void callSecurityPcUi("Modal", "confirm", {
        title: "提示",
        content: mode.value === "device" ? "确认清空当前设备的关联人员关系吗？" : "确认清空当前人员的关联设备关系吗？",
        okText: "确认",
        cancelText: "取消",
        async onOk() {
          const api = await getSecurityMonitorClient();
          if (mode.value === "device") {
            await api.clearDeviceUserAuthorizations(selectedHosts.map(deviceId));
          } else {
            await api.clearUserDeviceAuthorizations(selectedHosts.map(userId));
          }
          await notify("success", null, "清空成功");
          await load();
        },
      });
    };

    const deviceColumns = [
      { title: "设备编码", customRender: ({ record }: { record: SecurityRecord }) => text(record, "code", "deviceCode") },
      { title: "设备名称", customRender: ({ record }: { record: SecurityRecord }) => text(record, "deviceName", "name") },
      { title: "所属区域", customRender: ({ record }: { record: SecurityRecord }) => text(record, "areaName", "areaPathName") },
      { title: "关联人员", customRender: ({ record }: { record: SecurityRecord }) => joinedNames(record.userList, "userName", "name") },
      {
        title: "操作",
        width: 180,
        customRender: ({ record }: { record: SecurityRecord }) => (
          <Space>
            <Button type="link" onClick={() => void openRelation([record])}>
              权限关联
            </Button>
            <Button type="link" danger onClick={() => clearRelations([record])}>
              解除关联
            </Button>
          </Space>
        ),
      },
    ];
    const personColumns = [
      { title: "人员名称", customRender: ({ record }: { record: SecurityRecord }) => text(record, "name", "userName") },
      {
        title: "所属部门",
        customRender: ({ record }: { record: SecurityRecord }) =>
          text((record.organization as SecurityRecord | undefined) ?? record, "name", "organizationName"),
      },
      { title: "关联设备", customRender: ({ record }: { record: SecurityRecord }) => joinedNames(record.devices, "name", "deviceName") },
      {
        title: "操作",
        width: 180,
        customRender: ({ record }: { record: SecurityRecord }) => (
          <Space>
            <Button type="link" onClick={() => void openRelation([record])}>
              权限关联
            </Button>
            <Button type="link" danger onClick={() => clearRelations([record])}>
              解除关联
            </Button>
          </Space>
        ),
      },
    ];

    onMounted(() => void load());

    return () => {
      const slots = {
        "layout-content": () => (
          <>
            <Tabs
              activeKey={mode.value}
              onChange={(key: string | number) => {
                mode.value = String(key) as RelationMode;
                query.keyword = "";
                query.pageNumber = 1;
                void load();
              }}
            >
              <TabPane key="device" tab="关联人员" />
              <TabPane key="person" tab="关联设备" />
            </Tabs>
            <div class={styles.filterBar}>
              <Input
                class={styles.search}
                value={query.keyword}
                allowClear
                placeholder={mode.value === "device" ? "请输入设备名称" : "请输入人员名称"}
                onUpdate:value={(value: string) => (query.keyword = value)}
                onPressEnter={() => void load()}
              />
              <Button type="primary" onClick={() => void load()}>
                查询
              </Button>
              <Button
                onClick={() => {
                  query.keyword = "";
                  void load();
                }}
              >
                重置
              </Button>
              <Button type="primary" disabled={selectedKeys.value.length === 0} onClick={() => void openRelation()}>
                权限关联
              </Button>
              <Button disabled={selectedKeys.value.length === 0} onClick={() => clearRelations()}>
                清空关联关系
              </Button>
            </div>
            <Table
              rowKey={rowKey.value}
              columns={mode.value === "device" ? deviceColumns : personColumns}
              dataSource={rows.value}
              loading={loading.value}
              rowSelection={{
                selectedRowKeys: selectedKeys.value,
                onChange: (keys: (string | number)[]) => (selectedKeys.value = keys.map(String)),
              }}
              pagination={{
                current: query.pageNumber,
                pageSize: query.pageSize,
                total: query.total,
                showSizeChanger: false,
                onChange: (page: number) => {
                  query.pageNumber = page;
                  void load();
                },
              }}
            />
            <Modal
              open={relationOpen.value}
              title={mode.value === "device" ? "选择人员" : "选择设备"}
              width={980}
              onCancel={() => (relationOpen.value = false)}
              onOk={() => void saveRelation()}
            >
              <Table
                rowKey={candidateRowKey.value}
                loading={candidateLoading.value}
                dataSource={candidates.value}
                pagination={{ pageSize: 10 }}
                rowSelection={{
                  selectedRowKeys: candidateKeys.value,
                  onChange: (keys: (string | number)[]) => (candidateKeys.value = keys.map(String)),
                }}
                columns={mode.value === "device" ? personColumns.slice(0, 3) : deviceColumns.slice(0, 3)}
              />
            </Modal>
          </>
        ),
      };
      return <PageLayout title="监控权限" v-slots={slots} />;
    };
  },
});
