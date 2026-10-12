// @ts-nocheck
import { defineComponent, reactive, ref } from "vue";

import { DisEnableModal } from "./disenable-modal";
import { emergencyApi } from "@/api/server";
import { getEmergencyManagementClient } from "@/domain-context";
import { Button, Input, Page, PopConfirm, PopOver, Tag, message, PageLayout, usePcTable } from "@/pc-ui-runtime";
import { navigateIotAlarm, timeUnitLabel, usePageName } from "@/utils";

export const PlanRules = defineComponent({
  name: "PlanRules",
  setup() {
    const { pageTitle } = usePageName();
    const filters = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const disenableModalRef = ref<{ openModal: (record: Record<string, unknown>) => void }>();

    const columns = [
      {
        dataIndex: "name",
        title: "预警规则名称",
        ellipsis: true,
        customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      { dataIndex: "emergencyTypeName", title: "类型", width: 100 },
      { dataIndex: "alarmLevelName", title: "报警级别", width: 90 },
      {
        dataIndex: "repeatTime",
        title: "去重周期",
        width: 110,
        customRender: ({ record }) => `${record.repeatTime ?? ""}${timeUnitLabel(record.repeatTimeUnit)}`,
      },
      {
        dataIndex: "estimatedHandlerTime",
        title: "处理时限",
        width: 110,
        customRender: ({ record }) => `${record.estimatedHandlerTime ?? ""}${timeUnitLabel(record.estimatedHandlerUnit)}`,
      },
      {
        dataIndex: "enabled",
        title: "状态",
        width: 90,
        customRender: ({ record }) => (record.enabled ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag>),
      },
      {
        dataIndex: "disableDuration",
        title: "禁用时长",
        width: 110,
        customRender: ({ record }) => {
          const textVal = record.disableDuration ? `${record.disableDuration} 小时` : "";
          return <PopOver content={textVal || "--"}>{textVal || "--"}</PopOver>;
        },
      },
      {
        dataIndex: "remark",
        title: "说明",
        ellipsis: true,
        customRender: ({ record }) => <PopOver content={record.remark || "--"}>{record.remark || "--"}</PopOver>,
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 280,
        customRender: ({ record }) => (
          <>
            <Button type="link" size="small" onClick={() => navigateIotAlarm({ type: "detail", id: String(record.id) })}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => navigateIotAlarm({ type: "edit", id: String(record.id) })}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => navigateIotAlarm({ type: "edit", id: String(record.id), copy: "1" })}>
              复制
            </Button>
            <Button
              type="link"
              size="small"
              onClick={async () => {
                if (record.enabled) {
                  disenableModalRef.value?.openModal(record);
                  return;
                }
                try {
                  await getEmergencyManagementClient().setRuleEnabled({ id: record.id, enabled: true });
                  message.success("操作成功！");
                  tableApi.query();
                } catch (error) {
                  message.error(error instanceof Error ? error.message : "操作失败");
                }
              }}
            >
              {record.enabled ? "禁用规则" : "启用规则"}
            </Button>
            <PopConfirm
              title="确认删除该项？"
              onConfirm={async () => {
                try {
                  await getEmergencyManagementClient().deleteRule(String(record.id));
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
      tableCode: "EMERGENCY_CENTER_PLAN_RULE",
      rowKey: "id",
      fetchApi: async () => {
        const result = await emergencyApi.listRules({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: filters.keyword || undefined,
        });
        return { total: result.total, pages: 0, records: result.records };
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => navigateIotAlarm({ type: "add" })}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <div>
          <div class="em-search-row">
            <Input
              allowClear
              placeholder="请输入规则名称"
              style={{ width: "220px" }}
              value={filters.keyword}
              onUpdate:value={(v) => (filters.keyword = v)}
              onPressEnter={() => {
                page.pageNumber = 1;
                tableApi.query();
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                page.pageNumber = 1;
                tableApi.query();
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                filters.keyword = "";
                page.pageNumber = 1;
                tableApi.query();
              }}
            >
              重置
            </Button>
          </div>
          <PcTable />
          <DisEnableModal ref={disenableModalRef} onOk={() => tableApi.query()} />
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
