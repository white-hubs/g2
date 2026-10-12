import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons-vue";
import { computed, defineComponent, onMounted, ref } from "vue";

import { DeviceSelectModal } from "./components/device-select-modal";
import {
  ClassifySettingsPage,
  ReadRecordDelete,
  ReadRecordPage,
  ReadRecordUpdate,
  getAreaList,
  readLogExport,
  readRecordImport,
  readRecordTemplateExport,
} from "@/api";
import { GLayout } from "@/components/common/g-layout";
import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  RangePicker,
  Select,
  Spin,
  Table,
  Tree,
  Upload,
  dayjs,
  message,
  usePcQueryState,
  type Dayjs,
  type UploadFile,
} from "@/pc-ui-runtime";
import { downloadBlob, treeAddLevel } from "@/utils/common";

import "./device-record.less";

export const DeviceRecord = defineComponent({
  name: "DeviceRecord",
  setup() {
    const getCurrentMonthRange = (): [string, string] => [
      dayjs().startOf("month").format("YYYY-MM-DD"),
      dayjs().endOf("month").format("YYYY-MM-DD"),
    ];

    const queryState = usePcQueryState({
      storage: "url",
      initialState: {
        instrumentType: undefined as string | undefined,
        areaIds: "",
        deviceKeyword: "",
        period: getCurrentMonthRange() as [string, string],
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        pages: 1,
      },
      cacheFields: ["instrumentType", "areaIds", "deviceKeyword", "period", "pageNumber", "pageSize"],
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize" || field === "pages") return Number(raw);
        if (field === "period") return String(raw).split(",") as [string, string];
        return raw;
      },
    });

    const periodRange = computed({
      get(): [Dayjs, Dayjs] | undefined {
        const period = queryState.state.period;
        if (!Array.isArray(period) || !period[0] || !period[1]) return undefined;
        const start = dayjs(period[0]);
        const end = dayjs(period[1]);
        if (!start.isValid() || !end.isValid()) return undefined;
        return [start, end];
      },
      set(value: [Dayjs, Dayjs] | undefined) {
        if (!value?.[0] || !value[1]) return;
        queryState.state.period = [value[0].format("YYYY-MM-DD"), value[1].format("YYYY-MM-DD")];
      },
    });

    const scrollY = ref(200);
    const readValue = ref<string | number>("");
    const loading = ref(true);
    const tableSource = ref<Array<Record<string, unknown>>>([]);
    const expandedKeys = ref<string[]>([]);
    const selectedKeys = ref<string[]>([]);
    const treeData = ref<unknown[]>([]);
    const checkedKeys = ref<string[]>([]);
    const treeLoading = ref(false);
    const meterTypeList = ref<unknown[]>([]);
    const selectedRowKeys = ref<string[]>([]);
    const selectedRows = ref<Array<Record<string, unknown>>>([]);
    const allSelectedRows = ref<Array<Record<string, unknown>>>([]);
    const editRow = ref(-1);

    const getRecordId = (record: Record<string, unknown>): string => {
      if (!record) return "";
      const deviceId = String(record.deviceId || "");
      const curDateTime = String(record.curDateTime || record.curTime || "");
      if (!deviceId && !curDateTime) return `temp_${Date.now()}_${Math.random()}`;
      return `${deviceId}_${curDateTime}`;
    };

    const columns = [
      {
        title: "序号",
        dataIndex: "sort",
        customRender: ({ index }: { index: number }) => index + 1,
        width: 60,
      },
      {
        title: "设备编码",
        dataIndex: "deviceCode",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text == "" ? "--" : text),
        width: 100,
      },
      {
        title: "设备名称",
        dataIndex: "deviceName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text == "" ? "--" : text),
        width: 100,
      },
      { title: "上期抄表时间", dataIndex: "preDateTime", ellipsis: true, align: "center" as const, width: 120 },
      { title: "上次抄表数", dataIndex: "preReadValue", ellipsis: true, align: "center" as const, width: 100 },
      { title: "本期抄表时间", dataIndex: "curDateTime", ellipsis: true, align: "center" as const, width: 120 },
      {
        title: "抄表值",
        dataIndex: "readValue",
        align: "center" as const,
        width: 140,
        customRender: ({ index, record }: { text: unknown; index: number; record: Record<string, unknown> }) =>
          editRow.value === index ? (
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px">
              <InputNumber v-model:value={readValue.value} placeholder="请输入用量" style="width: 80px" />
              <Button type="link" style="padding: 0" onClick={() => void updateEdit(record)}>
                <CheckOutlined />
              </Button>
              <Button
                type="link"
                style="padding: 0"
                onClick={() => {
                  editRow.value = -1;
                  readValue.value = "";
                }}
              >
                <CloseOutlined />
              </Button>
            </div>
          ) : (
            <div
              style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer"
              onClick={() => {
                editRow.value = index;
                readValue.value = (record.readValue as string | number) || "";
              }}
            >
              <span>{(record.readValue as string | number) || 0}</span>
              <EditOutlined style="color: var(--cube-theme-var--primary-color, #1890ff); font-size: 14px" />
            </div>
          ),
      },
      { title: "用量", dataIndex: "usage", ellipsis: true, align: "center" as const, width: 100 },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right" as const,
        width: 120,
        ellipsis: true,
        customRender: ({ record }: { record: Record<string, unknown> }) => (
          <Popconfirm title="确定要删除这条数据吗？" ok-text="确定" cancel-text="取消" onConfirm={() => void handleDelete(record)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        ),
      },
    ];

    const getList = async () => {
      loading.value = true;
      try {
        const period = Array.isArray(queryState.state.period) ? queryState.state.period.join(",") : "";
        const { data } = (await ReadRecordPage({
          areaIds: queryState.state.areaIds,
          deviceKeyword: queryState.state.deviceKeyword,
          pageSize: queryState.state.pageSize,
          pageNumber: queryState.state.pageNumber,
          instrumentType: queryState.state.instrumentType,
          period: period === "," ? "" : period,
        })) as { data: { records: Array<Record<string, unknown>>; total: number; pages: number } };
        tableSource.value = data.records;
        queryState.state.total = data.total;
        queryState.state.pages = data.pages;
        editRow.value = -1;
        if (selectedRowKeys.value.length > 0) {
          const currentPageIds = data.records.map((item) => getRecordId(item));
          selectedRowKeys.value = selectedRowKeys.value.filter(
            (key) => currentPageIds.includes(key) || allSelectedRows.value.some((item) => getRecordId(item) === key),
          );
        }
      } finally {
        loading.value = false;
      }
    };

    const updateEdit = async (record: Record<string, unknown>) => {
      await ReadRecordUpdate({ ...record, readValue: readValue.value });
      message.success("操作成功");
      editRow.value = -1;
      readValue.value = "";
      await getList();
    };

    const handleDelete = async (record: Record<string, unknown>) => {
      try {
        await ReadRecordDelete([
          {
            time: record.curDateTime || record.curTime || record.preDateTime || "",
            deviceId: record.deviceId || Number(record.deviceId) || 0,
          },
        ]);
        message.success("删除成功");
        const recordId = getRecordId(record);
        allSelectedRows.value = allSelectedRows.value.filter((item) => getRecordId(item) !== recordId);
        selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== recordId);
        await getList();
      } catch {
        message.error("删除失败");
      }
    };

    const handleBatchDelete = async () => {
      if (!selectedRowKeys.value.length) {
        message.warning("请选择要删除的数据");
        return;
      }
      try {
        await ReadRecordDelete(
          allSelectedRows.value.map((record) => ({
            time: record.curDateTime || record.curTime || record.preDateTime || "",
            deviceId: record.deviceId || Number(record.deviceId) || 0,
          })),
        );
        message.success("批量删除成功");
        selectedRowKeys.value = [];
        selectedRows.value = [];
        allSelectedRows.value = [];
        await getList();
      } catch {
        message.error("批量删除失败");
      }
    };

    const rowSelection = computed(() => ({
      selectedRowKeys: selectedRowKeys.value.filter((key) => {
        const currentPageIds = tableSource.value.map((item) => getRecordId(item));
        return currentPageIds.includes(key) || allSelectedRows.value.some((item) => getRecordId(item) === key);
      }),
      onChange: (_keys: (string | number)[], rows: Array<Record<string, unknown>>) => {
        selectedRows.value = rows;
        const currentPageIds = tableSource.value.map((item) => getRecordId(item));
        allSelectedRows.value = [...allSelectedRows.value.filter((item) => !currentPageIds.includes(getRecordId(item))), ...rows];
        selectedRowKeys.value = allSelectedRows.value.map((item) => getRecordId(item)).filter(Boolean);
      },
    }));

    const exportToExcel = async (data: Array<Record<string, unknown>>, fileName: string) => {
      if (!data.length) {
        message.warning("没有可导出的数据");
        return;
      }
      try {
        const XLSX = await import("xlsx");
        const formatDateTime = (dateStr: string) => {
          if (!dateStr || dateStr === "--") return "--";
          const date = dayjs(dateStr);
          return date.isValid() ? date.format("YYYY/M/D H:mm") : dateStr;
        };
        const worksheetData = data.map((item) => ({
          序号: item.deviceId ? String(item.deviceId) : "",
          设备编码: item.deviceCode !== undefined && item.deviceCode !== null && item.deviceCode !== "" ? item.deviceCode : "--",
          设备名称: item.deviceName !== undefined && item.deviceName !== null && item.deviceName !== "" ? item.deviceName : "--",
          上期抄表时间: formatDateTime(String(item.preDateTime || "")),
          上次抄表数: item.preReadValue !== undefined && item.preReadValue !== null ? item.preReadValue : "--",
          本期抄表时间: formatDateTime(String(item.curDateTime || "")),
          抄表值: item.readValue !== undefined && item.readValue !== null ? item.readValue : "--",
          用量: item.usage !== undefined && item.usage !== null ? item.usage : "--",
        }));
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        worksheet["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        message.success("导出成功");
      } catch {
        message.error("导出失败");
      }
    };

    const handleExport = async () => {
      if (!queryState.state.period?.[0] || !queryState.state.period?.[1]) {
        message.warning("请选择时间范围");
        return;
      }
      if (selectedRowKeys.value.length > 0 && allSelectedRows.value.length > 0) {
        await exportToExcel(allSelectedRows.value, "采集读数记录");
        return;
      }
      if (!tableSource.value.length) {
        message.warning("未查询到数据，无法导出");
        return;
      }
      const { data } = (await readLogExport({
        areaIds: queryState.state.areaIds,
        instrumentType: queryState.state.instrumentType,
        period: queryState.state.period.join(","),
        deviceKeyword: queryState.state.deviceKeyword,
      })) as { data: Blob };
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      downloadBlob(blob, "采集读数记录.xlsx");
    };

    const importVisible = ref(false);
    const deviceModalVisible = ref(false);
    const selectedDevices = ref<string[]>([]);
    const deviceOptions = ref<Array<Record<string, unknown>>>([]);
    const fileList = ref<UploadFile[]>([]);
    const importLoading = ref(false);
    const importResultVisible = ref(false);
    const importResult = ref<{
      successCount: number;
      failCount: number;
      errorList: Array<{ errorRow: number; errorMsg: string }>;
    }>({ successCount: 0, failCount: 0, errorList: [] });
    const failColumns = [
      { title: "失败excel行数", dataIndex: "errorRow", key: "errorRow", align: "center" as const, width: 150 },
      { title: "失败原因", dataIndex: "errorMsg", key: "errorMsg", align: "center" as const },
    ];

    const cancelImport = () => {
      importVisible.value = false;
      selectedDevices.value = [];
      deviceOptions.value = [];
      fileList.value = [];
    };

    const downloadTemplate = async () => {
      if (!selectedDevices.value.length) {
        message.warning("请先选择设备");
        return;
      }
      try {
        const { data } = (await readRecordTemplateExport({ deviceIdList: selectedDevices.value })) as { data: Blob };
        const blob =
          data instanceof Blob
            ? data
            : new Blob([data as BlobPart], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
        downloadBlob(blob, "读数记录模板.xlsx");
        message.success("模板下载成功");
      } catch {
        message.error("模板下载失败");
      }
    };

    const handleImportSubmit = async () => {
      if (!fileList.value.length) {
        message.warning("请选择要上传的文件");
        return;
      }
      try {
        importLoading.value = true;
        const formData = new FormData();
        formData.append("file", fileList.value[0] as unknown as Blob);
        const { data } = (await readRecordImport(formData)) as {
          data?: { successCount?: number; errorList?: Array<{ errorRow: number; errorMsg: string }> };
        };
        if (data) {
          const errorList = data.errorList || [];
          importResult.value = {
            successCount: data.successCount || 0,
            failCount: errorList.length,
            errorList,
          };
          cancelImport();
          importResultVisible.value = true;
          if (importResult.value.successCount > 0) await getList();
        } else {
          message.success("导入成功");
          cancelImport();
          await getList();
        }
      } catch {
        message.error("导入失败");
      } finally {
        importLoading.value = false;
      }
    };

    const getTreeData = async () => {
      treeLoading.value = true;
      try {
        const { data } = (await getAreaList({})) as { data: Array<Record<string, unknown>> };
        treeData.value = treeAddLevel(data, "level");
      } finally {
        treeLoading.value = false;
      }
    };

    onMounted(() => {
      const clientHeight = document.querySelector(".content-table")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 220;
      window.addEventListener("resize", () => {
        const h = document.querySelector(".content-table")?.clientHeight;
        if (h) scrollY.value = h - 220;
      });
      void getTreeData();
      void getList();
      void ClassifySettingsPage().then((res) => {
        const { data } = res as { data: { records: unknown[] } };
        meterTypeList.value = data.records;
      });
    });

    return () => (
      <GLayout
        title="采集读数记录"
        contentTableScrollable
        v-slots={{
          "content-left": () => (
            <Spin spinning={treeLoading.value}>
              <div class="overflow-y-auto w-300" style={scrollY.value ? `height:${scrollY.value + 120}px` : ""}>
                <Tree
                  defaultExpandAll
                  v-model:expandedKeys={expandedKeys.value}
                  v-model:selectedKeys={selectedKeys.value}
                  v-model:checkedKeys={checkedKeys.value}
                  checkable
                  selectable={false}
                  treeData={treeData.value as never}
                  fieldNames={{ key: "id", title: "areaName", children: "children" }}
                  onCheck={(checked) => {
                    const value = Array.isArray(checked) ? checked : checked.checked;
                    queryState.state.pageNumber = 1;
                    queryState.state.areaIds = value.map(String).join(",");
                    void getList();
                  }}
                />
              </div>
            </Spin>
          ),
          "content-table": () => (
            <div class="pt-10 pl-10">
              <Form class="form-body">
                <FormItem label="仪表类型">
                  <Select
                    placeholder="请选择仪表类型"
                    style="width: 180px"
                    v-model:value={queryState.state.instrumentType}
                    allowClear
                    options={meterTypeList.value as never}
                    fieldNames={{ label: "categoryName", value: "categoryCode" }}
                  />
                </FormItem>
                <FormItem label="时间范围:">
                  <RangePicker
                    {...({
                      value: periodRange.value,
                      "onUpdate:value": (value: [Dayjs, Dayjs] | undefined) => {
                        periodRange.value = value;
                      },
                      allowClear: false,
                    } as object)}
                  />
                </FormItem>
                <FormItem label="设备名称:" style="width: 300px">
                  <Input placeholder="请输入设备名称，编号查询" v-model:value={queryState.state.deviceKeyword} />
                </FormItem>
                <FormItem>
                  <Button
                    type="primary"
                    onClick={() => {
                      queryState.resetPage();
                      void getList();
                    }}
                  >
                    查询
                  </Button>
                  <Button
                    class="ml-10"
                    style="margin-right: 10px"
                    onClick={() => {
                      queryState.update({
                        instrumentType: undefined,
                        areaIds: "",
                        deviceKeyword: "",
                        period: getCurrentMonthRange(),
                      });
                      queryState.resetPage();
                      void getList();
                    }}
                  >
                    重置
                  </Button>
                  <Button type="primary" style="margin-right: 10px" onClick={() => (importVisible.value = true)}>
                    导入
                  </Button>
                  <Button type="primary" style="margin-right: 10px" onClick={() => void handleExport()}>
                    导出
                  </Button>
                  <Popconfirm
                    title="确定要删除选中的数据吗？"
                    ok-text="确定"
                    cancel-text="取消"
                    onConfirm={() => void handleBatchDelete()}
                    disabled={selectedRowKeys.value.length === 0}
                  >
                    <Button type="primary" danger disabled={selectedRowKeys.value.length === 0} style="margin-right: 10px">
                      批量删除
                    </Button>
                  </Popconfirm>
                </FormItem>
              </Form>
              <div style="margin-top: 10px">
                <span style="margin-right: 10px; color: var(--cube-theme-var--primary-color, #1890ff)">
                  已选 {selectedRowKeys.value.length} 条
                </span>
              </div>
              <div class="mt-10">
                <Table
                  columns={columns}
                  dataSource={tableSource.value}
                  loading={loading.value}
                  pagination={false}
                  scroll={{ y: scrollY.value }}
                  rowSelection={rowSelection.value}
                  rowKey={(record: Record<string, unknown>) => getRecordId(record)}
                />
                <Pagination
                  class="pagination-footer"
                  v-model:current={queryState.state.pageNumber}
                  v-model:pageSize={queryState.state.pageSize}
                  showSizeChanger={false}
                  showTotal={(total: number) => `共 ${total} 条 第${queryState.state.pageNumber}/${queryState.state.pages}页`}
                  total={queryState.state.total}
                  onChange={(current: number, pageSize: number) => {
                    queryState.setPage(current || 1, pageSize);
                    void getList();
                  }}
                  style="margin-top: 10px; float: right"
                />
              </div>
            </div>
          ),
          default: () => (
            <>
              <Modal
                v-model:visible={importVisible.value}
                title="批量导入"
                width="600px"
                onCancel={cancelImport}
                afterClose={cancelImport}
                v-slots={{
                  footer: () => (
                    <>
                      <Button onClick={cancelImport}>取消</Button>
                      <Button
                        type="primary"
                        disabled={!fileList.value.length}
                        loading={importLoading.value}
                        onClick={() => void handleImportSubmit()}
                      >
                        导入
                      </Button>
                    </>
                  ),
                }}
              >
                <div class="import-steps">
                  <div class="step-item">
                    <span class="step-label">1、选择设备:</span>
                    <div class="step-content">
                      <Select
                        mode="multiple"
                        v-model:value={selectedDevices.value}
                        maxTagCount={3}
                        options={deviceOptions.value as never}
                        placeholder="请选择设备"
                        fieldNames={{ label: "deviceName", value: "deviceId" }}
                        open={false}
                        showArrow={false}
                        style="flex: 1; margin-right: 10px"
                        onChange={(value) => {
                          const ids = (Array.isArray(value) ? value : value != null ? [value] : []).map(String);
                          deviceOptions.value = deviceOptions.value.filter((d) => ids.includes(String(d.deviceId)));
                        }}
                      />
                      <Button type="primary" onClick={() => (deviceModalVisible.value = true)}>
                        选择
                      </Button>
                    </div>
                  </div>
                  <div class="step-item">
                    <span class="step-label">2、下载模板:</span>
                    <div class="step-content">
                      <a
                        class={["template-link", selectedDevices.value.length === 0 ? "disabled" : ""].join(" ")}
                        onClick={() => void downloadTemplate()}
                      >
                        读数记录模板.xlsx
                      </a>
                    </div>
                  </div>
                  <div class="step-item">
                    <span class="step-label">3、按模板填写上传:</span>
                    <div class="step-content">
                      <Upload
                        fileList={fileList.value}
                        remove={(file: UploadFile) => {
                          fileList.value = fileList.value.filter((f) => f !== file);
                        }}
                        beforeUpload={(file: UploadFile) => {
                          fileList.value = [file];
                          return false;
                        }}
                        accept=".xlsx,.xls"
                        maxCount={1}
                      >
                        <Button type="primary">点击上传</Button>
                      </Upload>
                    </div>
                  </div>
                </div>
              </Modal>
              <DeviceSelectModal
                v-model:visible={deviceModalVisible.value}
                selectedDeviceIds={selectedDevices.value}
                selectedDevices={deviceOptions.value}
                onConfirm={(devices: Array<Record<string, unknown>>) => {
                  deviceOptions.value = devices;
                  selectedDevices.value = devices.map((d) => String(d.deviceId));
                  deviceModalVisible.value = false;
                }}
              />
              <Modal
                v-model:visible={importResultVisible.value}
                title="导入结果"
                width="600px"
                v-slots={{
                  footer: () => (
                    <Button
                      type="primary"
                      onClick={() => {
                        importResultVisible.value = false;
                        importResult.value = { successCount: 0, failCount: 0, errorList: [] };
                      }}
                    >
                      我知道了
                    </Button>
                  ),
                }}
              >
                <div class="import-result">
                  <div class="result-summary">
                    <span>
                      成功<span class="success-count">{importResult.value.successCount || 0}</span>条, 失败
                      <span class="fail-count">{importResult.value.failCount || 0}</span>条
                    </span>
                  </div>
                  {importResult.value.errorList?.length > 0 ? (
                    <div class="fail-table">
                      <Table columns={failColumns} dataSource={importResult.value.errorList} pagination={false} size="small" />
                    </div>
                  ) : null}
                </div>
              </Modal>
            </>
          ),
        }}
      />
    );
  },
});
