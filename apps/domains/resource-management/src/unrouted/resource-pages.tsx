import type { DepartmentDevice, ImportResult, Machine, ManagedItem, OperatingRoom, ResourceFile } from "@g2-contract/resource-management";
import { computed, defineComponent, reactive, ref, watch, type PropType } from "vue";

import { getResourceManagementClient, getResourceRuntime } from "../domain-context";
import {
  Button,
  Form,
  FormItem,
  Image,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Select,
  Textarea,
  Tree,
  Upload,
  UploadDragger,
  message,
  usePcForm,
  usePcTable,
  type PcTableColumn,
  type UploadFile,
} from "../pc-ui-runtime";

const client = () => getResourceManagementClient();
const emptyItem = (): ManagedItem => ({ id: "", name: "", size: "", number: "", manufacturer: "", model: "" });
const emptyMachine = (): Machine => ({
  id: "",
  tenant: "",
  code: "",
  arguments: "",
  fileIds: "",
  fileList: [],
  roomIds: "",
  roomNumber: 0,
});
const value = (item: unknown): string => (item === null || item === undefined || item === "" ? "--" : String(item));
const saveBlob = (file: Blob, name: string): void => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// 这些页面保留旧应用功能模块；用户未提供菜单，故不向 Domain 注册路由。
const BatchImport = defineComponent({
  props: {
    open: Boolean,
    tenant: { type: String, required: true },
    type: { type: String as PropType<"item" | "machines">, required: true },
  },
  emits: ["close", "done"],
  setup(props, { emit }) {
    const file = ref<File>();
    const busy = ref(false);
    const result = ref<ImportResult>();
    const uploadList = ref<UploadFile[]>([]);
    watch(
      () => props.open,
      (open) => {
        if (open) {
          file.value = undefined;
          result.value = undefined;
          uploadList.value = [];
        }
      },
    );
    const template = async (): Promise<void> => {
      if (busy.value) return;
      busy.value = true;
      try {
        saveBlob(
          await (props.type === "item" ? client().downloadItemTemplate() : client().downloadMachineTemplate()),
          props.type === "item" ? "物品导入模板.xlsx" : "机组导入模板.xlsx",
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "模板下载失败");
      } finally {
        busy.value = false;
      }
    };
    const submit = async (): Promise<void> => {
      if (busy.value || !file.value || !props.tenant) return;
      busy.value = true;
      try {
        const form = new FormData();
        form.append("file", file.value);
        result.value =
          props.type === "item" ? await client().importItems(props.tenant, form) : await client().importMachines(props.tenant, form);
        message.success("导入完成");
        emit("done");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导入失败");
      } finally {
        busy.value = false;
      }
    };
    return () => (
      <Modal
        open={props.open}
        title="批量导入"
        okText="导入"
        cancelText="取消"
        okButtonProps={{ disabled: !file.value || !props.tenant, loading: busy.value }}
        onOk={() => void submit()}
        onCancel={() => emit("close")}
      >
        <p>请先下载模板，填写后上传 Excel 文件。</p>
        <Button type="link" loading={busy.value} onClick={() => void template()}>
          下载模板
        </Button>
        <UploadDragger
          accept=".xlsx"
          fileList={uploadList.value}
          beforeUpload={(selected: File) => {
            file.value = selected;
            uploadList.value = [{ uid: selected.name, name: selected.name, status: "done" }];
            return false;
          }}
          onRemove={() => {
            file.value = undefined;
            uploadList.value = [];
            return true;
          }}
        >
          <p>点击或将文件拖拽到这里上传</p>
          <p>支持扩展名：xlsx</p>
        </UploadDragger>
        {result.value && (
          <>
            <p>
              已成功导入{result.value.success}条，失败{result.value.fail}条，原因如下：
            </p>
            <div>
              {result.value.errorMsgList.map((row) => (
                <div key={row.key}>
                  {row.key}：{row.value}
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    );
  },
});

export const StuffManage = defineComponent({
  name: "UnroutedStuffManage",
  setup() {
    const runtime = getResourceRuntime();
    const query = reactive({
      tenant: runtime.terminal === "kh-admin-web" ? (undefined as string | undefined) : runtime.tenant,
      deviceId: "",
    });
    const selected = reactive({ deviceCode: "", deviceName: "" });
    const nameSearch = ref("");
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const tenants = ref<{ label: string; value: string }[]>([]);
    const tree = ref<DepartmentDevice[]>([]);
    type TreeNode = { key: string; title: string; children?: TreeNode[] };
    const treeData = computed(() => {
      const convert = (items: DepartmentDevice[]): TreeNode[] =>
        items.map((item) => ({
          key: item.id,
          title: item.deviceBool ? `${item.name}${item.code}` : item.name,
          children: item.children ? convert(item.children) : undefined,
        }));
      return convert(tree.value);
    });
    const findDevice = (items: DepartmentDevice[], id: string): DepartmentDevice | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        const found = item.children && findDevice(item.children, id);
        if (found) return found;
      }
      return undefined;
    };
    const treeLoading = ref(false);
    const edit = ref<ManagedItem | null>(null);
    const importOpen = ref(false);
    const saving = ref(false);
    const deleting = ref<string>();
    let version = 0;
    const columns: PcTableColumn[] = [
      { title: "手术室", dataIndex: "deviceName", align: "center" },
      { title: "编号", dataIndex: "deviceCode", align: "center" },
      { title: "物品名称", dataIndex: "name", align: "center" },
      { title: "尺寸", dataIndex: "size", align: "center" },
      { title: "数量", dataIndex: "number", align: "center" },
      { title: "厂家", dataIndex: "manufacturer", align: "center" },
      { title: "型号", dataIndex: "model", align: "center" },
      { title: "机组编号", dataIndex: "machinesCode", align: "center" },
      {
        title: "操作",
        dataIndex: "id",
        width: 140,
        customRender: ({ record }) => {
          const item = record as ManagedItem;
          return (
            <>
              <Button
                type="link"
                onClick={() => {
                  edit.value = { ...item };
                }}
              >
                编辑
              </Button>
              <PopConfirm title="是否确认删除当前物品？" okText="确定" cancelText="取消" onConfirm={() => void remove(item.id)}>
                <Button type="link" danger loading={deleting.value === item.id}>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];
    const [PcTable, table] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "d/resource-management/stuff-manage",
      pagination: false,
      autoFetch: false,
    });
    const load = async (): Promise<void> => {
      const current = ++version;
      if (!query.tenant) {
        table.setDataSource([]);
        page.total = 0;
        return;
      }
      table.loading.value = true;
      try {
        const result = await client().pageManagedItems({
          tenant: query.tenant,
          deviceId: query.deviceId,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        });
        if (current === version) {
          table.setDataSource(result.records);
          page.total = result.total;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "物品列表加载失败");
      } finally {
        if (current === version) table.loading.value = false;
      }
    };
    const loadTree = async (): Promise<void> => {
      if (!query.tenant) {
        tree.value = [];
        return;
      }
      treeLoading.value = true;
      try {
        tree.value = await client().listDepartmentDevices(query.tenant);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "手术室树加载失败");
      } finally {
        treeLoading.value = false;
      }
    };
    const remove = async (id: string): Promise<void> => {
      if (deleting.value) return;
      deleting.value = id;
      try {
        await client().deleteManagedItem(id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = undefined;
      }
    };
    const save = async (): Promise<void> => {
      if (saving.value || !edit.value || !query.tenant || !query.deviceId) return;
      saving.value = true;
      try {
        await client().saveManagedItem({
          ...edit.value,
          tenant: query.tenant,
          deviceId: query.deviceId,
          deviceCode: selected.deviceCode,
          deviceName: selected.deviceName,
        });
        message.success("操作成功");
        edit.value = null;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "tenant",
          label: "所属医院",
          defaultValue: query.tenant,
          componentProps: { options: tenants, placeholder: "请选择所属医院", allowClear: true, style: { width: "180px" } },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        void loadTree();
        void load();
      },
      handleReset: () => {
        page.pageNumber = 1;
        query.deviceId = "";
        selected.deviceCode = "";
        selected.deviceName = "";
        void loadTree();
        void load();
      },
      handleValuesChange: (_all, changed) => {
        if (changed && "tenant" in changed) {
          query.tenant = typeof changed.tenant === "string" ? changed.tenant : undefined;
          query.deviceId = "";
          void loadTree();
          void load();
        }
      },
    });
    void client()
      .listTenants()
      .then((rows) => {
        tenants.value = rows.map((row) => ({ label: row.name, value: row.code }));
        if (!query.tenant && rows[0]) query.tenant = rows[0].code;
        void loadTree();
        void load();
      })
      .catch((error: unknown) => message.error(error instanceof Error ? error.message : "医院列表加载失败"));
    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          disabled={!query.tenant}
          onClick={() => {
            importOpen.value = true;
          }}
        >
          批量导入
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <div style={{ display: "flex", minHeight: 0, flex: 1, gap: "12px" }}>
            <div style={{ width: "260px", overflow: "auto", borderRight: "1px solid #eee" }}>
              <Tree
                treeData={treeData.value}
                disabled={treeLoading.value}
                onSelect={(keys) => {
                  const node = findDevice(tree.value, String(keys[0] ?? ""));
                  if (!node?.deviceBool) return;
                  query.deviceId = node.id;
                  selected.deviceCode = node.code;
                  selected.deviceName = node.name;
                  page.pageNumber = 1;
                  void load();
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>物品名称</span>
                  <Input style={{ width: "180px" }} v-model:value={nameSearch.value} />
                  <Button
                    type="primary"
                    onClick={() => {
                      page.pageNumber = 1;
                      void load();
                    }}
                  >
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      nameSearch.value = "";
                      page.pageNumber = 1;
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </div>
                <Button
                  type="primary"
                  disabled={!query.deviceId}
                  onClick={() => {
                    edit.value = emptyItem();
                  }}
                >
                  新增
                </Button>
              </div>
              <PcTable />
            </div>
          </div>
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
            void load();
          }}
        />
      ),
    };
    return () => (
      <>
        <PageLayout title="物品管理" v-slots={slots} />
        <Modal
          open={edit.value !== null}
          title={edit.value?.id ? "编辑物品" : "新增物品"}
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            edit.value = null;
          }}
        >
          {edit.value && (
            <Form model={edit.value} labelCol={{ style: { width: "90px" } }}>
              <FormItem label="物品名称" name="name">
                <Input placeholder="请输入物品名称" v-model:value={edit.value.name} />
              </FormItem>
              <FormItem label="尺寸">
                <Input placeholder="请输入物品尺寸" v-model:value={edit.value.size} />
              </FormItem>
              <FormItem label="数量">
                <InputNumber min={0} precision={0} max={99999999} v-model:value={edit.value.number} />
              </FormItem>
              <FormItem label="厂家">
                <Input placeholder="请输入物品所属厂家" v-model:value={edit.value.manufacturer} />
              </FormItem>
              <FormItem label="型号">
                <Input placeholder="请输入物品型号" v-model:value={edit.value.model} />
              </FormItem>
            </Form>
          )}
        </Modal>
        <BatchImport
          open={importOpen.value}
          tenant={query.tenant ?? ""}
          type="item"
          onClose={() => {
            importOpen.value = false;
          }}
          onDone={() => void load()}
        />
      </>
    );
  },
});

