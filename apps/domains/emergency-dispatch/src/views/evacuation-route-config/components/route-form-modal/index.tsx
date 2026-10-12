// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent } from "vue";

import type { EvacuationModalBindings } from "../../../evacuation-shared/types/modal-bindings";
import { Button, Input, Modal, Select, Space } from "@/pc-ui-runtime";

const priorityOptions = [
  { label: "🔴 高 — 主疏散路线", value: "高" },
  { label: "🟡 中 — 备用路线", value: "中" },
  { label: "🟢 低 — 辅助路线", value: "低" },
];

export const RouteFormModal = defineComponent({
  name: "RouteFormModal",
  props: {
    state: { type: Object as () => EvacuationModalBindings, required: true },
  },
  setup(props) {
    const saving = computed(() => props.state.routeSaving?.value ?? false);

    return (): JSX.Element => (
      <Modal
        open={props.state.routeModalOpen.value}
        title={props.state.routeModalTitle.value}
        footer={null}
        onCancel={() => props.state.closeRouteModal()}
        width={420}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563" }}>路线名称</label>
            <Input
              placeholder="如：1号楼主疏散路线"
              value={props.state.routeForm.name}
              onUpdate:value={(v: string) => {
                props.state.routeForm.name = v;
              }}
              style={{ marginTop: "4px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563" }}>容量（人）</label>
            <Input
              type="number"
              min={1}
              placeholder="如：200"
              value={String(props.state.routeForm.capacity)}
              onUpdate:value={(v: string) => {
                props.state.routeForm.capacity = Number(v) || 0;
              }}
              style={{ marginTop: "4px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563" }}>优先级</label>
            <Select
              options={priorityOptions}
              value={props.state.routeForm.priority}
              onUpdate:value={(v: string) => {
                props.state.routeForm.priority = v as "高" | "中" | "低";
              }}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </div>
        </div>
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
          <Space>
            <Button onClick={() => props.state.closeRouteModal()} disabled={saving.value}>
              取消
            </Button>
            <Button type="primary" loading={saving.value} onClick={() => void props.state.confirmRouteModal()}>
              确认
            </Button>
          </Space>
        </div>
      </Modal>
    );
  },
});
