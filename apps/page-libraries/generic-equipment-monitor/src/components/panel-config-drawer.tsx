import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, Checkbox, Drawer, message, Space } from "@g2-platform/pc-ui";
import { defineComponent, reactive, watch, type PropType } from "vue";

import DeviceMonitorCard, { type DeviceMonitorRecord, type PanelConfigItem } from "./device-monitor-card";

import styles from "./panel-config-drawer.module.css";

type ModelType = { deviceProdId?: string; deviceProdName?: string };
type ProductAttr = { propCode: string; propName: string; disabled?: boolean };

function unwrapList(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const data = o.data !== undefined ? o.data : raw;
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === "object") {
      for (const k of ["records", "list", "content"]) {
        if (Array.isArray((data as Record<string, unknown>)[k])) {
          return (data as Record<string, unknown>)[k] as Record<string, unknown>[];
        }
      }
    }
  }
  return [];
}

export default defineComponent({
  name: "GemPanelConfigDrawer",
  props: {
    open: { type: Boolean, default: false },
    applicationCode: { type: String, required: true },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, required: true },
    panelsConfig: { type: Array as PropType<PanelConfigItem[]>, default: () => [] },
    previewItem: { type: Object as PropType<DeviceMonitorRecord | null>, default: null },
  },
  emits: ["update:open", "saved"],
  setup(props, { emit }) {
    const state = reactive({
      models: [] as ModelType[],
      activeProdId: "",
      attrs: [] as ProductAttr[],
      checked: [] as string[],
      saving: false,
    });

    const loadModels = async () => {
      const client = await props.getDeviceClient();
      state.models = unwrapList(await client.getApplicationModels(props.applicationCode)) as ModelType[];
      if (!state.activeProdId && state.models[0]?.deviceProdId) {
        state.activeProdId = String(state.models[0].deviceProdId);
      }
      await loadAttrs();
    };

    const loadAttrs = async () => {
      if (!state.activeProdId) return;
      const client = await props.getDeviceClient();
      const detail = unwrapList(await client.getProdListDetail(state.activeProdId));
      const first = detail[0] || {};
      const propsList = (first.productPropVoList || first.propList || []) as ProductAttr[];
      state.attrs = Array.isArray(propsList) ? propsList.map((p) => ({ propCode: p.propCode, propName: p.propName })) : [];
      const existing = (props.panelsConfig || []).find((c) => c.businessKey === state.activeProdId);
      if (existing?.panelConfig) {
        try {
          const parsed = JSON.parse(existing.panelConfig) as PropConfig[];
          state.checked = parsed.map((p) => p.propCode).filter(Boolean);
        } catch {
          state.checked = [];
        }
      } else {
        state.checked = [];
      }
      syncDisabled();
    };

    type PropConfig = { propCode: string; propName: string };

    const syncDisabled = () => {
      const full = state.checked.length >= 4;
      state.attrs = state.attrs.map((a) => ({
        ...a,
        disabled: full && !state.checked.includes(a.propCode),
      }));
    };

    const save = async () => {
      if (!state.activeProdId) return;
      state.saving = true;
      try {
        const client = await props.getDeviceClient();
        const selected = state.attrs
          .filter((a) => state.checked.includes(a.propCode))
          .map((a) => ({ propCode: a.propCode, propName: a.propName }));
        await client.saveDevicePanelConfig({
          applicationCode: props.applicationCode,
          businessKey: state.activeProdId,
          sceneType: "LIST_PANEL",
          panelConfig: JSON.stringify(selected),
        });
        message.success("保存成功");
        emit("saved");
      } catch (e) {
        message.error(e instanceof Error ? e.message : "保存失败");
      } finally {
        state.saving = false;
      }
    };

    watch(
      () => props.open,
      (open) => {
        if (open) void loadModels();
      },
    );

    return () => (
      <Drawer
        open={props.open}
        width="80%"
        closable={false}
        destroyOnClose
        onClose={() => emit("update:open", false)}
        onUpdate:open={(v: boolean) => emit("update:open", v)}
      >
        <div class={styles.drawerBody}>
          <div class={styles.preview}>
            <div class={styles.previewHint}>预览（最多展示 4 个属性）</div>
            {props.previewItem ? (
              <DeviceMonitorCard
                item={{
                  ...props.previewItem,
                  deviceProdId: state.activeProdId || props.previewItem.deviceProdId,
                }}
                panelsConfig={[
                  {
                    businessKey: state.activeProdId,
                    panelConfig: JSON.stringify(
                      state.attrs
                        .filter((a) => state.checked.includes(a.propCode))
                        .map((a) => ({ propCode: a.propCode, propName: a.propName })),
                    ),
                  },
                ]}
                onMore={() => undefined}
                onToggleCollection={() => undefined}
              />
            ) : (
              <div class={styles.previewHint}>暂无设备数据可预览</div>
            )}
          </div>
          <div class={styles.config}>
            <div class={styles.configTitle}>
              <div class={styles.title}>面板配置</div>
              <div class={styles.tipClose}>
                <span>最多选4个</span>
                <button type="button" class={styles.closeBtn} onClick={() => emit("update:open", false)}>
                  ×
                </button>
              </div>
            </div>
            <div class={styles.line} />
            <div class={styles.configContent}>
              <div class={styles.productTypeList}>
                {state.models.map((m) => (
                  <div
                    key={String(m.deviceProdId)}
                    class={[styles.listItem, state.activeProdId === m.deviceProdId ? styles.listItemActive : ""]}
                    onClick={() => {
                      state.activeProdId = String(m.deviceProdId || "");
                      void loadAttrs();
                    }}
                  >
                    {m.deviceProdName || m.deviceProdId}
                  </div>
                ))}
              </div>
              <div class={styles.attrConfig}>
                <Checkbox.Group
                  value={state.checked}
                  onUpdate:value={(vals) => {
                    state.checked = (vals as Array<string | number | boolean>).map(String).slice(0, 4);
                    syncDisabled();
                  }}
                >
                  {state.attrs.map((a) => (
                    <div class={styles.checkboxItem} key={a.propCode}>
                      <Checkbox value={a.propCode} disabled={a.disabled}>
                        {a.propName}
                      </Checkbox>
                    </div>
                  ))}
                </Checkbox.Group>
              </div>
            </div>
            <div class={styles.actions}>
              <Space>
                <Button onClick={() => emit("update:open", false)}>取消</Button>
                <Button type="primary" loading={state.saving} onClick={() => void save()}>
                  保存
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </Drawer>
    );
  },
});
