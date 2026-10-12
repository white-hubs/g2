import type { Cell } from "@antv/x6";
import { Button, Input, PopConfirm, message } from "@g2-platform/pc-ui";
import { defineComponent, computed, ref, watch, type PropType, inject, onUnmounted } from "vue";

import type { DeviceBinding } from "../types";
import { fitNodeLabel } from "../utils/fit-node-label";
import { DeviceBindModal } from "./device-bind-modal";

import "./electrical-property-panel.css";

/**
 * 电气属性面板组件
 */
export const ElectricalPropertyPanel = defineComponent({
  name: "ElectricalPropertyPanel",
  props: {
    selectedCells: {
      type: Array as PropType<Cell[]>,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    "update:property": (cellId: string, property: string, value: any) => true,
    "bind:device": (cellId: string, deviceBinding: DeviceBinding) => true,
  },
  setup(props, { emit }) {
    let graph = inject("graph") as any;

    let firstCell = computed(() => (props.selectedCells.length > 0 ? props.selectedCells[0] : null));

    let hasSelection = computed(() => props.selectedCells.length > 0);

    // 本地表单状态，避免直接依赖 Cell.getData() 造成输入不同步
    let nodeName = ref("");
    let nodeType = ref("");
    let parentNode = ref("");
    let location = ref("");

    let getNodeName = (node: any) => {
      if (!node) return "";
      let data = node.getData?.() || {};
      if (typeof data.nodeName === "string" && data.nodeName) {
        return data.nodeName;
      }
      let attrs = node.getAttrs?.() || {};
      let label = (attrs as any).label || {};
      if (label.textWrap && typeof label.textWrap.text === "string") {
        return label.textWrap.text;
      }
      if (typeof label.text === "string") {
        return label.text;
      }
      return "";
    };

    let computeParentNodeNames = (cell: any) => {
      if (!cell || !cell.isNode || !cell.isNode()) {
        return "";
      }
      if (!graph || !graph.value) {
        let data = cell.getData?.() || {};
        return data.parentNode || "";
      }
      let incomingEdges = graph.value.getIncomingEdges(cell) || [];
      let names = [];
      for (let i = 0; i < incomingEdges.length; i++) {
        let edge = incomingEdges[i];
        let fromId = edge.getSourceCellId?.() || edge.getSource?.()?.cell || edge.getData?.()?.from;
        if (!fromId) continue;
        let fromNode = graph.value.getCellById(fromId);
        names.push(getNodeName(fromNode) || fromId);
      }
      return names.join("、");
    };

    let refreshForm = (cell: any) => {
      if (!cell || !cell.isNode || !cell.isNode()) {
        nodeName.value = "";
        nodeType.value = "";
        parentNode.value = "";
        location.value = "";
        return;
      }
      let data = (cell.getData() || {}) as any;
      let attrs = cell.getAttrs() || {};
      nodeName.value = data.nodeName || (attrs as any).label?.textWrap?.text || (attrs as any).label?.text || data.name || "";
      nodeType.value = data.nodeType || data.elementId || "";
      parentNode.value = computeParentNodeNames(cell) || data.parentNode || "";
      location.value = data.location || "";
    };

    // 当选中节点变化时，同步表单初始值
    watch(
      firstCell,
      (cell) => {
        refreshForm(cell);
      },
      { immediate: true },
    );

    // 监听连线变化，实时刷新“上一级节点”展示（选中节点不变时也能更新）
    let cleanup: any = null;
    watch(
      () => graph && graph.value,
      (g) => {
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
        if (!g) {
          return;
        }
        let handler = () => refreshForm(firstCell.value);
        g.on("edge:connected", handler);
        g.on("edge:added", handler);
        g.on("edge:removed", handler);
        cleanup = () => {
          g.off("edge:connected", handler);
          g.off("edge:added", handler);
          g.off("edge:removed", handler);
        };
      },
      { immediate: true },
    );
    onUnmounted(() => {
      if (cleanup) cleanup();
    });

    let deviceBindingsVersion = ref(0);

    let getNodeDeviceBindings = (data: any): Record<string, DeviceBinding> => {
      if (data?.deviceBindings && typeof data.deviceBindings === "object") {
        return data.deviceBindings as Record<string, DeviceBinding>;
      }
      let nextBindings: Record<string, DeviceBinding> = {};
      if (Array.isArray(data?.relatedDevices)) {
        for (const item of data.relatedDevices) {
          if (!item?.id) {
            continue;
          }
          nextBindings[item.id] = {
            deviceId: item.id,
            deviceName: item.name || item.id,
            deviceType: "",
            position: item.position || "",
          } as DeviceBinding;
        }
      }
      if (Object.keys(nextBindings).length > 0) {
        return nextBindings;
      }
      if (data?.deviceBinding?.deviceId) {
        return {
          [data.deviceBinding.deviceId]: data.deviceBinding as DeviceBinding,
        };
      }
      if (typeof data?.deviceId === "string" && data.deviceId) {
        return {
          [data.deviceId]: {
            deviceId: data.deviceId,
            deviceName: data.deviceName || data.deviceId,
            deviceType: "",
            position: data.position || "",
          } as DeviceBinding,
        };
      }
      return {};
    };

    let relatedDevices = computed(() => {
      const _v = deviceBindingsVersion.value;
      let cell = firstCell.value;
      if (!cell) {
        return [];
      }
      let data = cell.getData() || {};
      let bindings = getNodeDeviceBindings(data as any);
      if (Object.keys(bindings).length > 0) {
        let list: { id: string; name: string; position: string }[] = [];
        for (let key in bindings) {
          let b = bindings[key];
          list.push({
            id: b.deviceId,
            name: b.deviceName,
            position: (b as any).position || "",
          });
        }
        return list;
      }
      if (Array.isArray((data as any).relatedDevices)) {
        return (data as any).relatedDevices as {
          id: string;
          name: string;
          position: string;
        }[];
      }
      return [];
    });

    let updateNodeField = (field: string, value: string) => {
      let cell = firstCell.value;
      if (!cell || !cell.isNode()) {
        return;
      }
      let text = value || "";
      if (field === "name" && text.length > 20) {
        text = text.slice(0, 20);
        nodeName.value = text;
      }
      let data = cell.getData() || {};
      let nextData: any = {
        ...data,
      };
      if (field === "name") {
        nextData.nodeName = text;
        let attrs = cell.getAttrs() || {};
        let hasIcon = !!(attrs as any).icon;
        let labelAttrs: any = (attrs as any).label || {};
        let nextLabelAttrs: any = {
          ...labelAttrs,
        };
        if (hasIcon) {
          let width = cell.size?.().width || 230;
          let height = cell.size?.().height || 40;
          let textAreaCenterX = Math.round(44 + (width - 52) / 2);

          nextLabelAttrs.text = text;
          nextLabelAttrs.refX = 0;
          nextLabelAttrs.refY = 0;
          nextLabelAttrs.x = textAreaCenterX;
          nextLabelAttrs.y = Math.round(height / 2);
          nextLabelAttrs.textAnchor = "middle";
          nextLabelAttrs.textVerticalAnchor = "middle";
          delete nextLabelAttrs.ref;
          delete nextLabelAttrs.textWrap;
        } else {
          nextLabelAttrs.textWrap = {
            ...labelAttrs.textWrap,
            text,
            width: -2,
            height: -2,
            ellipsis: false,
            breakWord: true,
          };
          nextLabelAttrs.ref = (attrs as any).labelBox ? "labelBox" : nextLabelAttrs.ref || "body";
          nextLabelAttrs.refX = "50%";
          nextLabelAttrs.refY = "50%";
          nextLabelAttrs.textAnchor = "middle";
          nextLabelAttrs.textVerticalAnchor = "middle";
          delete nextLabelAttrs.x;
          delete nextLabelAttrs.y;
          delete nextLabelAttrs.text;
        }
        cell.setAttrs({
          ...attrs,
          label: nextLabelAttrs,
        });
      } else if (field === "type") {
        nextData.nodeType = text;
      } else if (field === "parent") {
        nextData.parentNode = text;
      } else if (field === "location") {
        nextData.location = text;
      }
      cell.setData(nextData, { overwrite: true });
      if (field === "name") {
        fitNodeLabel(cell as any);
      }
      emit("update:property", cell.id, field, text);
    };

    let deviceBindModalVisible = ref(false);

    let handleOpenBindDevice = () => {
      deviceBindModalVisible.value = true;
    };

    const MAX_BIND_DEVICE_COUNT = 20;

    let handleDeviceBindConfirm = (payload: { selectedIds: string[]; bindings: DeviceBinding[] }) => {
      let cell = firstCell.value;
      if (!cell) {
        return;
      }
      let data = cell.getData() || {};
      let currentBindings = getNodeDeviceBindings(data as any);
      let { selectedIds, bindings } = payload;
      if (selectedIds.length > MAX_BIND_DEVICE_COUNT) {
        message.warning(`最多只能关联 ${MAX_BIND_DEVICE_COUNT} 个设备，已为您保留前 ${MAX_BIND_DEVICE_COUNT} 个`);
      }
      let limitedSelectedIds = selectedIds.slice(0, MAX_BIND_DEVICE_COUNT);
      const bindingById = new Map(bindings.map((b) => [b.deviceId, b]));
      let nextBindings: Record<string, DeviceBinding> = {};
      for (const id of limitedSelectedIds) {
        const b = bindingById.get(id) ?? currentBindings[id];
        if (b) {
          nextBindings[id] = b;
        }
      }
      let nextRelatedDevices = Object.values(nextBindings).map((b) => ({
        id: b.deviceId,
        name: b.deviceName,
        position: (b as any).position ?? "",
      }));
      const firstBinding = Object.values(nextBindings)[0];
      let primary = firstBinding;
      let nextData: any = {
        ...data,
        relatedDevices: nextRelatedDevices,
        deviceBindings: nextBindings,
      };
      if (primary) {
        nextData.deviceId = primary.deviceId;
        nextData.deviceBinding = primary;
      } else {
        delete (nextData as any).deviceId;
        delete (nextData as any).deviceBinding;
      }
      cell.setData(nextData, { overwrite: true });
      deviceBindingsVersion.value++;
      if (Object.keys(nextBindings).length > 0) {
        emit("bind:device", cell.id, primary!);
      }
    };

    const handleClearDevices = () => {
      let cell = firstCell.value;
      if (!cell) {
        return;
      }
      let data = cell.getData() || {};
      let nextData: any = {
        ...data,
        relatedDevices: [],
      };
      delete (nextData as any).deviceBindings;
      delete (nextData as any).deviceId;
      delete (nextData as any).deviceBinding;
      cell.setData(nextData, { overwrite: true });
      deviceBindingsVersion.value++;
      emit("bind:device", cell.id, {} as any);
    };

    const handleRemoveDevice = (deviceId: string, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let cell = firstCell.value;
      if (!cell) {
        return;
      }
      let data = cell.getData() || {};
      let currentBindings = getNodeDeviceBindings(data as any);
      if (!currentBindings[deviceId]) {
        return;
      }
      let nextBindings: Record<string, DeviceBinding> = {};
      for (const [key, b] of Object.entries(currentBindings)) {
        if (key !== deviceId) {
          nextBindings[key] = b;
        }
      }
      let nextRelatedDevices = Object.values(nextBindings).map((b) => ({
        id: b.deviceId,
        name: b.deviceName,
        position: (b as any).position ?? "",
      }));
      let nextData: any = { ...data, relatedDevices: nextRelatedDevices };
      if (Object.keys(nextBindings).length === 0) {
        delete (nextData as any).deviceBindings;
        delete (nextData as any).deviceId;
        delete (nextData as any).deviceBinding;
      } else {
        nextData.deviceBindings = nextBindings;
        const firstBinding = Object.values(nextBindings)[0];
        nextData.deviceId = firstBinding.deviceId;
        nextData.deviceBinding = firstBinding;
      }
      cell.setData(nextData);
      deviceBindingsVersion.value += 1;
      if (Object.keys(nextBindings).length > 0) {
        emit("bind:device", cell.id, Object.values(nextBindings)[0]);
      } else {
        emit("bind:device", cell.id, {} as any);
      }
    };

    let selectedDeviceIds = computed(() => relatedDevices.value.map((d) => d.id));

    let handleDeleteNode = () => {
      let cell = firstCell.value;
      if (!cell || !cell.isNode || !cell.isNode()) {
        return;
      }
      if (graph && graph.value) {
        graph.value.removeCell(cell);
      }
    };

    return () => {
      if (!hasSelection.value) {
        return (
          <div class="electrical-property-panel">
            <div class="electrical-property-panel__empty">
              <p class="electrical-property-panel__empty-text">请选择节点</p>
              <p class="electrical-property-panel__empty-hint">点击画布中的节点以编辑节点属性</p>
            </div>
          </div>
        );
      }

      let cell = firstCell.value;
      if (!cell || !cell.isNode()) {
        return (
          <div class="electrical-property-panel">
            <div class="electrical-property-panel__empty">
              <p class="electrical-property-panel__empty-text">请选择节点</p>
              <p class="electrical-property-panel__empty-hint">当前仅支持节点属性编辑</p>
            </div>
          </div>
        );
      }

      return (
        <div class="electrical-property-panel electrical-property-panel--form">
          <div class="electrical-property-panel__scroll">
            <div class="property-section">
              <div class="property-field">
                <label>
                  <span class="property-label-required">*</span>
                  节点名称
                  <span class="property-label-hint"> 最多20字</span>
                </label>
                {props.readonly ? (
                  <Input value={nodeName.value} readonly />
                ) : (
                  <Input
                    value={nodeName.value}
                    maxlength={20}
                    onUpdate:value={(val: string) => {
                      nodeName.value = val || "";
                      updateNodeField("name", nodeName.value);
                    }}
                  />
                )}
              </div>

              <div class="property-field">
                <label>节点类型</label>
                <Input value={nodeType.value} readonly />
              </div>

              <div class="property-field">
                <label>上一级节点</label>
                <Input value={parentNode.value} readonly />
              </div>

              <div class="property-field">
                <label>所在位置</label>
                {props.readonly ? (
                  <Input value={location.value} readonly />
                ) : (
                  <Input
                    value={location.value}
                    onUpdate:value={(val: string) => {
                      location.value = val || "";
                      updateNodeField("location", location.value);
                    }}
                  />
                )}
              </div>
            </div>

            <div class="property-section">
              <div class="property-section-header">
                <span>关联设备</span>
                {!props.readonly && (
                  <div>
                    <Button type="primary" onClick={handleOpenBindDevice}>
                      关联设备
                    </Button>
                    <Button style={{ color: "#ff4d4f", marginLeft: "10px" }} onClick={handleClearDevices}>
                      删除
                    </Button>
                  </div>
                )}
              </div>

              <table class="property-device-table property-device-table--two-col">
                <thead>
                  <tr>
                    <th>设备ID</th>
                    <th>设备名称</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedDevices.value.length === 0 ? (
                    <tr>
                      <td colspan={2} class="property-device-empty">
                        暂无关联设备
                      </td>
                    </tr>
                  ) : (
                    relatedDevices.value.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!props.readonly && (
            <div class="electrical-property-panel__footer">
              <PopConfirm title="确定删除该节点？" okText="确定" cancelText="取消" okType="danger" onConfirm={handleDeleteNode}>
                <Button style={{ color: "#ff4d4f" }}>删除节点</Button>
              </PopConfirm>
            </div>
          )}

          {!props.readonly && (
            <DeviceBindModal
              visible={deviceBindModalVisible.value}
              selectedIds={selectedDeviceIds.value}
              initialBindings={(() => {
                let cell = firstCell.value;
                if (!cell) return [];
                let data = cell.getData() || {};
                return Object.values(getNodeDeviceBindings(data as any));
              })()}
              onUpdate:visible={(v: boolean) => (deviceBindModalVisible.value = v)}
              onConfirm={handleDeviceBindConfirm}
            />
          )}
        </div>
      );
    };
  },
});

export default ElectricalPropertyPanel;
