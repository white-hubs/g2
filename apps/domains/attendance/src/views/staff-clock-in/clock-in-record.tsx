import { dayjs } from "@g2-platform/pc-ui";
import {
  AntModal,
  Button,
  Image,
  Page,
  type PcTableColumn,
  PopOver,
  message,
  usePcForm,
  usePcQueryState,
  usePcTable,
} from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { clockInRecordExport, clockInRecordPage, clockInRecordStatusUpdate } from "@/api/staff-clock-in";
import { AddClockInRecordModal } from "@/components/business/add-clock-in-record-modal/add-clock-in-record-modal";
import { DeptTreeSelect } from "@/components/department-select";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";

import style from "@/assets/style.module.less";

export const ClockInRecord = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const clockInAuthority = [
      { label: "撤销", value: "PC_CLOCK" },
      { label: "取消作废", value: "DISCARD_CLOCK" },
      { label: "作废", value: "MY_CLOCK" },
    ];
    const permission = appFunctionCodes.attendanceClockInRecord;
    const defaultPeriod = [dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().endOf("month").format("YYYY-MM-DD")];
    const formState = reactive<{
      userName: string;
      period: string[];
      orgId: string | undefined;
      ways: string | undefined;
    }>({
      userName: "",
      period: defaultPeriod,
      orgId: undefined,
      ways: undefined,
    });

    const exportLoading = ref(false);
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      exportLoading.value = true;
      await clockInRecordExport({ ...formState, period: formState.period.join(",") })
        .then((res) => {
          const link = document.createElement("a");
          const blob = new Blob([res.data], { type: "application/vnd.ms-excel" }); // 文件流处理
          link.style.display = "none";
          link.href = URL.createObjectURL(blob);
          link.setAttribute("download", "打卡记录.xlsx");
          document.body.append(link);
          link.click();
          document.body.removeChild(link);
        })
        .catch((error) => {
          message.error(error?.message || "操作失败");
        })
        .finally(() => {
          exportLoading.value = false;
        });
    };

    const imgPrevpath = ref("");
    const imgPrev = ref(false);
    /** 查看图片 */
    const viewPhoto = (record: { photoFileId: string | null; img: { path: string | undefined } }): void => {
      if (!record.photoFileId) {
        message.warn("抱歉系统暂无数据，无法查看");
        return;
      }
      if (!record.img.path) {
        message.warn("无法查看，照片数据已清理");
        return;
      }
      imgPrevpath.value = record.img.path;
      imgPrev.value = true;
    };
    const imgPreviewChange = (value: boolean): void => {
      imgPrev.value = value;
    };

    /** 记录变更 */
    const recordCancel = (record: { id: string; clockInAuthority: string }): void => {
      AntModal.confirm({
        okText: "确定",
        cancelText: "取消",
        centered: true,
        content: `确定${clockInAuthority.find((e) => e.value === record.clockInAuthority)?.label}该条打卡记录吗?`,
        async onOk() {
          await clockInRecordStatusUpdate(record.id);
          AntModal.destroyAll();
          message.success("操作成功");
          getTableData();
        },
        onCancel() {
          AntModal.destroyAll();
        },
      });
    };

    const addClockInRecordModalRef = ref<{ openModal: () => void }>();
    /** 新增记录 */
    const addRecord = (): void => {
      addClockInRecordModalRef.value?.openModal();
    };
    const columns: PcTableColumn[] = [
      {
        title: "日期",
        dataIndex: "actualClockInTime",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: { clockInAuthority: string } }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD") : "--";
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={time || "--"} class={beGray ? style["gray-color"] : ""}>
              {time || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "姓名",
        dataIndex: "userName",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: { clockInAuthority: string } }): VNode => {
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={text || "--"} class={beGray ? style["gray-color"] : ""}>
              {text || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "部门",
        dataIndex: "orgName",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: { clockInAuthority: string } }): VNode => {
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={text || "--"} class={beGray ? style["gray-color"] : ""}>
              {text || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "打卡时间",
        dataIndex: "actualClockInTime2",
        ellipsis: true,
        customRender: ({ record }: { record: { actualClockInTime: string; clockInAuthority: string } }): VNode => {
          const time = record.actualClockInTime ? dayjs(record.actualClockInTime).format("HH:mm:ss") : "--";
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={time || "--"} class={beGray ? style["gray-color"] : ""}>
              {time || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "打卡方式",
        dataIndex: "ways",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: { clockInAuthority: string } }): VNode => {
          let way = "";
          if (!text) {
            way = "--";
          } else {
            way = text === "GPS" ? "GPS打卡" : "考勤机打卡";
          }
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={way || "--"} class={beGray ? style["gray-color"] : ""}>
              {way || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "打卡地点",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: { clockInAuthority: string } }): VNode => {
          const beGray = record.clockInAuthority === "DISCARD_CLOCK";
          return (
            <PopOver content={text || "--"} class={beGray ? style["gray-color"] : ""}>
              {text || "--"}
            </PopOver>
          );
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        customRender: ({
          record,
        }: {
          record: { id: string; img: { path: string }; clockInAuthority: string; photoFileId: string | null };
        }): VNode => (
          <>
            {hasPermission(permission.viewPic) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  viewPhoto(record);
                }}
              >
                查看图片
              </Button>
            )}
            {record.clockInAuthority && hasPermission(permission.update) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  recordCancel(record);
                }}
                danger
              >
                {clockInAuthority.find((e) => e.value === record.clockInAuthority)?.label ?? "未知状态"}
              </Button>
            )}
          </>
        ),
      },
    ];

    const loading = ref(false);
    const dataSource = ref<unknown[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });

    const queryDefaults: Record<string, unknown> = {
      userName: "",
      period: defaultPeriod,
      orgId: undefined,
      ways: undefined,
      pageNumber: 1,
      pageSize: 10,
    };
    const cachedQuery = usePcQueryState({ initialState: queryDefaults, storage: "url" });
    const readQuery = () => ({
      userName: formState.userName,
      period: formState.period,
      orgId: formState.orgId,
      ways: formState.ways,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const restoreQuery = (next: Record<string, unknown>) => {
      const nextPeriod = next.period as string[] | string | undefined;
      formState.userName = String(next.userName ?? "");
      formState.period = Array.isArray(nextPeriod)
        ? nextPeriod
        : typeof nextPeriod === "string" && nextPeriod
          ? nextPeriod.split(",")
          : defaultPeriod;
      formState.orgId = next.orgId as string | undefined;
      formState.ways = next.ways as string | undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };

    let queryVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++queryVersion;
      try {
        loading.value = true;
        const res = await clockInRecordPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
          period: formState.period.join(","),
        });
        if (version !== queryVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.error(error);
      } finally {
        if (version === queryVersion) {
          loading.value = false;
        }
      }
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => cachedQuery.update(readQuery()));
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      cachedQuery.update(readQuery());
    };
    const reset = async (): Promise<void> => {
      restoreQuery(queryDefaults);
      cachedQuery.update(queryDefaults);
      formApi.setFormValues(formState);
      await getTableData();
    };

    onMounted(async () => {
      restoreQuery(cachedQuery.getSnapshot());
      formApi.setFormValues(formState);
      await getTableData();
    });

    const [PcForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      syncStateRef: formState,
      schema: [
        {
          fieldName: "period",
          label: "日期",
          component: "RangePicker",
          defaultValue: defaultPeriod,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
        },
        { fieldName: "userName", label: "", component: "Input", defaultValue: "", componentProps: { placeholder: "请输入人员姓名" } },
        {
          fieldName: "orgId",
          label: "部门",
          component: DeptTreeSelect,
          componentProps: { placeholder: "请选择部门", style: { width: "223px" } },
        },
        {
          fieldName: "ways",
          label: "打卡方式",
          component: "Select",
          componentProps: {
            placeholder: "请选择打卡方式",
            allowClear: true,
            options: [
              { label: "考勤机打卡", value: "DEVICE" },
              { label: "GPS地点打卡", value: "GPS" },
            ],
          },
        },
      ],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const [PcTable, tableApi] = usePcTable({ columns: columns, rowKey: "id", tableCode: tableCode, autoFetch: false });
    watchEffect(() => {
      tableApi.setColumns(columns);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    const layoutSlots = {
      "layout-header": (): VNode => (
        <div>
          {hasPermission(permission.add) && (
            <Button type="primary" onClick={addRecord} style="margin-right:10px">
              新增
            </Button>
          )}
          {hasPermission(permission.export) && (
            <Button type="primary" disabled={dataSource.value.length === 0} onClick={exportExcel} loading={exportLoading.value}>
              导出
            </Button>
          )}
        </div>
      ),
      "layout-content": (): VNode => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": (): VNode => (
        <Page
          cachePageQuery={false}
          current={pagination.value.pageNumber}
          pageSize={pagination.value.pageSize}
          total={pagination.value.total}
          onPageChange={pageChange}
        />
      ),
    };
    return (): VNode => (
      <>
        <Layout title={pageTitle ?? "打卡记录"} v-slots={layoutSlots} />
        <AddClockInRecordModal ref={addClockInRecordModalRef} onSuccess={reset} />
        <Image style="display:none" src={imgPrevpath.value} preview={{ visible: imgPrev.value, onVisibleChange: imgPreviewChange }} />
      </>
    );
  },
});
