import { defineComponent, reactive, ref, type DefineComponent } from "vue";

import { getResourceManagementClient } from "../domain-context";
import { Button, Page, PageLayout, PopOver, usePcForm, usePcTable, type PcTableColumn } from "../pc-ui-runtime";

// 旧工单页尚未接入业务接口；这里保留原页面的筛选、列和详情跳转行为。
function orderPage(report: boolean): DefineComponent {
  return defineComponent({
    name: report ? "UnroutedOrderReport" : "UnroutedOrderList",
    setup() {
      const query = reactive({
        tenantId: undefined as string | undefined,
        status: undefined as string | undefined,
        period: undefined as unknown,
      });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const tenants = ref<{ label: string; value: string }[]>([]);
      const labels = report
        ? ["日期", "所属医院", "工单类型", "工单合计", "进行中", "处理完成"]
        : [
            "编号",
            "所属医院",
            "工单名称",
            "工单类型",
            "对象",
            "工单来源",
            "紧急程度",
            "发起时间",
            "发起人",
            "处理状态",
            "处理进度",
            "处理结果",
          ];
      const columns: PcTableColumn[] = [
        ...labels.map((title, index) => ({
          title,
          key: `name-${index}`,
          ellipsis: true,
          customRender: ({ record }: { record: { name?: string } }) => (
            <PopOver content={record.name || "--"}>{record.name || "--"}</PopOver>
          ),
        })),
        ...(!report
          ? [
              {
                title: "操作",
                dataIndex: "action",
                customRender: () => (
                  <Button
                    type="link"
                    onClick={() => {
                      history.pushState(
                        { current: location.pathname + location.search },
                        "",
                        "/portal/stream-engine-render/index?businessType=LEAVE&processInstanceId=c9bc2100-e755-11ee-81f2-fed0f9197782&currentTaskId=&status=ACTIVE&type=detail&title=请假审批",
                      );
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                  >
                    详情
                  </Button>
                ),
              },
            ]
          : []),
      ];
      const [PcTable, table] = usePcTable({
        columns,
        rowKey: "id",
        tableCode: report ? "d/resource-management/order-report" : "d/resource-management/order-list",
        pagination: false,
        autoFetch: false,
      });
      table.setDataSource([]);
      const [PcForm] = usePcForm({
        layout: "horizontal",
        cache: false,
        syncStateRef: query,
        schema: [
          {
            component: "Select",
            fieldName: "tenantId",
            label: "所属医院",
            defaultValue: undefined,
            componentProps: { options: tenants, placeholder: "请选择所属医院", style: { width: "180px" } },
          },
          {
            component: "Select",
            fieldName: "status",
            label: "处理状态",
            defaultValue: undefined,
            componentProps: {
              options: [
                { label: "驳回", value: "1" },
                { label: "撤销", value: "1" },
                { label: "完成", value: "1" },
              ],
              placeholder: "请选择处理状态",
              style: { width: "180px" },
            },
          },
          {
            component: "RangePicker",
            fieldName: "period",
            label: "发起时间",
            defaultValue: undefined,
            componentProps: { style: { width: "250px" } },
          },
        ],
        handleSubmit: () => {
          page.pageNumber = 1;
        },
        handleReset: () => {
          page.pageNumber = 1;
        },
      });
      void getResourceManagementClient()
        .listTenants()
        .then((rows) => {
          tenants.value = rows.map((item) => ({ label: item.name, value: item.code }));
        });
      const slots = {
        "layout-content": () => (
          <>
            <PcForm />
            <PcTable />
          </>
        ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            cachePageQuery={false}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
            }}
          />
        ),
      };
      return () => <PageLayout title={report ? "工单报表" : "工单列表"} v-slots={slots} />;
    },
  }) as DefineComponent;
}

export const OrderList = orderPage(false);
export const OrderReport = orderPage(true);
