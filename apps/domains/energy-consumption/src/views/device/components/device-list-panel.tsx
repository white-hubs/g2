import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { AssociationModal } from "./association-modal";
import {
  ClassifySettingsPage,
  TableRecordUpdate,
  areaList,
  batchDelete,
  deleteDevices,
  deviceList,
  deviceReadUpdate,
  getParentList,
  meterAdd,
  meterDeviceBatchUpdate,
  setParentDevice,
} from "@/api";
import { getDeviceCenterClient } from "@/domain-context";
import {
  Button,
  Cascader,
  Form,
  FormItem,
  Input,
  Modal,
  Pagination,
  PopConfirm,
  Popover,
  Select,
  Table,
  message,
  usePcQueryState,
} from "@/pc-ui-runtime";
import type { FormInstance } from "@/pc-ui-runtime";
import { timeFormat } from "@/utils/common";

import "./device-list-panel.less";

const BASE = "/d/energy-consumption";

export const DeviceListPanel = defineComponent({
  name: "DeviceListPanel",
  setup() {
    const router = useRouter();
    const queryState = usePcQueryState({
      storage: "url",
      initialState: {
        instrumentType: undefined as string | undefined,
        deviceAreaId: [] as string[],
        keyword: "",
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        pages: 1,
      },
      cacheFields: ["instrumentType", "deviceAreaId", "keyword", "pageNumber", "pageSize"],
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize" || field === "pages") return Number(raw);
        if (field === "deviceAreaId") return String(raw).split(",");
        return raw;
      },
    });

    const scrollY = ref(200);
    const deviceListRef = ref<HTMLElement>();
    const footerRef = ref<HTMLElement>();
    const deviceLoading = ref(true);
    const meterTypeList = ref<unknown[]>([]);
    const areaDataList = ref<unknown[]>([]);
    const tableList = ref<unknown[]>([]);
    const selectedRowKeysData = ref<Array<Record<string, unknown>>>([]);
    const deviceVisible = ref(false);
    const initValue = ref("");
    const currentId = ref("");
    const associatedLoading = ref(false);
    const associatedVisible = ref(false);
    const formRef = ref<FormInstance>();
    const instrumentTypeOptions = ref<unknown[]>([]);
    const instrumentOptions = ref<Array<Record<string, unknown>>>([]);
    const searchAssociated = reactive({ visible: false });
    const parentDeviceVisible = ref(false);
    const parentDevice = ref<{ id: string; parentId: string | undefined }>({ id: "", parentId: undefined });
    const parentDeviceList = ref<unknown[]>([]);
    const deviceForm = reactive({
      instrumentType: "",
      instrument: [] as string[],
    });
    const deviceRules = {
      instrumentType: [{ required: true, message: "请选择仪表类型", trigger: "change" }],
      instrument: [{ required: true, message: "请选择仪表", trigger: "change" }],
    };

    const listLength = computed(() => selectedRowKeysData.value);

    const scrollHandle = async () => {
      await nextTick();
      const deviceListEl = deviceListRef.value;
      const table = deviceListEl?.querySelector<HTMLElement>(".device-list-table");
      const tableHeader = table?.querySelector<HTMLElement>(".ant-table-thead");
      const contentTable = deviceListEl?.closest<HTMLElement>(".content-table");
      if (!table || !deviceListEl) return;
      const availableBottom = Math.min(contentTable?.getBoundingClientRect().bottom ?? window.innerHeight, window.innerHeight);
      const tableTop = table.getBoundingClientRect().top;
      const tableHeaderHeight = tableHeader?.offsetHeight ?? 55;
      const footerHeight = footerRef.value?.offsetHeight ?? 42;
      scrollY.value = Math.max(Math.floor(availableBottom - tableTop - tableHeaderHeight - footerHeight - 50), 0);
    };

    const getDeviceList = async () => {
      deviceLoading.value = true;
      try {
        const { data } = (await deviceList({
          instrumentType: queryState.state.instrumentType,
          deviceAreaId:
            queryState.state.deviceAreaId && queryState.state.deviceAreaId.length
              ? queryState.state.deviceAreaId[queryState.state.deviceAreaId.length - 1]
              : "",
          keyword: queryState.state.keyword,
          total: queryState.state.total,
          pageSize: queryState.state.pageSize,
          pageNumber: queryState.state.pageNumber,
        })) as { data: { records: unknown[]; total: number; pages: number } };
        tableList.value = data.records;
        queryState.state.total = data.total;
        queryState.state.pages = data.pages;
      } finally {
        deviceLoading.value = false;
      }
    };

    const deviceColumns = [
      {
        title: "仪表编码",
        dataIndex: "code",
        key: "code",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text || "--" }),
      },
      {
        title: "仪表名称",
        dataIndex: "deviceName",
        key: "deviceName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text || "--" }),
      },
      {
        title: "仪表类型",
        dataIndex: "instrumentName",
        key: "instrumentName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text }, { default: () => text || "--" }),
      },
      {
        title: "所在区域",
        dataIndex: "deviceArea",
        key: "deviceArea",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => h(Popover, { content: text || "--" }, { default: () => text || "--" }),
      },
      {
        title: "最新采集时间",
        dataIndex: "nowReadeTime",
        key: "nowReadeTime",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => timeFormat(text, true),
      },
      {
        title: "当前读数",
        dataIndex: "readeValue",
        key: "readeValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: number }) => h(Popover, { content: text }, { default: () => text ?? "--" }),
      },
      {
        title: "初始读数",
        dataIndex: "initValue",
        key: "initValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: number }) => h(Popover, { content: text }, { default: () => text ?? "--" }),
      },
      {
        dataIndex: "action",
        title: "操作",
        width: 330,
        fixed: "right" as const,
        customRender: ({ record }: { record: Record<string, unknown> }) => (
          <>
            <Button type="link" onClick={() => checkDetail(record)}>
              详情
            </Button>
            <PopConfirm title="你确定删除当前数据?" ok-text="确定" cancel-text="取消" onConfirm={() => void deleteData(record)}>
              <Button type="link" danger>
                移除
              </Button>
            </PopConfirm>
            <Button type="link" onClick={() => void updateReading(String(record.id))}>
              更新读数
            </Button>
            <Button type="link" onClick={() => openChangeDeviceModel(String(record.deviceId))}>
              更换设备
            </Button>
            <Button type="link" onClick={() => void openParentDeviceModel(record)}>
              配置上级
            </Button>
          </>
        ),
      },
    ];

    const checkDetail = (record: Record<string, unknown>) => {
      void router.push({
        path: `${BASE}/device/detail`,
        query: {
          id: String(record.id),
          deviceId: String(record.deviceId),
          instrumentType: String(record.instrumentType),
        },
      });
    };

    const deleteData = async (record: Record<string, unknown>) => {
      await deleteDevices(record.deviceId);
      message.success("操作成功");
      await getDeviceList();
    };

    const updateReading = async (id: string) => {
      try {
        const { data } = (await deviceReadUpdate(id)) as { data: { nowReadeValue: unknown } };
        Modal.success({ content: `更新成功，当前读数 ${data.nowReadeValue}`, okText: "关闭" });
        await getDeviceList();
      } catch {
        Modal.error({ content: `更新失败，请检查设备连接状态`, okText: "关闭" });
      }
    };

    const openChangeDeviceModel = (id: string) => {
      initValue.value = "";
      currentId.value = id;
      deviceVisible.value = true;
    };

    const submitDevice = async () => {
      await TableRecordUpdate({ deviceId: currentId.value, initValue: initValue.value });
      message.success("操作成功");
      await getDeviceList();
      deviceVisible.value = false;
    };

    const openParentDeviceModel = async (record: Record<string, unknown>) => {
      const { data } = (await getParentList(record.id, record.instrumentType)) as { data: unknown[] };
      parentDeviceList.value = data;
      parentDevice.value.parentId = record.parentId === "" ? undefined : (record.parentId as string);
      parentDevice.value.id = String(record.id);
      parentDeviceVisible.value = true;
    };

    const submitParentDevice = async () => {
      await setParentDevice({ id: parentDevice.value.id, parentId: parentDevice.value.parentId });
      parentDeviceVisible.value = false;
      message.success("操作成功");
      await getDeviceList();
    };

    const batchUpdateReading = async () => {
      if (selectedRowKeysData.value.length > 0) {
        const ids = selectedRowKeysData.value.map((x) => x.id).join(",");
        await meterDeviceBatchUpdate(ids);
        await getDeviceList();
        message.success("操作成功");
      } else {
        message.warning("请选择要更新的设备！");
      }
    };

    const batchDeleteData = async () => {
      const ids = selectedRowKeysData.value.map((x) => x.deviceId);
      await batchDelete(ids as string[]);
      selectedRowKeysData.value = [];
      await getDeviceList();
    };

    const closeModal = async (data: unknown[], selectAll: boolean, searchFormObj: Record<string, unknown>) => {
      searchAssociated.visible = false;
      if (selectAll) {
        associatedLoading.value = true;
        try {
          const client = await getDeviceCenterClient();
          const obj = { ...searchFormObj, pageNumber: 1, pageSize: 100 };
          const first = (await client.getIotDeviceList(obj)) as { total: number; records: Array<Record<string, unknown>> };
          const page = Math.ceil((first.total - 100) / 100);
          let list: Array<Record<string, unknown>> = [];
          for (let i = 1; i <= page + 1; i++) {
            obj.pageNumber = i;
            const pageRes = (await client.getIotDeviceList(obj)) as { records: Array<Record<string, unknown>> };
            list = list.concat(pageRes.records);
          }
          const deviceInfo = list.map((item) => mapDevice(item));
          instrumentOptions.value = deviceInfo;
          deviceForm.instrument = deviceInfo.map((x) => String(x.deviceId));
        } finally {
          associatedLoading.value = false;
        }
        return;
      }
      if (!data || data.length === 0) return;
      const deviceInfo = (data as Array<Record<string, unknown>>).map((item) => mapDevice(item));
      instrumentOptions.value = deviceInfo;
      deviceForm.instrument = deviceInfo.map((x) => String(x.deviceId));
    };

    const mapDevice = (item: Record<string, unknown>) => {
      const productInfo = item.productInfo as Record<string, unknown> | undefined;
      const area = item.area as Record<string, unknown> | undefined;
      const status = item.status as Record<string, unknown> | undefined;
      const productCategory = productInfo?.productCategory as Record<string, unknown> | undefined;
      return {
        deviceName: item.name,
        deviceId: item.id,
        code: item.code,
        areaId: area ? area.pathId : "",
        areaName: area ? area.pathName : "",
        brandName: productInfo?.brandName,
        thirdPartyId: item.thirdPartyId,
        deviceProdCategoryCode: productCategory?.code,
        deviceProdCategoryCodeConcat: productCategory?.pathCode,
        deviceStatus: status?.onlineState,
        deviceProdCategoryName: productCategory?.name,
        deviceProdId: productInfo?.id,
        deviceProdName: productInfo?.name,
        lntAndLat: item.lntAndLat,
      };
    };

    const submitAssociated = () => {
      formRef.value?.validate().then(async () => {
        associatedLoading.value = true;
        try {
          const params = instrumentOptions.value.map((item) => ({
            instrumentType: deviceForm.instrumentType,
            deviceId: item.deviceId,
            deviceName: item.deviceName,
            deviceArea: item.areaName,
            deviceAreaId: item.areaId,
            productBrandName: item.brandName,
            productName: item.deviceProdName,
            productCategoryName: item.deviceProdCategoryName,
            productId: item.deviceProdId,
            productCategoryPathCode: item.deviceProdCategoryCodeConcat,
            code: item.code,
          }));
          await meterAdd(params);
          associatedVisible.value = false;
          await getDeviceList();
        } finally {
          associatedLoading.value = false;
        }
      });
    };

    let resizeObserver: ResizeObserver | undefined;
    const handleWindowResize = (): void => {
      void scrollHandle();
    };
    onMounted(async () => {
      window.addEventListener("resize", handleWindowResize);
      await scrollHandle();
      const contentTable = deviceListRef.value?.closest<HTMLElement>(".content-table");
      if (contentTable) {
        resizeObserver = new ResizeObserver(() => void scrollHandle());
        resizeObserver.observe(contentTable);
      }
      await getDeviceList();
      const { data } = (await ClassifySettingsPage()) as { data: { records: unknown[] } };
      instrumentTypeOptions.value = data.records;
      meterTypeList.value = data.records;
      const { data: areal } = (await areaList()) as { data: unknown[] };
      areaDataList.value = areal;
      await scrollHandle();
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleWindowResize);
      resizeObserver?.disconnect();
    });

    return () => (
      <div ref={deviceListRef} class="device-list">
        <div class="header">
          <Form layout="inline" model={queryState.state}>
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
            <FormItem label="所属区域">
              <Cascader
                v-model:value={queryState.state.deviceAreaId}
                options={areaDataList.value as never}
                fieldNames={{ label: "areaName", value: "id" }}
                changeOnSelect
                placeholder="请选择区域"
              />
            </FormItem>
            <FormItem>
              <Input placeholder="输入设备名称或编号搜索" v-model:value={queryState.state.keyword} />
            </FormItem>
            <FormItem>
              <Button
                type="primary"
                onClick={() => {
                  queryState.resetPage();
                  void getDeviceList();
                }}
              >
                查询
              </Button>
              <Button
                style="margin-left: 10px"
                onClick={() => {
                  queryState.update({ instrumentType: undefined, deviceAreaId: [], keyword: "" });
                  queryState.resetPage();
                  void getDeviceList();
                }}
              >
                重置
              </Button>
            </FormItem>
          </Form>
          <div>
            <Button type="primary" style="margin-left: 10px" onClick={() => void batchUpdateReading()}>
              批量更新读数
            </Button>
            <Button
              type="primary"
              style="margin-left: 10px"
              onClick={() => {
                associatedVisible.value = true;
                formRef.value?.resetFields();
              }}
            >
              关联设备
            </Button>
          </div>
        </div>
        <Table
          class="device-list-table"
          dataSource={tableList.value}
          columns={deviceColumns}
          pagination={false}
          size="small"
          scroll={{ y: scrollY.value }}
          rowSelection={{
            selectedRowKeys: selectedRowKeysData.value.map((x) => String(x.deviceId ?? x.id)),
            onChange: (_keys: (string | number)[], selectedRows: Array<Record<string, unknown>>) => {
              selectedRowKeysData.value = selectedRows;
            },
          }}
          loading={deviceLoading.value}
        />
        <div ref={footerRef} class="footer">
          <div>
            <span class="mr-10">已选{listLength.value.length}项</span>
            {listLength.value.length > 0 ? (
              <PopConfirm title="你确定删除当前数据?" ok-text="确定" cancel-text="取消" onConfirm={() => void batchDeleteData()}>
                <Button type="primary" danger>
                  批量删除
                </Button>
              </PopConfirm>
            ) : null}
          </div>
          <Pagination
            v-model:current={queryState.state.pageNumber}
            v-model:pageSize={queryState.state.pageSize}
            showSizeChanger
            total={queryState.state.total}
            showTotal={(total: number) => `共 ${total} 条 第${queryState.state.pageNumber}/${queryState.state.pages}页`}
            onChange={(current: number, pageSize: number) => {
              queryState.setPage(current || 1, pageSize);
              void getDeviceList();
            }}
          />
        </div>
        <Modal
          v-model:visible={associatedVisible.value}
          confirmLoading={associatedLoading.value}
          onOk={submitAssociated}
          onCancel={() => {
            associatedVisible.value = false;
            formRef.value?.resetFields();
          }}
          title="关联设备"
        >
          <Form ref={formRef} model={deviceForm} rules={deviceRules as never}>
            <FormItem label="仪表类型" name="instrumentType">
              <Select
                v-model:value={deviceForm.instrumentType}
                placeholder="请输入"
                options={instrumentTypeOptions.value as never}
                allowClear
                fieldNames={{ label: "categoryName", value: "categoryCode" }}
              />
            </FormItem>
            <FormItem label="选择仪表" name="instrument">
              <div style="display: flex">
                <Select
                  mode="multiple"
                  v-model:value={deviceForm.instrument}
                  maxTagCount={3}
                  options={instrumentOptions.value as never}
                  placeholder="请选择"
                  fieldNames={{ label: "deviceName", value: "deviceId" }}
                  open={false}
                  showArrow={false}
                  onChange={(value) => {
                    const ids = (Array.isArray(value) ? value : value != null ? [value] : []).map(String);
                    instrumentOptions.value = instrumentOptions.value.filter((x) => ids.includes(String(x.deviceId)));
                  }}
                />
                <Button type="primary" onClick={() => (searchAssociated.visible = true)}>
                  请选择
                </Button>
              </div>
            </FormItem>
          </Form>
          {searchAssociated.visible ? <AssociationModal visible={searchAssociated.visible} onClose={closeModal} /> : null}
        </Modal>
        <Modal v-model:visible={deviceVisible.value} onOk={() => void submitDevice()}>
          <div style="margin-top: 40px; display: flex; align-items: center">
            <div style="width: 100px">初始读数：</div>
            <Input placeholder="请输入新仪表的初始读数" type="number" v-model:value={initValue.value} />
          </div>
        </Modal>
        <Modal v-model:visible={parentDeviceVisible.value} onOk={() => void submitParentDevice()}>
          <div style="margin-top: 40px; display: flex; align-items: center">
            <div style="width: 100px">选择设备：</div>
            <Select
              style="width: 400px"
              showSearch
              v-model:value={parentDevice.value.parentId}
              options={parentDeviceList.value as never}
              allowClear
              optionFilterProp="deviceName"
              placeholder="请选择"
              fieldNames={{ label: "deviceName", value: "deviceId" }}
            />
          </div>
        </Modal>
      </div>
    );
  },
});
