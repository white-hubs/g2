import type { ElectricalFacilityOverview } from "@g2-contract/electrical-safety";
import { Empty, Modal, Select, Tag, message } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, shallowRef, watch } from "vue";

import { type ElectricalCenterFacilityBindingSelection, facilityOverviewToScadaProperties } from "@/utils/electrical-center-scada-binding";
import type { ScadaBindableElementSummary } from "@/utils/scada-pages";

const FULL_WIDTH_STYLE = { width: "100%" } as const;
const EMPTY_PROPERTY_OPTIONS: { label: string; value: string }[] = [];
const EMPTY_PROPERTY_CODES: string[] = [];

const CenterFacilityBindingRow = defineComponent({
  name: "CenterFacilityBindingRow",
  props: {
    element: { type: Object as PropType<ScadaBindableElementSummary>, required: true },
    facilityId: { type: String, default: undefined },
    propertyCodes: { type: Array as PropType<string[]>, required: true },
    facilityOptions: { type: Array as PropType<{ label: string; value: string }[]>, required: true },
    propertyOptions: { type: Array as PropType<{ label: string; value: string }[]>, required: true },
    bindingSelectVersion: { type: Number, default: 0 },
  },
  emits: {
    updateBinding: (_facilityId?: string): boolean => true,
    updatePropertyCodes: (_codes: string[]): boolean => true,
  },
  setup(props, { emit }) {
    const updateBinding = (facilityId?: string): void => emit("updateBinding", facilityId);
    const updatePropertyCodes = (codes: string[]): void => emit("updatePropertyCodes", codes);

    return (): JSX.Element => (
      <div class="center-facility-binding-item">
        <div>
          <strong>{props.element.name}</strong>
          <small>{props.element.id}</small>
        </div>
        <Select
          key={`facility-binding-${props.element.id}-${props.bindingSelectVersion}`}
          allowClear
          showSearch
          optionFilterProp="label"
          value={props.facilityId || undefined}
          options={props.facilityOptions}
          placeholder="选择设施房"
          style={FULL_WIDTH_STYLE}
          onUpdate:value={(value) => updateBinding(typeof value === "string" ? value : undefined)}
        />
        {props.element.type === "product-property-panel" ? (
          <Select
            allowClear
            mode="multiple"
            maxTagCount={2}
            value={props.propertyCodes}
            options={props.propertyOptions}
            disabled={!props.facilityId}
            placeholder={props.facilityId ? "选择展示属性" : "请先选择设施房"}
            style={FULL_WIDTH_STYLE}
            onUpdate:value={(value) => updatePropertyCodes(Array.isArray(value) ? value.map(String) : [])}
          />
        ) : (
          <span class="center-facility-binding-no-properties">该图元不展示属性</span>
        )}
        {props.facilityId ? <Tag color="green">已绑定</Tag> : <Tag>未绑定</Tag>}
      </div>
    );
  },
});

