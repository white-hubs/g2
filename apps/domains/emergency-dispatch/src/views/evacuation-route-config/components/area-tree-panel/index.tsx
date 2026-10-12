// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent, type PropType } from "vue";

import type { AreaTreeItem } from "../../../evacuation-shared/data/types";
import type { EvacuationRouteState } from "../../composables/use-evacuation-route-state";
import { filterAreaTreeItems } from "../../data/area-tree";
import { Input, Spin } from "@/pc-ui-runtime";

import "./index.less";

const AreaTreeNodes = defineComponent({
  name: "AreaTreeNodes",
  props: {
    nodes: { type: Array as PropType<AreaTreeItem[]>, required: true },
    depth: { type: Number, default: 0 },
    state: { type: Object as PropType<EvacuationRouteState>, required: true },
  },
  setup(props) {
    return (): JSX.Element => (
      <>
        {props.nodes.map((node) => (
          <div key={node.id}>
            <div
              class={[
                "area-node",
                props.depth > 0 ? "area-node--child" : "",
                props.state.selectedAreaId.value === node.id ? "area-node--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ paddingLeft: `${10 + props.depth * 16}px` }}
              onClick={() => props.state.selectArea(node.id)}
            >
              {node.children.length > 0 ? (
                <span
                  class={["area-node__caret", node.expanded ? "area-node__caret--expanded" : ""].filter(Boolean).join(" ")}
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    props.state.toggleAreaNode(node.id);
                  }}
                >
                  ▶
                </span>
              ) : (
                <span class="area-node__caret area-node__caret--placeholder" />
              )}
              {props.depth > 0 ? "📍 " : null}
              {node.name}
            </div>
            {node.expanded && node.children.length > 0 ? (
              <AreaTreeNodes nodes={node.children} depth={props.depth + 1} state={props.state} />
            ) : null}
          </div>
        ))}
      </>
    );
  },
});

export const AreaTreePanel = defineComponent({
  name: "AreaTreePanel",
  props: {
    state: { type: Object as PropType<EvacuationRouteState>, required: true },
  },
  setup(props) {
    const filteredTree = computed(() => {
      return filterAreaTreeItems(props.state.areaTree.value, props.state.areaSearch.value);
    });

    return (): JSX.Element => (
      <div class="area-tree-panel">
        <div class="area-tree-panel__header">区域选择</div>
        <div class="area-tree-panel__search">
          <Input
            size="small"
            placeholder="搜索区域..."
            value={props.state.areaSearch.value}
            onUpdate:value={(v: string) => {
              props.state.areaSearch.value = v ?? "";
              props.state.expandAllAreaNodes();
            }}
          />
        </div>
        <div class="area-tree-panel__body">
          <Spin spinning={props.state.areaLoading.value}>
            {filteredTree.value.length === 0 ? (
              <div class="area-tree-panel__empty">{props.state.areaLoading.value ? "加载中..." : "暂无区域数据"}</div>
            ) : (
              <AreaTreeNodes nodes={filteredTree.value} state={props.state} />
            )}
          </Spin>
        </div>
      </div>
    );
  },
});
