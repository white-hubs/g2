import { computed, defineComponent, onMounted, shallowRef, watch } from "vue";

import { useAuthRequest } from "@/api/request";
import { pageRiskObjects, pageUnits, type RiskObjectVO, type RiskUnitVO } from "@/api/risk-graded-control";
import { Select, message } from "@/pc-ui-runtime";

type OptionSource = RiskUnitVO | RiskObjectVO;

interface SelectOption<T extends OptionSource = OptionSource> {
  label: string;
  value: string;
  source?: T;
}

export interface RiskUnitObjectChangePayload {
  unitId: string;
  unitName: string;
  unit?: RiskUnitVO;
  objectId: string;
  objectName: string;
  object?: RiskObjectVO;
}

const PAGE_SIZE = 500;

const readText = (...values: Array<string | number | undefined | null>): string => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined || value === null ? "" : String(value);
};

const createUniqueOptions = <T extends OptionSource>(options: Array<SelectOption<T>>): Array<SelectOption<T>> => {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
};

const mapUnitOption = (unit: RiskUnitVO): SelectOption<RiskUnitVO> => {
  const value = readText(unit.id, unit.unitId);
  const name = readText(unit.unitName, unit.name, unit.code, value);
  return {
    label: unit.code ? `${name}（${unit.code}）` : name,
    value,
    source: unit,
  };
};

const mapRiskObjectOption = (object: RiskObjectVO): SelectOption<RiskObjectVO> => {
  const value = readText(object.id, object.objectId);
  const name = readText(object.objectName, object.name, object.objectCode, object.code, value);
  const code = readText(object.objectCode, object.code);
  return {
    label: code && code !== name ? `${name}（${code}）` : name,
    value,
    source: object,
  };
};

const readOption = <T extends OptionSource>(option: unknown): SelectOption<T> | undefined => {
  if (Array.isArray(option)) return option[0] as SelectOption<T> | undefined;
  return option as SelectOption<T> | undefined;
};

const readSelectValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value);
};

