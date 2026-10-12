import { Button } from "@g2-platform/pc-ui";
import { computed, defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ArchiveDocumentView } from "./archive-document-view";

import "./fumigation.less";

/** 独立档案 URL，内容与合规页内嵌一致，供直接访问。 */
export const FumigationArchiveDocumentPage = defineComponent({
  name: "FumigationArchiveDocumentPage",
  setup: () => {
    const route = useRoute();
    const router = useRouter();

    const archiveId = computed(() => {
      const param = route.params.archiveId;
      return typeof param === "string" ? param : Array.isArray(param) ? (param[0] ?? "") : "";
    });

    return (): JSX.Element => (
      <div class="fumigation-archive-document-page">
        <div class="fumigation-archive-document-header">
          <div class="fumigation-archive-document-breadcrumb">
            熏蒸作业 / 完工归档 /
            <Button type="link" size="small" onClick={() => router.push({ name: "fumigation-work-list" })}>
              ← 返回列表
            </Button>
          </div>
        </div>
        <div class="fumigation-archive-document-scroll">
          <ArchiveDocumentView archiveId={archiveId.value} />
        </div>
      </div>
    );
  },
});
