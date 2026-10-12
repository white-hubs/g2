import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { onScopeDispose, ref, watch } from "vue";

export interface ArchiveFieldValue {
  id: string;
  name: string;
}
export interface ArchiveFieldData {
  client: Pick<StreamEngineClient, "getStaffDetail" | "getStaffInfo">;
  sourceId: string;
  attr: string;
  sponsor: boolean;
  detail: boolean;
  readonly: boolean;
}

/** 档案属性可能没有业务 id，旧数据以空 id 和 name 保存。 */
export function archiveFieldValue(value: unknown): ArchiveFieldValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as { id?: unknown; name?: unknown };
  return { id: String(record.id ?? ""), name: String(record.name ?? "") };
}

export function useArchiveField(
  data: ArchiveFieldData,
  onValue: (value: ArchiveFieldValue | null) => void,
  onError: (error: unknown) => void,
) {
  const loading = ref(false);
  let requestVersion = 0;
  watch(
    [() => data.sourceId, () => data.attr, () => data.detail, () => data.readonly] as const,
    async ([sourceId, attr, detail, readonly], previous) => {
      const version = ++requestVersion;
      const changedSource = previous?.[0] !== undefined && (previous[0] !== sourceId || previous[1] !== attr);
      if (!sourceId || ["MALE", "FEMALE", "NONE"].includes(sourceId) || (detail && (readonly || !changedSource))) {
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const result = data.sponsor ? await data.client.getStaffDetail(sourceId) : await data.client.getStaffInfo({ attr, id: sourceId });
        if (version === requestVersion) {
          onValue(result?.name ? archiveFieldValue(result) : null);
        }
      } catch (error) {
        if (version === requestVersion) {
          onError(error);
        }
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    requestVersion++;
  });
  return { loading };
}