export const MachineManage = defineComponent({
  name: "UnroutedMachineManage",
  setup() {
    const runtime = getResourceRuntime();
    const query = reactive({ tenant: runtime.terminal === "kh-admin-web" ? (undefined as string | undefined) : runtime.tenant, code: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const tenants = ref<{ label: string; value: string }[]>([]);
    const edit = ref<Machine | null>(null);
    const info = ref(false);
    const importOpen = ref(false);
    const related = ref<Machine | null>(null);
    const saving = ref(false);
    const deleting = ref<string>();
    const uploading = ref(0);
    let version = 0;
    const columns: PcTableColumn[] = [
      {
        title: "企业名称",
        dataIndex: "tenant",
        align: "center",
        customRender: () => tenants.value.find((row) => row.value === query.tenant)?.label ?? "--",
      },
      { title: "机组编号", dataIndex: "code", align: "center" },
      { title: "机组铭牌参数", dataIndex: "arguments", align: "center" },
      {
        title: "机组铭牌附件",
        dataIndex: "fileList",
        align: "center",
        customRender: ({ record }) => {
          const files = (record as Machine).fileList;
          return files?.length ? (
            <div>
              {files.map((file) => (
                <Image key={file.id} src={file.path} width={64} height={64} />
              ))}
            </div>
          ) : (
            "--"
          );
        },
      },
      { title: "关联手术室数量", dataIndex: "roomNumber", align: "center" },
      {
        title: "操作",
        dataIndex: "id",
        width: 270,
        customRender: ({ record }) => {
          const machine = record as Machine;
          return (
            <>
              <Button
                type="link"
                onClick={() => {
                  related.value = machine;
                }}
              >
                关联手术室
              </Button>
              <Button
                type="link"
                onClick={() => {
                  info.value = true;
                  edit.value = { ...machine, fileList: [...(machine.fileList ?? [])] };
                }}
              >
                详情
              </Button>
              <Button
                type="link"
                onClick={() => {
                  info.value = false;
                  edit.value = { ...machine, fileList: [...(machine.fileList ?? [])] };
                }}
              >
                编辑
              </Button>
              <PopConfirm title="是否确认删除当前机组？" okText="确定" cancelText="取消" onConfirm={() => void remove(machine.id)}>
                <Button type="link" danger loading={deleting.value === machine.id}>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];
    const [PcTable, table] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "d/resource-management/machine-manage",
      pagination: false,
      autoFetch: false,
    });
    const load = async (): Promise<void> => {
      const current = ++version;
      if (!query.tenant) {
        table.setDataSource([]);
        page.total = 0;
        return;
      }
      table.loading.value = true;
      try {
        const result = await client().pageMachines({
          tenant: query.tenant,
          code: query.code,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        });
        if (current === version) {
          table.setDataSource(result.records);
          page.total = result.total;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "机组列表加载失败");
      } finally {
        if (current === version) table.loading.value = false;
      }
    };
    const remove = async (id: string): Promise<void> => {
      if (deleting.value) return;
      deleting.value = id;
      try {
        await client().deleteMachine(id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = undefined;
      }
    };
    const save = async (): Promise<void> => {
      if (saving.value || !edit.value || !edit.value.tenant || !edit.value.code.trim()) {
        message.warning("请选择医院并输入机组编号");
        return;
      }
      saving.value = true;
      try {
        await client().saveMachine({ ...edit.value, fileIds: edit.value.fileList.map((file) => file.id).join(",") });
        message.success("操作成功");
        edit.value = null;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    const upload = async (selected: File): Promise<boolean> => {
      if (!edit.value) return false;
      if (selected.size > 300 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(selected.type)) {
        message.warning("请上传不超过300MB的 JPG、PNG 文件");
        return false;
      }
      if (edit.value.fileList.length + uploading.value >= 10) {
        message.warning("最多上传10张图片");
        return false;
      }
      uploading.value += 1;
      try {
        const data = new FormData();
        data.append("businessKey", "maintain");
        data.append("sceneCode", "MEDICAL_CLEANLINESS");
        data.append("file", selected);
        const config = (window as Window & { config?: { feature?: { useUploadTemporary?: boolean } } }).config;
        const saved = await client().uploadFile(data, config?.feature?.useUploadTemporary);
        edit.value.fileList = [...edit.value.fileList, saved];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
      } finally {
        uploading.value -= 1;
      }
      return false;
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "tenant",
          label: "所属医院",
          defaultValue: query.tenant,
          componentProps: { options: tenants, placeholder: "请选择所属医院", allowClear: true, style: { width: "180px" } },
        },
        {
          component: "Input",
          fieldName: "code",
          label: "机组编号",
          defaultValue: "",
          componentProps: { placeholder: "请输入机组编号", style: { width: "180px" } },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        query.code = "";
        page.pageNumber = 1;
        void load();
      },
      handleValuesChange: (_all, changed) => {
        if (changed && "tenant" in changed) {
          query.tenant = typeof changed.tenant === "string" ? changed.tenant : undefined;
          page.pageNumber = 1;
          void load();
        }
      },
    });
    void client()
      .listTenants()
      .then((rows) => {
        tenants.value = rows.map((row) => ({ label: row.name, value: row.code }));
        if (!query.tenant && rows[0]) query.tenant = rows[0].code;
        void load();
      })
      .catch((error: unknown) => message.error(error instanceof Error ? error.message : "医院列表加载失败"));
    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          onClick={() => {
            importOpen.value = true;
          }}
        >
          批量导入
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <div style={{ textAlign: "right", marginBottom: "8px" }}>
            <Button
              type="primary"
              onClick={() => {
                info.value = false;
                edit.value = { ...emptyMachine(), tenant: query.tenant ?? "" };
              }}
            >
              新增机组
            </Button>
          </div>
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
            void load();
          }}
        />
      ),
    };
    return () =>
      related.value ? (
        <RelateOperatingRoom
          tenant={related.value.tenant || query.tenant || ""}
          machineId={related.value.id}
          onClose={() => {
            related.value = null;
            void load();
          }}
        />
      ) : (
        <>
          <PageLayout title="机组管理" v-slots={slots} />
          <Modal
            open={edit.value !== null}
            title={info.value ? "机组详情" : edit.value?.id ? "编辑机组" : "新增机组"}
            okText="确定"
            cancelText="取消"
            confirmLoading={saving.value}
            footer={info.value ? null : undefined}
            onOk={() => void save()}
            onCancel={() => {
              edit.value = null;
            }}
          >
            {edit.value && (
              <Form model={edit.value} labelCol={{ style: { width: "110px" } }}>
                <FormItem label="选择医院" required>
                  <Select disabled={info.value} options={tenants.value} placeholder="请选择医院" v-model:value={edit.value.tenant} />
                </FormItem>
                <FormItem label="机组编号" required>
                  <Input disabled={info.value} placeholder="请输入机组编号" v-model:value={edit.value.code} />
                </FormItem>
                <FormItem label="机组铭牌参数">
                  <Textarea disabled={info.value} v-model:value={edit.value.arguments} autoSize={{ minRows: 4, maxRows: 10 }} />
                </FormItem>
                <FormItem label="机组铭牌附件">
                  <div>
                    {edit.value.fileList.map((file: ResourceFile) => (
                      <span key={file.id} style={{ display: "inline-block", marginRight: "8px" }}>
                        <Image src={file.path} width={80} height={80} />
                        {!info.value && (
                          <Button
                            size="small"
                            danger
                            onClick={() => {
                              if (edit.value) edit.value.fileList = edit.value.fileList.filter((item) => item.id !== file.id);
                            }}
                          >
                            移除
                          </Button>
                        )}
                      </span>
                    ))}
                  </div>
                  {!info.value && (
                    <Upload
                      listType="picture-card"
                      multiple
                      accept=".jpg,.jpeg,.png"
                      showUploadList={false}
                      beforeUpload={(file: File) => {
                        void upload(file);
                        return false;
                      }}
                    >
                      <Button loading={uploading.value > 0}>上传图片</Button>
                    </Upload>
                  )}
                  {!info.value && <div>请上传不超过10M的JPG、PNG、JEPG文件,最多可上传10张</div>}
                </FormItem>
              </Form>
            )}
          </Modal>
          <BatchImport
            open={importOpen.value}
            tenant={query.tenant ?? ""}
            type="machines"
            onClose={() => {
              importOpen.value = false;
            }}
            onDone={() => void load()}
          />
        </>
      );
  },
});

