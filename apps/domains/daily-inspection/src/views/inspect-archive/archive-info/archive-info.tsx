// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ArchiveBasicInfo } from "./components/basic-info";
import { CubeLayout } from "@/compat/app-design";
import { OBJECT_STATUS_COLOR, OBJECT_STATUS_MAP, RESULT_OPTIONS, TARGET_CATEGORY_MAP, TARGET_CATEGORY_OPTIONS } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Input, Page, PopOver, Select, Space, Spin, Table, message } from "@/pc-ui-runtime";

import styles from "./archive-info.module.css";

const BASE = "/d/daily-inspection";

export const ArchiveInfo = defineComponent({
  name: "InspectArchiveInfo",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const targetId = String(route.query.id ?? route.query.targetId ?? "");
    const pageLoading = ref(true);
    const tableLoading = ref(false);
    const state = reactive<{ details: InspectionRecord; dataSource: InspectionRecord[] }>({
      details: {},
      dataSource: [],
    });
    const query = reactive({
      targetCategory: "",
      result: "",
      keyword: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });

    const loadDetail = async (): Promise<void> => {
      if (!targetId) return;
      state.details = await getDailyInspectionClient().getArchive({ targetId, id: targetId });
    };

    const loadTable = async (): Promise<void> => {
      if (!targetId) return;
      tableLoading.value = true;
      try {
        const page = await getDailyInspectionClient().listArchiveRecords({
          targetId,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
          targetCategory: query.targetCategory || undefined,
          result: query.result || undefined,
          keyword: query.keyword || undefined,
        });
        state.dataSource = page.records;
        query.total = page.total;
      } catch {
        message.error("历史巡检记录加载失败");
        state.dataSource = [];
      } finally {
        tableLoading.value = false;
      }
    };

    onMounted(async () => {
      try {
        await Promise.all([loadDetail(), loadTable()]);
      } catch {
        message.error("巡检档案详情加载失败");
      } finally {
        pageLoading.value = false;
      }
    });

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
          return TARGET_CATEGORY_MAP[key] ?? (key || "--");
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
        dataIndex: "errNames",
        key: "errNames",
        ellipsis: true,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const text = String(record.errNames ?? record.itemName ?? "--");
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
        title: "结果来源",
        dataIndex: "resultSource",
        key: "resultSource",
        width: 110,
        customRender: ({ record }: { record: InspectionRecord }) =>
          String(record.resultSource ?? "MANUAL") === "AI" ? "AI识别" : "人工确认",
      },
      {
        title: "执行人",
        dataIndex: "username",
        key: "username",
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
        <Spin spinning={pageLoading.value}>
          <div class={styles["edit-content"]}>
            <div class={styles.title}>基础信息</div>
            <ArchiveBasicInfo initFormState={state.details} />
            <div class={styles.title} style={{ marginTop: "32px" }}>
              巡检记录
            </div>
            <div class={styles.titleTips}>
              <div>巡检总次数：{Number(state.details.dailyNum ?? 0) + Number(state.details.temporaryNum ?? 0)}次</div>
              <div>日常巡检：{Number(state.details.dailyNum ?? 0)}次</div>
              <div>临时巡检：{Number(state.details.temporaryNum ?? 0)}次</div>
              <div>
                巡检异常结果次数：
                {Number(state.details.dailyErrNum ?? 0) + Number(state.details.temporaryErrNum ?? 0)}次
              </div>
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
                  Object.assign(query, { targetCategory: "", result: "", keyword: "", pageNumber: 1 });
                  void loadTable();
                }}
              >
                重置
              </Button>
            </Space>
            <Table
              columns={columns}
              dataSource={state.dataSource}
              loading={tableLoading.value}
              pagination={false}
              rowKey={(record: InspectionRecord) => String(record.id ?? Math.random())}
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

    return () => <CubeLayout title="巡检档案详情" v-slots={slots} />;
  },
});
