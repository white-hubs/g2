import type { MonitoringDevice } from "@g2-contract/electrical-safety";
import { Empty, Modal, Select, Spin, Tag, message } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, shallowRef, watch } from "vue";

import {
  type FacilityDeviceBindingSelection,
  type FacilityDeviceScadaData,
  deviceScadaDataToProperties,
} from "@/utils/facility-scada-binding";
import type { ScadaBindableElementSummary } from "@/utils/scada-pages";

const FULL_WIDTH_STYLE = { width: "100%" } as const;
const EMPTY_PROPERTY_OPTIONS: { label: string; value: string }[] = [];
const EMPTY_PROPERTY_CODES: string[] = [];

const FacilityDevicePropertySelect = defineComponent({
  name: "FacilityDevicePropertySelect",
  props: {
    deviceId: { type: String, default: undefined },
    propertyCodes: { type: Array as PropType<string[]>, required: true },
    propertyOptions: { type: Array as PropType<{ label: string; value: string }[]>, required: true },
    loadingProperties: { type: Boolean, default: false },
  },
  emits: {
    updatePropertyCodes: (_codes: string[]): boolean => true,
  },
  setup(props, { emit }) {
    const selectedPropertyCodes = shallowRef(props.propertyCodes);

    watch(
      () => props.propertyCodes,
      (codes) => {
        if (codes !== selectedPropertyCodes.value) {
          selectedPropertyCodes.value = codes;
        }
      },
    );

    const updatePropertyCodes = (codes: string[]): void => {
      const nextCodes = [...codes];
      selectedPropertyCodes.value = nextCodes;
      emit("updatePropertyCodes", nextCodes);
    };

    return (): JSX.Element => (
      <Select
        allowClear
        mode="multiple"
        maxTagCount={2}
        loading={props.loadingProperties}
        value={selectedPropertyCodes.value}
        options={props.propertyOptions}
        disabled={!props.deviceId || props.loadingProperties}
        placeholder={props.deviceId ? (props.loadingProperties ? "正在查询设备属性" : "选择展示属性") : "请先选择设备"}
        style={FULL_WIDTH_STYLE}
        onUpdate:value={(value) => updatePropertyCodes(Array.isArray(value) ? value.map(String) : [])}
      />
    );
  },
});

const FacilityDeviceBindingRow = defineComponent({
  name: "FacilityDeviceBindingRow",
  props: {
    element: { type: Object as PropType<ScadaBindableElementSummary>, required: true },
    deviceId: { type: String, default: undefined },
    propertyCodes: { type: Array as PropType<string[]>, required: true },
    deviceOptions: { type: Array as PropType<{ label: string; value: string }[]>, required: true },
    propertyOptions: { type: Array as PropType<{ label: string; value: string }[]>, required: true },
    loadingProperties: { type: Boolean, default: false },
    bindingSelectVersion: { type: Number, default: 0 },
  },
  emits: {
    updateBinding: (_deviceId?: string): boolean => true,
    updatePropertyCodes: (_codes: string[]): boolean => true,
  },
  setup(props, { emit }) {
    const updateBinding = (deviceId?: string): void => emit("updateBinding", deviceId);
    const updatePropertyCodes = (codes: string[]): void => emit("updatePropertyCodes", codes);

    return (): JSX.Element => (
      <div class="facility-device-binding-item">
        <div>
          <strong>{props.element.name}</strong>
          <small>{props.element.id}</small>
        </div>
        <Select
          key={`device-binding-${props.element.id}-${props.bindingSelectVersion}`}
          allowClear
          showSearch
          optionFilterProp="label"
          value={props.deviceId || undefined}
          options={props.deviceOptions}
          placeholder="选择当前设施房设备"
          style={FULL_WIDTH_STYLE}
          onUpdate:value={(value) => updateBinding(typeof value === "string" ? value : undefined)}
        />
        {props.element.type === "product-property-panel" ? (
          <FacilityDevicePropertySelect
            deviceId={props.deviceId}
            propertyCodes={props.propertyCodes}
            propertyOptions={props.propertyOptions}
            loadingProperties={props.loadingProperties}
            onUpdatePropertyCodes={updatePropertyCodes}
          />
        ) : (
          <span class="facility-device-binding-no-properties">该图元使用画布内配置的数据绑定</span>
        )}
        {props.deviceId ? <Tag color="green">已绑定</Tag> : <Tag>未绑定</Tag>}
      </div>
    );
  },
});

