import { Button, Modal, Page, PageLayout, Space, Spin, Switch, TreeSelect, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementClient } from "../../domain-context";

import styles from "./permissions.module.css";

interface PermissionRecord {
  id: string;
  name?: string;
  code?: string;
  doorCode?: string;
  typeName?: string;
  areaName?: string;
}

interface Option {
  label: string;
  value: string;
  children?: Option[];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function toTree(rows: { id: string; name: string; children?: unknown[]; nextList?: unknown[] }[]): Option[] {
  return rows.map((row) => ({
    label: row.name,
    value: String(row.id),
    children:
      Array.isArray(row.children) && row.children.length > 0
        ? toTree(row.children as { id: string; name: string; children?: unknown[] }[])
        : Array.isArray(row.nextList) && row.nextList.length > 0
          ? toTree(row.nextList as { id: string; name: string; nextList?: unknown[] }[])
          : undefined,
  }));
}

function toDoorTypeTree(rows: { id: string | number; doorTypeName: string; children?: unknown[] }[]): Option[] {
  return rows.map((row) => ({
    label: row.doorTypeName,
    value: String(row.id),
    children:
      Array.isArray(row.children) && row.children.length > 0
        ? toDoorTypeTree(row.children as { id: string | number; doorTypeName: string; children?: unknown[] }[])
        : undefined,
  }));
}

export const BusinessPermissionsPage = defineComponent({
  name: "PersonnelBusinessPermissionsPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const mobile = String(route.query.mobile ?? "");
    const loading = ref(false);
    const saving = ref(false);
    const consumePm = ref(false);
    const doors = ref<PermissionRecord[]>([]);
    const parking = ref<PermissionRecord[]>([]);
    const doorPage = reactive({ current: 1, size: 10 });
    const parkingPage = reactive({ current: 1, size: 10 });
    const modalType = ref<"door" | "parking" | null>(null);
    const modalPage = reactive({ current: 1, size: 10, total: 0 });
    const selectedIds = ref<string[]>([]);
    const candidates = new Map<string, PermissionRecord>();
    const areaOptions = reactive<Option[]>([]);
    const doorTypeOptions = reactive<Option[]>([]);
    const search = reactive<{ type?: string; doorArea?: string; keyword: string }>({ keyword: "" });

    const back = (): void => {
      void router.push("/d/person-management/roster");
    };
    const remove = (type: "door" | "parking", row: PermissionRecord): void => {
      if (type === "door") {
        doors.value = doors.value.filter((item) => item.id !== row.id);
        doorTableApi.setDataSource(doors.value.slice((doorPage.current - 1) * doorPage.size, doorPage.current * doorPage.size));
      } else {
        parking.value = parking.value.filter((item) => item.id !== row.id);
        parkingTableApi.setDataSource(
          parking.value.slice((parkingPage.current - 1) * parkingPage.size, parkingPage.current * parkingPage.size),
        );
      }
    };

    const [DoorTable, doorTableApi] = usePcTable({
      tableCode: "PERSONNEL_ACCESS_PERMISSION",
      rowKey: "id",
      pagination: false,
      autoFetch: false,
      columns: [
        { title: "设备编码", dataIndex: "doorCode", width: 180 },
        { title: "设备名称", dataIndex: "name", width: 200 },
        { title: "门禁类型", dataIndex: "typeName", width: 160 },
        { title: "所属区域", dataIndex: "areaName", width: 180 },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          customRender: ({ record }: { record: PermissionRecord }) => (
            <Button type="link" danger size="small" onClick={() => remove("door", record)}>
              删除
            </Button>
          ),
        },
      ],
    });

    const [ParkingTable, parkingTableApi] = usePcTable({
      tableCode: "PERSONNEL_PARKING_PERMISSION",
      rowKey: "id",
      pagination: false,
      autoFetch: false,
      columns: [
        { title: "停车场编码", dataIndex: "code", width: 180 },
        { title: "停车场名称", dataIndex: "name", width: 220 },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          customRender: ({ record }: { record: PermissionRecord }) => (
            <Button type="link" danger size="small" onClick={() => remove("parking", record)}>
              删除
            </Button>
          ),
        },
      ],
    });

