import type { AssetRow } from "@g2-contract/asset-management";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { FormInstance } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient, getContext } from "./domain-context";
import { BASE } from "./menu-data";
import { ASSET_STATUS, CHECK_TYPES, cellText, errorText, flattenOptions } from "./model";
import { useOptions } from "./options";
import { type Person, PersonPicker } from "./person-picker";
import { loadPcUi } from "./runtime-modules";
import { columnsFor, displayDate } from "./table-columns";

import styles from "./styles.module.css";
const {
  Alert,
  Button,
  Cascader,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout,
  Select,
  Space,
  Spin,
  TabPane,
  Tabs,
  Textarea,
  TreeSelect,
  message,
  usePcTable,
} = await loadPcUi();
export const AssetCheckAdd = defineComponent({
  setup() {
    const router = useRouter();
    const saving = ref(false);
    const form = ref<FormInstance>();
    const choices = useOptions();
    const duty = ref<Person[]>([]);
    const admin = ref<Person[]>([]);
    const draft = reactive({
      taskName: "",
      dutyUserId: "",
      dutyUserName: "",
      checkType: undefined as string | undefined,
      chooseType: undefined as number | undefined,
      estimateEndTime: "",
      remarks: "",
    });
    const scope = reactive({
      typeId: [] as string[],
      receiveDepId: undefined as string | undefined,
      purchaseDate: "",
      adminId: "",
      adminName: "",
      status: undefined as string | undefined,
      areaIds: [] as string[],
    });
    const back = () => void router.push(`${BASE}/asset-check`);
    onMounted(() => {
      void choices.load(["assetType", "departments", "areas"]).catch((error: unknown) => message.error(errorText(error)));
      void getContext()
        .ensureClient<OuaaClient>("ouaaClient")
        .then((client) => client.getUserProfile())
        .then((result) => {
          const response = result as { data?: unknown };
          const user = (response?.data ?? result) as { id?: string; name?: string; username?: string };
          if (user.id && duty.value.length === 0) {
            duty.value = [{ id: user.id, name: user.name ?? user.username ?? "" }];
            draft.dutyUserId = user.id;
            draft.dutyUserName = duty.value[0].name;
          }
        })
        .catch((error: unknown) => message.error(errorText(error)));
    });
    const save = async () => {
      if (saving.value) {
        return;
      }
      try {
        await form.value?.validate();
      } catch {
        return;
      }
      saving.value = true;
      try {
        const departments = flattenOptions(choices.data.departments);
        const categories = flattenOptions(choices.data.assetType);
        const areas = flattenOptions(choices.data.areas);
        await getClient().createAssetCheck({
          ...draft,
          taskName: draft.taskName.trim(),
          taskDataSource: {
            ...scope,
            typeId: scope.typeId.join(","),
            typeName: categories
              .filter((item) => scope.typeId.includes(item.id))
              .map((item) => item.name)
              .join(","),
            receiveDepName: departments.find((item) => item.id === scope.receiveDepId)?.name ?? "",
            areaName: scope.areaIds
              .map((id) => areas.find((item) => item.id === id)?.name)
              .filter(Boolean)
              .join("/"),
          },
        });
        message.success("创建成功");
        back();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    const required = (label: string) => [{ required: true, message: `请填写${label}` }];
    return () => (
      <PageLayout
        title="新增资产盘点"
        class={styles.page}
        v-slots={{
          "layout-content": () => (
            <div class={styles.scroll}>
              <Form ref={form} model={draft} layout="vertical" class={styles.editor}>
                <div class={styles.sectionTitle}>基本信息</div>
                <FormItem label="盘点任务名称" name="taskName" rules={required("盘点任务名称")}>
                  <Input
                    value={draft.taskName}
                    onChange={(event) => {
                      draft.taskName = event.target.value ?? "";
                    }}
                  />
                </FormItem>
                <FormItem label="盘点负责人" name="dutyUserId" rules={required("盘点负责人")}>
                  <PersonPicker
                    value={duty.value}
                    onChange={(people) => {
                      duty.value = people;
                      draft.dutyUserId = people[0]?.id ?? "";
                      draft.dutyUserName = people[0]?.name ?? "";
                    }}
                  />
                </FormItem>
                <FormItem label="盘点方式" name="checkType" rules={required("盘点方式")}>
                  <Select
                    value={draft.checkType}
                    options={CHECK_TYPES}
                    onChange={(value) => {
                      draft.checkType = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="是否允许手动选择" name="chooseType" rules={required("是否允许手动选择")}>
                  <Select
                    value={draft.chooseType}
                    options={[
                      { label: "是", value: 1 },
                      { label: "否", value: 0 },
                    ]}
                    onChange={(value) => {
                      draft.chooseType = Number(value);
                    }}
                  />
                </FormItem>
                <FormItem label="预计完成时间">
                  <DatePicker
                    value={draft.estimateEndTime}
                    valueFormat="YYYY-MM-DD"
                    onChange={(_date, value) => {
                      draft.estimateEndTime = value;
                    }}
                  />
                </FormItem>
                <FormItem label="备注说明">
                  <Textarea
                    value={draft.remarks}
                    rows={3}
                    maxlength={200}
                    showCount
                    onChange={(event) => {
                      draft.remarks = event.target.value ?? "";
                    }}
                  />
                </FormItem>
                <div class={styles.sectionTitle}>盘点范围</div>
                <Alert
                  class={styles.full}
                  style={{ marginBottom: "20px" }}
                  type="info"
                  showIcon
                  message="满足全部选择条件的资产将被包含在盘点单中；不选择条件将包含权限内全部资产。"
                />
                <FormItem label="资产类别">
                  <Select
                    mode="multiple"
                    value={scope.typeId}
                    options={choices.select("assetType")}
                    allowClear
                    onChange={(value) => {
                      scope.typeId = Array.isArray(value) ? value.map(String) : [];
                    }}
                  />
                </FormItem>
                <FormItem label="使用部门">
                  <TreeSelect
                    value={scope.receiveDepId}
                    treeData={choices.data.departments}
                    fieldNames={{ label: "name", value: "id", children: "children" }}
                    allowClear
                    onChange={(value) => {
                      scope.receiveDepId = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="购入日期">
                  <DatePicker
                    value={scope.purchaseDate}
                    valueFormat="YYYY-MM-DD"
                    onChange={(_date, value) => {
                      scope.purchaseDate = value;
                    }}
                  />
                </FormItem>
                <FormItem label="管理员">
                  <PersonPicker
                    value={admin.value}
                    onChange={(people) => {
                      admin.value = people;
                      scope.adminId = people[0]?.id ?? "";
                      scope.adminName = people[0]?.name ?? "";
                    }}
                  />
                </FormItem>
                <FormItem label="资产状态">
                  <Select
                    value={scope.status}
                    options={ASSET_STATUS}
                    allowClear
                    onChange={(value) => {
                      scope.status = value === undefined ? undefined : String(value);
                    }}
                  />
                </FormItem>
                <FormItem label="区域">
                  <Cascader
                    value={scope.areaIds}
                    options={choices.data.areas}
                    fieldNames={{ label: "name", value: "id", children: "children" }}
                    changeOnSelect
                    onChange={(value) => {
                      scope.areaIds = value.map(String);
                    }}
                  />
                </FormItem>
              </Form>
            </div>
          ),
          "footer-page": () => (
            <Space>
              <Button onClick={back}>返回</Button>
              <Button type="primary" loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
            </Space>
          ),
        }}
      />
    );
  },
});
export function createCheckDetail(kind: "asset" | "consumable") {
  return defineComponent({
    setup() {
      const route = useRoute();
      const router = useRouter();
      const id = String(route.query.id ?? "");
      const owner = `${BASE}/${kind === "asset" ? "asset-check" : "consumable-check"}`;
      const tab = ref(kind === "asset" ? "base" : "info");
      const detail = ref<AssetRow>({ id });
      const counts = ref<Record<string, number>>({});
      const loading = ref(false);
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      let version = 0;
      const [PcTable, table] = usePcTable({
        rowKey: "id",
        tableCode: `ASSET_${kind.toUpperCase()}_CHECK_DETAIL`,
        columns: columnsFor(
          kind === "asset" ? "assetCheckDetails" : "consumableCheckDetails",
          () => (pager.pageNumber - 1) * pager.pageSize,
        ),
        autoFetch: false,
        pagination: false,
      });
      const [TaskTable, tasks] = usePcTable({
        rowKey: "id",
        tableCode: "ASSET_CHECK_TASKS",
        columns: columnsFor("checkTasks"),
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        loading.value = true;
        table.loading.value = true;
        try {
          const [count, page, plan, taskRows] = await Promise.all([
            getClient().checkCounts(kind, id),
            getClient().page(kind === "asset" ? "assetCheckDetails" : "consumableCheckDetails", {
              [kind === "asset" ? "id" : "checkId"]: id,
              pageNumber: pager.pageNumber,
              pageSize: pager.pageSize,
            }),
            kind === "asset" ? getClient().getAssetCheck(id) : Promise.resolve({ id }),
            kind === "asset" ? getClient().checkTasks(id) : Promise.resolve([]),
          ]);
          if (version === current) {
            counts.value = count;
            table.setDataSource(page.records);
            pager.total = page.total;
            detail.value = plan;
            tasks.setDataSource(taskRows);
          }
        } catch (error) {
          message.error(errorText(error));
        } finally {
          if (version === current) {
            loading.value = false;
            table.loading.value = false;
          }
        }
      };
      onMounted(() => void load());
      onUnmounted(() => {
        version += 1;
      });
      const back = () =>
        void router.push(
          typeof route.query.returnPath === "string" && route.query.returnPath.startsWith(owner) ? route.query.returnPath : owner,
        );
      const base = () => {
        const row = detail.value;
        const source = (row.taskDataSource ?? {}) as Record<string, unknown>;
        return (
          <Descriptions bordered column={2}>
            <DescriptionsItem label="盘点任务名称">{cellText(row.taskName)}</DescriptionsItem>
            <DescriptionsItem label="盘点负责人">{cellText(row.dutyUserName ?? row.dutyUserId)}</DescriptionsItem>
            <DescriptionsItem label="盘点方式">{CHECK_TYPES.find((item) => item.value === row.checkType)?.label ?? "--"}</DescriptionsItem>
            <DescriptionsItem label="是否允许手动选择">{row.chooseType === 1 ? "是" : "否"}</DescriptionsItem>
            <DescriptionsItem label="预计完成时间">{displayDate(row.estimateEndTime)}</DescriptionsItem>
            <DescriptionsItem label="备注说明">{cellText(row.remarks)}</DescriptionsItem>
            <DescriptionsItem label="资产类别">{cellText(source.typeName)}</DescriptionsItem>
            <DescriptionsItem label="使用部门">{cellText(source.receiveDepName)}</DescriptionsItem>
            <DescriptionsItem label="购入日期">{displayDate(source.purchaseDate)}</DescriptionsItem>
            <DescriptionsItem label="管理员">{cellText(source.adminName)}</DescriptionsItem>
            <DescriptionsItem label="资产状态">{ASSET_STATUS.find((item) => item.value === source.status)?.label ?? "--"}</DescriptionsItem>
            <DescriptionsItem label="区域">{cellText(source.areaName ?? source.area)}</DescriptionsItem>
          </Descriptions>
        );
      };
      const fields =
        kind === "asset"
          ? [
              "全部:checkTotalNumber",
              "已盘:checkCompleteNumber",
              "未盘:checkUndiskNumber",
              "盘盈:checkWinNumber",
              "盘亏:checkLossNumber",
              "异常:abnormalNumber",
            ]
          : ["全部:consumableNum", "已盘:checkedNum", "未盘:checkWaitNumber", "盘盈:addNum", "盘亏:reduceNum"];
      return () => (
        <PageLayout
          class={styles.page}
          title={kind === "asset" ? "资产盘点详情" : "耗材盘点详情"}
          v-slots={{
            "layout-content": () => (
              <div class={styles.main}>
                {kind === "asset" && (
                  <Tabs
                    activeKey={tab.value}
                    onChange={(key) => {
                      tab.value = String(key);
                    }}
                  >
                    <TabPane key="base" tab="基本信息" />
                    <TabPane key="info" tab="盘点信息" />
                    <TabPane key="tasks" tab="盘点任务" />
                  </Tabs>
                )}
                {tab.value === "base" ? (
                  <div class={styles.scroll}>
                    <Spin spinning={loading.value}>{base()}</Spin>
                  </div>
                ) : tab.value === "tasks" ? (
                  <TaskTable />
                ) : (
                  <>
                    <div class={styles.summary}>
                      {fields.map((entry) => {
                        const [label, field] = entry.split(":");
                        return (
                          <span>
                            {label}
                            <strong>{counts.value[field] ?? 0}</strong>
                          </span>
                        );
                      })}
                    </div>
                    <PcTable />
                  </>
                )}
              </div>
            ),
            "footer-page": () => (
              <Space size={20}>
                {tab.value === "info" && (
                  <Page
                    cachePageQuery={false}
                    current={pager.pageNumber}
                    pageSize={pager.pageSize}
                    total={pager.total}
                    syncToUrl={false}
                    onPageChange={(number: number, size: number) => {
                      pager.pageNumber = number;
                      pager.pageSize = size;
                      void load();
                    }}
                  />
                )}
                <Button onClick={back}>返回</Button>
              </Space>
            ),
          }}
        />
      );
    },
  });
}
