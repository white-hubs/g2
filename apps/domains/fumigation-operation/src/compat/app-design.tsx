import type { FumigationAttachment, FumigationDeviceOption, FumigationWorkerOption } from "@g2-contract/fumigation-operation";
import { Button, Input, Modal, PageLayout, Space, Table, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref, type PropType } from "vue";

import { getFileClient, getFumigationClient } from "@/domain-context";

export const CubeLayout = defineComponent({
  name: "FumigationCubeLayoutCompat",
  props: {
    title: { type: String, default: "" },
    subTitle: { type: String, default: "" },
    showFooter: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () => (
      <PageLayout
        title={props.title}
        showFooter={Boolean(slots["footer-page"] || slots["footer-btn"])}
        v-slots={{
          "layout-header": () => <>{slots["layout-header"]?.()}</>,
          "layout-content": slots["layout-content"],
          "footer-page": slots["footer-page"],
          "footer-btn": slots["footer-btn"],
          default: slots.default,
        }}
      />
    );
  },
});

export const useCubeForm = usePcForm;
export const useCubeTable = usePcTable;

function fileName(file: Partial<FumigationAttachment>): string {
  return String(file.name ?? file.fileVO?.name ?? file.id ?? "附件");
}

export const FileUpload = defineComponent({
  name: "FumigationFileUpload",
  props: {
    value: { type: Array as PropType<FumigationAttachment[]>, default: () => [] },
    readonly: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    sceneCode: { type: String, required: true },
    maxCount: { type: Number, default: 1 },
    size: { type: Number, default: 100 },
    accept: { type: String, default: "" },
    customText: { type: String, default: "" },
    showText: { type: Boolean, default: false },
    type: { type: String, default: "text" },
    typeList: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const input = ref<HTMLInputElement>();
    const uploading = ref(false);
    const files = computed(() => props.value ?? []);
    const update = (value: FumigationAttachment[]): void => {
      emit("update:value", value);
      emit("change", value);
    };
    const choose = async (event: Event): Promise<void> => {
      const target = event.target as HTMLInputElement;
      const selected = Array.from(target.files ?? []);
      target.value = "";
      if (!selected.length) return;
      const remaining = Math.max(props.maxCount - files.value.length, 0);
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded: FumigationAttachment[] = [];
        for (const file of selected.slice(0, remaining)) {
          if (file.size > props.size * 1024 * 1024) {
            message.warning(`${file.name} 超过 ${props.size}MB`);
            continue;
          }
          const result = await client.uploadSceneFile({
            file,
            businessKey: "fumigation-operation",
            sceneCode: props.sceneCode,
            useTemporary: true,
          });
          uploaded.push({
            id: String(result.id),
            name: result.name ?? file.name,
            path: result.path ?? undefined,
            sceneCode: props.sceneCode,
          });
        }
        update([...files.value, ...uploaded]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
      } finally {
        uploading.value = false;
      }
    };
    return () => (
      <div class="fumigation-file-upload">
        {files.value.length ? (
          <div class="fumigation-file-list">
            {files.value.map((file) => (
              <div class="fumigation-file-item" key={String(file.id)}>
                {file.path ? (
                  <a href={file.path} target="_blank" rel="noreferrer">
                    {fileName(file)}
                  </a>
                ) : (
                  <span>{fileName(file)}</span>
                )}
                {!props.readonly ? (
                  <Button type="link" danger size="small" onClick={() => update(files.value.filter((item) => item.id !== file.id))}>
                    删除
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : props.readonly ? (
          <span class="fumigation-empty-text">暂无附件</span>
        ) : null}
        {!props.readonly && files.value.length < props.maxCount ? (
          <>
            <Button loading={uploading.value} onClick={() => input.value?.click()}>
              选择附件
            </Button>
            <input
              ref={input}
              type="file"
              accept={props.accept}
              multiple={props.multiple}
              style={{ display: "none" }}
              onChange={(event) => void choose(event)}
            />
          </>
        ) : null}
        {props.customText && !props.readonly ? <div class="fumigation-field-help">{props.customText}</div> : null}
      </div>
    );
  },
});

export const UserSelectModal = defineComponent({
  name: "FumigationUserSelectModal",
  props: {
    title: { type: String, default: "选择人员" },
    multiple: { type: Boolean, default: true },
  },
  emits: ["enter"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const keyword = ref("");
    const rows = ref<FumigationWorkerOption[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<FumigationWorkerOption[]>([]);
    const filteredRows = computed(() => {
      const query = keyword.value.trim().toLowerCase();
      if (!query) return rows.value;
      return rows.value.filter((item) =>
        [item.name, item.department, item.role, item.phone].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        ),
      );
    });
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        rows.value = await getFumigationClient().listFumigationWorkers();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "作业人员加载失败");
      } finally {
        loading.value = false;
      }
    };
    expose({
      openModal: (keys?: string[]) => {
        selectedKeys.value = keys ?? [];
        selectedRows.value = rows.value.filter((item) => selectedKeys.value.includes(item.id));
        open.value = true;
        void load();
      },
    });
    onMounted(() => void load());
    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={860}
        okText="确定"
        cancelText="取消"
        onCancel={() => (open.value = false)}
        onOk={() => {
          if (!selectedRows.value.length) {
            message.warning("请选择人员");
            return;
          }
          emit("enter", selectedRows.value);
          open.value = false;
        }}
      >
        <Input
          value={keyword.value}
          placeholder="搜索姓名、部门、岗位"
          allowClear
          style={{ width: "280px", marginBottom: "12px" }}
          onUpdate:value={(value: string) => (keyword.value = value)}
        />
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={filteredRows.value}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无人员数据" }}
          columns={[
            { title: "姓名", dataIndex: "name" },
            { title: "部门", dataIndex: "department" },
            { title: "岗位", dataIndex: "role" },
            { title: "联系电话", dataIndex: "phone" },
          ]}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: unknown[], selected: FumigationWorkerOption[]) => {
              selectedKeys.value = keys.map(String);
              selectedRows.value = selected;
            },
          }}
        />
      </Modal>
    );
  },
});

