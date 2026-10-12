import type { PatrolArea, PatrolRow } from "@g2-contract/electronic-patrol";
import type { FormInstance } from "@g2-platform/pc-ui";
import * as VueApi from "vue";
import { useRoute, useRouter } from "vue-router";

import * as PatrolContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { areaText, errorMessage, formatDateTime, text } from "../shared";

import styles from "../styles.module.less";

const {
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Image,
  Input,
  Modal,
  PageLayout,
  Popconfirm,
  TabPane,
  Table,
  Tabs,
  Tag,
  message,
  usePcForm,
  usePcTable,
} = PcUi;
const { defineComponent, reactive, ref } = VueApi;

function currentPeriod(periods: string[]): string {
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    periods.find((period) => {
      const [start, end] = period.split("-");
      return Boolean(start && end && current >= start && current < end);
    }) ??
    periods[0] ??
    ""
  );
}

function normalizeRoutePoints(record: PatrolRow): PatrolRow[] {
  const value = record.patrolLocation ?? record.locationList;
  return Array.isArray(value) ? value.filter((item): item is PatrolRow => Boolean(item && typeof item === "object" && "id" in item)) : [];
}

export const PatrolRouteFormPage = defineComponent({
  name: "ElectronicPatrolRouteFormPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = typeof route.query.id === "string" ? route.query.id : "";
    const formRef = ref<FormInstance>();
    const saving = ref(false);
    const pickerVisible = ref(false);
    const areaOptions = ref<PatrolArea[]>([]);
    const selectedPoints = ref<PatrolRow[]>([]);
    const selectedKeys = ref<string[]>([]);
    const pickerRows = ref<PatrolRow[]>([]);
    const pickerQuery = reactive<{ keyword: string; areaPath?: string[] }>({ keyword: "" });
    const pickerPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const model = reactive({ patrolRouteName: "" });

    const [PointTable, pointTableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_ROUTE_POINT_PICKER",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedKeys.value = keys.map(String);
        const merged = new Map(selectedPoints.value.map((item) => [item.id, item]));
        for (const item of pickerRows.value) {
          merged.set(item.id, item);
        }
        selectedPoints.value = selectedKeys.value.map((key) => merged.get(key)).filter((item): item is PatrolRow => Boolean(item));
      },
      columns: [
        { title: "巡更点名称", dataIndex: "patrolLocationName", width: 220, ellipsis: true },
        { title: "所属区域", dataIndex: "area", width: 260, ellipsis: true, customRender: ({ text: value }) => areaText(value) },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pagePoints({
            pageNumber: pickerPage.pageNumber,
            pageSize: pickerPage.pageSize,
            keyword: pickerQuery.keyword || undefined,
            areaId: pickerQuery.areaPath?.join(","),
          });
          pickerRows.value = result.records;
          pickerPage.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更点加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PointForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: pickerQuery,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "巡更点名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更点名称" },
        },
        {
          component: "Cascader",
          fieldName: "areaPath",
          label: "所属区域",
          componentProps: {
            allowClear: true,
            changeOnSelect: true,
            options: areaOptions,
            fieldNames: { label: "name", value: "id", children: "children" },
            placeholder: "请选择",
          },
        },
      ],
      handleSubmit(values) {
        pickerQuery.keyword = String(values.keyword ?? "").trim();
        pickerQuery.areaPath = Array.isArray(values.areaPath) ? values.areaPath.map(String) : undefined;
        pickerPage.pageNumber = 1;
        pointTableApi.query();
      },
      handleReset() {
        pickerQuery.keyword = "";
        pickerQuery.areaPath = undefined;
        pickerPage.pageNumber = 1;
        pointTableApi.query();
      },
    });

    void PatrolContext.getElectronicPatrolClient()
      .listAreas()
      .then((items) => {
        areaOptions.value = items;
      })
      .catch((error: unknown) => message.error(errorMessage(error, "区域加载失败")));
    if (id) {
      void PatrolContext.getElectronicPatrolClient()
        .getRoute(id)
        .then((record) => {
          model.patrolRouteName = text(record.patrolRouteName) === "--" ? "" : text(record.patrolRouteName);
          selectedPoints.value = normalizeRoutePoints(record);
          selectedKeys.value = selectedPoints.value.map((item) => item.id);
          pointTableApi.setSelectedRowKeys(selectedKeys.value);
        })
        .catch((error: unknown) => message.error(errorMessage(error, "巡更路线加载失败")));
    }
    const removePoint = (pointId: string): void => {
      selectedPoints.value = selectedPoints.value.filter((item) => item.id !== pointId);
      selectedKeys.value = selectedKeys.value.filter((key) => key !== pointId);
      pointTableApi.setSelectedRowKeys(selectedKeys.value);
    };
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validateFields();
        if (selectedPoints.value.length === 0) {
          message.warning("请至少添加一个巡更点");
          return;
        }
        saving.value = true;
        const body = {
          id: id || undefined,
          patrolRouteName: model.patrolRouteName.trim(),
          locationIds: selectedPoints.value.map((item) => item.id),
        };
        if (id) {
          await PatrolContext.getElectronicPatrolClient().updateRoute(body);
        } else {
          await PatrolContext.getElectronicPatrolClient().createRoute(body);
        }
        message.success(id ? "修改成功" : "添加成功");
        router.back();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      } finally {
        saving.value = false;
      }
    };

    return () => (
      <PageLayout
        title={id ? "编辑巡更路线" : "新增巡更路线"}
        v-slots={{
          "layout-content": () => (
            <div class={styles.tablePage}>
              <div class={styles.formCard}>
                <Form ref={formRef} model={model} labelCol={{ style: { width: "130px" } }}>
                  <FormItem label="巡更路线名称" name="patrolRouteName" rules={[{ required: true, message: "请输入巡更路线名称" }]}>
                    <Input v-model:value={model.patrolRouteName} maxlength={30} placeholder="请输入巡更路线名称" />
                  </FormItem>
                  <FormItem label="巡更点">
                    <Button
                      type="primary"
                      onClick={() => {
                        pickerVisible.value = true;
                        pointTableApi.setSelectedRowKeys(selectedKeys.value);
                        pointTableApi.query();
                      }}
                    >
                      添加巡更点
                    </Button>
                  </FormItem>
                </Form>
              </div>
              <div class={styles.detailSection}>
                <div class={styles.detailSectionTitle}>已选巡更点（{selectedPoints.value.length}）</div>
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={selectedPoints.value}
                  columns={[
                    { title: "序号", width: 70, customRender: ({ index }: { index: number }) => index + 1 },
                    { title: "巡更点", dataIndex: "patrolLocationName", ellipsis: true },
                    { title: "所属区域", dataIndex: "area", customRender: ({ text: value }: { text: unknown }) => areaText(value) },
                    {
                      title: "操作",
                      width: 100,
                      customRender: ({ record }: { record: PatrolRow }) => (
                        <Popconfirm title="是否删除当前选中？" onConfirm={() => removePoint(record.id)}>
                          <Button type="link" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </div>
              <Modal
                open={pickerVisible.value}
                title="添加巡更点"
                width={900}
                onOk={() => (pickerVisible.value = false)}
                onCancel={() => (pickerVisible.value = false)}
              >
                <PointForm />
                <PointTable />
              </Modal>
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              <Button onClick={() => router.back()}>返回</Button>
              <Button type="primary" loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});

function createTaskDetailPage(mode: "task" | "record") {
  return defineComponent({
    name: mode === "task" ? "ElectronicPatrolTaskDetailsPage" : "ElectronicPatrolRecordDetailsPage",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const id = typeof route.query.id === "string" ? route.query.id : "";
      const status = typeof route.query.status === "string" ? route.query.status : "";
      const detail = reactive<Record<string, unknown>>({ executePeriod: [] });
      const activePeriod = ref("");
      const loading = ref(true);
      const accepting = ref(false);
      const modalVisible = ref(false);
      const selectedPoint = reactive<Record<string, unknown>>({ files: [] });

      const [PcTable, tableApi] = usePcTable({
        tableCode: mode === "task" ? "ELECTRONIC_PATROL_TASK_DETAILS" : "ELECTRONIC_PATROL_RECORD_DETAILS",
        rowKey: "id",
        columns: [
          { title: "序号", dataIndex: "sequence", width: 70, fixed: "left", customRender: ({ index }: { index: number }) => index + 1 },
          { title: "巡更点", dataIndex: "locationName", width: 180, ellipsis: true },
          { title: "所属区域", dataIndex: "arae", width: 200, ellipsis: true, customRender: ({ text: value }) => areaText(value) },
          { title: "巡更人员", dataIndex: "userName", width: 140, ellipsis: true },
          { title: "巡更时间", dataIndex: "patrolDate", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
          {
            title: "巡更结果",
            dataIndex: "patrolResult",
            width: 110,
            customRender: ({ text: value }) =>
              value === "NORMAL" ? <Tag color="green">正常</Tag> : value === "ABNORMAL" ? <Tag color="red">异常</Tag> : "--",
          },
          {
            title: "操作",
            dataIndex: "action",
            width: 100,
            fixed: "right",
            customRender: ({ record }: { record: PatrolRow }) => (
              <Button
                type="link"
                onClick={() => {
                  Object.assign(selectedPoint, record);
                  modalVisible.value = true;
                }}
              >
                详情
              </Button>
            ),
          },
        ],
        fetchApi: async () => {
          if (!id || !activePeriod.value) {
            return { records: [], total: 0, pages: 0 };
          }
          try {
            const rows = await PatrolContext.getElectronicPatrolClient().getTaskLocations({
              taskId: id,
              executePeriod: activePeriod.value,
            });
            return { records: rows, total: rows.length, pages: rows.length > 0 ? 1 : 0 };
          } catch (error) {
            message.error(errorMessage(error, "巡更明细加载失败"));
            return { records: [], total: 0, pages: 0 };
          }
        },
      });
      const load = async (): Promise<void> => {
        if (!id) {
          loading.value = false;
          return;
        }
        try {
          const task = await PatrolContext.getElectronicPatrolClient().getTask(id);
          Object.assign(detail, task);
          const periods = Array.isArray(detail.executePeriod) ? detail.executePeriod.map(String) : [];
          activePeriod.value = currentPeriod(periods);
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "巡更详情加载失败"));
        } finally {
          loading.value = false;
        }
      };
      void load();
      const accept = async (): Promise<void> => {
        if (!id) {
          return;
        }
        accepting.value = true;
        try {
          await PatrolContext.getElectronicPatrolClient().acceptTask(id);
          message.success("接收成功");
          router.back();
        } catch (error) {
          message.error(errorMessage(error, "接收失败"));
        } finally {
          accepting.value = false;
        }
      };
      const files = (): { path: string }[] =>
        Array.isArray(selectedPoint.files)
          ? selectedPoint.files.filter((item): item is { path: string } => Boolean(item && typeof item === "object" && "path" in item))
          : [];
      const periods = (): string[] => (Array.isArray(detail.executePeriod) ? detail.executePeriod.map(String) : []);
      return () => (
        <PageLayout
          title={mode === "task" ? "巡更任务详情" : "巡更记录详情"}
          v-slots={{
            "layout-content": () => (
              <div class={styles.tablePage}>
                <div class={styles.detailSection}>
                  <Descriptions bordered column={3}>
                    <DescriptionsItem label="任务名称">{text(detail.taskName)}</DescriptionsItem>
                    <DescriptionsItem label="巡更人员">{text(detail.userName)}</DescriptionsItem>
                    <DescriptionsItem label="协同人员">{text(detail.assistNames)}</DescriptionsItem>
                    <DescriptionsItem label="所属部门">{text(detail.userDep)}</DescriptionsItem>
                    <DescriptionsItem label="任务日期">{formatDateTime(detail.startDate ?? detail.completedDate)}</DescriptionsItem>
                    <DescriptionsItem label="巡更路线">{text(detail.routeName ?? detail.patrolRouteName)}</DescriptionsItem>
                    <DescriptionsItem label="巡更点数">{text(detail.patrolLocationNum)}</DescriptionsItem>
                    <DescriptionsItem label="已巡点数">{text(detail.completedNum)}</DescriptionsItem>
                    <DescriptionsItem label="未巡点数">{text(detail.undoneNum)}</DescriptionsItem>
                  </Descriptions>
                </div>
                <Tabs
                  activeKey={activePeriod.value}
                  onChange={(value: string | number) => {
                    activePeriod.value = String(value);
                    tableApi.query();
                  }}
                >
                  {periods().map((period) => (
                    <TabPane key={period} tab={period} />
                  ))}
                </Tabs>
                <PcTable />
                <Modal open={modalVisible.value} title="巡更详情" width={820} footer={null} onCancel={() => (modalVisible.value = false)}>
                  <Descriptions bordered column={2}>
                    <DescriptionsItem label="巡更点">{text(selectedPoint.locationName)}</DescriptionsItem>
                    <DescriptionsItem label="巡更结果">
                      {selectedPoint.patrolResult === "NORMAL" ? (
                        "正常"
                      ) : selectedPoint.patrolResult === "ABNORMAL" ? (
                        <span class={styles.danger}>异常</span>
                      ) : (
                        "--"
                      )}
                    </DescriptionsItem>
                    <DescriptionsItem label="说明" span={2}>
                      {text(selectedPoint.remark)}
                    </DescriptionsItem>
                    <DescriptionsItem label="巡更图片" span={2}>
                      <div class={styles.actionSpace}>
                        {files().length > 0
                          ? files().map((file) => <Image key={file.path} src={file.path} width={100} height={100} />)
                          : "--"}
                      </div>
                    </DescriptionsItem>
                    {selectedPoint.hiddenId ? (
                      <DescriptionsItem label="关联隐患" span={2}>
                        <Button
                          type="link"
                          onClick={() => {
                            globalThis.location.href = `/portal/stream-engine-render/index?businessType=HIDDENDANGER&processInstanceId=${encodeURIComponent(String(selectedPoint.hiddenId))}&status=ACTIVE&type=detail&title=${encodeURIComponent("隐患单")}`;
                          }}
                        >
                          隐患排查单
                        </Button>
                      </DescriptionsItem>
                    ) : null}
                  </Descriptions>
                </Modal>
              </div>
            ),
            "footer-page": () => (
              <div class={styles.footerActions}>
                <Button onClick={() => router.back()}>返回</Button>
                {mode === "task" && status === "TO_BE_RECEIVED" ? (
                  <Button type="primary" loading={accepting.value} onClick={() => void accept()}>
                    接收
                  </Button>
                ) : null}
              </div>
            ),
          }}
        />
      );
    },
  });
}

export const PatrolTaskDetailsPage = createTaskDetailPage("task");
export const PatrolRecordDetailsPage = createTaskDetailPage("record");
