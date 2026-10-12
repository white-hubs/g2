import { DeleteOutlined, EditOutlined } from "@ant-design/icons-vue";
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Tooltip,
  Upload,
  message,
  usePcForm,
  usePcTable,
  type PcTableColumn,
  type UploadRequestOption,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { AddSiteModal, type SiteFormState, type SiteModeDetails } from "./add-site-modal";
import { AreaCascaderSelect } from "@/compat/app-design";
import { getDailyInspectionClient, getOuaaClient } from "@/domain-context";

import styles from "./site-configuration.module.css";

interface NamedOption {
  id: string;
  name: string;
}

interface PointPage {
  records: InspectionRecord[];
  total: number;
}

function listOf(value: unknown): Array<Record<string, unknown>> {
  let current = value;
  for (let i = 0; i < 4 && current && typeof current === "object" && !Array.isArray(current) && "data" in current; i += 1) {
    current = (current as { data: unknown }).data;
  }
  if (Array.isArray(current)) return current as Array<Record<string, unknown>>;
  if (current && typeof current === "object") {
    const root = current as Record<string, unknown>;
    const nested = root.records ?? root.list ?? root.children ?? root.data;
    if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>;
  }
  return [];
}

function flattenOrg(value: unknown): NamedOption[] {
  const result: NamedOption[] = [];
  const walk = (nodes: Array<Record<string, unknown>>): void => {
    for (const item of nodes) {
      const id = String(item.id ?? item.value ?? "");
      const name = String(item.name ?? item.label ?? "");
      if (id) result.push({ id, name });
      if (Array.isArray(item.children)) walk(item.children as Array<Record<string, unknown>>);
    }
  };
  walk(listOf(value));
  return result;
}

function asPointPage(value: unknown): PointPage {
  if (Array.isArray(value)) return { records: value as InspectionRecord[], total: value.length };
  const root = value && typeof value === "object" ? (value as InspectionRecord) : {};
  const records = Array.isArray(root.records) ? (root.records as InspectionRecord[]) : [];
  return { records, total: Number(root.total ?? records.length) };
}