export const RelateOperatingRoom = defineComponent({
  name: "UnroutedRelateOperatingRoom",
  props: { tenant: { type: String, required: true }, machineId: { type: String, required: true } },
  emits: ["close"],
  setup(props, { emit }) {
    const machine = ref<Machine>(emptyMachine());
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const pickerOpen = ref(false);
    const pickerQuery = reactive({
      keyword: "",
      productId: undefined as string | undefined,
      category: undefined as string[] | undefined,
      area: undefined as string[] | undefined,
      departmentId: undefined as string | undefined,
      tagCodes: [] as string[],
    });
    const pickerPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const products = ref<{ label: string; value: string }[]>([]);
    const categories = ref<{ categoryCode: string; categoryName: string; children?: unknown[] }[]>([]);
    const areas = ref<{ id: string; name: string; children?: unknown[] }[]>([]);
    const departments = ref<{ id: string; name: string; children?: unknown[] }[]>([]);
    const tags = ref<{ label: string; value: string }[]>([]);
    const selected = ref<string[]>([]);
    const saving = ref(false);
    const deleting = ref<string>();
    let version = 0;
    let pickerVersion = 0;
    const columns: PcTableColumn[] = [
      { title: "手术室", dataIndex: "deviceName", align: "center" },
      { title: "编号", dataIndex: "deviceCode", align: "center" },
      { title: "分类", dataIndex: "productTypeName", align: "center" },
      { title: "所在区域", dataIndex: "areaPathName", align: "center" },
      { title: "维护部门", dataIndex: "deptName", align: "center" },
      {
        title: "操作",
        dataIndex: "deviceId",
        customRender: ({ record }) => {
          const room = record as OperatingRoom & { deviceId?: string };
          const id = room.deviceId ?? room.id;
          return (
            <PopConfirm title="是否确认移除？" okText="确定" cancelText="取消" onConfirm={() => void remove(id)}>
              <Button type="link" danger loading={deleting.value === id}>
                移除
              </Button>
            </PopConfirm>
          );
        },
      },
    ];
    const [PcTable, table] = usePcTable({
      columns,
      rowKey: "deviceId",
      tableCode: "d/resource-management/relate-operating-room",
      pagination: false,
      autoFetch: false,
    });
    const [PickerTable, pickerTable] = usePcTable({
      columns: [
        { title: "设备名称", dataIndex: "name" },
        {
          title: "产品品类",
          dataIndex: "productInfo",
          customRender: ({ record }) =>
            value((record as { productInfo?: { productCategory?: { name?: string } } }).productInfo?.productCategory?.name),
        },
        {
          title: "维护部门",
          dataIndex: "department",
          customRender: ({ record }) => value((record as { department?: { name?: string } }).department?.name),
        },
        {
          title: "所在区域",
          dataIndex: "area",
          customRender: ({ record }) => value((record as { area?: { pathName?: string } }).area?.pathName),
        },
      ],
      rowKey: "id",
      tableCode: "d/resource-management/room-picker",
      pagination: false,
      autoFetch: false,
      rowSelection: "checkbox",
      rowSelectionChange: (keys) => {
        selected.value = keys.map(String);
      },
    });
    const load = async (): Promise<void> => {
      const current = ++version;
      table.loading.value = true;
      try {
        const result = await client().pageMachineRooms({
          tenant: props.tenant,
          id: props.machineId,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        });
        if (current === version) {
          table.setDataSource(result.records.filter((room) => !query.keyword || (room.deviceName ?? room.name).includes(query.keyword)));
          page.total = result.total;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "关联手术室加载失败");
      } finally {
        if (current === version) table.loading.value = false;
      }
    };
    const loadPicker = async (): Promise<void> => {
      const current = ++pickerVersion;
      pickerTable.loading.value = true;
      try {
        const result = await client().pageAvailableRooms({
          tenant: props.tenant,
          pageNumber: pickerPage.pageNumber,
          pageSize: pickerPage.pageSize,
          keyword: pickerQuery.keyword,
          productId: pickerQuery.productId,
          categoryCode: pickerQuery.category?.join("-"),
          anyMatchedAreaId: pickerQuery.area?.join("-"),
          anyMatchedDepartmentId: pickerQuery.departmentId,
          tagCodes: pickerQuery.tagCodes,
        });
        if (current === pickerVersion) {
          pickerTable.setDataSource(result.records);
          pickerPage.total = result.total;
        }
      } catch (error) {
        if (current === pickerVersion) message.error(error instanceof Error ? error.message : "设备列表加载失败");
      } finally {
        if (current === pickerVersion) pickerTable.loading.value = false;
      }
    };
    const loadPickerOptions = async (): Promise<void> => {
      const results = await Promise.allSettled([
        client().listProducts(props.tenant),
        client().listProductCategories(props.tenant),
        client().listAreas(props.tenant),
        client().listDepartments(props.tenant),
        client().listCustomerTags(props.tenant),
      ]);
      if (results[0].status === "fulfilled") products.value = results[0].value.map((row) => ({ label: row.prodName, value: row.id }));
      if (results[1].status === "fulfilled") categories.value = results[1].value;
      if (results[2].status === "fulfilled") areas.value = results[2].value;
      if (results[3].status === "fulfilled") departments.value = results[3].value;
      if (results[4].status === "fulfilled") tags.value = results[4].value.map((row) => ({ label: row.tagName, value: row.tagCode }));
      if (results.some((result) => result.status === "rejected")) message.error("设备筛选项加载失败");
    };
    const remove = async (id: string): Promise<void> => {
      if (deleting.value) return;
      deleting.value = id;
      try {
        await client().deleteMachineRooms(props.tenant, props.machineId, id);
        selected.value = selected.value.filter((key) => key !== id);
        pickerTable.setSelectedRowKeys(selected.value);
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "移除失败");
      } finally {
        deleting.value = undefined;
      }
    };
    const save = async (): Promise<void> => {
      if (saving.value || !selected.value.length) return;
      saving.value = true;
      try {
        await client().saveMachineRooms(props.tenant, props.machineId, selected.value.join(","));
        pickerOpen.value = false;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "关联失败");
      } finally {
        saving.value = false;
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "手术室",
          defaultValue: "",
          componentProps: { placeholder: "请输入手术室", style: { width: "180px" } },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        query.keyword = "";
        page.pageNumber = 1;
        void load();
      },
    });
    const [PickerForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: pickerQuery,
      schema: [
        {
          component: "Select",
          fieldName: "productId",
          label: "所属产品",
          componentProps: {
            options: products,
            placeholder: "请选择所属产品",
            allowClear: true,
            showSearch: true,
            style: { width: "180px" },
          },
        },
        {
          component: "Cascader",
          fieldName: "category",
          label: "产品品类",
          componentProps: {
            options: categories,
            fieldNames: { label: "categoryName", value: "categoryCode", children: "children" },
            changeOnSelect: true,
            placeholder: "请选择产品品类",
            style: { width: "180px" },
          },
        },
        {
          component: "Cascader",
          fieldName: "area",
          label: "所在区域",
          componentProps: {
            options: areas,
            fieldNames: { label: "name", value: "id", children: "children" },
            changeOnSelect: true,
            placeholder: "请选择所在区域",
            style: { width: "180px" },
          },
        },
        {
          component: "TreeSelect",
          fieldName: "departmentId",
          label: "维护部门",
          componentProps: {
            treeData: departments,
            fieldNames: { label: "name", value: "id", children: "children" },
            placeholder: "请选择维护部门",
            allowClear: true,
            style: { width: "180px" },
          },
        },
        {
          component: "Select",
          fieldName: "tagCodes",
          label: "设备标签",
          componentProps: { options: tags, mode: "multiple", placeholder: "请选择设备标签", style: { width: "180px" } },
        },
        { component: "Input", fieldName: "keyword", label: "", componentProps: { placeholder: "设备名称", style: { width: "180px" } } },
      ],
      handleSubmit: () => {
        pickerPage.pageNumber = 1;
        void loadPicker();
      },
      handleReset: () => {
        pickerPage.pageNumber = 1;
        pickerQuery.keyword = "";
        pickerQuery.productId = undefined;
        pickerQuery.category = undefined;
        pickerQuery.area = undefined;
        pickerQuery.departmentId = undefined;
        pickerQuery.tagCodes = [];
        void loadPicker();
      },
    });
    void client()
      .getMachine(props.machineId, props.tenant)
      .then((result) => {
        machine.value = result;
        selected.value = result.roomIds ? result.roomIds.split(",") : [];
        pickerTable.setSelectedRowKeys(selected.value);
      })
      .catch((error: unknown) => message.error(error instanceof Error ? error.message : "机组详情加载失败"));
    void load();
    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          onClick={() => {
            pickerOpen.value = true;
            void loadPickerOptions();
            void loadPicker();
          }}
        >
          新增手术室
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Button onClick={() => emit("close")}>返回</Button>
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            cachePageQuery={false}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
              void load();
            }}
          />
        </div>
      ),
    };
    return () => (
      <>
        <PageLayout title={`关联手术室机组编号：${machine.value.code}`} v-slots={slots} />
        <Modal
          open={pickerOpen.value}
          width={1300}
          title="设备选择"
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            pickerOpen.value = false;
          }}
        >
          <PickerForm />
          <PickerTable />
          <Page
            current={pickerPage.pageNumber}
            pageSize={pickerPage.pageSize}
            total={pickerPage.total}
            cachePageQuery={false}
            onPageChange={(number: number, size: number) => {
              pickerPage.pageNumber = number;
              pickerPage.pageSize = size;
              void loadPicker();
            }}
          />
        </Modal>
      </>
    );
  },
});
