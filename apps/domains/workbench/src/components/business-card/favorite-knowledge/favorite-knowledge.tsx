import { defineComponent } from "vue";

import PanelCard from "../../card/card";
import { Empty } from "@/pc-ui-runtime";
import { navigateToApplication } from "@/utils/navigate";

export default defineComponent({
  name: "FavoriteKnowledge",
  emits: ["close"],
  setup(_, { emit }) {
    const goKnowledge = (): void => {
      navigateToApplication({
        code: "KNOWLEDGE_DOCUMENT",
        path: "/portal/knowledge-document/knowledge-document",
      });
    };
    return () => (
      <PanelCard title="我的收藏知识库" icon="icon-wodeshoucangzhishiku" onClose={() => emit("close")}>
        {{
          btn: () => <a onClick={goKnowledge}>查看更多文档 &gt;</a>,
          default: () => (
            <div class="business-card-empty">
              <Empty description="暂无收藏知识" />
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
