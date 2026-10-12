// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent } from "vue";

import type { EvacuationRouteState } from "../../composables/use-evacuation-route-state";
import type { RoutePriority } from "../../evacuation-shared/data/types";
import { Button, Table, Tag, type ColumnType } from "@/pc-ui-runtime";

import "./index.less";

function priorityTag(priority: RoutePriority): JSX.Element {
  if (priority === "高") {
    return <Tag color="error">{priority}</Tag>;
  }
  if (priority === "低") {
    return <Tag color="success">{priority}</Tag>;
  }
  return <Tag color="warning">{priority}</Tag>;
}

export const RouteListTable = defineComponent({
  name: "RouteListTable",
  props: {
    state: { type: Object as () => EvacuationRouteState, required: true },
  },
  setup(props) {
    const busy = computed(() => props.state.routesLoading.value);

    const columns: ColumnType[] = [
      {
        title: "#",
        dataIndex: "color",
        width: 48,
        customRender: ({ record }: { record: { color: string } }) => (
          <span class="route-list-table__color-dot" style={{ background: record.color }} />
        ),
      },
      { title: "路线名称", dataIndex: "name", ellipsis: true },
      {
        title: "容量（人）",
        dataIndex: "capacity",
        width: 100,
        customRender: ({ text }: { text: number }) => `${text}人`,
      },
      {
        title: "优先级",
        dataIndex: "priority",
        width: 88,
        customRender: ({ text }: { text: RoutePriority }) => priorityTag(text),
      },
      {
        title: "节点",
        dataIndex: "pointCount",
        width: 72,
        customRender: ({ text }: { text: number }) => <span style={{ color: "#9ca3af" }}>{text}个</span>,
      },
      {
        title: "监控",
        dataIndex: "camCount",
        width: 100,
        customRender: ({ record }: { record: { index: number; camCount: number; camNames: string } }) =>
          record.camCount > 0 ? (
            <span class="route-list-table__cam-link" title={record.camNames} onClick={() => props.state.openCameraBindModal(record.index)}>
              📹 {record.camCount}台
            </span>
          ) : (
            <Button type="link" size="small" style={{ color: "#9ca3af" }} onClick={() => props.state.openCameraBindModal(record.index)}>
              📹 绑定
            </Button>
          ),
      },
      {
        title: "操作",
        dataIndex: "actions",
        width: 140,
        customRender: ({ record }: { record: { index: number } }) => (
          <span>
            <Button type="link" size="small" disabled={busy.value} onClick={() => props.state.openEditRouteModal(record.index)}>
              编辑
            </Button>
            <Button type="link" size="small" danger disabled={busy.value} onClick={() => void props.state.deleteRoute(record.index)}>
              删除
            </Button>
          </span>
        ),
      },
    ];

    return (): JSX.Element => {
      const dataSource = props.state.routes.value.map((r, index) => ({
        key: r.id,
        index,
        color: r.color,
        name: r.name,
        capacity: r.capacity,
        priority: r.priority,
        pointCount: r.points.length,
        camCount: r.boundCameras.length,
        camNames: r.boundCameras.map((c) => c.name).join("\n"),
      }));

      return (
        <div class="route-list-table">
          <div class="route-list-table__head">
            <span class="route-list-table__title">📋 路线列表</span>
            <Button type="primary" size="small" disabled={busy.value} onClick={() => props.state.openSaveRouteModal()}>
              + 保存路线
            </Button>
          </div>
          <div class="route-list-table__body">
            <Table
              size="small"
              loading={busy.value}
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              locale={{ emptyText: "暂无路线，请先在地图上标注" }}
            />
          </div>
        </div>
      );
    };
  },
});
