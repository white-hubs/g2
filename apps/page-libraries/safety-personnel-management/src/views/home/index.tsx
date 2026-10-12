import { Empty } from "@g2-platform/pc-ui";

import layoutStyles from "../../layout.module.css";
/** @jsxImportSource vue */
import { computed, defineComponent, onMounted, ref } from "vue";

import { getHomeOrgArchitecture } from "../../api/safety-personnel";
import { useAuthRequest } from "../../hooks/use-auth-request";
import type { OrgNodeUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { mapOrgTree } from "../../utils/mappers";
import { enrichOrgTreeAvatars } from "../../utils/member-avatar";
import { OrgArchitectureCanvas } from "./components/org-architecture-canvas";

import styles from "./index.module.css";

export const HomePage = defineComponent({
  setup() {
    const tree = ref<OrgNodeUI[]>([]);
    const root = computed(() => tree.value[0] ?? null);

    const load = async (): Promise<void> => {
      try {
        const data = await useAuthRequest(() => getHomeOrgArchitecture());
        const mapped = data.root ? mapOrgTree([data.root]) : [];
        if (mapped.length > 0) {
          await enrichOrgTreeAvatars(mapped);
        }
        tree.value = mapped;
      } catch (e) {
        showApiError(e);
        tree.value = [];
      }
    };

    onMounted(() => {
      void load();
    });

    return () => (
      <div class={layoutStyles.route}>
        <div class={styles.container}>
          {root.value ? (
            <OrgArchitectureCanvas root={root.value} />
          ) : (
            <div class={styles.emptyState}>
              <Empty description="暂无组织架构数据，请先在组织管理配置中维护" />
            </div>
          )}
        </div>
      </div>
    );
  },
});
