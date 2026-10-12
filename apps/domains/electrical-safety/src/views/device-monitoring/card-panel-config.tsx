import type { DeviceCardConfig, LongId, ProductPropertyRangeRule } from "@g2-contract/electrical-safety";
import { AntModal, Button, Checkbox, Drawer, Empty, InputNumber, PcIcon, Spin, message } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent, reactive, shallowRef, watch } from "vue";

import { CardPanelPreview } from "./card-panel-preview";
import { getDeviceCardConfig, listConfigurableProducts, saveDeviceCardConfig } from "@/api/electrical-safety";

interface RangeDraft {
  lower?: number;
  upper?: number;
}

const toRangeRule = (draft: RangeDraft): ProductPropertyRangeRule => {
  const hasLower = typeof draft.lower === "number" && Number.isFinite(draft.lower);
  const hasUpper = typeof draft.upper === "number" && Number.isFinite(draft.upper);
  if (hasLower && hasUpper) {
    return {
      type: "BETWEEN",
      lower: draft.lower,
      upper: draft.upper,
      lowerInclusive: true,
      upperInclusive: true,
    };
  }
  if (hasLower) {
    return { type: "GTE", value: draft.lower };
  }
  if (hasUpper) {
    return { type: "LTE", value: draft.upper };
  }
  return { type: "BETWEEN" };
};

