// @ts-nocheck
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { emergencyApi } from "@/api/server";
import { getEmergencyManagementClient } from "@/domain-context";
import { Button, Input, Page, PopConfirm, PopOver, Select, Tag, message, PageLayout, usePcTable } from "@/pc-ui-runtime";
import { asOptions, formatDate, usePageName } from "@/utils";

const BASE = "/d/emergency-management";

export const PlanDocuments = defineComponent({
  name: "PlanDocuments",
  setup() {
    const { pageTitle } = usePageName();
    const router = useRouter();
    const filters = reactive({
      emergencyEventTypeCode: undefined as string | undefined,
      levelCode: undefined as string | undefined,
      expirationStatus: undefined as string | undefined,
      keyword: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const eventTypeOptions = ref<{ label: string; value: string }[]>([]);

    onMounted(async () => {
      try {
        eventTypeOptions.value = asOptions(
          await getEmergencyManagementClient().getEventTypes({}),
          ["label", "name"],
          ["value", "code", "id"],
        );
      } catch {
        eventTypeOptions.value = [];
      }
    });

    const goDetail = (type: string, id?: string) => {
      const query = id ? `?type=${type}&id=${id}` : `?type=${type}`;
      router.push(`${BASE}/plan-documents/detail${query}`);
    };

    const columns = [
      {
        dataIndex: "name",
        title: "文件名称",
        ellipsis: true,
        customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "emergencyFileTypeName",
        title: "文件类型",
        ellipsis: true,
        customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "levelCode",
        title: "文件级别",
        width: 100,
        customRender: ({ text }) =>
          !text ? "--" : text === "IMPORTANT" ? <Tag color="#ff0000">重要</Tag> : <Tag color="#2db7f5">普通</Tag>,
      },
      {
        dataIndex: "expirationDate",
        title: "文件到期日期",
        width: 140,
        customRender: ({ text }) => {
          const res = formatDate(text);
          return <PopOver content={res}>{res}</PopOver>;
        },
      },
      {
        dataIndex: "expirationStatus",
        title: "文件状态",
        width: 100,
        customRender: ({ text }) => (!text ? "--" : text === "EXPIRED" ? <Tag color="red">已过期</Tag> : <Tag color="green">正常</Tag>),
      },
      {
        dataIndex: "generated",
        title: "创建来源",
        width: 120,
        customRender: ({ text, record }) =>
          record.contentHtml || text ? <Tag color="blue">AI智能创建</Tag> : <Tag color="green">人工新建</Tag>,
      },
      {
        dataIndex: "remark",
        title: "备注说明",
        ellipsis: true,
        customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 200,
        customRender: ({ record }) => (
          <>
            <Button type="link" size="small" onClick={() => goDetail("detail", String(record.id))}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => goDetail("edit", String(record.id))}>
              编辑
            </Button>
            <PopConfirm
              title="确认删除该项？"
              onConfirm={async () => {
                try {
                  await getEmergencyManagementClient().deletePlanDocument(String(record.id));
                  message.success("操作成功");
                  tableApi.query();
                } catch (error) {
                  message.error(error instanceof Error ? error.message : "删除失败");
                }
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "EMERGENCY_CENTER_PLAN_FILE",
      rowKey: "id",
      fetchApi: async () => {
        const result = await emergencyApi.listPlanDocuments({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          ...filters,
          keyword: filters.keyword || undefined,
        });
        return { total: result.total, pages: 0, records: result.records };
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const query = () => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <div class="em-header-actions">
          <Button type="primary" onClick={() => goDetail("add")}>
            新增
          </Button>
          <Button type="primary" onClick={() => router.push(`${BASE}/plan-generate`)}>
            AI生成
          </Button>
        </div>
      ),
      "layout-content": () => (
        <div>
          <div class="em-search-row">
            <Select
              allowClear
              placeholder="请选择事件分类"
              style={{ width: "180px" }}
              options={eventTypeOptions.value}
              value={filters.emergencyEventTypeCode}
              onUpdate:value={(v) => (filters.emergencyEventTypeCode = v)}
            />
            <Select
              allowClear
              placeholder="请选择文件级别"
              style={{ width: "160px" }}
              options={[
                { label: "重要", value: "IMPORTANT" },
                { label: "普通", value: "ORDINARY" },
              ]}
              value={filters.levelCode}
              onUpdate:value={(v) => (filters.levelCode = v)}
            />
            <Select
              allowClear
              placeholder="请选择文件状态"
              style={{ width: "160px" }}
              options={[
                { label: "正常", value: "NORMAL" },
                { label: "已过期", value: "EXPIRED" },
              ]}
              value={filters.expirationStatus}
              onUpdate:value={(v) => (filters.expirationStatus = v)}
            />
            <Input
              allowClear
              placeholder="请输入文件名"
              style={{ width: "200px" }}
              value={filters.keyword}
              onUpdate:value={(v) => (filters.keyword = v)}
              onPressEnter={query}
            />
            <Button type="primary" onClick={query}>
              查询
            </Button>
            <Button
              onClick={() => {
                filters.emergencyEventTypeCode = undefined;
                filters.levelCode = undefined;
                filters.expirationStatus = undefined;
                filters.keyword = "";
                query();
              }}
            >
              重置
            </Button>
          </div>
          <PcTable />
        </div>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber, pageSize) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title={pageTitle} v-slots={slots} />;
  },
});
