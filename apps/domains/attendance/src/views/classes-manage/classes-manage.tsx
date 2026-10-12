import {
  AntModal,
  Button,
  Page,
  type PcTableColumn,
  PopOver,
  Spin,
  message,
  usePcForm,
  usePcQueryState,
  usePcTable,
} from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { classesDel, classesDelCheck, classesPage } from "@/api/classes-manage";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
export const ClassesManage = defineComponent({
  setup: () => {
    const router = useRouter();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const { pageTitle } = usePageName();
    const formState = reactive({
      name: "",
    });
    const permission = appFunctionCodes.attendanceClasses;
    const add = (): void => {
      router.push("/d/attendance/classes-manage-form?action=add");
    };
    const editRow = (record: { id: string }, detail?: boolean): void => {
      router.push(`/d/attendance/classes-manage-form?id=${record.id}&action=${detail ? "detail" : "edit"}`);
    };

    const deleting = ref(false);
    const delRow = async (record: { id: string }): Promise<void> => {
      if (deleting.value) {
        return;
      }
      deleting.value = true;
      let active = true;
      const modal = AntModal.confirm({
        centered: true,
        okText: "确定",
        cancelText: "取消",
        content: <Spin spinning />,
        okButtonProps: { disabled: true },
        async onOk() {
          if (!active) {
            return;
          }
          try {
            await classesDel({ id: record.id });
            message.success("操作成功");
            await reset();
          } finally {
            active = false;
            deleting.value = false;
          }
        },
        onCancel() {
          active = false;
          deleting.value = false;
        },
      });
      try {
        const checkRes = await classesDelCheck({ id: record.id });
        if (active) {
          modal.update({ content: (checkRes.data as string) || "确定要删除该项?", okButtonProps: { disabled: false } });
        }
      } catch (error) {
        modal.destroy();
        active = false;
        deleting.value = false;
        message.error(error instanceof Error ? error.message : "删除校验失败");
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "班次名称",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "班次简称",
        dataIndex: "nickName",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "起始时间",
        align: "center" as const,
        dataIndex: "startWorkTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "结束时间",
        align: "center" as const,
        dataIndex: "endWorkTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作",
        dataIndex: "action",
        customRender: ({ record }: { record: { id: string } }): VNode => (
          <>
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
              <Button
                type="link"
                size="small"
                onClick={() => {
                  delRow(record);
                }}
                danger
              >
                删除
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
        const res = await classesPage({
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
      schema: [{ fieldName: "name", label: "", component: "Input", defaultValue: "", componentProps: { placeholder: "班次名称" } }],
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
            新增班次
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
        <Layout title={pageTitle ?? "班次管理"} v-slots={layoutSlots} />
      </>
    );
  },
});
