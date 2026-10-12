import type { PatrolArea, PatrolRow } from "@g2-contract/electronic-patrol";
import type { MessageSceneConfig } from "@g2-contract/message";
import type { FormInstance } from "@g2-platform/pc-ui";
import * as VueApi from "vue";
import { useRouter } from "vue-router";

import * as PatrolContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { areaText, downloadBlob, errorMessage, formatDateTime, text } from "../shared";

import styles from "../styles.module.less";

const {
  Alert,
  Button,
  Cascader,
  CheckboxGroup,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  Popconfirm,
  Select,
  Switch,
  TabPane,
  Tabs,
  Textarea,
  Upload,
  message,
  usePcForm,
  usePcTable,
} = PcUi;
const { defineComponent, reactive, ref } = VueApi;

function fileFromInput(value: unknown): Blob | null {
  return value instanceof Blob ? value : null;
}

function fileUploadButton(label: string, loading: boolean, upload: (file: Blob) => Promise<void>): JSX.Element {
  return (
    <Upload
      accept=".xls,.xlsx"
      showUploadList={false}
      beforeUpload={(file: Blob) => {
        void upload(file);
        return false;
      }}
    >
      <Button type="primary" loading={loading}>
        {label}
      </Button>
    </Upload>
  );
}

export const PatrolPointPage = defineComponent({
  name: "ElectronicPatrolPointPage",
  setup() {
    const query = reactive<{ keyword: string; areaPath?: string[] }>({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const areaOptions = ref<PatrolArea[]>([]);
    const nfcOptions = ref<PatrolRow[]>([]);
    const visible = ref(false);
    const editing = ref(false);
    const formRef = ref<FormInstance>();
    const importing = ref(false);
    const downloading = ref(false);
    const qrLoading = ref(false);
    const selectedIds = ref<string[]>([]);
    const currentRecords = ref<PatrolRow[]>([]);
    const model = reactive<Record<string, unknown>>({
      id: "",
      patrolLocationName: "",
      bimCode: "",
      areaIds: [],
      deviceId: "",
      nfcCode: "",
      bluetoothCode: "",
      patrolLongitude: "",
      patrolDimension: "",
      remarks: "",
    });

    const resetModel = (): void => {
      Object.assign(model, {
        id: "",
        patrolLocationName: "",
        bimCode: "",
        areaIds: [],
        deviceId: "",
        nfcCode: "",
        bluetoothCode: "",
        patrolLongitude: "",
        patrolDimension: "",
        remarks: "",
      });
      formRef.value?.clearValidate();
    };
    const openCreate = async (): Promise<void> => {
      resetModel();
      editing.value = false;
      try {
        nfcOptions.value = await PatrolContext.getElectronicPatrolClient().listNfc();
        visible.value = true;
      } catch (error) {
        message.error(errorMessage(error, "巡更点设备加载失败"));
      }
    };
    const openEdit = async (record: PatrolRow): Promise<void> => {
      resetModel();
      editing.value = true;
      const areaIds = typeof record.areaId === "string" ? record.areaId.split(",").filter(Boolean) : [];
      Object.assign(model, record, { areaIds });
      try {
        nfcOptions.value = await PatrolContext.getElectronicPatrolClient().listNfc(
          typeof record.deviceId === "string" ? record.deviceId : undefined,
        );
        visible.value = true;
      } catch (error) {
        message.error(errorMessage(error, "巡更点设备加载失败"));
      }
    };
    const refresh = (): void => tableApi.query();
    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_POINT",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedIds.value = keys.map(String);
      },
      columns: [
        {
          title: "序号",
          dataIndex: "sequence",
          width: 70,
          fixed: "left",
          align: "center",
          customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1,
        },
        { title: "巡更点名称", dataIndex: "patrolLocationName", width: 160, fixed: "left", ellipsis: true },
        { title: "关联巡更点设备", dataIndex: "deviceCode", width: 160, ellipsis: true },
        { title: "所属区域", dataIndex: "area", width: 200, ellipsis: true, customRender: ({ text: value }) => areaText(value) },
        { title: "模型编码", dataIndex: "bimCode", width: 130, ellipsis: true },
        {
          title: "经纬度",
          dataIndex: "coordinates",
          width: 190,
          customRender: ({ record }: { record: PatrolRow }) => `${text(record.patrolLongitude)} / ${text(record.patrolDimension)}`,
        },
        { title: "创建时间", dataIndex: "createTime", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        { title: "巡更NFC芯片", dataIndex: "nfcCode", width: 160, ellipsis: true },
        { title: "蓝牙信标地址", dataIndex: "bluetoothCode", width: 180, ellipsis: true },
        { title: "说明", dataIndex: "remarks", width: 200, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button type="link" onClick={() => void openEdit(record)}>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除该项？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().deletePoint(record.id);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pagePoints({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword || undefined,
            areaId: query.areaPath?.join(","),
          });
          page.total = result.total;
          currentRecords.value = result.records;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更点加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "巡更点名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更点名称" },
        },
        {
          component: "Cascader",
          fieldName: "areaPath",
          label: "所属区域",
          componentProps: {
            allowClear: true,
            changeOnSelect: true,
            showSearch: true,
            options: areaOptions,
            fieldNames: { label: "name", value: "id", children: "children" },
            placeholder: "请选择",
          },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.areaPath = Array.isArray(values.areaPath) ? values.areaPath.map(String) : undefined;
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.keyword = "";
        query.areaPath = undefined;
        page.pageNumber = 1;
        refresh();
      },
    });

    void PatrolContext.getElectronicPatrolClient()
      .listAreas()
      .then((items) => {
        areaOptions.value = items;
      })
      .catch((error: unknown) => message.error(errorMessage(error, "区域加载失败")));

    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validateFields();
        const body = { ...model, areaIds: Array.isArray(model.areaIds) ? model.areaIds : [] };
        if (editing.value) {
          await PatrolContext.getElectronicPatrolClient().updatePoint(body);
        } else {
          await PatrolContext.getElectronicPatrolClient().createPoint(body);
        }
        message.success(editing.value ? "修改成功" : "添加成功");
        visible.value = false;
        refresh();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      }
    };
    const downloadTemplate = async (): Promise<void> => {
      downloading.value = true;
      try {
        downloadBlob(await PatrolContext.getElectronicPatrolClient().downloadPointTemplate(), "巡更点模板.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "下载失败"));
      } finally {
        downloading.value = false;
      }
    };
    const importFile = async (value: Blob): Promise<void> => {
      const file = fileFromInput(value);
      if (!file) {
        return;
      }
      importing.value = true;
      try {
        await PatrolContext.getElectronicPatrolClient().importPoints(file);
        message.success("导入成功");
        refresh();
      } catch (error) {
        message.error(errorMessage(error, "导入失败"));
      } finally {
        importing.value = false;
      }
    };
    const downloadQrcodes = async (): Promise<void> => {
      const selected = currentRecords.value.filter((item) => selectedIds.value.includes(item.id));
      if (selected.length === 0) {
        message.warning("请选择要下载的二维码");
        return;
      }
      qrLoading.value = true;
      try {
        downloadBlob(
          await PatrolContext.getElectronicPatrolClient().downloadPointQrcodes(
            selected.map((item) => ({ entityId: item.id, entityName: text(item.patrolLocationName) })),
          ),
          "巡更点二维码.zip",
        );
      } catch (error) {
        message.error(errorMessage(error, "二维码下载失败"));
      } finally {
        qrLoading.value = false;
      }
    };

    return () => (
      <PageLayout
        title="巡更点"
        v-slots={{
          "layout-header": () => (
            <div class={styles.actionSpace}>
              <Button type="primary" loading={qrLoading.value} onClick={() => void downloadQrcodes()}>
                下载二维码
              </Button>
              <Button type="primary" onClick={() => void openCreate()}>
                新增
              </Button>
              <Button type="primary" loading={downloading.value} onClick={() => void downloadTemplate()}>
                下载模板
              </Button>
              {fileUploadButton("批量导入", importing.value, importFile)}
            </div>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
              <Modal
                open={visible.value}
                title={editing.value ? "编辑巡更点" : "添加巡更点"}
                width={820}
                onOk={() => void save()}
                onCancel={() => (visible.value = false)}
              >
                <Form ref={formRef} model={model} labelCol={{ style: { width: "145px" } }}>
                  <FormItem label="巡更点名称" name="patrolLocationName" rules={[{ required: true, message: "请输入巡更点名称" }]}>
                    <Input v-model:value={model.patrolLocationName} maxlength={20} placeholder="请输入巡更点名称" />
                  </FormItem>
                  <FormItem label="巡更点模型编码" name="bimCode">
                    <Input v-model:value={model.bimCode} maxlength={20} placeholder="请输入模型编码" />
                  </FormItem>
                  <FormItem label="所属区域" name="areaIds" rules={[{ required: true, message: "请选择所属区域" }]}>
                    <Cascader
                      v-model:value={model.areaIds}
                      options={areaOptions.value}
                      fieldNames={{ label: "name", value: "id", children: "children" }}
                      changeOnSelect
                      showSearch
                      placeholder="请选择"
                    />
                  </FormItem>
                  <FormItem label="关联巡更点设备" name="deviceId">
                    <Select
                      v-model:value={model.deviceId}
                      allowClear
                      showSearch
                      options={nfcOptions.value.map((item) => ({ label: text(item.deviceCode), value: item.id }))}
                      onChange={(value: unknown) => {
                        const device = nfcOptions.value.find((item) => item.id === String(value ?? ""));
                        if (device) {
                          Object.assign(model, {
                            nfcCode: device.nfcCode ?? "",
                            bluetoothCode: device.bluetoothCode ?? "",
                            patrolLongitude: device.nfcLongitude ?? "",
                            patrolDimension: device.nfcDimension ?? "",
                          });
                        }
                      }}
                    />
                  </FormItem>
                  <FormItem label="NFC芯片编号">
                    <Input value={String(model.nfcCode ?? "")} disabled />
                  </FormItem>
                  <FormItem label="蓝牙信标地址">
                    <Input value={String(model.bluetoothCode ?? "")} disabled />
                  </FormItem>
                  <FormItem label="经度">
                    <Input v-model:value={model.patrolLongitude} placeholder="请输入经度" />
                  </FormItem>
                  <FormItem label="纬度">
                    <Input v-model:value={model.patrolDimension} placeholder="请输入纬度" />
                  </FormItem>
                  <FormItem label="说明">
                    <Textarea v-model:value={model.remarks} maxlength={200} placeholder="请描述" />
                  </FormItem>
                </Form>
              </Modal>
            </div>
          ),
          "footer-btn": () => <span class={styles.muted}>已选 {selectedIds.value.length} 项</span>,
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number: number, size: number) => {
                page.pageNumber = number;
                page.pageSize = size;
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});

export const PatrolNfcPage = defineComponent({
  name: "ElectronicPatrolNfcPage",
  setup() {
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const visible = ref(false);
    const editing = ref(false);
    const formRef = ref<FormInstance>();
    const importing = ref(false);
    const downloading = ref(false);
    const model = reactive<Record<string, unknown>>({
      id: "",
      deviceCode: "",
      nfcCode: "",
      bluetoothCode: "",
      nfcLongitude: "",
      nfcDimension: "",
      remarks: "",
    });
    const refresh = (): void => tableApi.query();
    const resetModel = (): void => {
      Object.assign(model, { id: "", deviceCode: "", nfcCode: "", bluetoothCode: "", nfcLongitude: "", nfcDimension: "", remarks: "" });
    };
    const open = (record?: PatrolRow): void => {
      resetModel();
      editing.value = Boolean(record);
      if (record) {
        Object.assign(model, record);
      }
      visible.value = true;
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_NFC",
      rowKey: "id",
      columns: [
        {
          title: "序号",
          dataIndex: "sequence",
          width: 70,
          fixed: "left",
          customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1,
        },
        { title: "巡更NFC芯片", dataIndex: "nfcCode", width: 160, ellipsis: true },
        { title: "巡更点设备", dataIndex: "deviceCode", width: 180, ellipsis: true },
        { title: "蓝牙编码", dataIndex: "bluetoothCode", width: 180, ellipsis: true },
        { title: "经度", dataIndex: "nfcLongitude", width: 130 },
        { title: "纬度", dataIndex: "nfcDimension", width: 130 },
        { title: "说明", dataIndex: "remarks", width: 200, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "创建时间", dataIndex: "createTime", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button type="link" onClick={() => open(record)}>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除该项？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().deleteNfc(record.id);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pageNfc({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword || undefined,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "NFC芯片加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键字",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "NFC芯片编号/蓝牙编码" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.keyword = "";
        page.pageNumber = 1;
        refresh();
      },
    });
    const save = async (): Promise<void> => {
      try {
        await formRef.value?.validateFields();
        if (!model.nfcCode && !model.bluetoothCode) {
          message.warning("NFC芯片编号和蓝牙编码至少填写一项");
          return;
        }
        if (editing.value) {
          await PatrolContext.getElectronicPatrolClient().updateNfc({ ...model });
        } else {
          await PatrolContext.getElectronicPatrolClient().createNfc({ ...model });
        }
        message.success(editing.value ? "修改成功" : "添加成功");
        visible.value = false;
        refresh();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      }
    };
    const importFile = async (value: Blob): Promise<void> => {
      const file = fileFromInput(value);
      if (!file) {
        return;
      }
      importing.value = true;
      try {
        await PatrolContext.getElectronicPatrolClient().importNfc(file);
        message.success("导入成功");
        refresh();
      } catch (error) {
        message.error(errorMessage(error, "导入失败"));
      } finally {
        importing.value = false;
      }
    };
    const downloadTemplate = async (): Promise<void> => {
      downloading.value = true;
      try {
        downloadBlob(await PatrolContext.getElectronicPatrolClient().downloadNfcTemplate(), "NFC芯片模板.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "下载失败"));
      } finally {
        downloading.value = false;
      }
    };

    return () => (
      <PageLayout
        title="NFC芯片"
        v-slots={{
          "layout-header": () => (
            <div class={styles.actionSpace}>
              <Button type="primary" onClick={() => open()}>
                新增
              </Button>
              <Button type="primary" loading={downloading.value} onClick={() => void downloadTemplate()}>
                下载模板
              </Button>
              {fileUploadButton("批量导入", importing.value, importFile)}
            </div>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
              <Modal
                open={visible.value}
                title={editing.value ? "编辑巡更设备" : "新增巡更设备"}
                width={760}
                onOk={() => void save()}
                onCancel={() => (visible.value = false)}
              >
                <Form ref={formRef} model={model} labelCol={{ style: { width: "130px" } }}>
                  <FormItem label="巡更点设备" name="deviceCode" rules={[{ required: true, message: "请输入巡更点设备" }]}>
                    <Input v-model:value={model.deviceCode} maxlength={30} />
                  </FormItem>
                  <FormItem label="NFC芯片编号" name="nfcCode">
                    <Input v-model:value={model.nfcCode} maxlength={30} />
                  </FormItem>
                  <FormItem label="蓝牙编码" name="bluetoothCode">
                    <Input v-model:value={model.bluetoothCode} maxlength={30} />
                  </FormItem>
                  <FormItem label="经度" name="nfcLongitude">
                    <Input v-model:value={model.nfcLongitude} placeholder="请输入经度" />
                  </FormItem>
                  <FormItem label="纬度" name="nfcDimension">
                    <Input v-model:value={model.nfcDimension} placeholder="请输入纬度" />
                  </FormItem>
                  <FormItem label="说明">
                    <Textarea v-model:value={model.remarks} maxlength={100} placeholder="请描述" />
                  </FormItem>
                </Form>
              </Modal>
            </div>
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
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});

export const PatrolRoutePage = defineComponent({
  name: "ElectronicPatrolRoutePage",
  setup() {
    const router = useRouter();
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const refresh = (): void => tableApi.query();
    const [PcTable, tableApi] = usePcTable({
      tableCode: "ELECTRONIC_PATROL_ROUTE",
      rowKey: "id",
      columns: [
        {
          title: "序号",
          dataIndex: "sequence",
          width: 70,
          fixed: "left",
          customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1,
        },
        { title: "巡更路线", dataIndex: "patrolRouteName", width: 220, fixed: "left", ellipsis: true },
        { title: "巡更点数量", dataIndex: "patrolLocationNumber", width: 140 },
        { title: "创建时间", dataIndex: "createTime", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        { title: "创建人", dataIndex: "createName", width: 140, ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: PatrolRow }) => (
            <div class={styles.actionSpace}>
              <Button
                type="link"
                onClick={() => void router.push({ path: "/d/electronic-patrol/path/detiles", query: { id: record.id, type: "edit" } })}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除该项？"
                onConfirm={async () => {
                  try {
                    await PatrolContext.getElectronicPatrolClient().deleteRoute(record.id);
                    message.success("删除成功");
                    refresh();
                  } catch (error) {
                    message.error(errorMessage(error, "删除失败"));
                  }
                }}
              >
                <Button type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await PatrolContext.getElectronicPatrolClient().pageRoutes({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword || undefined,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "巡更路线加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "巡更路线名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更路线名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        refresh();
      },
      handleReset() {
        query.keyword = "";
        page.pageNumber = 1;
        refresh();
      },
    });
    return () => (
      <PageLayout
        title="巡更路线"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => void router.push({ path: "/d/electronic-patrol/path/detiles", query: { type: "add" } })}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
            </div>
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
                refresh();
              }}
            />
          ),
        }}
      />
    );
  },
});

interface NoticeRule {
  id: number;
  condition: number;
  mode: string[];
}

export const PatrolMessagePage = defineComponent({
  name: "ElectronicPatrolMessagePage",
  setup() {
    const activeKey = ref("任务接收提醒");
    const acceptOptions = ref<{ label: string; value: string }[]>([]);
    const expireOptions = ref<{ label: string; value: string }[]>([]);
    const receiveRules = ref<NoticeRule[]>([{ id: 1, condition: 1, mode: [] }]);
    const expireRules = ref<NoticeRule[]>([{ id: 2, condition: 1, mode: [] }]);
    const loading = ref(false);
    let sequence = 3;
    const messageClient = PatrolContext.getElectronicPatrolMessageClient();
    const toRules = (items: MessageSceneConfig[]): NoticeRule[] =>
      items.map((item) => ({
        id: sequence++,
        condition: Number(item.value ?? 1),
        mode: (item.noticeWays ?? []).map((way) => String(way.noticeWay ?? "")).filter(Boolean),
      }));
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const [acceptWays, expireWays, receives, expires] = await Promise.all([
          messageClient.sceneNotificationMethod("ELECTRON_TASK_RECEIVE"),
          messageClient.sceneNotificationMethod("ELECTRON_TASK_EXPIRE"),
          messageClient.getMessageConfig({ businessType: "ELECTRONIC_PATROL", label: "任务接收提醒" }),
          messageClient.getMessageConfig({ businessType: "ELECTRONIC_PATROL", label: "任务到期提醒" }),
        ]);
        acceptOptions.value = acceptWays;
        expireOptions.value = expireWays;
        if (receives.length > 0) {
          receiveRules.value = toRules(receives);
        }
        if (expires.length > 0) {
          expireRules.value = toRules(expires);
        }
      } catch (error) {
        message.error(errorMessage(error, "消息配置加载失败"));
      } finally {
        loading.value = false;
      }
    };
    void load();
    const save = async (): Promise<void> => {
      loading.value = true;
      try {
        await messageClient.addMessageConfig({
          businessType: "ELECTRONIC_PATROL",
          sceneConfigDTOS: [
            ...receiveRules.value.map((rule) => ({
              label: "任务接收提醒",
              sceneCode: "ELECTRON_TASK_RECEIVE",
              value: rule.condition,
              noticeWays: rule.mode.map((noticeWay) => ({ noticeWay })),
            })),
            ...expireRules.value.map((rule) => ({
              label: "任务到期提醒",
              sceneCode: "ELECTRON_TASK_EXPIRE",
              value: rule.condition,
              noticeWays: rule.mode.map((noticeWay) => ({ noticeWay })),
            })),
          ],
        });
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        loading.value = false;
      }
    };
    const renderRules = (rules: NoticeRule[], kind: "receive" | "expire", options: { label: string; value: string }[]) => (
      <div>
        <Button onClick={() => rules.push({ id: sequence++, condition: 1, mode: [] })}>添加</Button>
        {rules.map((rule, index) => (
          <div class={styles.messageCard} key={rule.id}>
            <div class={styles.messageRow}>
              通知条件：{kind === "receive" ? "距离任务巡更开始时间还有" : "距离巡更截止时间"}
              <InputNumber v-model:value={rule.condition} min={1} max={999} />
              分钟，{kind === "receive" ? "仍未接收提醒" : "进行提醒"}
              {index > 0 ? (
                <Button type="link" danger onClick={() => rules.splice(index, 1)}>
                  删除
                </Button>
              ) : null}
            </div>
            <div class={styles.messageRow}>
              通知方式：
              <CheckboxGroup v-model:value={rule.mode} options={options} />
            </div>
            <div class={styles.messageExample}>
              通知示例：
              {kind === "receive"
                ? `您有一条【巡更任务名称】还有【${rule.condition}】分钟开始，请及时接收任务避免影响巡更进度`
                : `您有一条【巡更任务名称】还有【${rule.condition}】分钟即将截止，请及时处理`}
            </div>
          </div>
        ))}
      </div>
    );
    return () => (
      <PageLayout
        title="巡更消息配置"
        v-slots={{
          "layout-content": () => (
            <Tabs activeKey={activeKey.value} onChange={(value: string | number) => (activeKey.value = String(value))}>
              <TabPane key="任务接收提醒" tab="任务接收提醒">
                {renderRules(receiveRules.value, "receive", acceptOptions.value)}
              </TabPane>
              <TabPane key="任务到期提醒" tab="任务到期提醒">
                {renderRules(expireRules.value, "expire", expireOptions.value)}
              </TabPane>
            </Tabs>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              <Button type="primary" loading={loading.value} onClick={() => void save()}>
                保存
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});

export const PatrolSubmitSettingPage = defineComponent({
  name: "ElectronicPatrolSubmitSettingPage",
  setup() {
    const id = ref("");
    const version = ref("");
    const loading = ref(false);
    const config = reactive<{ requirePic: boolean; uploadMethod: string[]; watermark: string[] }>({
      requirePic: false,
      uploadMethod: [],
      watermark: [],
    });
    const code = "uploadPicConfig";
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const rows = await PatrolContext.getElectronicPatrolClient().getDictionary("ELECTRONIC_PATROL_SUBMIT_CONFIG", code);
        const row = rows.find((item) => item.code === code);
        if (row) {
          id.value = String(row.id ?? "");
          version.value = String(row.version ?? "");
          if (typeof row.variable === "string" && row.variable) {
            const value = JSON.parse(row.variable) as Partial<typeof config>;
            config.requirePic = Boolean(value.requirePic);
            config.uploadMethod = Array.isArray(value.uploadMethod) ? value.uploadMethod.map(String) : [];
            config.watermark = Array.isArray(value.watermark) ? value.watermark.map(String) : [];
          }
        }
      } catch (error) {
        message.error(errorMessage(error, "配置加载失败"));
      } finally {
        loading.value = false;
      }
    };
    void load();
    const save = async (): Promise<void> => {
      loading.value = true;
      try {
        const body = {
          id: id.value || undefined,
          code,
          version: version.value || undefined,
          name: "巡更图片配置",
          itemCode: "ELECTRONIC_PATROL_SUBMIT_CONFIG",
          variable: JSON.stringify(config),
        };
        if (id.value) {
          await PatrolContext.getElectronicPatrolClient().updateDictionary(body);
        } else {
          await PatrolContext.getElectronicPatrolClient().createDictionary(body);
        }
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        loading.value = false;
      }
    };
    return () => (
      <PageLayout
        title="巡更提交配置"
        v-slots={{
          "layout-content": () => (
            <Tabs activeKey="巡更图片">
              <TabPane key="巡更图片" tab="巡更图片">
                <Alert
                  message="用于对巡更结果的图片进行配置，以约束用户的巡更行为"
                  type="info"
                  showIcon
                  style={{ maxWidth: "680px", marginBottom: "16px" }}
                />
                <div class={styles.formCard}>
                  <Form model={config} labelCol={{ style: { width: "140px" } }}>
                    <FormItem label="图片是否必填">
                      <Switch v-model:checked={config.requirePic} />
                    </FormItem>
                    <FormItem label="图片上传方式">
                      <CheckboxGroup
                        v-model:value={config.uploadMethod}
                        options={[
                          { label: "拍照", value: "camera" },
                          { label: "相册", value: "album" },
                        ]}
                      />
                    </FormItem>
                    <FormItem label="是否添加水印">
                      <CheckboxGroup
                        v-model:value={config.watermark}
                        options={[
                          { label: "添加地点定位", value: "location" },
                          { label: "添加时间戳", value: "timestamp" },
                        ]}
                      />
                    </FormItem>
                  </Form>
                </div>
              </TabPane>
            </Tabs>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              <Button type="primary" loading={loading.value} onClick={() => void save()}>
                保存
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