export const DeviceModalTable = defineComponent({
  name: "FumigationDeviceModalTable",
  props: {
    title: { type: String, default: "选择设备" },
    value: { type: Array as PropType<Array<{ id: string; name?: string }>>, default: () => [] },
    multiple: { type: Boolean, default: true },
    searchParams: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: ["ok"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const keyword = ref("");
    const rows = ref<FumigationDeviceOption[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<FumigationDeviceOption[]>([]);
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        rows.value = await getFumigationClient().listFumigationDevices({
          pageNumber: 1,
          pageSize: 200,
          keyword: keyword.value.trim() || undefined,
          warehouseId: typeof props.searchParams.warehouseId === "string" ? props.searchParams.warehouseId : undefined,
        });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "设备加载失败");
      } finally {
        loading.value = false;
      }
    };
    expose({
      openModal: () => {
        selectedKeys.value = props.value.map((item) => item.id);
        selectedRows.value = [];
        open.value = true;
        void load();
      },
    });
    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={900}
        okText="确定"
        cancelText="取消"
        onCancel={() => (open.value = false)}
        onOk={() => {
          if (!selectedRows.value.length) {
            message.warning("请选择设备");
            return;
          }
          emit("ok", selectedRows.value);
          open.value = false;
        }}
      >
        <Space style={{ marginBottom: "12px" }}>
          <Input
            value={keyword.value}
            placeholder="搜索设备名称、编号"
            allowClear
            onUpdate:value={(value: string) => (keyword.value = value)}
            onPressEnter={() => void load()}
          />
          <Button type="primary" onClick={() => void load()}>
            查询
          </Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={rows.value}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无设备数据" }}
          columns={[
            { title: "设备名称", dataIndex: "name" },
            { title: "设备编号", dataIndex: "code" },
            { title: "位置", dataIndex: "locationName" },
          ]}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: unknown[], selected: FumigationDeviceOption[]) => {
              selectedKeys.value = keys.map(String);
              selectedRows.value = selected;
            },
          }}
        />
      </Modal>
    );
  },
});
