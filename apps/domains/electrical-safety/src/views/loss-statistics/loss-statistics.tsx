import { Button, DownloadOutlined, Page, PageLayout, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { defineComponent, reactive, ref } from "vue";

import { getElectricalSafetyClient } from "@/domain-context";
import { usePageName } from "@/utils/page-name";

/** 电量类数值：空为 --，0 展示 0（避免 0 被 || 当成假值显示成 --） */
function formatEnergyValue(text: unknown): string {
  if (text === null || text === undefined || text === "") {
    return "--";
  }
  const n = Number(text);
  if (!Number.isNaN(n) && n === 0) {
    return "0";
  }
  return String(text);
}

function formatTimestamp(timestamp: unknown | number): string {
  if (timestamp === null || timestamp === undefined || timestamp === "") {
    return "--";
  }
  if (typeof timestamp === "string" && !/^\d+$/.test(timestamp)) {
    return timestamp;
  }

  return dayjs(typeof timestamp === "string" ? parseInt(timestamp) : (timestamp as number)).format("YYYY-MM-DD HH:mm:ss");
}

export const LossStatistics = defineComponent({
  name: "LossStatistics",
  setup: () => {
    const { pageTitle } = usePageName();

    const defaultPeriod = [dayjs().subtract(1, "month").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];
    const searchParams = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      period: defaultPeriod.join(","),
    });

    const columns = [
      {
        title: "线路ID",
        dataIndex: "lineId",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "线路名称",
        dataIndex: "lineName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "起点",
        dataIndex: "fromNodeName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "终点",
        dataIndex: "toNodeName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "起点位置",
        dataIndex: "fromNodeLocation",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "终点位置",
        dataIndex: "toNodeLocation",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "deviceName",
        title: "计量设备",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "输入电量(kWh)",
        dataIndex: "inputEnergy",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }): JSX.Element => {
          const display = formatEnergyValue(text);
          return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
        },
      },
      {
        title: "输出电量(kWh)",
        dataIndex: "outputEnergy",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }): JSX.Element => {
          const display = formatEnergyValue(text);
          return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
        },
      },
      {
        title: "设备损耗(kWh)",
        dataIndex: "lossEnergy",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }): JSX.Element => {
          const display = formatEnergyValue(text);
          return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
        },
      },
      {
        title: "设备线损率(%)",
        dataIndex: "lossRate",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }): JSX.Element => {
          if (text === null || text === undefined || text === "") {
            return <PopOver content="">--</PopOver>;
          }
          const raw = Number(text);
          if (Number.isNaN(raw)) {
            const s = String(text);
            return <PopOver content={s}>{s}</PopOver>;
          }
          const lossRatePct = raw * 100;
          const display = lossRatePct === 0 ? "0" : String(lossRatePct);
          const content = `${display}%`;
          return <PopOver content={content}>{display}</PopOver>;
        },
      },
      {
        title: "收集时间",
        dataIndex: "collectTime",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ text }: { text: unknown }): JSX.Element => {
          const display = formatTimestamp(text);
          return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
        },
      },
    ];

    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-loss-statistics",
      columns,
      rowKey: "lineId",
      fetchApi: async () => {
        try {
          const [startTime, endTime] = searchParams.period
            ? ((searchParams.period.split(",") as [string, string]).map((time, index) =>
                index === 0 ? `${time} 00:00:00` : `${time} 23:59:59`,
              ) as [string, string])
            : ([`${defaultPeriod[0]} 00:00:00`, `${defaultPeriod[1]} 23:59:59`] as [string, string]);
          const res = await getElectricalSafetyClient().getLineLossPage({
            pageNumber: searchParams.pageNumber,
            pageSize: searchParams.pageSize,
            startTime,
            endTime,
            lineName: searchParams.keyword,
          });
          return { total: res.total, records: res.records, pages: res.pages };
        } catch (error) {
          message.error((error as { errorMessage: string }).errorMessage ?? "查询失败");
          return { total: 0, records: [] as unknown[], pages: 0 };
        }
      },
      fetchLoaded: (data: { total: number }) => {
        searchParams.total = data.total ?? 0;
      },
    });

    const handleChange = (pageNumber: number, pageSize: number) => {
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };

    const formSchema = [
      {
        component: "RangePicker",
        label: "时间范围",
        fieldName: "period",
        defaultValue: defaultPeriod,
        componentProps: {
          styles: {
            width: "100%",
          },
          valueFormat: "YYYY-MM-DD",
          allowClear: true,
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "线路名称",
        },
      },
    ];

    const [CubeForm, _ignoreFormApi] = usePcForm({
      layout: "horizontal",
      schema: formSchema,
      showCollapseButton: true,
      syncStateRef: searchParams,
      syncMap: (values) => ({
        keyword: String(values.keyword ?? ""),
        period: Array.isArray(values.period) ? values.period.join(",") : defaultPeriod.join(","),
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (data) => {
        searchParams.period = data.period ? (data.period as [string, string]).join(",") : defaultPeriod.join(",");
        searchParams.keyword = data.keyword ? (data.keyword as string) : "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.period = defaultPeriod.join(",");
        searchParams.keyword = "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
    });
    const exportLoading = ref(false);
    const handleExport = async (): Promise<void> => {
      try {
        exportLoading.value = true;
        const [start, end] = searchParams.period.split(",");
        const blob = await getElectricalSafetyClient().exportLineLossStatistics({
          startTime: start + " 00:00:00",
          endTime: end + " 23:59:59",
          lineName: searchParams.keyword,
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "损耗统计.csv";
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        message.error((error as { errorMessage: string })?.errorMessage ?? "操作失败");
      } finally {
        exportLoading.value = false;
      }
    };

    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          disabled={searchParams.total === 0}
          loading={exportLoading.value}
          onClick={handleExport}
        >
          导出
        </Button>
      ),
      "layout-content": () => (
        <div>
          <CubeForm />
          <CubeTable />
        </div>
      ),
      "footer-page": () => (
        <Page
          cachePageQuery={false}
          current={searchParams.pageNumber}
          pageSize={searchParams.pageSize}
          total={searchParams.total}
          onPageChange={handleChange}
        />
      ),
    };

    return () => <PageLayout title={pageTitle.value} v-slots={slots} />;
  },
});