function saveBlob(data: unknown, fileName: string): void {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const QR_STYLE_ID = "1726505877848473667";

export const InspectionSiteConfiguration = defineComponent({
  name: "InspectionSiteConfiguration",
  setup() {
    const client = getDailyInspectionClient();
    const siteTypes = ref<NamedOption[]>([]);
    const departments = ref<NamedOption[]>([]);
    const currentTypeId = ref<string | undefined>(undefined);
    const query = reactive({
      pointName: "",
      receiveDepId: undefined as string | undefined,
      areaId: undefined as string | undefined,
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const typeModal = reactive({ open: false, id: "", name: "", title: "新增现场点类型" });
    const siteModal = reactive({
      open: false,
      details: {
        modelType: true,
        siteInfo: {},
      } as SiteModeDetails,
    });
    const addSiteRef = ref<{ formState: SiteFormState; onCheck: () => Promise<boolean> }>();
    const batchLoading = ref(false);
    const downLoading = ref(false);
    const codeLoading = ref(false);
    const siteSaving = ref(false);
    /** 删除确认弹层打开时保持行 hover/图标，避免鼠标移入弹层后样式丢失 */
    const actionTypeId = ref<string | undefined>(undefined);
    let queryToken = 0;

    const loadTypes = async (): Promise<void> => {
      const raw = await client.request<NamedOption[]>("GET", "/inspect/sceneTypeList");
      siteTypes.value = Array.isArray(raw) ? raw.map((item) => ({ id: String(item.id), name: String(item.name ?? "--") })) : [];
    };

    const loadFilters = async (): Promise<void> => {
      try {
        const orgTree = await (await getOuaaClient()).getOrganizationTree();
        departments.value = flattenOrg(orgTree);
        formApi.updateFieldSchema({
          component: "Select",
          fieldName: "receiveDepId",
          label: "管理部门",
          componentProps: {
            allowClear: true,
            placeholder: "请选择部门",
            options: departments.value.map((item) => ({ label: item.name, value: item.id })),
          },
        });
      } catch {
        departments.value = [];
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "序号",
        dataIndex: "index",
        width: 70,
        align: "center",
        fixed: "left",
        customRender: ({ index }) => String((query.pageNumber - 1) * query.pageSize + (index ?? 0) + 1),
      },
      { title: "编码", dataIndex: "codeNum", align: "center", ellipsis: true },
      { title: "现场点名称", dataIndex: "name", align: "center", ellipsis: true },
      { title: "类型", dataIndex: "typeName", align: "center", ellipsis: true },
      { title: "管理部门", dataIndex: "depName", align: "center", ellipsis: true },
      { title: "所属区域", dataIndex: "areaName", align: "center", ellipsis: true },
      { title: "具体地址", dataIndex: "location", align: "center", ellipsis: true },
      {
        title: "编辑",
        dataIndex: "edit",
        align: "center",
        width: 140,
        customRender: ({ record }) => {
          const row = record as InspectionRecord;
          return (
            <>
              <Button type="link" size="small" onClick={() => openEditSite(row)}>
                编辑
              </Button>
              <PopConfirm title="是否确认删除？" okText="确定" cancelText="取消" onConfirm={() => void deleteSite(row)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "INSPECTION_CONFIG",
      rowKey: "id",
      autoFetch: false,
      autoScrollY: true,
      rowSelection: "checkbox",
      fetchApi: async () => {
        const token = ++queryToken;
        try {
          const page = asPointPage(
            await client.request("GET", "/inspect/pointList", {
              pointName: query.pointName || undefined,
              pageNumber: query.pageNumber,
              pageSize: query.pageSize,
              typeId: currentTypeId.value,
              receiveDepId: query.receiveDepId,
              areaId: query.areaId || undefined,
            }),
          );
          if (token !== queryToken) return { records: [], total: 0, pages: 0 };
          query.total = page.total;
          return { records: page.records, total: page.total, pages: 0 };
        } catch {
          if (token === queryToken) {
            query.total = 0;
            message.error("现场点加载失败");
          }
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const reload = (): void => {
      tableApi.query();
    };

    const applyFilterValues = (values: Record<string, unknown>): void => {
      query.pointName = String(values.pointName ?? "").trim();
      query.receiveDepId = values.receiveDepId == null || values.receiveDepId === "" ? undefined : String(values.receiveDepId);
      const areaRaw = values.areaId;
      if (Array.isArray(areaRaw) && areaRaw.length) query.areaId = String(areaRaw.at(-1));
      else if (typeof areaRaw === "string" && areaRaw) query.areaId = areaRaw;
      else query.areaId = undefined;
      query.pageNumber = 1;
    };

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "pointName",
          label: "",
          componentProps: { allowClear: true, placeholder: "现场点名称" },
        },
        {
          component: "Select",
          fieldName: "receiveDepId",
          label: "",
          componentProps: { allowClear: true, placeholder: "请选择部门", options: [] },
        },
        {
          component: AreaCascaderSelect,
          fieldName: "areaId",
          label: "",
          componentProps: { placeholder: "请选择区域" },
        },
      ],
      handleSubmit(values) {
        applyFilterValues(values);
        reload();
      },
      handleReset() {
        query.pointName = "";
        query.receiveDepId = undefined;
        query.areaId = undefined;
        query.pageNumber = 1;
        query.pageSize = 10;
        reload();
      },
    });

    const openAddType = (): void => {
      typeModal.id = "";
      typeModal.name = "";
      typeModal.title = "新增现场点类型";
      typeModal.open = true;
    };

    const openEditType = (item: NamedOption): void => {
      typeModal.id = item.id;
      typeModal.name = item.name;
      typeModal.title = "编辑现场点类型";
      typeModal.open = true;
    };

    const saveType = async (): Promise<void> => {
      if (!typeModal.name.trim()) {
        message.warning("请填写现场点名称!");
        return;
      }
      const name = typeModal.name.trim();
      if (!typeModal.id) {
        await client.request("PUT", `/inspect/addType/${encodeURIComponent(name)}`);
        message.success("现场点类型新增成功");
      } else {
        await client.request("PUT", `/inspect/updateType/${encodeURIComponent(typeModal.id)}/${encodeURIComponent(name)}`);
        message.success("现场点类型修改成功");
      }
      typeModal.open = false;
      await loadTypes();
    };

    const deleteType = async (id: string): Promise<void> => {
      await client.request("DELETE", `/inspect/deleteType/${encodeURIComponent(id)}`);
      if (currentTypeId.value === id) currentTypeId.value = undefined;
      if (actionTypeId.value === id) actionTypeId.value = undefined;
      await loadTypes();
      message.success("现场点类型删除成功");
      reload();
    };

    const openAddSite = (): void => {
      siteModal.details = { modelType: true, siteInfo: {} };
      siteModal.open = true;
    };

    const openEditSite = (record: InspectionRecord): void => {
      siteModal.details = { modelType: false, siteInfo: { ...record } };
      siteModal.open = true;
    };

    const saveSite = async (): Promise<void> => {
      if (!(await addSiteRef.value?.onCheck())) return;
      const raw = JSON.parse(JSON.stringify(addSiteRef.value?.formState ?? {})) as SiteFormState;
      const params: Record<string, unknown> = {
        ...raw,
        deviceIdList: Array.isArray(raw.deviceIdList) ? raw.deviceIdList : [],
        areaId: Array.isArray(raw.areaId) ? raw.areaId.join(",") : raw.areaId,
      };
      delete params.deviceList;
      siteSaving.value = true;
      try {
        if (siteModal.details.modelType) {
          await client.request("PUT", "/inspect/addPoint", params);
          message.success("现场点新增成功");
        } else {
          await client.request("PUT", "/inspect/updatePoint", params);
          message.success("现场点修改成功");
        }
        siteModal.open = false;
        reload();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        siteSaving.value = false;
      }
    };

    const deleteSite = async (record: InspectionRecord): Promise<void> => {
      await client.request("DELETE", `/inspect/deletePoint/${encodeURIComponent(String(record.id ?? ""))}`);
      message.success("现场点删除成功");
      reload();
    };

    const deleteBatch = async (): Promise<void> => {
      const keys = tableApi.getSelectedRows().map((row) => String((row as InspectionRecord).id ?? ""));
      if (!keys.length) {
        message.warning("请选择要删除的现场点");
        return;
      }
      batchLoading.value = true;
      try {
        await client.request("PUT", "/inspect/point/delete-batch", { idList: keys });
        message.success("现场点删除成功");
        query.pageNumber = 1;
        reload();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "批量删除失败");
      } finally {
        batchLoading.value = false;
      }
    };

    const downloadTemplate = async (): Promise<void> => {
      downLoading.value = true;
      try {
        const blob = await client.request<Blob>("GET", "/inspect/point/download-template");
        saveBlob(blob, "现场点模板.xlsx");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "模板下载失败");
      } finally {
        downLoading.value = false;
      }
    };

    const importFile = async ({ file, onSuccess, onError }: UploadRequestOption): Promise<void> => {
      if (!(file instanceof File)) {
        onError?.(new Error("请选择有效的 Excel 文件"));
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      try {
        await client.request("POST", "/inspect/point/import-template", formData as unknown as Record<string, unknown>);
        onSuccess?.({});
        message.success("批量导入成功");
        query.pageNumber = 1;
        reload();
      } catch (error) {
        const reason = error instanceof Error ? error : new Error("批量导入失败");
        onError?.(reason);
        message.error(reason.message);
      }
    };

    const downloadQrcodes = async (): Promise<void> => {
      const rows = tableApi.getSelectedRows() as InspectionRecord[];
      if (!rows.length) {
        message.warning("请选择要下载的二维码");
        return;
      }
      codeLoading.value = true;
      try {
        const blob = await client.request<Blob>("POST", "/api/identity/qrcode/generate/batch/download", {
          entityType: "SITE_POINT",
          styleId: QR_STYLE_ID,
          entityInfo: rows.map((item) => ({
            entityId: String(item.id ?? ""),
            entityName: String(item.name ?? ""),
            serialNumber: String(item.codeNum ?? ""),
          })),
        });
        saveBlob(blob, "二维码.zip");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "二维码下载失败");
      } finally {
        codeLoading.value = false;
      }
    };

    onMounted(async () => {
      await Promise.all([loadTypes(), loadFilters()]);
      reload();
    });

    const slots = {
      "layout-header": () => (
        <div class={styles.toolbar}>
          <PopConfirm title="确定要批量删除?" okText="确定" cancelText="取消" onConfirm={() => void deleteBatch()}>
            <Button type="primary" danger loading={batchLoading.value}>
              批量删除
            </Button>
          </PopConfirm>
          <Button type="primary" loading={downLoading.value} onClick={() => void downloadTemplate()}>
            下载模板
          </Button>
          <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={importFile}>
            <Button type="primary">批量导入</Button>
          </Upload>
          <Button type="primary" onClick={openAddSite}>
            新增
          </Button>
          <Button type="primary" loading={codeLoading.value} onClick={() => void downloadQrcodes()}>
            批量下载二维码
          </Button>
        </div>
      ),
      "layout-content": () => (
        <div class={styles["site-points"]}>
          <aside class={styles["site-points-left"]}>
            <div class={styles["site-points-left-title"]}>
              <span>现场点类型</span>
              <span class={styles["add-type"]} onClick={openAddType}>
                新增类型
              </span>
            </div>
            <div class={styles["site-type-list"]}>
              {siteTypes.value.map((item) => (
                <div
                  key={item.id}
                  class={[
                    styles["site-type-item"],
                    currentTypeId.value === item.id ? styles["site-type-item-active"] : null,
                    actionTypeId.value === item.id ? styles["site-type-item-action-open"] : null,
                  ]}
                  onClick={() => {
                    currentTypeId.value = currentTypeId.value === item.id ? undefined : item.id;
                    query.pageNumber = 1;
                    reload();
                  }}
                >
                  <Tooltip title={item.name} placement="topLeft">
                    <span class={styles["site-type-name"]}>{item.name}</span>
                  </Tooltip>
                  <div class={styles["site-type-actions"]} onClick={(event: Event) => event.stopPropagation()}>
                    <Tooltip title="编辑">
                      <EditOutlined
                        class={styles["site-type-action-icon"]}
                        onClick={() => {
                          openEditType(item);
                        }}
                      />
                    </Tooltip>
                    <PopConfirm
                      title="确定要删除本条数据嘛?"
                      okText="确定"
                      cancelText="取消"
                      onOpenChange={(open: boolean) => {
                        actionTypeId.value = open ? item.id : undefined;
                      }}
                      onConfirm={() => void deleteType(item.id)}
                    >
                      <Tooltip title="删除">
                        <DeleteOutlined class={[styles["site-type-action-icon"], styles["site-type-delete"]]} />
                      </Tooltip>
                    </PopConfirm>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section class={styles["site-points-right"]}>
            <PcForm />
            <PcTable />
          </section>

          <Modal
            open={typeModal.open}
            title={typeModal.title}
            okText="确定"
            cancelText="取消"
            onOk={() => void saveType()}
            onCancel={() => {
              typeModal.open = false;
            }}
          >
            <Form labelCol={{ span: 8 }}>
              <FormItem label="现场点类型名称" required>
                <Input v-model:value={typeModal.name} style={{ width: "300px" }} />
              </FormItem>
            </Form>
          </Modal>

          <Modal
            open={siteModal.open}
            width="500px"
            title={siteModal.details.modelType ? "新增现场点" : "编辑现场点"}
            destroyOnClose
            okText="确定"
            cancelText="取消"
            confirmLoading={siteSaving.value}
            onOk={() => void saveSite()}
            onCancel={() => {
              siteModal.open = false;
            }}
          >
            {siteModal.open ? <AddSiteModal ref={addSiteRef} modeDetails={siteModal.details} /> : null}
          </Modal>
        </div>
      ),
      "footer-page": () => (
        <Page
          current={query.pageNumber}
          pageSize={query.pageSize}
          total={query.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            query.pageNumber = pageNumber;
            query.pageSize = pageSize;
            reload();
          }}
        />
      ),
    };

    return () => <PageLayout title="现场点管理" v-slots={slots} />;
  },
});