export const FacilityDeviceBindingModal = defineComponent({
  name: "FacilityDeviceBindingModal",
  props: {
    open: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    elements: { type: Array as PropType<ScadaBindableElementSummary[]>, default: () => [] },
    devices: { type: Array as PropType<MonitoringDevice[]>, default: () => [] },
    devicesLoading: { type: Boolean, default: false },
    deviceData: { type: Object as PropType<Record<string, FacilityDeviceScadaData>>, default: () => ({}) },
    loadingDeviceIds: { type: Array as PropType<string[]>, default: () => [] },
    currentBindings: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    currentPropertyCodes: { type: Object as PropType<Record<string, string[]>>, default: () => ({}) },
  },
  emits: {
    cancel: (): boolean => true,
    submit: (_selection: FacilityDeviceBindingSelection): boolean => true,
    requestDeviceData: (_deviceId: string): boolean => true,
  },
  setup(props, { emit }) {
    const draftBindings = shallowRef<Record<string, string>>({});
    const draftPropertyCodes = shallowRef<Record<string, string[]>>({});
    const bindingSelectVersions = shallowRef<Record<string, number>>({});
    const autoSelectAllElementIds = new Set<string>();
    const bindingHandlers = new Map<string, (deviceId?: string) => void>();
    const propertyHandlers = new Map<string, (codes: string[]) => void>();
    const propertyOptionCache = new Map<string, { source: FacilityDeviceScadaData; options: { label: string; value: string }[] }>();

    const isPropertyPanel = (element: ScadaBindableElementSummary): boolean => element.type === "product-property-panel";

    const elementById = computed(() => new Map(props.elements.map((element) => [element.id, element])));
    const deviceOptions = computed(() =>
      props.devices.map((device) => ({
        label: `${device.deviceName}（${device.productName}）`,
        value: String(device.deviceId),
      })),
    );
    const propertyOptionsByDeviceId = computed(() => {
      const entries = Object.entries(props.deviceData).map(([deviceId, data]) => {
        const cached = propertyOptionCache.get(deviceId);
        if (cached?.source === data) {
          return [deviceId, cached.options];
        }
        const options = deviceScadaDataToProperties(data).map((property) => ({
          label: property.unitName ? `${property.propName}（${property.unitName}）` : property.propName,
          value: property.propCode,
        }));
        propertyOptionCache.set(deviceId, { source: data, options });
        return [deviceId, options];
      });
      const currentDeviceIds = new Set(Object.keys(props.deviceData));
      for (const deviceId of propertyOptionCache.keys()) {
        if (!currentDeviceIds.has(deviceId)) {
          propertyOptionCache.delete(deviceId);
        }
      }
      return Object.fromEntries(entries);
    });
    const loadingDeviceIdSet = computed(() => new Set(props.loadingDeviceIds));

    const propertyOptions = (elementId: string): { label: string; value: string }[] => {
      const deviceId = draftBindings.value[elementId];
      return deviceId ? (propertyOptionsByDeviceId.value[deviceId] ?? EMPTY_PROPERTY_OPTIONS) : EMPTY_PROPERTY_OPTIONS;
    };

    const populateAutoSelectedProperties = (): void => {
      const next = { ...draftPropertyCodes.value };
      let changed = false;
      for (const element of props.elements) {
        if (!isPropertyPanel(element) || !autoSelectAllElementIds.has(element.id) || !draftBindings.value[element.id]) {
          continue;
        }
        const codes = propertyOptions(element.id).map((option) => option.value);
        if (codes.length === 0) {
          continue;
        }
        next[element.id] = codes;
        changed = true;
      }
      if (changed) {
        draftPropertyCodes.value = next;
      }
    };

    watch(
      () => props.open,
      (open) => {
        if (!open) {
          return;
        }
        draftBindings.value = { ...props.currentBindings };
        draftPropertyCodes.value = Object.fromEntries(
          Object.entries(props.currentPropertyCodes).map(([elementId, codes]) => [elementId, [...codes]]),
        );
        autoSelectAllElementIds.clear();
        for (const element of props.elements) {
          const deviceId = draftBindings.value[element.id];
          if (!deviceId) {
            continue;
          }
          emit("requestDeviceData", deviceId);
          if (isPropertyPanel(element) && !Object.hasOwn(props.currentPropertyCodes, element.id)) {
            autoSelectAllElementIds.add(element.id);
          }
        }
        populateAutoSelectedProperties();
      },
    );

    watch(() => props.deviceData, populateAutoSelectedProperties);

    const updateBinding = (elementId: string, deviceId?: string): void => {
      const element = elementById.value.get(elementId);
      if (!element) {
        return;
      }
      if (
        deviceId &&
        Object.entries(draftBindings.value).some(
          ([boundElementId, boundDeviceId]) => boundElementId !== elementId && boundDeviceId === deviceId,
        )
      ) {
        bindingSelectVersions.value = {
          ...bindingSelectVersions.value,
          [elementId]: (bindingSelectVersions.value[elementId] ?? 0) + 1,
        };
        message.warning("该设备已绑定其他组态图元");
        return;
      }
      const next = { ...draftBindings.value };
      if (deviceId) {
        next[elementId] = deviceId;
      } else {
        delete next[elementId];
      }
      draftBindings.value = next;

      const nextPropertyCodes = { ...draftPropertyCodes.value };
      if (deviceId && isPropertyPanel(element)) {
        autoSelectAllElementIds.add(elementId);
        nextPropertyCodes[elementId] = [];
        emit("requestDeviceData", deviceId);
      } else {
        autoSelectAllElementIds.delete(elementId);
        delete nextPropertyCodes[elementId];
      }
      draftPropertyCodes.value = nextPropertyCodes;
      populateAutoSelectedProperties();
    };

    const updatePropertyCodes = (elementId: string, codes: string[]): void => {
      autoSelectAllElementIds.delete(elementId);
      draftPropertyCodes.value[elementId] = codes;
    };

    const bindingHandler = (elementId: string): ((deviceId?: string) => void) => {
      const cached = bindingHandlers.get(elementId);
      if (cached) {
        return cached;
      }
      const handler = (deviceId?: string): void => updateBinding(elementId, deviceId);
      bindingHandlers.set(elementId, handler);
      return handler;
    };

    const propertyHandler = (elementId: string): ((codes: string[]) => void) => {
      const cached = propertyHandlers.get(elementId);
      if (cached) {
        return cached;
      }
      const handler = (codes: string[]): void => updatePropertyCodes(elementId, codes);
      propertyHandlers.set(elementId, handler);
      return handler;
    };

    const submit = (): void => {
      const elementDeviceIds = Object.fromEntries(Object.entries(draftBindings.value).filter(([, deviceId]) => Boolean(deviceId)));
      const elementPropertyCodes = Object.fromEntries(
        props.elements.flatMap((element) =>
          isPropertyPanel(element) && elementDeviceIds[element.id] ? [[element.id, [...(draftPropertyCodes.value[element.id] ?? [])]]] : [],
        ),
      );
      emit("submit", { elementDeviceIds, elementPropertyCodes });
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title="设施房设备绑定"
        width="980px"
        wrapClassName="electrical-viewport-modal"
        confirmLoading={props.submitting}
        destroyOnClose
        onCancel={() => emit("cancel")}
        onOk={submit}
      >
        <div class="facility-device-binding-tip">
          每个组态图元可绑定当前设施房下的一台设备，同一设备不重复绑定。产品属性面板可选择设备基本信息和实时参数。
          <small>设备数据来自电气安全服务，二维组态页面仍由独立 SCADA 服务提供。</small>
        </div>
        <Spin spinning={props.devicesLoading} tip="正在查询设施房设备...">
          {props.elements.length > 0 ? (
            <div class="facility-device-binding-list">
              {props.elements.map((element) => {
                const deviceId = draftBindings.value[element.id];
                const loadingProperties = Boolean(deviceId && loadingDeviceIdSet.value.has(deviceId));
                return (
                  <FacilityDeviceBindingRow
                    key={element.id}
                    element={element}
                    deviceId={deviceId}
                    propertyCodes={draftPropertyCodes.value[element.id] ?? EMPTY_PROPERTY_CODES}
                    deviceOptions={deviceOptions.value}
                    propertyOptions={propertyOptions(element.id)}
                    loadingProperties={loadingProperties}
                    bindingSelectVersion={bindingSelectVersions.value[element.id] ?? 0}
                    onUpdateBinding={bindingHandler(element.id)}
                    onUpdatePropertyCodes={propertyHandler(element.id)}
                  />
                );
              })}
            </div>
          ) : (
            <Empty description="当前画面没有需要运行端绑定设备的图元" />
          )}
        </Spin>
      </Modal>
    );
  },
});