export const RiskUnitObjectSelect = defineComponent({
  name: "RiskUnitObjectSelect",
  props: {
    unitValue: {
      type: String,
      default: "",
    },
    objectValue: {
      type: String,
      default: "",
    },
    unitName: {
      type: String,
      default: "",
    },
    objectName: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    allowClear: {
      type: Boolean,
      default: true,
    },
    unitPlaceholder: {
      type: String,
      default: "请选择风险单元",
    },
    objectPlaceholder: {
      type: String,
      default: "请先选择风险单元",
    },
    unitLabel: {
      type: String,
      default: "风险单元",
    },
    objectLabel: {
      type: String,
      default: "风险对象",
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:unitValue", "update:objectValue", "update:unitName", "update:objectName", "change"],
  setup: (props, { emit }) => {
    const unitOptions = shallowRef<Array<SelectOption<RiskUnitVO>>>([]);
    const objectOptions = shallowRef<Array<SelectOption<RiskObjectVO>>>([]);
    const unitLoading = shallowRef(false);
    const objectLoading = shallowRef(false);

    const allUnitOptions = computed(() =>
      createUniqueOptions(
        [props.unitValue ? { label: props.unitName || props.unitValue, value: props.unitValue } : undefined, ...unitOptions.value].filter(
          Boolean,
        ) as Array<SelectOption<RiskUnitVO>>,
      ),
    );

    const allObjectOptions = computed(() =>
      createUniqueOptions(
        [
          props.objectValue ? { label: props.objectName || props.objectValue, value: props.objectValue } : undefined,
          ...objectOptions.value,
        ].filter(Boolean) as Array<SelectOption<RiskObjectVO>>,
      ),
    );

    const emitChange = (
      nextUnit: Pick<RiskUnitObjectChangePayload, "unitId" | "unitName" | "unit">,
      nextObject: Pick<RiskUnitObjectChangePayload, "objectId" | "objectName" | "object">,
    ): void => {
      emit("change", {
        ...nextUnit,
        ...nextObject,
      } satisfies RiskUnitObjectChangePayload);
    };

    const loadUnits = async (keyword = ""): Promise<void> => {
      unitLoading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pageUnits({
            pageNumber: 1,
            pageSize: PAGE_SIZE,
            keyword: keyword.trim() || undefined,
            view: "option",
          }),
        );
        unitOptions.value = (page.records ?? []).map(mapUnitOption).filter((option) => option.value);
      } catch (error) {
        console.error(error);
        message.error("加载风险单元失败");
      } finally {
        unitLoading.value = false;
      }
    };

    const loadRiskObjects = async (unitId: string, keyword = ""): Promise<void> => {
      if (!unitId) {
        objectOptions.value = [];
        return;
      }
      objectLoading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pageRiskObjects({
            unitId,
            pageNumber: 1,
            pageSize: PAGE_SIZE,
            keyword: keyword.trim() || undefined,
            view: "option",
          }),
        );
        objectOptions.value = (page.records ?? []).map(mapRiskObjectOption).filter((option) => option.value);
      } catch (error) {
        console.error(error);
        message.error("加载风险对象失败");
      } finally {
        objectLoading.value = false;
      }
    };

    const updateUnit = (value: unknown, option?: SelectOption<RiskUnitVO>): void => {
      const unitId = readSelectValue(value);
      const unitName = option?.label || "";
      emit("update:unitValue", unitId);
      emit("update:unitName", unitName);
      emit("update:objectValue", "");
      emit("update:objectName", "");
      objectOptions.value = [];
      emitChange({ unitId, unitName, unit: option?.source }, { objectId: "", objectName: "" });
      if (unitId) void loadRiskObjects(unitId);
    };

    const updateObject = (value: unknown, option?: SelectOption<RiskObjectVO>): void => {
      const objectId = readSelectValue(value);
      const objectName = option?.label || "";
      emit("update:objectValue", objectId);
      emit("update:objectName", objectName);
      emitChange({ unitId: props.unitValue, unitName: props.unitName }, { objectId, objectName, object: option?.source });
    };

    watch(
      () => props.unitValue,
      (unitId) => {
        if (!unitId) {
          objectOptions.value = [];
          return;
        }
        void loadRiskObjects(unitId);
      },
    );

    onMounted(() => {
      void loadUnits();
      if (props.unitValue) void loadRiskObjects(props.unitValue);
    });

    return (): JSX.Element => (
      <div class="hazard-risk-unit-object-select">
        <div class="hazard-risk-unit-object-field">
          <div class="hazard-risk-unit-object-label">
            {props.required ? <span class="hazard-risk-unit-object-required">*</span> : null}
            {props.unitLabel}
          </div>
          <Select
            value={props.unitValue}
            options={allUnitOptions.value}
            loading={unitLoading.value}
            disabled={props.disabled}
            allowClear={props.allowClear}
            showSearch
            filterOption={false}
            placeholder={props.unitPlaceholder}
            onSearch={(keyword: string) => {
              void loadUnits(keyword);
            }}
            onChange={(value: unknown, option: unknown) => {
              updateUnit(value, readOption<RiskUnitVO>(option));
            }}
          />
        </div>
        <div class="hazard-risk-unit-object-field">
          <div class="hazard-risk-unit-object-label">
            {props.required ? <span class="hazard-risk-unit-object-required">*</span> : null}
            {props.objectLabel}
          </div>
          <Select
            value={props.objectValue}
            options={allObjectOptions.value}
            loading={objectLoading.value}
            disabled={props.disabled || !props.unitValue}
            allowClear={props.allowClear}
            showSearch
            filterOption={false}
            placeholder={props.unitValue ? "请选择风险对象" : props.objectPlaceholder}
            onSearch={(keyword: string) => {
              void loadRiskObjects(props.unitValue, keyword);
            }}
            onChange={(value: unknown, option: unknown) => {
              updateObject(value, readOption<RiskObjectVO>(option));
            }}
          />
        </div>
      </div>
    );
  },
});
