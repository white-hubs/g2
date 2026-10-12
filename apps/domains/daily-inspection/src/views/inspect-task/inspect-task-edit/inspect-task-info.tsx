// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { BasicInfo } from "./components/basic-info";
import { CubeLayout } from "@/compat/app-design";
import { OBJECT_STATUS_COLOR, OBJECT_STATUS_MAP, TARGET_CATEGORY_MAP, TARGET_CATEGORY_OPTIONS, RESULT_OPTIONS } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Input, Page, PopOver, Select, Space, Spin, Table, message } from "@/pc-ui-runtime";

import styles from "./inspect-task-edit.module.css";

const BASE = "/d/daily-inspection";

export const InspectTaskInfo = defineComponent({
  name: "InspectTaskInfo",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const taskId = String(route.query.id ?? "");
    const state = reactive<{
      formState: InspectionRecord;
      details: InspectionRecord;
      dataSource: InspectionRecord[];
      loading: boolean;
      pageLoading: boolean;
    }>({
      formState: {},
      details: {
        targetAllNum: 0,
        waitTargetNum: 0,
        repairNum: 0,
        completedTargetNum: 0,
        errTargetNum: 0,
      },
      dataSource: [],
      loading: false,
      pageLoading: true,
    });
    const query = reactive({
      targetCategory: "",
      status: "",
      keyword: "",
      result: String(route.query.result ?? ""),
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });

    const loadHeader = async (): Promise<void> => {
      if (!taskId) return;
      const [detail, count] = await Promise.all([
        getDailyInspectionClient().getTask({ id: taskId, notTarget: true }),
        getDailyInspectionClient().getTaskObjCount({ taskId }),
      ]);
      state.formState = detail;
      state.details = count;
    };

    const loadTable = async (): Promise<void> => {
      if (!taskId) return;
      state.loading = true;
      try {
        const page = await getDailyInspectionClient().getTaskRate({
          id: taskId,
          taskId,
          targetCategory: query.targetCategory || undefined,
          status: query.status || undefined,
          keyword: query.keyword || undefined,
          result: query.result || undefined,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        });
        const root = page as InspectionRecord & { records?: InspectionRecord[]; recordTaskResultList?: InspectionRecord[] };
        state.dataSource = (root.recordTaskResultList ?? root.records ?? []) as InspectionRecord[];
        query.total = Number(root.total ?? root.targetNum ?? page.total ?? 0);
      } catch {
        message.error("巡检进度加载失败");
        state.dataSource = [];
      } finally {
        state.loading = false;
      }
    };

    onMounted(async () => {
      try {
        await Promise.all([loadHeader(), loadTable()]);
      } catch {
        message.error("巡检任务详情加载失败");
      } finally {
        state.pageLoading = false;
      }
    });

    const statusOptions = Object.entries(OBJECT_STATUS_MAP).map(([value, label]) => ({ label, value }));

    const columns = [
      {
        title: "巡检对象名称",
        dataIndex: "targetName",
        key: "targetName",
        ellipsis: true,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const text = String(record.targetName ?? "--");
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "巡检对象类型",
        dataIndex: "targetCategory",
        key: "targetCategory",
        width: 130,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const key = String(record.targetCategory ?? "");
          const text = TARGET_CATEGORY_MAP[key] ?? (key || "--");
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 110,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const key = String(record.status ?? "");
          const text = OBJECT_STATUS_MAP[key] ?? (key || "--");
          return <span style={{ color: OBJECT_STATUS_COLOR[key] }}>{text}</span>;
        },
      },
      {
        title: "巡检项",
        dataIndex: "itemName",
        key: "itemName",
        ellipsis: true,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const text = String(record.itemName ?? record.errNames ?? "--");
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "巡检结果",
        dataIndex: "result",
        key: "result",
        width: 110,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const key = String(record.result ?? "");
          if (!key) return "--";
          return key === "ABNORMAL" ? <span style={{ color: "#ff4158" }}>异常</span> : <span>正常</span>;
        },
      },
      {
        title: "执行人",
        dataIndex: "nickname",
        key: "nickname",
        width: 120,
        customRender: ({ record }: { record: InspectionRecord }) => String(record.nickname ?? record.username ?? "--"),
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        width: 130,
        align: "center",
        customRender: ({ record }: { record: InspectionRecord }) => (
          <Button
            type="link"
            size="small"
            onClick={() => void router.push({ path: `${BASE}/inspect-record-info`, query: { id: String(record.id ?? "") } })}
          >
            查看巡检记录
          </Button>
        ),
      },
    ];

    const slots = {
      "layout-content": () => (
        <Spin spinning={state.pageLoading}>
          <div class={styles["edit-content"]}>
            <div class={styles.title}>基础信息</div>
            <BasicInfo initFormState={state.formState} readonly />
            <div class={styles.title}>巡检进度</div>
            <div class={styles.titleTips}>
              <div>对象总数：{Number(state.details.targetAllNum ?? 0)}</div>
              <div>待巡检：{Number(state.details.waitTargetNum ?? 0)}</div>
              <div>已巡检：{Number(state.details.completedTargetNum ?? 0)}</div>
              <div>异常对象：{Number(state.details.errTargetNum ?? 0)}</div>
              <div>已修复：{Number(state.details.repairNum ?? state.details.repairCount ?? 0)}</div>
            </div>
            <Space wrap style={{ marginBottom: 12 }}>
              <Select
                value={query.targetCategory || undefined}
                allowClear
                placeholder="对象类型"
                style={{ width: 160 }}
                options={TARGET_CATEGORY_OPTIONS.filter((item) => item.value)}
                onUpdate:value={(value: string) => {
                  query.targetCategory = value || "";
                }}
              />
              <Select
                value={query.status || undefined}
                allowClear
                placeholder="状态"
                style={{ width: 140 }}
                options={statusOptions}
                onUpdate:value={(value: string) => {
                  query.status = value || "";
                }}
              />
              <Select
                value={query.result || undefined}
                allowClear
                placeholder="巡检结果"
                style={{ width: 140 }}
                options={RESULT_OPTIONS}
                onUpdate:value={(value: string) => {
                  query.result = value || "";
                }}
              />
              <Input
                value={query.keyword}
                allowClear
                placeholder="巡检对象名称"
                style={{ width: 200 }}
                onUpdate:value={(value: string) => {
                  query.keyword = value;
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void loadTable();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  Object.assign(query, { targetCategory: "", status: "", keyword: "", result: "", pageNumber: 1 });
                  void loadTable();
                }}
              >
                重置
              </Button>
            </Space>
            <Table
              class={styles["progress-table"]}
              columns={columns}
              dataSource={state.dataSource}
              loading={state.loading}
              pagination={false}
              rowKey={(record: InspectionRecord) => String(record.id ?? record.targetId ?? Math.random())}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={query.total}
                onPageChange={(page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void loadTable();
                }}
              />
            </div>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => router.back()}>返回</Button>
        </Space>
      ),
    };

    return () => <CubeLayout title="巡检任务详情" v-slots={slots} />;
  },
});
