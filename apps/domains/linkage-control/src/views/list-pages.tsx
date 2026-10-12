import type { LinkageRow } from "@g2-contract/linkage-control";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getLinkageControlClient } from "../domain-context";
import { Button, Page, PageLayout, PopConfirm, RangePicker, Space, Switch, message, usePcForm, usePcTable } from "../pc-ui-runtime";

type RuleKind = "condition" | "scene" | "time";
type LogKind = "condition-log" | "scene-log" | "time-log";
const BASE = "/d/linkage-control";
const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";
const dateText = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "--";
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
};

export const LinkageRulePage = (kind: RuleKind) => defineComponent({
  name: `LinkageRulePage-${kind}`,
  setup() {
    const router = useRouter();
    const query = reactive<{ keyword: string; enabled?: boolean }>({ keyword: "", enabled: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedIds = ref<string[]>([]);
    const title = kind === "condition" ? "规则联动列表" : kind === "scene" ? "场景联动列表" : "定时联动列表";
    const refresh = (): void => tableApi.query();
    const [PcTable, tableApi] = usePcTable({
      tableCode: `LINKAGE_CONTROL_${kind.toUpperCase()}`,
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) { selectedIds.value = keys.map(String); },
      columns: [
        { title: kind === "time" ? "定时任务名称" : kind === "scene" ? "场景名称" : "联动名称", dataIndex: "name", width: 220, fixed: "left", ellipsis: true },
        ...(kind === "time" ? [{ title: "周期类型", dataIndex: "looped", width: 100, customRender: ({ text: value }: { text: unknown }) => value ? "循环" : "单次" }] : []),
        ...(kind !== "time" ? [{ title: "触发次数", dataIndex: "triggerNum", width: 100, align: "center" as const, customRender: ({ text: value }: { text: unknown }) => value == null ? 0 : value }] : []),
        ...(kind === "condition" ? [{ title: "创建人", dataIndex: "createByName", width: 140, ellipsis: true }] : []),
        { title: "更新时间", dataIndex: "updateTime", width: 180, customRender: ({ text: value }: { text: unknown }) => dateText(value) },
        { title: "是否启用", dataIndex: "enabled", width: 100, customRender: ({ record }: { record: LinkageRow }) => (
          <Switch checked={Boolean(record.enabled)} onChange={async (checked: boolean | string | number) => {
            try { await getLinkageControlClient().setRuleEnabled(record.id, checked === true); message.success("设置成功"); refresh(); }
            catch (error) { message.error(errorText(error)); refresh(); }
          }} />
        ) },
        { title: "操作", dataIndex: "action", fixed: "right", width: 190, customRender: ({ record }: { record: LinkageRow }) => (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => void router.push(`${BASE}/rule-edit/${kind}/${encodeURIComponent(record.id)}`)}>编辑</Button>
            <PopConfirm title="确认删除当前联动？" okText="确定" cancelText="取消" onConfirm={async () => {
              try { await getLinkageControlClient().deleteRule(record.id); message.success("删除成功"); refresh(); }
              catch (error) { message.error(errorText(error)); }
            }}><Button type="link" size="small" danger>删除</Button></PopConfirm>
          </Space>
        ) },
      ],
      fetchApi: async () => {
        try {
          const result = await getLinkageControlClient().pageRules(kind, {
            pageNumber: page.pageNumber, pageSize: page.pageSize,
            keyword: query.keyword.trim() || undefined, enabled: kind === "condition" ? query.enabled : undefined,
          });
          page.total = result.total;
          return result;
        } catch (error) { message.error(errorText(error)); return { records: [], total: 0, pages: 0 }; }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        ...(kind === "condition" ? [{ component: "Select", fieldName: "enabled", label: "是否启用", componentProps: {
          allowClear: true, placeholder: "请选择启用状态", options: [{ label: "启用", value: true }, { label: "停用", value: false }],
        } }] : []),
        { component: "Input", fieldName: "keyword", label: "", defaultValue: "", componentProps: {
          allowClear: true, placeholder: kind === "time" ? "请输入任务名称搜索" : kind === "scene" ? "请输入场景名称搜索" : "请输入联动名称搜索",
        } },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.enabled = values.enabled === true || values.enabled === false ? values.enabled : undefined;
        page.pageNumber = 1; refresh();
      },
      handleReset() { query.keyword = ""; query.enabled = undefined; page.pageNumber = 1; refresh(); },
    });
    return () => <PageLayout title={title} v-slots={{
      "layout-header": () => <Space>
        <PopConfirm title={`确定删除选中的 ${selectedIds.value.length} 条联动？`} okText="确定" cancelText="取消" onConfirm={async () => {
          if (!selectedIds.value.length) return;
          try { await getLinkageControlClient().deleteRules(selectedIds.value); message.success("删除成功"); selectedIds.value = []; tableApi.setSelectedRowKeys([]); refresh(); }
          catch (error) { message.error(errorText(error)); }
        }}><Button danger disabled={!selectedIds.value.length}>批量删除</Button></PopConfirm>
        <Button type="primary" onClick={() => void router.push(`${BASE}/rule-edit/${kind}`)}>新增</Button>
      </Space>,
      "layout-content": () => <><PcForm /><PcTable /></>,
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} cachePageQuery={false} onPageChange={(pageNumber: number, pageSize: number) => {
        page.pageNumber = pageNumber; page.pageSize = pageSize; refresh();
      }} />,
    }} />;
  },
});

