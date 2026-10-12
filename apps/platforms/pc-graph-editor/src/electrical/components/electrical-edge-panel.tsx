import type { Cell } from "@antv/x6";
import { Button, Input } from "@g2-platform/pc-ui";
import { defineComponent, computed, inject } from "vue";

import "./electrical-property-panel.css";

function getNodeName(node: any) {
  if (!node) return "";
  var data = node.getData?.() || {};
  if (typeof data.nodeName === "string" && data.nodeName) {
    return data.nodeName;
  }
  var attrs = node.getAttrs?.() || {};
  var label = (attrs as any).label || {};
  if (label.textWrap && typeof label.textWrap.text === "string") {
    return label.textWrap.text;
  }
  if (typeof label.text === "string") {
    return label.text;
  }
  return "";
}

export const ElectricalEdgePanel = defineComponent({
  name: "ElectricalEdgePanel",
  props: {
    selectedCells: {
      type: Array as any,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    var graph = inject("graph") as any;

    var firstEdge = computed(() => {
      var cells = (props.selectedCells || []) as Cell[];
      var edge = cells.find((c) => (c as any).isEdge && (c as any).isEdge());
      return edge || null;
    });

    var lineName = computed(() => {
      var edge: any = firstEdge.value as any;
      if (!edge) {
        return "";
      }
      var data = edge.getData?.() || {};
      var fromId = data.from || (edge.getSourceCellId && edge.getSourceCellId()) || edge.getSource?.()?.cell;
      var toId = data.to || (edge.getTargetCellId && edge.getTargetCellId()) || edge.getTarget?.()?.cell;

      var fromName = "";
      var toName = "";
      if (graph && graph.value) {
        var fromNode = fromId ? graph.value.getCellById(fromId) : null;
        var toNode = toId ? graph.value.getCellById(toId) : null;
        fromName = getNodeName(fromNode);
        toName = getNodeName(toNode);
      }

      var startText = fromName || fromId || "开始节点";
      var endText = toName || toId || "结束节点";
      return `【${startText}】-【${endText}】`;
    });

    var handleDeleteEdge = () => {
      var edge: any = firstEdge.value as any;
      if (!edge) {
        return;
      }
      if (graph && graph.value) {
        graph.value.removeCell(edge);
      }
    };

    return () => {
      if (!firstEdge.value) {
        return (
          <div class="electrical-property-panel">
            <div class="electrical-property-panel__empty">
              <p class="electrical-property-panel__empty-text">请选择连线</p>
              <p class="electrical-property-panel__empty-hint">点击画布中的连线以查看线路名称</p>
            </div>
          </div>
        );
      }

      return (
        <div class="electrical-property-panel electrical-property-panel--form">
          <div class="electrical-property-panel__scroll">
            <div class="property-section">
              <div class="property-field">
                <label>线路名称</label>
                <Input value={lineName.value} readonly />
              </div>
            </div>
          </div>

          {!props.readonly && (
            <div class="electrical-property-panel__footer">
              <Button style={{ color: "#ff4d4f", marginLeft: "10px" }} onClick={handleDeleteEdge}>
                删除连线
              </Button>
            </div>
          )}
        </div>
      );
    };
  },
});

export default ElectricalEdgePanel;
