import { computed, onMounted, readonly, shallowRef } from "vue";

import type { MemoDraft, MemoNote } from "./types";
import { cubeWorkbenchService } from "@/api/server";
import { message } from "@/pc-ui-runtime";

const SUMMARY_PAGE_SIZE = 5;
export type MemoCreateSource = "summary" | "manager";

const toTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toMemoNote = (memo: { id: string | number; title: string; content: string; createTime: string; updateTime: string }): MemoNote => ({
  id: String(memo.id),
  title: memo.title,
  content: memo.content,
  createdAt: toTimestamp(memo.createTime),
  updatedAt: toTimestamp(memo.updateTime),
});

export const useMemoNotes = () => {
  const summaryNotes = shallowRef<MemoNote[]>([]);
  const total = shallowRef(0);
  const summaryLoading = shallowRef(false);
  const saving = shallowRef(false);
  const deletingId = shallowRef<string | null>(null);
  let summaryRequestVersion = 0;

  const visibleNotes = computed(() => summaryNotes.value);

  const loadSummary = async (): Promise<void> => {
    const requestVersion = ++summaryRequestVersion;
    summaryLoading.value = true;
    try {
      const page = await cubeWorkbenchService.getUserMemoPage({ pageNumber: 1, pageSize: SUMMARY_PAGE_SIZE });
      if (requestVersion !== summaryRequestVersion) return;
      summaryNotes.value = page.records.map(toMemoNote);
      total.value = page.total;
    } catch {
      message.error("备忘录加载失败，请稍后重试");
    } finally {
      if (requestVersion === summaryRequestVersion) summaryLoading.value = false;
    }
  };

  const fetchManagerPage = async (query: {
    pageNumber: number;
    pageSize: number;
    keyword?: string;
  }): Promise<{ total: number; pages: number; records: MemoNote[] }> => {
    const page = await cubeWorkbenchService.getUserMemoPage(query);
    return { ...page, records: page.records.map(toMemoNote) };
  };

  const create = async (draft: MemoDraft): Promise<boolean> => {
    if (saving.value) return false;
    saving.value = true;
    try {
      await cubeWorkbenchService.createUserMemo(draft);
      await loadSummary();
      return true;
    } catch {
      message.error("新增备忘录失败，请稍后重试");
      return false;
    } finally {
      saving.value = false;
    }
  };

  const update = async (id: string, draft: MemoDraft, { source }: { source: MemoCreateSource }): Promise<boolean> => {
    if (saving.value) return false;
    saving.value = true;
    try {
      await cubeWorkbenchService.updateUserMemo(id, draft);
      if (source === "summary") {
        summaryNotes.value = summaryNotes.value.map((note) => (note.id === id ? { ...note, ...draft, updatedAt: Date.now() } : note));
      } else {
        await loadSummary();
      }
      return true;
    } catch {
      message.error("保存备忘录失败，请稍后重试");
      return false;
    } finally {
      saving.value = false;
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    if (deletingId.value) return false;
    deletingId.value = id;
    try {
      await cubeWorkbenchService.deleteUserMemo(id);
      await loadSummary();
      return true;
    } catch {
      message.error("删除备忘录失败，请稍后重试");
      return false;
    } finally {
      deletingId.value = null;
    }
  };

  onMounted(() => void loadSummary());

  return {
    total: readonly(total),
    visibleNotes,
    summaryLoading: readonly(summaryLoading),
    saving: readonly(saving),
    deletingId: readonly(deletingId),
    fetchManagerPage,
    create,
    update,
    remove,
  };
};