export const LinkageEventPage = (kind: LogKind) => defineComponent({
  name: `LinkageEventPage-${kind}`,
  setup() {
    const router = useRouter();
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const query = reactive<{ keyword: string; date?: [string, string] }>({ keyword: "", date: undefined });
    const [PcTable, tableApi] = usePcTable({
      tableCode: `LINKAGE_CONTROL_${kind.toUpperCase()}`,
      rowKey: "id",
      columns: [
        { title: "触发时间", dataIndex: "triggerTime", width: 180, customRender: ({ text: value }: { text: unknown }) => dateText(value) },
        { title: kind === "scene-log" ? "场景名称" : kind === "time-log" ? "事件名称" : "联动名称", dataIndex: "name", width: 220, ellipsis: true },
        ...(kind === "scene-log" ? [{ title: "操作人", dataIndex: "operatorName", width: 150 }] : []),
        { title: "操作", dataIndex: "action", width: 100, customRender: ({ record }: { record: LinkageRow }) => (
          <Button type="link" onClick={() => void router.push(`${BASE}/event-detail/${kind.replace("-log", "")}/${encodeURIComponent(record.id)}`)}>详情</Button>
        ) },
      ],
      fetchApi: async () => {
        const businessType = kind === "condition-log" ? "DEVICE_CONDITION" : kind === "scene-log" ? "SCENE_CONTROL" : "TIMING_CONTROL";
        try {
          const result = await getLinkageControlClient().pageEvents({
            pageNumber: page.pageNumber, pageSize: page.pageSize, applicationCode: "DEVICE", businessType,
            keyword: query.keyword.trim() || undefined,
            period: query.date?.length === 2 ? `${query.date[0]} 00:00:00,${query.date[1]} 23:59:59` : undefined,
          });
          page.total = result.total; return result;
        } catch (error) { message.error(errorText(error)); return { records: [], total: 0, pages: 0 }; }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal", syncStateRef: query,
      schema: [
        { component: RangePicker, fieldName: "date", label: "时间范围", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD", placeholder: ["开始日期", "结束日期"] } },
        { component: "Input", fieldName: "keyword", label: "", defaultValue: "", componentProps: { allowClear: true, placeholder: kind === "time-log" ? "请输入任务名称搜索" : kind === "scene-log" ? "请输入场景名称搜索" : "请输入联动名称搜索" } },
      ],
      handleSubmit(values) { query.keyword = String(values.keyword ?? "").trim(); query.date = Array.isArray(values.date) ? values.date as [string, string] : undefined; page.pageNumber = 1; tableApi.query(); },
      handleReset() { query.keyword = ""; query.date = undefined; page.pageNumber = 1; tableApi.query(); },
    });
    return () => <PageLayout title={kind === "condition-log" ? "联动日志" : kind === "scene-log" ? "场景日志" : "定时日志"} showFooter={false} v-slots={{
      "layout-content": () => <><PcForm /><PcTable /></>,
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} cachePageQuery={false} onPageChange={(pageNumber: number, pageSize: number) => { page.pageNumber = pageNumber; page.pageSize = pageSize; tableApi.query(); }} />,
    }} />;
  },
});
