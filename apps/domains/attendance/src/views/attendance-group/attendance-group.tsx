import { Button, Page, type PcTableColumn, PopConfirm, PopOver, message, usePcForm, usePcQueryState, usePcTable } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { attendanceGroupDel, attendanceGroupPage } from "@/api/attendance-group";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
export const AttendanceGroup = defineComponent({
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const formState = reactive({
      name: "",
    });
    const permission = appFunctionCodes.attendanceGroup;
    const add = (): void => {
      router.push("/d/attendance/attendance-group-form?action=add");
    };
    const editRow = (record: { id: string }, detail?: boolean): void => {
      router.push(`/d/attendance/attendance-group-form?id=${record.id}&action=${detail ? "detail" : "edit"}`);
    };
    const delRow = async (record: { id: string }): Promise<void> => {
      if (loading.value) {
        return;
      }
      try {
        loading.value = true;
        await attendanceGroupDel({ id: record.id });
        message.success("操作成功");
        await reset();
      } catch (error) {
        logger.error(error);
      } finally {
        loading.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "考勤组名称",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "考勤组人数",
        ellipsis: true,
        customRender: ({ record }: { record: { ranges: "ALL" | "PART"; staffNumber: number } }): VNode => {
          const text = record.ranges === "ALL" ? "所有人" : record.staffNumber.toString();
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        customRender: ({ record }: { record: { id: string } }): VNode => (
          <>
            {hasPermission(permission.info) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  editRow(record, true);
                }}
              >
                详情
              </Button>
            )}
            {hasPermission(permission.update) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  editRow(record);
                }}
              >
                编辑
              </Button>
            )}
            {hasPermission(permission.delete) && (
              <PopConfirm
                okText="确定"
                cancelText="取消"
                title="确认删除该项？"
                onConfirm={() => {
                  delRow(record);
                }}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
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
    const queryDefaults: Record<string, unknown> = { name: "", pageNumber: 1, pageSize: 10 };
    const cachedQuery = usePcQueryState({ initialState: queryDefaults, storage: "url" });
    const readQuery = () => ({ name: formState.name, pageNumber: pagination.value.pageNumber, pageSize: pagination.value.pageSize });
    const restoreQuery = (next: Record<string, unknown>) => {
      formState.name = (next.name as string) ?? "";
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };

    let queryVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++queryVersion;
      try {
        loading.value = true;
        const res = await attendanceGroupPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
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
        logger.debug(error);
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
      schema: [{ fieldName: "name", label: "", component: "Input", defaultValue: "", componentProps: { placeholder: "考勤组名称" } }],
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
      "layout-header": (): VNode =>
        (hasPermission(permission.add) && (
          <Button type="primary" onClick={add}>
            新增考勤组
          </Button>
        )) as VNode,
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
        <Layout title={pageTitle ?? "考勤组管理"} v-slots={layoutSlots} />
      </>
    );
  },
});
