import type { FormGroupCount } from "@g2-contract/form-audit";
import { Empty, PageLayout, message, usePcForm } from "@g2-platform/pc-ui";
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { APPLICATION_CODE, errorMessage } from "../shared";

export const WorkOrderLibrary = defineComponent({
  name: "FormAuditWorkOrderLibrary",
  setup() {
    const router = useRouter();
    const keyword = ref("");
    const groups = ref<FormGroupCount[]>([]);
    const loading = ref(false);

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        groups.value = await getFormAuditClient().listPermissionFormGroups({
          keyword: keyword.value,
          filterEmpty: true,
          application: APPLICATION_CODE,
        });
      } catch (error) {
        groups.value = [];
        message.error(errorMessage(error, "表单模板加载失败"));
      } finally {
        loading.value = false;
      }
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "名称",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入表单名称" },
        },
      ],
      handleSubmit(values) {
        keyword.value = String(values.keyword ?? "").trim();
        void load();
      },
      handleReset() {
        keyword.value = "";
        void load();
      },
    });

    void load();
    return () => (
      <PageLayout
        title="表单模板"
        v-slots={{
          "layout-content": () => (
            <div class="form-audit-page">
              <PcForm />
              <div class="form-audit-library" aria-busy={loading.value}>
                {groups.value.map((group) => (
                  <section key={group.formGroupId} class="form-audit-library-group">
                    <h2 class="form-audit-section-title">{group.formGroupName}</h2>
                    <div class="form-audit-flow-grid">
                      {(group.formGroupFlowList ?? []).map((flow) => (
                        <button
                          key={flow.id}
                          type="button"
                          class="form-audit-flow-card"
                          onClick={() =>
                            void router.push({
                              path: "/d/form-audit/work-order-approval",
                              query: { flowId: flow.id, flowName: flow.name, businessType: flow.businessType },
                            })
                          }
                        >
                          <span class="form-audit-flow-icon">单</span>
                          <span class="form-audit-flow-name" title={flow.name}>
                            {flow.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
                {!loading.value && groups.value.length === 0 && <Empty description="暂无表单模板" />}
              </div>
            </div>
          ),
        }}
      />
    );
  },
});
