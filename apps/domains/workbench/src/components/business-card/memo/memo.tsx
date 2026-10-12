import { PlusOutlined } from "@ant-design/icons-vue";
import { defineComponent, nextTick, reactive, shallowRef } from "vue";

import PanelCard from "../../card/card";
import MemoEditorModal from "./memo-editor-modal";
import MemoManagerModal from "./memo-manager-modal";
import type { MemoDraft, MemoNote } from "./types";
import { type MemoCreateSource, useMemoNotes } from "./use-memo-notes";
import { Button, Empty, Input, PopConfirm, PopOver, Textarea, Tooltip } from "@/pc-ui-runtime";

import "./memo.less";

const formatMemoTime = (timestamp: number): string =>
  new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(timestamp);

const getPopoverContainer = (triggerNode: HTMLElement | null | undefined): HTMLElement =>
  triggerNode?.closest(".card-container") ?? document.body;

export default defineComponent({
  name: "Memo",
  emits: ["close"],
  setup(_, { emit }) {
    const { visibleNotes, summaryLoading, saving, deletingId, fetchManagerPage, create, update, remove } = useMemoNotes();
    const editorVisible = shallowRef(false);
    const managerVisible = shallowRef(false);
    const editingNote = shallowRef<MemoNote | null>(null);
    const inlineEditingId = shallowRef<string | null>(null);
    const expandedMemoId = shallowRef<string | null>(null);
    const inlineEditingElement = shallowRef<HTMLElement | null>(null);
    const inlineDraft = reactive<MemoDraft>({ title: "", content: "" });
    const createSource = shallowRef<MemoCreateSource>("summary");
    const managerRefreshKey = shallowRef(0);

    const openCreate = (source: MemoCreateSource): void => {
      editingNote.value = null;
      createSource.value = source;
      editorVisible.value = true;
    };

    const openEdit = (note: MemoNote): void => {
      editingNote.value = note;
      editorVisible.value = true;
    };

    const openManager = (): void => {
      managerVisible.value = true;
      managerRefreshKey.value += 1;
    };

    const startInlineEdit = (note: MemoNote): void => {
      inlineDraft.title = note.title;
      inlineDraft.content = note.content;
      inlineEditingId.value = note.id;
      void nextTick(() => {
        inlineEditingElement.value?.querySelector<HTMLInputElement>("input")?.focus();
      });
    };

    const handlePopoverVisibility = (id: string, visible: boolean): void => {
      if (!visible && inlineEditingId.value === id) {
        inlineEditingId.value = null;
      }
      expandedMemoId.value = visible ? id : null;
    };

    const saveInlineEdit = async (): Promise<void> => {
      const id = inlineEditingId.value;
      const title = inlineDraft.title.trim().slice(0, 10);
      const content = inlineDraft.content.trim().slice(0, 100);
      if (id && title && content) {
        const saved = await update(id, { title, content }, { source: "summary" });
        if (saved) {
          inlineEditingId.value = null;
          expandedMemoId.value = null;
        }
      }
    };

    const cancelInlineEdit = (): void => {
      inlineEditingId.value = null;
    };

    const saveNote = async (draft: MemoDraft): Promise<void> => {
      const normalizedDraft = {
        title: draft.title.trim().slice(0, 10),
        content: draft.content.trim().slice(0, 100),
      } satisfies MemoDraft;
      const saved = editingNote.value
        ? await update(editingNote.value.id, normalizedDraft, { source: "manager" })
        : await create(normalizedDraft);
      if (saved) {
        editorVisible.value = false;
        if (createSource.value === "manager" || editingNote.value) managerRefreshKey.value += 1;
      }
    };

    const removeNote = async (id: string): Promise<void> => {
      if (await remove(id)) managerRefreshKey.value += 1;
    };

    const removeSummaryNote = async (id: string): Promise<void> => {
      inlineEditingId.value = null;
      expandedMemoId.value = null;
      await remove(id);
    };

    return () => (
      <PanelCard title="个人备忘录" icon="icon-gerenbeiwanglu" onClose={() => emit("close")}>
        {{
          btn: () => (
            <span class="memo-actions">
              <button class="memo-action" type="button" onClick={() => openCreate("summary")}>
                <PlusOutlined /> 新增备忘录
              </button>
              <button class="memo-action" type="button" onClick={openManager}>
                查看全部 &gt;
              </button>
            </span>
          ),
          default: () => (
            <>
              {summaryLoading.value ? (
                <div class="business-card-empty">
                  <Empty description="备忘录加载中" />
                </div>
              ) : visibleNotes.value.length ? (
                <div class="memo-card__list">
                  {visibleNotes.value.map((note) => (
                    <PopOver
                      key={note.id}
                      open={expandedMemoId.value === note.id}
                      trigger={["click"]}
                      placement="bottom"
                      overlayClassName="memo-expanded-popover"
                      getPopupContainer={getPopoverContainer}
                      onOpenChange={(visible: boolean) => handlePopoverVisibility(note.id, visible)}
                      v-slots={{
                        default: () => (
                          <Tooltip title="点击查看">
                            <button class="memo-item" type="button">
                              <span class="memo-item__tag-column">
                                <span class="memo-item__tag memo-item__tag--blue">{note.title}</span>
                                <time class="memo-item__time">{formatMemoTime(note.updatedAt)}</time>
                              </span>
                              <span class="memo-item__content">{note.content}</span>
                            </button>
                          </Tooltip>
                        ),
                        content: () => (
                          <div class="memo-expanded-popover__body">
                            {inlineEditingId.value === note.id ? (
                              <div
                                ref={(element) => (inlineEditingElement.value = element as HTMLElement | null)}
                                class="memo-expanded-popover__editor"
                              >
                                <Input
                                  value={inlineDraft.title}
                                  maxlength={10}
                                  placeholder="请输入标题"
                                  onUpdate:value={(value: string) => (inlineDraft.title = value)}
                                />
                                <Textarea
                                  value={inlineDraft.content}
                                  rows={5}
                                  maxlength={100}
                                  placeholder="请输入内容"
                                  onUpdate:value={(value: string) => (inlineDraft.content = value)}
                                />
                                <div class="memo-expanded-popover__footer">
                                  <Button onClick={cancelInlineEdit}>取消</Button>
                                  <Button type="primary" loading={saving.value} onClick={() => void saveInlineEdit()}>
                                    保存
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div class="memo-expanded-popover__header">
                                  <span class="memo-item__tag memo-item__tag--blue">{note.title}</span>
                                  <div class="memo-expanded-popover__actions">
                                    <Button type="link" disabled={Boolean(deletingId.value)} onClick={() => startInlineEdit(note)}>
                                      编辑
                                    </Button>
                                    <PopConfirm
                                      title="确定删除这条备忘录吗？"
                                      okText="删除"
                                      cancelText="取消"
                                      onConfirm={() => void removeSummaryNote(note.id)}
                                    >
                                      <Button
                                        danger
                                        type="link"
                                        loading={deletingId.value === note.id}
                                        disabled={Boolean(deletingId.value) && deletingId.value !== note.id}
                                      >
                                        删除
                                      </Button>
                                    </PopConfirm>
                                  </div>
                                </div>
                                <div class="memo-expanded-popover__content">{note.content}</div>
                              </>
                            )}
                          </div>
                        ),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div class="business-card-empty">
                  <Empty description="暂无备忘录，点击右上角新增" />
                </div>
              )}
              <MemoEditorModal
                visible={editorVisible.value}
                note={editingNote.value}
                submitting={saving.value}
                onCancel={() => (editorVisible.value = false)}
                onSubmit={(draft: MemoDraft) => void saveNote(draft)}
              />
              <MemoManagerModal
                visible={managerVisible.value}
                refreshKey={managerRefreshKey.value}
                deletingId={deletingId.value ?? undefined}
                fetchPage={fetchManagerPage}
                onCancel={() => (managerVisible.value = false)}
                onCreate={() => openCreate("manager")}
                onEdit={openEdit}
                onDelete={(id: string) => void removeNote(id)}
              />
            </>
          ),
        }}
      </PanelCard>
    );
  },
});
