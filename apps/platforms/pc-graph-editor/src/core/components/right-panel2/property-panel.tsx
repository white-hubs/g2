import type { Cell } from "@antv/x6";
import { defineComponent, computed, type PropType } from "vue";

import "./property-panel.css";

/**
 * 属性面板基础组件
 *
 * 提供基础的属性编辑功能，可被业务层扩展
 */
export const PropertyPanel = defineComponent({
  name: "PropertyPanel",
  props: {
    /**
     * 选中的单元格
     */
    selectedCells: {
      type: Array as PropType<Cell[]>,
      default: () => [],
    },
  },
  emits: {
    "update:property": (cellId: string, property: string, value: any) => true,
  },
  setup(props, { emit, slots }) {
    // 计算选中状态
    const hasSelection = computed(() => props.selectedCells.length > 0);
    const isSingleSelection = computed(() => props.selectedCells.length === 1);
    const isMultipleSelection = computed(() => props.selectedCells.length > 1);

    // 获取第一个选中的单元格（用于单选时显示属性）
    const firstCell = computed(() => (props.selectedCells.length > 0 ? props.selectedCells[0] : null));

    // 选中的节点
    const selectedNodes = computed(() => props.selectedCells.filter((cell) => cell.isNode()));

    // 选中的连线
    const selectedEdges = computed(() => props.selectedCells.filter((cell) => cell.isEdge()));

    // 更新属性
    const updateProperty = (property: string, value: any) => {
      if (firstCell.value) {
        emit("update:property", firstCell.value.id, property, value);
      }
    };

    return () => (
      <div class="property-panel">
        {/* 使用插槽，业务层可以完全自定义 */}
        {slots.default?.({
          hasSelection: hasSelection.value,
          isSingleSelection: isSingleSelection.value,
          isMultipleSelection: isMultipleSelection.value,
          selectedCells: props.selectedCells,
          selectedNodes: selectedNodes.value,
          selectedEdges: selectedEdges.value,
          firstCell: firstCell.value,
          updateProperty,
        }) || (
          <div class="property-panel__content">
            {!hasSelection.value ? (
              // 未选中任何元素
              <div class="property-panel__empty">
                <div class="property-panel__empty-icon">📝</div>
                <p class="property-panel__empty-text">请选择画布中的元素</p>
                <p class="property-panel__empty-hint">点击或框选元素以查看和编辑其属性</p>
              </div>
            ) : isMultipleSelection.value ? (
              // 选中多个元素
              <div class="property-panel__multiple">
                <div class="property-panel__section">
                  <h3 class="property-panel__section-title">多选</h3>
                  <div class="property-panel__info">
                    <p>已选中 {props.selectedCells.length} 个元素</p>
                    {selectedNodes.value.length > 0 && <p>节点: {selectedNodes.value.length} 个</p>}
                    {selectedEdges.value.length > 0 && <p>连线: {selectedEdges.value.length} 个</p>}
                  </div>
                </div>
              </div>
            ) : firstCell.value ? (
              // 选中单个元素
              <div class="property-panel__single">
                {/* 基本信息 */}
                <div class="property-panel__section">
                  <h3 class="property-panel__section-title">基本信息</h3>
                  <div class="property-panel__field">
                    <label class="property-panel__label">类型</label>
                    <div class="property-panel__value">{firstCell.value.isNode() ? "节点" : "连线"}</div>
                  </div>
                  <div class="property-panel__field">
                    <label class="property-panel__label">ID</label>
                    <div class="property-panel__value-code">{firstCell.value.id}</div>
                  </div>
                  <div class="property-panel__field">
                    <label class="property-panel__label">形状</label>
                    <div class="property-panel__value">{firstCell.value.shape}</div>
                  </div>
                </div>

                {/* 位置和尺寸（仅节点） */}
                {firstCell.value.isNode() && (
                  <div class="property-panel__section">
                    <h3 class="property-panel__section-title">位置和尺寸</h3>
                    <div class="property-panel__field-group">
                      <div class="property-panel__field">
                        <label class="property-panel__label">X</label>
                        <input
                          type="number"
                          class="property-panel__input"
                          value={firstCell.value.position().x}
                          onInput={(e: Event) => {
                            const value = (e.target as HTMLInputElement).value;
                            updateProperty("x", Number(value));
                          }}
                        />
                      </div>
                      <div class="property-panel__field">
                        <label class="property-panel__label">Y</label>
                        <input
                          type="number"
                          class="property-panel__input"
                          value={firstCell.value.position().y}
                          onInput={(e: Event) => {
                            const value = (e.target as HTMLInputElement).value;
                            updateProperty("y", Number(value));
                          }}
                        />
                      </div>
                    </div>
                    <div class="property-panel__field-group">
                      <div class="property-panel__field">
                        <label class="property-panel__label">宽度</label>
                        <input
                          type="number"
                          class="property-panel__input"
                          value={firstCell.value.size().width}
                          onInput={(e: Event) => {
                            const value = (e.target as HTMLInputElement).value;
                            updateProperty("width", Number(value));
                          }}
                        />
                      </div>
                      <div class="property-panel__field">
                        <label class="property-panel__label">高度</label>
                        <input
                          type="number"
                          class="property-panel__input"
                          value={firstCell.value.size().height}
                          onInput={(e: Event) => {
                            const value = (e.target as HTMLInputElement).value;
                            updateProperty("height", Number(value));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 提示：使用插槽自定义 */}
                <div class="property-panel__hint">
                  <p>💡 使用默认插槽自定义属性面板内容</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  },
});

export default PropertyPanel;
