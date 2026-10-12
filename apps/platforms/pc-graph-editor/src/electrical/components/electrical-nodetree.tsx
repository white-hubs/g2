import { defineComponent, type PropType } from "vue";

import { NodeTree, type TreeNode } from "../../core";
import type { ElectricalNode } from "../types";

/**
 * 电气节点树组件（支持多根）
 */
export const ElectricalNodeTree = defineComponent({
  name: "ElectricalNodeTree",
  props: {
    nodes: {
      type: Array as PropType<ElectricalNode[]>,
      required: true,
    },
  },
  emits: {
    "node-select": (node: ElectricalNode) => true,
    "node-drag-start": (node: ElectricalNode, event: DragEvent) => true,
  },
  setup(props, { emit }) {
    // 将电气节点转换为树节点格式，支持 children 或 childrenIds（避免循环引用）
    const convertToTreeNodes = (nodes: ElectricalNode[], nodeMap?: Map<string, ElectricalNode>, visited?: Set<string>): TreeNode[] => {
      var map = nodeMap || new Map(props.nodes.map((n) => [n.id, n]));
      var seen = visited || new Set<string>();
      return nodes.map((node) => {
        var childNodes: ElectricalNode[] = [];
        if (node.children && node.children.length > 0) {
          childNodes = node.children;
        } else if (node.childrenIds && node.childrenIds.length > 0) {
          seen.add(node.id);
          for (var i = 0; i < node.childrenIds.length; i++) {
            var c = map.get(node.childrenIds[i]);
            if (c && !seen.has(c.id)) childNodes.push(c);
          }
          seen.delete(node.id);
        }
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          children: childNodes.length > 0 ? convertToTreeNodes(childNodes, map, new Set(seen)) : undefined,
          ...node.metadata,
        };
      });
    };

    const findNodeById = (id: string): ElectricalNode | null => {
      return props.nodes.find((n) => n.id === id) || null;
    };

    const handleNodeClick = (treeNode: TreeNode) => {
      var electricalNode = findNodeById(treeNode.id);
      if (electricalNode) emit("node-select", electricalNode);
    };

    const handleNodeDragStart = (treeNode: TreeNode, event: DragEvent) => {
      var electricalNode = findNodeById(treeNode.id);
      if (electricalNode) emit("node-drag-start", electricalNode, event);
    };

    // 有 childrenIds 时需确定根节点（不在任何 childrenIds 中的节点）
    const displayNodes = (): ElectricalNode[] => {
      if (props.nodes.some((n) => n.children && n.children.length > 0)) {
        return props.nodes;
      }
      var childIds = new Set<string>();
      props.nodes.forEach((n) => {
        (n.childrenIds || []).forEach((id) => childIds.add(id));
      });
      var roots = props.nodes.filter((n) => !childIds.has(n.id));
      return roots.length > 0 ? roots : props.nodes;
    };

    return () => (
      <div class="electrical-node-tree">
        <NodeTree
          nodes={convertToTreeNodes(displayNodes())}
          draggable={true}
          onNode-click={handleNodeClick}
          onNode-drag-start={handleNodeDragStart}
        />
      </div>
    );
  },
});

export default ElectricalNodeTree;
