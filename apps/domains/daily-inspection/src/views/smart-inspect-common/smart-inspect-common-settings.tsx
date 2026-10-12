// @ts-nocheck -- 从 cube daily-inspection smart-inspect-common 迁入。
import { Switch, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, watch, type PropType } from "vue";

import { PersonLiableSelectCheck } from "@/compat/app-design";

import styles from "./smart-inspect-page.module.css";

export interface SmartInspectCommonSettingsValue {
  isCheck: boolean;
  method: string;
  checkUserType: string;
  checkUserIds: string[];
  checkRoleIds: unknown;
  checkPostIds: unknown;
  checkDeptIds: unknown;
  checkUserNames?: string;
  checkRoleNames?: string;
  checkPostNames?: string;
  checkDeptNames?: string;
}

export const createSmartInspectCommonSettingsValue = (): SmartInspectCommonSettingsValue => ({
  isCheck: false,
  method: "",
  checkUserType: "1",
  checkUserIds: [],
  checkRoleIds: null,
  checkPostIds: null,
  checkDeptIds: null,
});

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value ? value.split(",").filter(Boolean) : [];
  return [];
};

const toBoolean = (value: unknown): boolean => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const getCheckUserText = (settings: SmartInspectCommonSettingsValue): string => {
  return (
    settings.checkUserNames ||
    settings.checkRoleNames ||
    settings.checkPostNames ||
    settings.checkDeptNames ||
    toArray(settings.checkUserIds).join(",") ||
    "--"
  );
};

const normalizeSettings = (
  value: Partial<SmartInspectCommonSettingsValue> | Record<string, unknown> = {},
): SmartInspectCommonSettingsValue => {
  return {
    ...createSmartInspectCommonSettingsValue(),
    ...value,
    isCheck: toBoolean(value.isCheck),
    method: value.method === "SCAN_CODE" || value.method === true ? "SCAN_CODE" : "",
    checkUserType: String(value.checkUserType || "1"),
    checkUserIds: toArray(value.checkUserIds),
  };
};

export const SmartInspectCommonSettings = defineComponent({
  name: "SmartInspectCommonSettings",
  props: {
    value: {
      type: Object as PropType<Partial<SmartInspectCommonSettingsValue> | Record<string, unknown>>,
      default: () => ({}),
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:value"],
  setup: (props, { emit, expose }) => {
    const state = reactive<{ settings: SmartInspectCommonSettingsValue }>({
      settings: normalizeSettings(props.value),
    });

    const getSettings = (): SmartInspectCommonSettingsValue => ({
      ...state.settings,
      checkUserIds: toArray(state.settings.checkUserIds),
    });

    const emitSettings = (): void => {
      emit("update:value", getSettings());
    };

    const updateField = (fieldName: keyof SmartInspectCommonSettingsValue, value: unknown): void => {
      (state.settings as Record<string, unknown>)[fieldName] = value;
      if (fieldName === "isCheck" && !toBoolean(value)) {
        state.settings.checkUserType = "1";
        state.settings.checkUserIds = [];
        state.settings.checkRoleIds = null;
        state.settings.checkPostIds = null;
        state.settings.checkDeptIds = null;
      }
      emitSettings();
    };

    const validate = async (): Promise<SmartInspectCommonSettingsValue> => {
      const settings = getSettings();
      if (!settings.isCheck) return settings;
      if (!settings.checkUserType) {
        message.error("请选择稽查人");
        return Promise.reject(new Error("check user required"));
      }
      if (settings.checkUserType === "1" && !toArray(settings.checkUserIds).length) {
        message.error("请选择稽查人");
        return Promise.reject(new Error("check user required"));
      }
      if (settings.checkUserType === "2" && !settings.checkRoleIds && !settings.checkPostIds && !settings.checkDeptIds) {
        message.error("请选择稽查人部门");
        return Promise.reject(new Error("check user department required"));
      }
      return settings;
    };

    watch(
      () => props.value,
      (value) => {
        state.settings = normalizeSettings(value);
      },
      { deep: true, immediate: true },
    );

    expose({
      validate,
      getSettings,
    });

    const EditSettings = (): JSX.Element => (
      <div class={styles["common-settings"]}>
        <div class={styles["common-switch-row"]}>
          <label class={styles["common-switch-item"]}>
            <span class={styles["common-switch-label"]}>是否需要稽查：</span>
            <Switch
              checked={state.settings.isCheck}
              onUpdate:checked={(value: boolean) => {
                updateField("isCheck", value);
              }}
            />
          </label>
          <label class={styles["common-switch-item"]}>
            <span class={styles["common-switch-label"]}>扫码巡检：</span>
            <Switch
              checked={state.settings.method === "SCAN_CODE"}
              checkedChildren="是"
              unCheckedChildren="否"
              onUpdate:checked={(value: boolean) => {
                updateField("method", value ? "SCAN_CODE" : "");
              }}
            />
          </label>
        </div>
        {state.settings.isCheck && (
          <div class={styles["common-check-row"]}>
            <span class={styles["common-check-label"]}>稽查人：</span>
            <div class={styles["common-check-field"]}>
              <PersonLiableSelectCheck
                value={state.settings.checkUserType}
                onUpdate:value={(value: string) => {
                  updateField("checkUserType", value);
                  updateField("checkUserIds", []);
                  updateField("checkDeptIds", null);
                  updateField("checkPostIds", []);
                  updateField("checkRoleIds", []);
                }}
                checkUserIds={state.settings.checkUserIds}
                onUpdate:checkUserIds={(value: unknown) => {
                  updateField("checkUserIds", toArray(value));
                }}
                checkPostIds={state.settings.checkPostIds}
                onUpdate:checkPostIds={(value: unknown) => {
                  updateField("checkPostIds", value);
                }}
                checkDeptIds={state.settings.checkDeptIds}
                onUpdate:checkDeptIds={(value: unknown) => {
                  updateField("checkDeptIds", value);
                }}
                checkRoleIds={state.settings.checkRoleIds}
                onUpdate:checkRoleIds={(value: unknown) => {
                  updateField("checkRoleIds", value);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );

    const ReadonlySettings = (): JSX.Element => (
      <div class={styles["common-settings-readonly"]}>
        <div class={styles["summary-item"]}>
          <div class={styles["summary-label"]}>是否需要稽查</div>
          <div class={styles["summary-value"]}>{state.settings.isCheck ? "是" : "否"}</div>
        </div>
        <div class={styles["summary-item"]}>
          <div class={styles["summary-label"]}>扫码巡检</div>
          <div class={styles["summary-value"]}>{state.settings.method ? "是" : "否"}</div>
        </div>
        {state.settings.isCheck && (
          <div class={styles["summary-item"]}>
            <div class={styles["summary-label"]}>稽查人</div>
            <div class={styles["summary-value"]}>{getCheckUserText(state.settings)}</div>
          </div>
        )}
      </div>
    );

    return (): JSX.Element => (props.readonly ? <ReadonlySettings /> : <EditSettings />);
  },
});