export const CenterFacilityBindingModal = defineComponent({
  name: "CenterFacilityBindingModal",
  props: {
    open: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    elements: { type: Array as PropType<ScadaBindableElementSummary[]>, default: () => [] },
    facilities: { type: Array as PropType<ElectricalFacilityOverview[]>, default: () => [] },
    currentBindings: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    currentPropertyCodes: { type: Object as PropType<Record<string, string[]>>, default: () => ({}) },
  },
  emits: ["cancel", "submit"],
  setup(props, { emit }) {
    const draftBindings = shallowRef<Record<string, string>>({});
    const draftPropertyCodes = shallowRef<Record<string, string[]>>({});
    const bindingSelectVersions = shallowRef<Record<string, number>>({});
    const bindingHandlers = new Map<string, (facilityId?: string) => void>();
    const propertyHandlers = new Map<string, (propCodes: string[]) => void>();

    const isPropertyPanel = (element: ScadaBindableElementSummary): boolean => element.type === "product-property-panel";

    const elementById = computed(() => new Map(props.elements.map((element) => [element.id, element])));
    const facilityOptions = computed(() =>
      props.facilities.map((facility) => ({
        label: facility.facilityName,
        value: String(facility.facilityId),
      })),
    );
    const propertyOptionsByFacilityId = computed(() =>
      Object.fromEntries(
        props.facilities.map((facility) => [
          String(facility.facilityId),
          facilityOverviewToScadaProperties(facility).map((property) => ({
            label: property.unitName ? `${property.propName}（${property.unitName}）` : property.propName,
            value: property.propCode,
          })),
        ]),
      ),
    );

    const propertyOptions = (elementId: string) => {
      const facilityId = draftBindings.value[elementId];
      return facilityId ? (propertyOptionsByFacilityId.value[facilityId] ?? EMPTY_PROPERTY_OPTIONS) : EMPTY_PROPERTY_OPTIONS;
    };

    watch(
      () => props.open,
      (open) => {
        if (open) {
          draftBindings.value = { ...props.currentBindings };
          draftPropertyCodes.value = Object.fromEntries(
            props.elements.flatMap((element) => {
              if (!isPropertyPanel(element) || !props.currentBindings[element.id]) {
                return [];
              }
              const availableCodes = propertyOptions(element.id).map((option) => option.value);
              const currentCodes = Object.hasOwn(props.currentPropertyCodes, element.id)
                ? (props.currentPropertyCodes[element.id] ?? [])
                : availableCodes;
              return [[element.id, currentCodes.filter((code) => availableCodes.includes(code))]];
            }),
          );
        }
      },
    );

    const updateBinding = (elementId: string, facilityId?: string): void => {
      const element = elementById.value.get(elementId);
      if (!element) {
        return;
      }
      if (
        facilityId &&
        Object.entries(draftBindings.value).some(
          ([boundElementId, boundFacilityId]) => boundElementId !== elementId && boundFacilityId === facilityId,
        )
      ) {
        bindingSelectVersions.value = {
          ...bindingSelectVersions.value,
          [elementId]: (bindingSelectVersions.value[elementId] ?? 0) + 1,
        };
        message.warning("该设施房已绑定其他组态图元");
        return;
      }
      const next = { ...draftBindings.value };
      if (facilityId) {
        next[elementId] = facilityId;
      } else {
        delete next[elementId];
      }
      draftBindings.value = next;

      const nextPropertyCodes = { ...draftPropertyCodes.value };
      if (facilityId && isPropertyPanel(element)) {
        nextPropertyCodes[elementId] = propertyOptions(elementId).map((option) => option.value);
      } else {
        delete nextPropertyCodes[elementId];
      }
      draftPropertyCodes.value = nextPropertyCodes;
    };

    const updatePropertyCodes = (elementId: string, propCodes: string[]): void => {
      draftPropertyCodes.value = { ...draftPropertyCodes.value, [elementId]: [...propCodes] };
    };

    const bindingHandler = (elementId: string): ((facilityId?: string) => void) => {
      const cached = bindingHandlers.get(elementId);
      if (cached) {
        return cached;
      }
      const handler = (facilityId?: string): void => updateBinding(elementId, facilityId);
      bindingHandlers.set(elementId, handler);
      return handler;
    };

    const propertyHandler = (elementId: string): ((propCodes: string[]) => void) => {
      const cached = propertyHandlers.get(elementId);
      if (cached) {
        return cached;
      }
      const handler = (propCodes: string[]): void => updatePropertyCodes(elementId, propCodes);
      propertyHandlers.set(elementId, handler);
      return handler;
    };

    const submit = (): void => {
      const elementFacilityIds = Object.fromEntries(Object.entries(draftBindings.value).filter(([, facilityId]) => Boolean(facilityId)));
      const elementPropertyCodes = Object.fromEntries(
        props.elements.flatMap((element) =>
          isPropertyPanel(element) && elementFacilityIds[element.id]
            ? [[element.id, [...(draftPropertyCodes.value[element.id] ?? [])]]]
            : [],
        ),
      );
      emit("submit", { elementFacilityIds, elementPropertyCodes } satisfies ElectricalCenterFacilityBindingSelection);
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
        <div class="center-facility-binding-tip">
          每个组态图元可绑定一个电气设施房，同一设施房不重复绑定。产品属性面板可继续选择需要展示的设施房属性。
          <small>
            组态逻辑 Tag 可使用 facilityName、hasActiveAlarm、electricalDeviceTotal、electricalDeviceOnline、
            electricalDeviceOnlineRate，以及设施房展示属性的 propertyCode。
          </small>
        </div>
        {props.elements.length > 0 ? (
          <div class="center-facility-binding-list">
            {props.elements.map((element) => {
              const facilityId = draftBindings.value[element.id];
              return (
                <CenterFacilityBindingRow
                  key={element.id}
                  element={element}
                  facilityId={facilityId}
                  propertyCodes={draftPropertyCodes.value[element.id] ?? EMPTY_PROPERTY_CODES}
                  facilityOptions={facilityOptions.value}
                  propertyOptions={propertyOptions(element.id)}
                  bindingSelectVersion={bindingSelectVersions.value[element.id] ?? 0}
                  onUpdateBinding={bindingHandler(element.id)}
                  onUpdatePropertyCodes={propertyHandler(element.id)}
                />
              );
            })}
          </div>
        ) : (
          <Empty description="当前画面没有需要运行端绑定的图元" />
        )}
      </Modal>
    );
  },
});
