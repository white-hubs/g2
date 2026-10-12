import { Button, Select, Space, Tag } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import { MESSAGE_TARGET_OPTIONS } from "./alarm-config.model";
import TargetPickerModal from "./target-picker-modal";
import type { SelectEnum, TargetModifyParams } from "./types";

type OuaaPickerClient = {
  listUsers: (params?: Record<string, unknown>) => Promise<unknown>;
  getRoles: () => Promise<unknown>;
  getOrganizations: (params?: Record<string, unknown>) => Promise<unknown>;
};

function targetTags(info: TargetModifyParams): { id: string; name: string }[] {
  return info.targetConfig
    .map((item) => {
      if (info.messageTargetNotify === "USER") {
        return item.userId ? { id: String(item.userId), name: String(item.userName || item.userId) } : null;
      }
      if (info.messageTargetNotify === "DEPARTMENT") {
        return item.departmentId ? { id: String(item.departmentId), name: String(item.departmentName || item.departmentId) } : null;
      }
      return item.roleId ? { id: String(item.roleId), name: String(item.roleName || item.roleId) } : null;
    })
    .filter((item): item is { id: string; name: string } => !!item);
}

function mapPickedToConfig(type: Exclude<SelectEnum, null>, picked: { id: string; name: string }[]): TargetModifyParams["targetConfig"] {
  return picked.map((item) => ({
    roleId: type === "ROLE" ? item.id : "",
    roleName: type === "ROLE" ? item.name : "",
    userId: type === "USER" ? item.id : "",
    userName: type === "USER" ? item.name : "",
    departmentId: type === "DEPARTMENT" ? item.id : "",
    departmentName: type === "DEPARTMENT" ? item.name : "",
  }));
}

export default defineComponent({
  name: "GemSelectNotice",
  props: {
    info: { type: Object as PropType<TargetModifyParams>, required: true },
    readonly: { type: Boolean, default: false },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaPickerClient>>, default: undefined },
  },
  emits: ["change"],
  setup(props, { emit }) {
    const local = ref<TargetModifyParams>({ ...props.info });
    const pickerOpen = ref(false);
    const tags = ref<{ id: string; name: string }[]>([]);

    watch(
      () => props.info,
      (info) => {
        local.value = { ...info };
        tags.value = targetTags(info);
      },
      { immediate: true, deep: true },
    );

    const emitChange = (next: TargetModifyParams): void => {
      local.value = next;
      tags.value = targetTags(next);
      emit("change", next);
    };

    const pickerLabel =
      local.value.messageTargetNotify === "DEPARTMENT" ? "选择部门" : local.value.messageTargetNotify === "ROLE" ? "选择角色" : "选择人员";

    return () => (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Space wrap align="center" style={{ marginBottom: 0, marginRight: "8px" }}>
          <Select
            value={local.value.messageTargetNotify ?? undefined}
            disabled={props.readonly}
            options={[...MESSAGE_TARGET_OPTIONS]}
            style={{ width: 200 }}
            placeholder="请选择"
            onUpdate:value={(v: TargetModifyParams["messageTargetNotify"]) => {
              emitChange({ ...local.value, messageTargetNotify: v, targetConfig: [] });
            }}
          />
          {!props.readonly && local.value.messageTargetNotify ? (
            <Button type="primary" onClick={() => (pickerOpen.value = true)}>
              {pickerLabel}
            </Button>
          ) : null}
          {tags.value.map((tag) => (
            <Tag
              key={tag.id}
              closable={!props.readonly}
              onClose={() => {
                const nextTags = tags.value.filter((item) => item.id !== tag.id);
                const type = local.value.messageTargetNotify;
                if (!type) return;
                emitChange({ ...local.value, targetConfig: mapPickedToConfig(type, nextTags) });
              }}
            >
              {tag.name}
            </Tag>
          ))}
        </Space>
        <TargetPickerModal
          open={pickerOpen.value}
          type={(local.value.messageTargetNotify || "USER") as Exclude<SelectEnum, null>}
          selected={tags.value}
          getOuaaClient={props.getOuaaClient}
          onUpdate:open={(v: boolean) => {
            pickerOpen.value = v;
          }}
          onConfirm={(picked: { id: string; name: string }[]) => {
            const type = local.value.messageTargetNotify;
            if (!type) return;
            emitChange({ ...local.value, targetConfig: mapPickedToConfig(type, picked) });
          }}
        />
      </div>
    );
  },
});
