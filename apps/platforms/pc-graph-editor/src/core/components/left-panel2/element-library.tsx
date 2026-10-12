import { defineComponent, ref, computed, type PropType } from "vue";

import { useDragDrop } from "../../composables/use-drag-drop";
import type { ElementDefinition, ElementCategory } from "../../types";

import "./element-library.css";

/**
 * 元素库基础组件
 *
 * 提供拖拽元素到画布的基础功能
 */
export const ElementLibrary = defineComponent({
  name: "ElementLibrary",
  props: {
    /**
     * 元素分类列表
     */
    categories: {
      type: Array as PropType<ElementCategory[]>,
      default: () => [],
    },
    /**
     * 元素列表（扁平结构，不分类）
     */
    elements: {
      type: Array as PropType<ElementDefinition[]>,
      default: () => [],
    },
    /**
     * 是否显示搜索框
     */
    showSearch: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    var searchKeyword = ref("");
    var expandedCategories = ref<Set<string>>(new Set());

    // 使用拖拽功能（graph 会从父组件注入）
    var graphRef = ref(null);
    var { startDrag } = useDragDrop(graphRef);

    // 计算分类数据
    var computedCategories = computed(() => {
      if (props.categories.length > 0) {
        return props.categories;
      }

      // 如果没有提供分类，则将所有元素归为"默认"分类
      if (props.elements.length > 0) {
        return [
          {
            id: "default",
            name: "所有元素",
            elements: props.elements,
          },
        ];
      }

      return [];
    });

    // 过滤后的分类数据
    var filteredCategories = computed(() => {
      if (!searchKeyword.value) {
        return computedCategories.value;
      }

      const keyword = searchKeyword.value.toLowerCase();
      return computedCategories.value
        .map((category) => ({
          ...category,
          elements: category.elements.filter(
            (element) => element.name.toLowerCase().includes(keyword) || element.id.toLowerCase().includes(keyword),
          ),
        }))
        .filter((category) => category.elements.length > 0);
    });

    // 切换分类展开/折叠
    var toggleCategory = (categoryId: string) => {
      if (expandedCategories.value.has(categoryId)) {
        expandedCategories.value.delete(categoryId);
      } else {
        expandedCategories.value.add(categoryId);
      }
    };

    // 检查分类是否展开
    var isCategoryExpanded = (categoryId: string) => {
      return expandedCategories.value.has(categoryId);
    };

    // 判断图标是否为图片 URL
    var isImageIcon = (icon?: string) => {
      if (!icon) {
        return false;
      }
      var lower = icon.toLowerCase();
      return (
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.startsWith("data:") ||
        lower.startsWith("http://") ||
        lower.startsWith("https://")
      );
    };

    // 处理元素拖拽开始
    var handleDragStart = (element: ElementDefinition, event: DragEvent) => {
      startDrag(element, event);
    };

    // 默认展开第一个分类
    if (computedCategories.value.length > 0) {
      expandedCategories.value.add(computedCategories.value[0].id);
    }

    return () => (
      <div class="element-library">
        {/* 搜索框 */}
        {props.showSearch && (
          <div class="element-library__search">
            <input type="text" v-model={searchKeyword.value} placeholder="器件名称" class="element-library__search-input" />
          </div>
        )}

        {/* 元素分类列表 */}
        <div class="element-library__categories">
          {filteredCategories.value.length === 0 ? (
            <div class="element-library__empty">{searchKeyword.value ? "没有找到匹配的元素" : "暂无可用元素"}</div>
          ) : (
            filteredCategories.value.map((category) => (
              <div key={category.id} class="element-library__category">
                {/* 分类标题 */}
                <div class="element-library__category-header" onClick={() => toggleCategory(category.id)}>
                  <span
                    class={[
                      "element-library__category-arrow",
                      {
                        "is-expanded": isCategoryExpanded(category.id),
                      },
                    ]}
                  >
                    ▶
                  </span>
                  {category.icon && <span class="element-library__category-icon">{category.icon}</span>}
                  <span class="element-library__category-name">{category.name}</span>
                  <span class="element-library__category-count">({category.elements.length})</span>
                </div>

                {/* 元素列表 */}
                {isCategoryExpanded(category.id) && (
                  <div class="element-library__elements">
                    {category.elements.map((element) => (
                      <div
                        key={element.id}
                        class="element-library__element"
                        draggable={true}
                        onDragstart={(e: DragEvent) => handleDragStart(element, e)}
                      >
                        {element.icon && (
                          <span class="element-library__element-icon">
                            {isImageIcon(element.icon) ? (
                              <img src={element.icon} alt={element.name} class="element-library__element-icon-img" />
                            ) : (
                              element.icon
                            )}
                          </span>
                        )}
                        <span class="element-library__element-name">{element.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
});

export default ElementLibrary;
