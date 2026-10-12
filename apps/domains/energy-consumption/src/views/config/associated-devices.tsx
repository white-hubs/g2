import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AssociationModal from "./association-modal";
import { AreaReferDevice, AreaReferDeviceById, DeviceList, SubItemReferDevice, SubItemReferDeviceById } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, InputNumber, Pagination, Popconfirm, Table, message } from "@/pc-ui-runtime";

type DeviceRow = {
  id: string;
  code: string;
  deviceName: string;
  deviceArea?: string;
  deviceAreaName?: string;
  deviceAreaId?: string;
  shareNum?: number;
  projectId?: string;
  deviceId?: string;
  deviceType?: string;
  parentId?: string;
};

export const AssociatedDevices = defineComponent({
  name: "AssociatedDevices",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const dataSource = ref<DeviceRow[]>([]);
    const totalDevice = ref<DeviceRow[]>([]);
    const loading = ref(false);
    const associatedModel = reactive({ visible: false });
    const pagination = reactive({
      total: 0,
      pages: 1,
      pageSize: 10,
      current: 1,
    });

    const deviceColumns = computed(() => [
      {
        title: "设备编号",
        dataIndex: "code",
        ellipsis: true,
        customRender: ({ text }: { text: string }) => text,
      },
      {
        title: "当前关联设备名称",
        dataIndex: "deviceName",
        ellipsis: true,
        customRender: ({ text }: { text: string }) => text,
      },
      {
        title: "设备所在区域",
        dataIndex: "deviceArea",
        ellipsis: true,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        title: "分摊比例",
        dataIndex: "shareNum",
        ellipsis: true,
        customRender: ({ record }: { record: DeviceRow }) => (
          <InputNumber
            value={record.shareNum}
            onUpdate:value={(v) => {
              record.shareNum = v == null || v === "" ? undefined : Number(v);
            }}
          />
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        ellipsis: true,
        width: "140px",
        customRender: ({ record }: { record: DeviceRow }) => (
          <Popconfirm title="你确定删除当前数据?" okText="确定" cancelText="取消" onConfirm={() => deletedata(record)}>
            <a class="ml-10px color-red">移除</a>
          </Popconfirm>
        ),
      },
    ]);

    const pageChange = (current: number, pageSize: number) => {
      pagination.current = current;
      pagination.pageSize = pageSize;
      pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
      dataSource.value = totalDevice.value.slice(
        pagination.current * pagination.pageSize - pagination.pageSize,
        pagination.current * pagination.pageSize,
      );
    };

    const deletedata = (record: DeviceRow) => {
      totalDevice.value = totalDevice.value.filter((item) => item.id !== record.id);
      dataSource.value = totalDevice.value.slice(
        pagination.current * pagination.pageSize - pagination.pageSize,
        pagination.current * pagination.pageSize,
      );
      if (dataSource.value.length === 0 && pagination.current !== 1) {
        dataSource.value = totalDevice.value.slice(0, pagination.pageSize);
        pagination.current = 1;
      }
      pagination.total = totalDevice.value.length;
      pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
    };

    const goBack = () => {
      router.back();
    };

    const submit = async () => {
      const page = String(route.query.page ?? "");
      const id = String(route.query.id ?? "");
      if (page === "sub-item") {
        loading.value = true;
        const list = totalDevice.value.map((item) => ({
          bindType: "ITEM",
          projectId: item.projectId,
          shareNum: item.shareNum,
          deviceId: item.deviceId,
          deviceAreaId: item.deviceAreaId,
          deviceArea: item.deviceArea,
          deviceName: item.deviceName,
          deviceType: item.deviceType,
          code: item.code,
          parentId: item.parentId,
        }));
        await SubItemReferDevice(id, list);
        loading.value = false;
        message.success("操作成功");
        goBack();
      } else if (page === "area") {
        loading.value = true;
        const list = totalDevice.value.map((item) => ({
          bindType: "AREA",
          projectId: item.projectId,
          shareNum: item.shareNum,
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          deviceArea: item.deviceAreaName,
          deviceType: item.deviceType,
          code: item.code,
          parentId: item.parentId,
        }));
        await AreaReferDevice(id, list);
        loading.value = false;
        message.success("操作成功");
        goBack();
      } else {
        goBack();
      }
    };

    const closeModal = async (
      data: DeviceRow[],
      selectAll: boolean,
      searchForm: {
        keyword: string;
        instrumentType: string;
        deviceAreaId: string;
        total: number;
      },
    ) => {
      associatedModel.visible = false;
      if (selectAll) {
        const total = searchForm.total;
        const list: DeviceRow[] = [];
        const pageNum = Math.ceil(total / 999);
        for (let i = 1; i <= pageNum; i++) {
          const { data: pageData } = await DeviceList({
            pageNumber: i,
            pageSize: 999,
            keyword: searchForm.keyword,
            instrumentType: searchForm.instrumentType,
            deviceAreaId: searchForm.deviceAreaId || "",
          });
          list.push(...((pageData as { records: DeviceRow[] }).records ?? []));
        }
        const ids = list.map((x) => x.code);
        const isExist = totalDevice.value.length > 0 ? totalDevice.value.some((x) => ids.some((i) => i === x.code)) : false;
        if (isExist) {
          message.error("设备已存在");
          return;
        }
        totalDevice.value = totalDevice.value.concat(list);
        pagination.total = totalDevice.value.length;
        pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
        dataSource.value = totalDevice.value.slice(0, pagination.pageSize);
        return;
      }
      if (!data || data.length === 0) return;
      const ids = data.map((x) => x.code);
      const isExist = totalDevice.value.length > 0 ? totalDevice.value.some((x) => ids.some((i) => i === x.code)) : false;
      if (isExist) {
        message.error("设备已存在");
        return;
      }
      totalDevice.value = totalDevice.value.length > 0 ? totalDevice.value.concat(data) : data;
      dataSource.value = totalDevice.value.slice(0, pagination.pageSize);
      pagination.total = totalDevice.value.length;
      pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
    };

    onMounted(async () => {
      // 对齐旧页：按区域/分项 ID 拉取已关联设备；设备中心检索走能耗 DeviceList（非 cube SDK）
      if (route.query.page === "area") {
        const { data } = await AreaReferDeviceById(String(route.query.id));
        totalDevice.value = (data as DeviceRow[]) ?? [];
        dataSource.value = totalDevice.value.slice(0, pagination.pageSize);
        pagination.total = totalDevice.value.length;
        pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
      }
      if (route.query.page === "sub-item") {
        const { data } = await SubItemReferDeviceById(String(route.query.id));
        totalDevice.value = (data as DeviceRow[]) ?? [];
        dataSource.value = totalDevice.value.slice(0, pagination.pageSize);
        pagination.total = totalDevice.value.length;
        pagination.pages = Math.ceil(pagination.total / pagination.pageSize) || 1;
      }
    });

    return () => (
      <GLayout
        showFooter
        title="关联设备"
        v-slots={{
          "content-table": () => (
            <>
              <div>
                <span>{route.query.page === "sub-item" ? "分项名称：" : "区域名称："}</span>
                {String(route.query.name ?? "--")}
              </div>
              <div>
                <Button
                  type="primary"
                  style={{ margin: "10px 0" }}
                  onClick={() => {
                    associatedModel.visible = true;
                  }}
                >
                  添加
                </Button>
              </div>
              <Table columns={deviceColumns.value} dataSource={dataSource.value} rowKey="code" pagination={false} />
              <Pagination
                style={{ float: "right", marginTop: "20px" }}
                current={pagination.current}
                pageSize={pagination.pageSize}
                showSizeChanger
                total={pagination.total}
                showTotal={(total: number) => `共 ${total} 条 第${pagination.current}/${pagination.pages}页`}
                onChange={pageChange}
              />
            </>
          ),
          "footer-page": () => (
            <>
              <Button onClick={goBack} class="mr-15px">
                返回
              </Button>
              <Button type="primary" loading={loading.value} onClick={() => void submit()}>
                保存
              </Button>
            </>
          ),
          default: () =>
            associatedModel.visible ? (
              <AssociationModal
                visible={associatedModel.visible}
                onClose={(data: DeviceRow[], selectAll: boolean, searchForm: never) => void closeModal(data, selectAll, searchForm)}
              />
            ) : null,
        }}
      />
    );
  },
});

export default AssociatedDevices;