    const associationColumns = [
      {
        title: "编码",
        dataIndex: "code",
        width: 180,
        customRender: ({ record }: { record: PermissionRecord }) => record.doorCode || record.code || "--",
      },
      { title: "名称", dataIndex: "name", width: 220 },
      { title: "类型", dataIndex: "typeName", width: 160 },
      { title: "所属区域", dataIndex: "areaName", width: 180 },
    ];

    const [CandidateTable, candidateApi] = usePcTable({
      tableCode: "PERSONNEL_PERMISSION_ASSOCIATION",
      rowKey: "id",
      pagination: false,
      rowSelection: "checkbox",
      rowSelectionChange(keys: (string | number)[]) {
        selectedIds.value = keys.map(String);
      },
      columns: associationColumns,
      fetchApi: async () => {
        if (!modalType.value) {
          return { records: [], total: 0, pages: 0 };
        }
        try {
          const payload = {
            pageNumber: modalPage.current,
            pageSize: modalPage.size,
            keyword: search.keyword.trim() || undefined,
            type: modalType.value === "door" ? search.type : undefined,
            doorArea: search.doorArea,
            areaId: search.doorArea,
          };
          const client = getPersonManagementClient();
          const result = modalType.value === "door" ? await client.pageDoorDevices(payload) : await client.pageParkingLots(payload);
          modalPage.total = result.total;
          for (const row of result.records) {
            candidates.set(String(row.id), row);
          }
          return result;
        } catch (error) {
          message.error(errorMessage(error, "设备列表加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [SearchForm, searchFormApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: search,
      cache: false,
      schema: [
        {
          component: markRaw(TreeSelect),
          fieldName: "type",
          label: "门禁类型",
          defaultValue: undefined,
          componentProps: {
            treeData: doorTypeOptions,
            placeholder: "请选择门禁类型",
            allowClear: true,
            showSearch: true,
            style: { width: "200px" },
          },
        },
        {
          component: markRaw(TreeSelect),
          fieldName: "doorArea",
          label: "所属区域",
          defaultValue: undefined,
          componentProps: {
            treeData: areaOptions,
            placeholder: "请选择所属区域",
            allowClear: true,
            showSearch: true,
            style: { width: "200px" },
          },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入设备名称或型号", allowClear: true, style: { width: "220px" } },
        },
      ],
      handleSubmit(values) {
        Object.assign(search, values);
        modalPage.current = 1;
        candidateApi.query();
      },
      handleReset() {
        Object.assign(search, { type: undefined, doorArea: undefined, keyword: "" });
        modalPage.current = 1;
        candidateApi.query();
      },
    });
    const doorSearchSchema = [...searchFormApi.state.schema];

    const openAssociation = (type: "door" | "parking"): void => {
      modalType.value = type;
      candidateApi.setColumns(type === "door" ? associationColumns : associationColumns.slice(0, 2));
      searchFormApi.updateSchema(type === "door" ? doorSearchSchema : doorSearchSchema.filter((item) => item.fieldName !== "type"));
      modalPage.current = 1;
      selectedIds.value = [];
      candidates.clear();
      candidateApi.setSelectedRowKeys([]);
      candidateApi.query();
    };

    const addSelected = (): void => {
      if (!modalType.value) {
        return;
      }
      const list = modalType.value === "door" ? doors : parking;
      const known = new Set(list.value.map((item) => String(item.id)));
      const next = selectedIds.value.map((id) => candidates.get(id)).filter((item): item is PermissionRecord => Boolean(item));
      if (next.some((item) => known.has(String(item.id)))) {
        message.warning("设备已存在，重复项已忽略");
      }
      list.value = [...list.value, ...next.filter((item) => !known.has(String(item.id)))];
      doorTableApi.setDataSource(doors.value.slice((doorPage.current - 1) * doorPage.size, doorPage.current * doorPage.size));
      parkingTableApi.setDataSource(
        parking.value.slice((parkingPage.current - 1) * parkingPage.size, parkingPage.current * parkingPage.size),
      );
      modalType.value = null;
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      saving.value = true;
      try {
        await getPersonManagementClient().updateUserPermissionMobile({
          mobile,
          consumePm: consumePm.value,
          doorDeviceList: doors.value,
          parkingInfos: parking.value,
        });
        message.success("操作成功");
        back();
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };

    onMounted(async () => {
      if (!mobile) {
        message.error("缺少员工联系电话");
        return;
      }
      loading.value = true;
      const client = getPersonManagementClient();
      const [permissionResult, areaResult, typeResult] = await Promise.allSettled([
        client.getUserPermissionMobile(mobile),
        client.getAreaTree(),
        client.getDoorTypeList(),
      ]);
      if (permissionResult.status === "fulfilled") {
        consumePm.value = Boolean(permissionResult.value.consumePm);
        doors.value = (permissionResult.value.doorDeviceList ?? []).filter((item): item is typeof item & { id: string } =>
          Boolean(item.id),
        );
        parking.value = (permissionResult.value.parkingInfos ?? []).filter((item): item is typeof item & { id: string } =>
          Boolean(item.id),
        );
        doorTableApi.setDataSource(doors.value.slice(0, 10));
        parkingTableApi.setDataSource(parking.value.slice(0, 10));
      } else {
        message.error(errorMessage(permissionResult.reason, "业务权限加载失败"));
      }
      if (areaResult.status === "fulfilled") {
        areaOptions.splice(0, areaOptions.length, ...toTree(areaResult.value));
      }
      if (typeResult.status === "fulfilled") {
        doorTypeOptions.splice(0, doorTypeOptions.length, ...toDoorTypeTree(typeResult.value));
      }
      loading.value = false;
    });

    const section = (type: "door" | "parking") => {
      const title = type === "door" ? "门禁权限" : "停车权限";
      const list = type === "door" ? doors : parking;
      const page = type === "door" ? doorPage : parkingPage;
      const table = type === "door" ? <DoorTable /> : <ParkingTable />;
      const tableApi = type === "door" ? doorTableApi : parkingTableApi;
      return (
        <section class={styles.section}>
          <div class={styles.sectionHeader}>
            <h3>{title}</h3>
            <Button type="primary" onClick={() => openAssociation(type)}>
              新增
            </Button>
          </div>
          {table}
          <div class={styles.page}>
            <Page
              current={page.current}
              pageSize={page.size}
              total={list.value.length}
              cachePageQuery={false}
              onPageChange={(number, size) => {
                page.current = number;
                page.size = size;
                tableApi.setDataSource(list.value.slice((number - 1) * size, number * size));
              }}
            />
          </div>
        </section>
      );
    };

    return () => (
      <PageLayout
        title="业务权限"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class={styles.content}>
                {section("door")}
                {section("parking")}
                <section class={styles.section}>
                  <div class={styles.sectionHeader}>
                    <h3>消费权限</h3>
                    <Switch
                      checked={consumePm.value}
                      onUpdate:checked={(value) => {
                        consumePm.value = Boolean(value);
                      }}
                    />
                  </div>
                </section>
                <Modal
                  open={Boolean(modalType.value)}
                  title={modalType.value === "door" ? "门禁设备列表" : "停车场列表"}
                  width={1100}
                  okText="确定"
                  cancelText="取消"
                  onOk={addSelected}
                  onCancel={() => (modalType.value = null)}
                >
                  <SearchForm />
                  <CandidateTable />
                  <div class={styles.page}>
                    <Page
                      current={modalPage.current}
                      pageSize={modalPage.size}
                      total={modalPage.total}
                      cachePageQuery={false}
                      onPageChange={(number, size) => {
                        modalPage.current = number;
                        modalPage.size = size;
                        candidateApi.query();
                      }}
                    />
                  </div>
                </Modal>
              </div>
            </Spin>
          ),
          "footer-page": () => (
            <div class={styles.footer}>
              <Space>
                <Button onClick={back}>返回</Button>
                <Button type="primary" loading={saving.value} onClick={() => void save()}>
                  保存
                </Button>
              </Space>
            </div>
          ),
        }}
      />
    );
  },
});
