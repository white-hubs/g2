import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { ReadRecordPage, TableRecordPage } from "@/api";
import { unwrapList, unwrapPage } from "@/api/unwrap";
import { getDeviceCenterClient } from "@/domain-context";
import { Button, Pagination, Table } from "@/pc-ui-runtime";
import { timeFormat } from "@/utils/common";

import "./detail-tabs.less";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

export const ReadingRecord = defineComponent({
  name: "ReadingRecord",
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const scrollY = ref(200);
    const tableList = ref([]);
    const params = reactive({ total: 0, pageSize: 10, pageNumber: 1 });
    const columns = [
      { title: "采集时间", dataIndex: "curDateTime", key: "curDateTime", ellipsis: true, align: "center" as const },
      {
        title: "设备读数",
        dataIndex: "readValue",
        key: "readValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
      {
        title: "本期用量",
        dataIndex: "usage",
        key: "usage",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
      {
        title: "采集方式",
        dataIndex: "collectType",
        key: "collectType",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => (text === "auto" ? "自动" : "手动"),
      },
    ];

    const getTableData = async () => {
      loading.value = true;
      try {
        const { data } = (await ReadRecordPage({ ...params, deviceIds: route.query.deviceId })) as {
          data: { records: never[]; total: number };
        };
        tableList.value = data.records;
        params.total = data.total;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      const clientHeight = document.querySelector("#tabs")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 160;
      window.addEventListener("resize", () => {
        const h = document.querySelector("#tabs")?.clientHeight;
        if (h) scrollY.value = h - 160;
      });
      void getTableData();
    });

    return () => (
      <div id="myTable">
        <Table
          dataSource={tableList.value}
          columns={columns}
          pagination={false}
          loading={loading.value}
          scroll={{ y: scrollY.value }}
          size="small"
          rowKey="deviceId"
        />
        <div style="float: right;margin: 20px 0px;">
          <Button
            style="margin-right: 10px;"
            disabled={params.pageNumber === 1}
            onClick={() => {
              params.pageNumber -= 1;
              void getTableData();
            }}
          >
            上一页
          </Button>
          <Button
            type="primary"
            disabled={tableList.value.length < 10}
            onClick={() => {
              params.pageNumber += 1;
              void getTableData();
            }}
          >
            下一页
          </Button>
        </div>
      </div>
    );
  },
});

export const HistoryRecord = defineComponent({
  name: "HistoryRecord",
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const scrollY = ref(200);
    const tableList = ref([]);
    const params = reactive({ deviceId: "", total: 0, pages: 1, pageSize: 10, pageNumber: 1 });
    const columns = [
      {
        title: "更换时间",
        dataIndex: "optTime",
        key: "optTime",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => timeFormat(text, true),
      },
      {
        title: "操作人",
        dataIndex: "optUserName",
        key: "optUserName",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
      {
        title: "仪表初始读数",
        dataIndex: "initValue",
        key: "initValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
      {
        title: "仪表最新读数",
        dataIndex: "changedDeviceValue",
        key: "changedDeviceValue",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
    ];

    const getTableData = async () => {
      params.deviceId = String(route.query.deviceId || "");
      loading.value = true;
      try {
        const { data } = (await TableRecordPage({ ...params })) as {
          data: { records: never[]; total: number; pages: number };
        };
        tableList.value = data.records;
        params.total = data.total;
        params.pages = data.pages;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      const clientHeight = document.querySelector("#tabs")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 160;
      void getTableData();
    });

    return () => (
      <div id="myTable">
        <Table
          dataSource={tableList.value}
          columns={columns}
          pagination={false}
          loading={loading.value}
          scroll={{ y: scrollY.value }}
          size="small"
          rowKey="deviceId"
        />
        <div style="float: right;margin: 20px 0px;">
          <Pagination
            v-model:current={params.pageNumber}
            v-model:pageSize={params.pageSize}
            showSizeChanger
            showTotal={(total: number) => `共 ${total} 条 第${params.pageNumber}/${params.pages}页`}
            total={params.total}
            onChange={(current: number, pageSize: number) => {
              params.pageNumber = current;
              params.pageSize = pageSize;
              void getTableData();
            }}
          />
        </div>
      </div>
    );
  },
});

export const OperateNote = defineComponent({
  name: "OperateNote",
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const scrollY = ref(200);
    const tableList = ref<unknown[]>([]);
    const params = reactive({ deviceId: "", total: 0, pages: 1, pageSize: 10, pageNumber: 1 });
    const executeResultOptions = [
      { value: "ARRIVAL", label: "命令送达给物联网平台" },
      { value: "ISSUING", label: "下发中" },
      { value: "SUCCESS", label: "成功" },
      { value: "FAIL", label: "失败" },
      { value: "EXPIRED", label: "超时" },
    ];
    const columns = [
      { title: "操作时间", dataIndex: "createTime", key: "createTime", ellipsis: true, align: "center" as const },
      {
        title: "操作人",
        dataIndex: "createBy",
        key: "createBy",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text ?? "--",
      },
      {
        title: "操作内容",
        dataIndex: "content",
        key: "content",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ record }: { record: { originalValue?: { name: string; value: string }; expectedValue?: { value: string } } }) => {
          if (record.originalValue) {
            return `${record.originalValue.name}从【${record.originalValue.value}】调整为【${record.expectedValue?.value}】`;
          }
          return "--";
        },
      },
      {
        title: "备注",
        dataIndex: "executeResult",
        key: "executeResult",
        ellipsis: true,
        align: "center" as const,
        customRender: ({ text }: { text: string }) => {
          const curState = executeResultOptions.find((e) => e.value === text || e.value.includes(text));
          return curState?.label ? curState.label : "--";
        },
      },
    ];

    const getTableData = async () => {
      // 旧仓传 query.id；属性变更日志实际按 IoT deviceInstanceId，优先 deviceId
      params.deviceId = String(route.query.deviceId || route.query.id || "");
      loading.value = true;
      try {
        const client = await getDeviceCenterClient();
        const page = unwrapPage(
          await client.getDeviceLogPage({
            deviceInstanceId: params.deviceId,
            pageNumber: params.pageNumber,
            pageSize: params.pageSize,
          }),
        );
        tableList.value = page.records;
        params.total = page.total;
        params.pages = page.pages || 1;
      } catch {
        tableList.value = [];
        params.total = 0;
        params.pages = 1;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      const clientHeight = document.querySelector("#tabs")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 160;
      void getTableData();
    });

    return () => (
      <div>
        <Table
          dataSource={tableList.value}
          columns={columns}
          pagination={false}
          loading={loading.value}
          size="small"
          scroll={{ y: scrollY.value }}
          rowKey="deviceId"
        />
        <div style="float: right;margin: 20px 0px;">
          <Pagination
            v-model:current={params.pageNumber}
            v-model:pageSize={params.pageSize}
            showSizeChanger
            showTotal={(total: number) => `共 ${total} 条 第${params.pageNumber}/${params.pages}页`}
            total={params.total}
            onChange={(current: number, pageSize: number) => {
              params.pageNumber = current;
              params.pageSize = pageSize;
              void getTableData();
            }}
          />
        </div>
      </div>
    );
  },
});

export const AssociatedMonitoring = defineComponent({
  name: "AssociatedMonitoring",
  setup() {
    const route = useRoute();
    const deviceDataVideos = ref<Array<{ name: string; id: string; token?: string; thirdPartyId?: string }>>([]);

    onMounted(async () => {
      const deviceId = String(route.query.deviceId || "");
      if (!deviceId) return;
      try {
        const client = await getDeviceCenterClient();
        deviceDataVideos.value = unwrapList(await client.getDeviceAssociatedVideos(deviceId)) as typeof deviceDataVideos.value;
      } catch {
        deviceDataVideos.value = [];
      }
    });

    return () =>
      deviceDataVideos.value?.length > 0 ? (
        <div class="tab-pane-content gvideo-box">
          {deviceDataVideos.value.map((item) => (
            <div key={item.id}>
              <span class="gvideo-title">{item.name}</span>
              <CubePlayer class="gvideo" deviceId={item.id} control />
            </div>
          ))}
        </div>
      ) : (
        <div>暂无关联监控</div>
      );
  },
});