export const CardPanelConfig = defineComponent({
  name: "CardPanelConfig",
  props: {
    open: { type: Boolean, required: true },
    facilityId: { type: [String, Number] as PropType<LongId>, required: true },
  },
  emits: {
    close: (): boolean => true,
    saved: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const products = shallowRef<Awaited<ReturnType<typeof listConfigurableProducts>>>([]);
    const activeProductCode = shallowRef("");
    const cardConfig = shallowRef<DeviceCardConfig | null>(null);
    const selectedCodes = shallowRef<string[]>([]);
    const defaultSelectedCodes = shallowRef<string[]>([]);
    const ranges = reactive<Record<string, RangeDraft>>({});
    const defaultRanges = shallowRef<Record<string, RangeDraft>>({});
    const loading = shallowRef(false);
    const saving = shallowRef(false);
    const draggedPropertyCode = shallowRef("");
    let requestVersion = 0;

    const activeProduct = computed(() => products.value.find((item) => item.productCode === activeProductCode.value) ?? null);
    const availableProperties = computed(() => cardConfig.value?.availableProperties ?? []);
    const selectedProperties = computed(() =>
      selectedCodes.value
        .map((propertyCode) => availableProperties.value.find((item) => item.propertyCode === propertyCode))
        .filter((property): property is NonNullable<typeof property> => Boolean(property)),
    );
    const orderedProperties = computed(() => [
      ...selectedProperties.value,
      ...availableProperties.value.filter((property) => !selectedCodes.value.includes(property.propertyCode)),
    ]);

    const replaceRangeDrafts = (drafts: Record<string, RangeDraft>): void => {
      Object.keys(ranges).forEach((key) => delete ranges[key]);
      Object.entries(drafts).forEach(([propertyCode, range]) => {
        ranges[propertyCode] = { ...range };
      });
    };
    const snapshotLoadedConfig = (): void => {
      defaultSelectedCodes.value = [...selectedCodes.value];
      defaultRanges.value = Object.fromEntries(Object.entries(ranges).map(([propertyCode, range]) => [propertyCode, { ...range }]));
    };

    const loadProductConfig = async (productCode: string): Promise<void> => {
      if (!productCode) {
        return;
      }
      const version = ++requestVersion;
      loading.value = true;
      try {
        const nextCardConfig = await getDeviceCardConfig(props.facilityId, productCode);
        if (version !== requestVersion || productCode !== activeProductCode.value) {
          return;
        }
        cardConfig.value = nextCardConfig;
        selectedCodes.value = [...(nextCardConfig.selectedItems ?? [])]
          .toSorted((left, right) => left.sort - right.sort)
          .map((item) => item.propertyCode)
          .slice(0, 6);
        replaceRangeDrafts({});
        snapshotLoadedConfig();
      } catch {
        if (version === requestVersion) {
          cardConfig.value = null;
          selectedCodes.value = [];
          replaceRangeDrafts({});
          snapshotLoadedConfig();
        }
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    const loadProducts = async (): Promise<void> => {
      if (!props.open || !props.facilityId) {
        return;
      }
      const version = ++requestVersion;
      loading.value = true;
      products.value = [];
      activeProductCode.value = "";
      cardConfig.value = null;
      selectedCodes.value = [];
      defaultSelectedCodes.value = [];
      replaceRangeDrafts({});
      defaultRanges.value = {};
      try {
        const result = await listConfigurableProducts(props.facilityId);
        if (version !== requestVersion) {
          return;
        }
        products.value = Array.isArray(result) ? result : [];
        activeProductCode.value = products.value[0]?.productCode ?? "";
        if (activeProductCode.value) {
          await loadProductConfig(activeProductCode.value);
        }
      } catch {
        if (version === requestVersion) {
          products.value = [];
        }
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    watch(
      () => [props.open, props.facilityId] as const,
      ([open]) => {
        if (open) {
          void loadProducts();
        } else {
          requestVersion += 1;
        }
      },
      { immediate: true },
    );

    const selectProduct = (productCode: string): void => {
      if (productCode === activeProductCode.value) {
        return;
      }
      activeProductCode.value = productCode;
      void loadProductConfig(productCode);
    };

    const toggleProperty = (propertyCode: string, checked: boolean): void => {
      if (checked) {
        if (selectedCodes.value.length >= 6) {
          message.warning("每种产品最多展示 6 个监测指标");
          return;
        }
        if (!selectedCodes.value.includes(propertyCode)) {
          selectedCodes.value = [...selectedCodes.value, propertyCode];
        }
        return;
      }
      selectedCodes.value = selectedCodes.value.filter((item) => item !== propertyCode);
    };

    const moveProperty = (propertyCode: string, targetIndex: number): void => {
      const current = [...selectedCodes.value];
      const index = current.indexOf(propertyCode);
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length || index === targetIndex) {
        return;
      }
      const [item] = current.splice(index, 1);
      current.splice(targetIndex, 0, item);
      selectedCodes.value = current;
    };

    const handleDrop = (propertyCode: string): void => {
      const sourceCode = draggedPropertyCode.value;
      draggedPropertyCode.value = "";
      if (!sourceCode || sourceCode === propertyCode) {
        return;
      }
      moveProperty(sourceCode, selectedCodes.value.indexOf(propertyCode));
    };

    const resetToDefault = (): void => {
      selectedCodes.value = [...defaultSelectedCodes.value];
      replaceRangeDrafts(defaultRanges.value);
    };

    const confirmResetToDefault = (): void => {
      AntModal.confirm({
        title: "确认恢复默认配置？",
        content: "将恢复为本次接口查询返回的初始展示点位与参考范围，当前未保存的修改将丢失。",
        okText: "恢复默认",
        cancelText: "取消",
        onOk: resetToDefault,
      });
    };

    const setRangeValue = (propertyCode: string, key: keyof RangeDraft, value: number | null): void => {
      const current = ranges[propertyCode] ?? {};
      ranges[propertyCode] = {
        ...current,
        ...(typeof value === "number" && Number.isFinite(value) ? { [key]: value } : {}),
      };
      if (value == null) {
        delete ranges[propertyCode][key];
      }
    };

    const save = async (): Promise<void> => {
      if (!activeProductCode.value) {
        return;
      }
      const invalidProperty = selectedCodes.value.find((propertyCode) => {
        const range = ranges[propertyCode];
        return typeof range?.lower === "number" && typeof range?.upper === "number" && range.lower > range.upper;
      });
      if (invalidProperty) {
        const property = availableProperties.value.find((item) => item.propertyCode === invalidProperty);
        message.warning(`${property?.propertyName ?? invalidProperty}的参考范围下限不能大于上限`);
        return;
      }

      saving.value = true;
      try {
        await saveDeviceCardConfig(props.facilityId, activeProductCode.value, {
          items: selectedCodes.value.map((propertyCode) => ({ propertyCode, rangeRule: toRangeRule(ranges[propertyCode] ?? {}) })),
        });
        message.success("面板配置已保存");
        emit("saved");
        emit("close");
      } catch {
        // 网关已展示对应接口错误，保留抽屉供用户继续修改。
      } finally {
        saving.value = false;
      }
    };

    return (): JSX.Element => (
      <Drawer
        open={props.open}
        title="面板配置"
        width={980}
        destroyOnClose
        class="card-panel-drawer electrical-viewport-drawer"
        footer={
          <div class="card-panel-actions">
            <Button onClick={confirmResetToDefault}>恢复默认</Button>
            <span class="card-panel-action-tip">恢复默认会还原接口查询的初始配置</span>
            <Button onClick={() => emit("close")}>取消</Button>
            <Button type="primary" loading={saving.value} disabled={!activeProductCode.value || loading.value} onClick={() => void save()}>
              保存配置
            </Button>
          </div>
        }
        onClose={() => emit("close")}
      >
        <Spin spinning={loading.value}>
          {products.value.length === 0 && !loading.value ? (
            <Empty description="当前设施暂无可配置产品" />
          ) : (
            <div class="card-panel-config">
              <CardPanelPreview
                productName={cardConfig.value?.productName ?? activeProduct.value?.productName ?? "设备卡片"}
                properties={selectedProperties.value}
              />
              <div class="card-panel-products">
                <div class="card-panel-section-title">设备产品</div>
                {products.value.map((product) => (
                  <button
                    type="button"
                    class={["card-panel-product", product.productCode === activeProductCode.value && "is-active"]}
                    key={product.productCode}
                    onClick={() => selectProduct(product.productCode)}
                  >
                    <strong>{product.productName}</strong>
                    <small>{product.productCategoryName || product.productCode}</small>
                  </button>
                ))}
              </div>
              <div class="card-panel-properties">
                <div class="card-panel-config-heading">
                  <div>
                    <strong>{cardConfig.value?.productName ?? activeProduct.value?.productName ?? "产品属性"}</strong>
                    <span>勾选卡片指标并设置参考范围</span>
                  </div>
                  <b>已选 {selectedCodes.value.length}/6</b>
                </div>
                <div class="card-panel-range-hint">
                  参考范围非必填；填写后用于设备参数状态和健康分析。仅填下限按“≥”保存，仅填上限按“≤”保存。
                </div>
                <div class="card-panel-property-list">
                  {orderedProperties.value.map((property) => {
                    const selectedIndex = selectedCodes.value.indexOf(property.propertyCode);
                    const selected = selectedIndex !== -1;
                    const range = ranges[property.propertyCode] ?? {};
                    return (
                      <div
                        class={[
                          "card-panel-property",
                          selected && "is-selected",
                          draggedPropertyCode.value === property.propertyCode && "is-dragging",
                        ]}
                        key={property.propertyCode}
                        onDragover={(event: DragEvent) => {
                          if (selected) {
                            event.preventDefault();
                          }
                        }}
                        onDrop={() => selected && handleDrop(property.propertyCode)}
                      >
                        <Checkbox
                          checked={selected}
                          onUpdate:checked={(inputValue) => {
                            const checked = inputValue as boolean;
                            return toggleProperty(property.propertyCode, checked);
                          }}
                        />
                        <div class="card-panel-property-name">
                          <strong>{property.propertyName}</strong>
                          <small>{property.propertyCode}</small>
                        </div>
                        {selected ? (
                          <>
                            <div class="card-panel-range">
                              <InputNumber
                                value={range.lower}
                                placeholder="下限"
                                onUpdate:value={(inputValue) => {
                                  const value = inputValue as number | null;
                                  return setRangeValue(property.propertyCode, "lower", value);
                                }}
                              />
                              <span>~</span>
                              <InputNumber
                                value={range.upper}
                                placeholder="上限"
                                onUpdate:value={(inputValue) => {
                                  const value = inputValue as number | null;
                                  return setRangeValue(property.propertyCode, "upper", value);
                                }}
                              />
                              <small>{property.unit ?? ""}</small>
                            </div>
                            <div class="card-panel-sort">
                              <b>{selectedIndex + 1}</b>
                              <span
                                class="card-panel-drag-handle"
                                draggable
                                title="拖拽排序"
                                onDragstart={(event: DragEvent) => {
                                  draggedPropertyCode.value = property.propertyCode;
                                  event.dataTransfer?.setData("text/plain", property.propertyCode);
                                  if (event.dataTransfer) {
                                    event.dataTransfer.effectAllowed = "move";
                                  }
                                }}
                                onDragend={() => (draggedPropertyCode.value = "")}
                              >
                                <PcIcon iconClass="icon-tuozhuai" size={16} />
                              </span>
                            </div>
                          </>
                        ) : (
                          <span class="card-panel-property-unit">{property.unit ?? "--"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>
    );
  },
});
