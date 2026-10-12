import { defineComponent, ref, type PropType } from "vue";

import "./node-tree.css";

/**
 * 树节点接口
 */
export interface TreeNode {
  id: string;
  name: string;
  type?: string;
  children?: TreeNode[];
  [key: string]: any;
}

/**
 * 节点树基础组件
 *
 * 支持多根节点的树形结构
 */
export const NodeTree = defineComponent({
  name: "NodeTree",
  props: {
    /**
     * 树节点数据（支持多根）
     */
    nodes: {
      type: Array as PropType<TreeNode[]>,
      default: () => [],
    },
    /**
     * 是否显示搜索框
     */
    showSearch: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否可拖拽
     */
    draggable: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    "node-click": (node: TreeNode) => true,
    "node-dblclick": (node: TreeNode) => true,
    "node-contextmenu": (node: TreeNode, event: MouseEvent) => true,
    "node-drag-start": (node: TreeNode, event: DragEvent) => true,
  },
  setup(props, { emit }) {
    const searchKeyword = ref("");
    const expandedNodes = ref<Set<string>>(new Set());
    const selectedNodeId = ref<string | null>(null);

    // 切换节点展开/折叠
    const toggleNode = (nodeId: string) => {
      if (expandedNodes.value.has(nodeId)) {
        expandedNodes.value.delete(nodeId);
      } else {
        expandedNodes.value.add(nodeId);
      }
    };

    // 检查节点是否展开
    const isNodeExpanded = (nodeId: string) => {
      return expandedNodes.value.has(nodeId);
    };

    // 处理节点点击
    const handleNodeClick = (node: TreeNode) => {
      selectedNodeId.value = node.id;
      emit("node-click", node);
    };

    // 处理节点双击
    const handleNodeDblClick = (node: TreeNode) => {
      emit("node-dblclick", node);
    };

    // 处理节点右键菜单
    const handleNodeContextMenu = (node: TreeNode, event: MouseEvent) => {
      event.preventDefault();
      emit("node-contextmenu", node, event);
    };

    // 处理节点拖拽开始
    const handleNodeDragStart = (node: TreeNode, event: DragEvent) => {
      if (!props.draggable) return;
      emit("node-drag-start", node, event);
    };

    // 过滤节点（根据搜索关键词）
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      if (!searchKeyword.value) return nodes;

      const keyword = searchKeyword.value.toLowerCase();
      return nodes.filter((node) => {
        const matchName = node.name.toLowerCase().includes(keyword);
        const matchChildren = node.children && filterNodes(node.children).length > 0;
        return matchName || matchChildren;
      });
    };

    // 渲染树节点
    const renderNode = (node: TreeNode, level = 0): JSX.Element => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = isNodeExpanded(node.id);
      const isSelected = selectedNodeId.value === node.id;

      return (
        <div key={node.id} class="node-tree__node">
          <div
            class={[
              "node-tree__node-content",
              {
                "is-selected": isSelected,
                "has-children": hasChildren,
              },
            ]}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            draggable={props.draggable}
            onClick={() => handleNodeClick(node)}
            onDblclick={() => handleNodeDblClick(node)}
            onContextmenu={(e: MouseEvent) => handleNodeContextMenu(node, e)}
            onDragstart={(e: DragEvent) => handleNodeDragStart(node, e)}
          >
            {hasChildren && (
              <span
                class={["node-tree__node-arrow", { "is-expanded": isExpanded }]}
                onClick={(e: Event) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                ▶
              </span>
            )}
            {!hasChildren && <span class="node-tree__node-spacer"></span>}
            <span class="node-tree__node-name">{node.name}</span>
            {node.type && <span class="node-tree__node-type">{node.type}</span>}
          </div>

          {hasChildren && isExpanded && (
            <div class="node-tree__children">{node.children!.map((child) => renderNode(child, level + 1))}</div>
          )}
        </div>
      );
    };

    return () => {
      const filteredNodes = filterNodes(props.nodes);

      return (
        <div class="node-tree">
          {/* 搜索框 */}
          {props.showSearch && (
            <div class="node-tree__search">
              <input type="text" v-model={searchKeyword.value} placeholder="搜索节点..." class="node-tree__search-input" />
            </div>
          )}

          {/* 树节点列表 */}
          <div class="node-tree__list">
            {filteredNodes.length === 0 ? (
              <div class="node-tree__empty">{searchKeyword.value ? "没有找到匹配的节点" : "暂无节点数据"}</div>
            ) : (
              filteredNodes.map((node) => renderNode(node))
            )}
          </div>
        </div>
      );
    };
  },
});

export default NodeTree;
