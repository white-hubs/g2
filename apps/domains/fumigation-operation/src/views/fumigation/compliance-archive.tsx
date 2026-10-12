import { Button, Space, Spin, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { loadFumigationWorkToCache } from "./api";
import { ArchiveDocumentView } from "./archive-document-view";
import { EmptyBlock, FixedActionFooter } from "./components";
import { FumigationPageShell } from "./fumigation-page-shell";
import { readQueryValue } from "./navigation-utils";
import { fumigationState, replaceFumigationArchives, upsertFumigationArchive, type ArchiveRecord, type FumigationWork } from "./state";
import { sameSnowflakeId } from "./worker-utils";
import { generateFumigationArchive, listFumigationArchives } from "@/api/fumigation-client";

import "./fumigation.less";

export const FumigationComplianceArchive = defineComponent({
  name: "FumigationComplianceArchive",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const selectedWorkId = ref(readQueryValue(route.query.workId));
    const activeArchiveId = ref("");
    const generating = shallowRef(false);
    const pageLoading = shallowRef(false);

    const currentWork = computed(() => fumigationState.works.find((work) => sameSnowflakeId(work.id, selectedWorkId.value)));
    const pageTitle = computed(() => {
      const work = currentWork.value;
      if (work?.code) {
        return activeArchiveId.value !== "" ? `合规档案 - ${work.code}` : work.code;
      }
      return "合规档案";
    });

    const loadArchiveState = async (work: FumigationWork): Promise<void> => {
      pageLoading.value = true;
      try {
        const archives = await listFumigationArchives({ pageNumber: 1, pageSize: 20, workId: work.id });
        replaceFumigationArchives(archives.records as ArchiveRecord[]);
        activeArchiveId.value = archives.records[0]?.id ?? "";
      } catch (error) {
        replaceFumigationArchives([]);
        activeArchiveId.value = "";
        message.error((error as Error).message || "获取合规档案数据失败");
      } finally {
        pageLoading.value = false;
      }
    };

    const loadWorkDetail = (workId: string): void => {
      if (workId === "") {
        return;
      }
      activeArchiveId.value = "";
      void loadFumigationWorkToCache(workId)
        .then(async (work) => {
          if (work == null) {
            return;
          }
          await loadArchiveState(work);
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "获取作业详情失败");
        });
    };

    const handleGenerate = async (): Promise<void> => {
      const work = currentWork.value;
      if (work == null) {
        message.warning("缺少作业编号");
        return;
      }
      generating.value = true;
      try {
        const archive = (await generateFumigationArchive(work.id)) as ArchiveRecord;
        upsertFumigationArchive(archive);
        activeArchiveId.value = archive.id;
        message.success("合规档案已生成");
      } catch (error) {
        message.error((error as Error).message || "生成合规档案失败");
      } finally {
        generating.value = false;
      }
    };

    watch(
      () => currentWork.value?.code,
      (code) => {
        if (code != null && code !== "") {
          route.meta.title = activeArchiveId.value !== "" ? `合规档案 - ${code}` : code;
        }
      },
      { immediate: true },
    );

    watch(
      () => route.query.workId,
      (workId) => {
        const nextWorkId = readQueryValue(workId);
        if (nextWorkId === "") {
          return;
        }
        selectedWorkId.value = nextWorkId;
        loadWorkDetail(nextWorkId);
      },
    );

    onMounted(() => {
      if (selectedWorkId.value !== "") {
        loadWorkDetail(selectedWorkId.value);
        return;
      }
      message.warning("缺少作业编号，请从列表进入合规档案");
    });

    return (): JSX.Element => {
      const work = currentWork.value;
      const hasArchive = activeArchiveId.value !== "";

      return (
        <FumigationPageShell
          title={pageTitle.value}
          showFooter={true}
          v-slots={{
            "layout-content": () =>
              pageLoading.value ? (
                <div class="fumigation-empty">
                  <Spin />
                </div>
              ) : work == null ? (
                <EmptyBlock text="暂无合规档案作业" />
              ) : hasArchive ? (
                <ArchiveDocumentView archiveId={activeArchiveId.value} />
              ) : (
                <EmptyBlock text="作业已归档，点击下方按钮生成合规档案" />
              ),
            "footer-page": () => (
              <FixedActionFooter>
                <Space>
                  <Button onClick={() => void router.push({ name: "fumigation-work-list" })}>返回列表</Button>
                  {!hasArchive ? (
                    <Button
                      type="primary"
                      loading={generating.value}
                      disabled={work == null || work.status !== "ARCHIVED"}
                      onClick={() => void handleGenerate()}
                    >
                      生成合规档案
                    </Button>
                  ) : null}
                </Space>
              </FixedActionFooter>
            ),
          }}
        />
      );
    };
  },
});
