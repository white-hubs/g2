import type {
  AppraisalDraftOption,
  AppraisalRuleContent,
  AppraisalRuleItem,
  AppraisalRuleRange,
  AppraisalRuleSaveCommand,
  FormFlow,
  FormGroup,
} from "@g2-contract/form-audit";
import { Button, Form, FormItem, Input, InputNumber, PageLayout, Select, Switch, Textarea, TreeSelect, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { errorMessage, loadCommonOptions, periodOptions } from "../shared";

type Mode = "add" | "edit" | "detail";
interface GroupTreeOption {
  label: string;
  value: string;
  disabled: boolean;
  children?: GroupTreeOption[];
}
type SourceType = "FORM" | "INSPECT" | "MAINTAIN";
interface DraftOption {
  label: string;
  value: string;
  sourceRefCode?: string;
}

function groupTreeOptions(items: FormGroup[]): GroupTreeOption[] {
  return items.map((item) => ({
    label: item.name,
    value: String(item.id),
    disabled: (item.children?.length ?? 0) > 0,
    children: item.children?.length ? groupTreeOptions(item.children) : undefined,
  }));
}

function createRange(): AppraisalRuleRange {
  return { startValue: 0, endValue: 0, deductScore: 0 };
}
function createItem(): AppraisalRuleItem {
  return { itemName: "计分规则", fieldKey: "", calcType: "FORM_COUNT", rangeConfig: [createRange()] };
}
function withItemSort(item: AppraisalRuleItem, index: number): AppraisalRuleItem {
  return { ...item, sort: index };
}
function withContentSort(content: AppraisalRuleContent, index: number): AppraisalRuleContent {
  return {
    ...content,
    sort: index,
    sourceRefId: content.sourceRefId || content.sourceRefName,
    sourceRefCode: content.sourceRefCode || content.sourceRefName,
    items: (content.items ?? []).map((item, itemIndex) => withItemSort(item, itemIndex)),
  };
}
function createContent(type: "SPOT_CHECK" | "INSPECTION"): AppraisalRuleContent {
  return {
    contentType: type,
    sourceType: "FORM",
    sourceRefId: "",
    sourceRefName: "",
    contentDesc: "",
    standardDesc: "",
    items: [createItem()],
  };
}

export const AssessmentRuleForm = defineComponent({
  name: "FormAuditAssessmentRuleForm",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const mode = computed<Mode>(() =>
      String(route.name).endsWith("add") ? "add" : String(route.name).endsWith("edit") ? "edit" : "detail",
    );
    const readonly = computed(() => mode.value === "detail");
    const saving = ref(false);
    const departments = ref<{ label: string; value: string }[]>([]);
    const formGroups = ref<GroupTreeOption[]>([]);
    const draftOptions = ref<Record<SourceType, DraftOption[]>>({ FORM: [], INSPECT: [], MAINTAIN: [] });
    const fieldsByFormId = ref<Record<string, { label: string; value: string }[]>>({});
    const state = reactive<AppraisalRuleSaveCommand>({
      name: "",
      inspectionItem: "",
      formGroupId: undefined,
      periodType: "MONTHLY",
      totalScore: 100,
      spotCheckScore: 50,
      inspectionScore: 50,
      responsibleDepartmentIds: [],
      enabled: true,
      contents: [createContent("SPOT_CHECK"), createContent("INSPECTION")],
    });

    watch(
      () => [state.totalScore, state.spotCheckScore],
      () => {
        state.inspectionScore = Math.max(0, Number(state.totalScore) - Number(state.spotCheckScore));
      },
    );

    const load = async (): Promise<void> => {
      try {
        const [options, groups, forms, inspections, maintenances] = await Promise.all([
          loadCommonOptions(),
          getFormAuditClient().treeFormGroups(),
          getFormAuditClient().pageBusinessForms({ pageNumber: 1, pageSize: 1000 }),
          getFormAuditClient().pageInspectPlanDrafts({ pageNumber: 1, pageSize: 1000 }),
          getFormAuditClient().pageMaintenancePlanDrafts({ pageNumber: 1, pageSize: 1000 }),
        ]);
        departments.value = options.departments;
        formGroups.value = groupTreeOptions(groups);
        draftOptions.value = {
          FORM: forms.records.map((item: FormFlow) => ({ label: item.name, value: item.id, sourceRefCode: item.businessType })),
          INSPECT: inspections.records.map((item: AppraisalDraftOption) => ({
            label: item.planName ?? item.name ?? item.id,
            value: item.id,
          })),
          MAINTAIN: maintenances.records.map((item: AppraisalDraftOption) => ({
            label: item.maintenancePlanName ?? item.name ?? item.id,
            value: item.id,
          })),
        };
        const id = String(route.params.id ?? "");
        if (id && mode.value !== "add") {
          const detail = await getFormAuditClient().getAppraisalRule(id);
          Object.assign(state, {
            id: detail.id,
            name: detail.name ?? "",
            inspectionItem: detail.inspectionItem ?? "",
            formGroupId: detail.formGroupId,
            periodType: detail.periodType ?? "MONTHLY",
            totalScore: Number(detail.totalScore ?? 0),
            spotCheckScore: Number(detail.spotCheckScore ?? 0),
            inspectionScore: Number(detail.inspectionScore ?? 0),
            responsibleDepartmentIds: detail.responsibleDepartmentIds ?? [],
            enabled: Boolean(detail.enabled),
            contents: detail.contents?.length ? detail.contents : [createContent("SPOT_CHECK"), createContent("INSPECTION")],
          });
          await Promise.all(
            state.contents
              .filter((content) => content.sourceType === "FORM" && content.sourceRefId)
              .map((content) => loadFormFields(String(content.sourceRefId))),
          );
        }
      } catch (error) {
        message.error(errorMessage(error, "考核规则加载失败"));
      }
    };

    const loadFormFields = async (formId: string): Promise<void> => {
      if (!formId || fieldsByFormId.value[formId]) {
        return;
      }
      try {
        const form = await getFormAuditClient().getFormFlow(formId);
        fieldsByFormId.value = {
          ...fieldsByFormId.value,
          [formId]: (form.formFieldList ?? []).map((field) => ({ label: field.name, value: field.id })),
        };
      } catch (error) {
        message.error(errorMessage(error, "表单字段加载失败"));
      }
    };

    const changeSourceType = (content: AppraisalRuleContent): void => {
      content.sourceRefId = "";
      content.sourceRefCode = "";
      content.sourceRefName = "";
      for (const item of content.items ?? []) {
        item.fieldKey = "";
      }
    };

    const selectDraft = (content: AppraisalRuleContent, value: string): void => {
      const type = (content.sourceType ?? "FORM") as SourceType;
      const option = draftOptions.value[type].find((item) => item.value === value);
      content.sourceRefId = value;
      content.sourceRefName = option?.label ?? "";
      content.sourceRefCode = option?.sourceRefCode ?? value;
      if (type === "FORM") {
        void loadFormFields(value);
      }
    };

    const removeContent = (index: number): void => {
      state.contents.splice(index, 1);
    };
    const addRuleItem = (content: AppraisalRuleContent): void => {
      (content.items ??= []).push(createItem());
    };
    const removeRuleItem = (content: AppraisalRuleContent, index: number): void => {
      content.items?.splice(index, 1);
    };
    const addRange = (item: AppraisalRuleItem): void => {
      (item.rangeConfig ??= []).push(createRange());
    };
    const removeRange = (item: AppraisalRuleItem, index: number): void => {
      item.rangeConfig?.splice(index, 1);
    };

    const validate = (): string | undefined => {
      if (!state.name.trim()) {
        return "请输入规则名称";
      }
      if (!state.inspectionItem.trim()) {
        return "请输入检查项目";
      }
      if (!state.formGroupId) {
        return "请选择表单分组";
      }
      if (state.responsibleDepartmentIds.length === 0) {
        return "请选择责任部门";
      }
      if (state.totalScore <= 0) {
        return "总分值必须大于 0";
      }
      if (state.spotCheckScore + state.inspectionScore !== state.totalScore) {
        return "抽查分值与检查分值之和必须等于总分值";
      }
      if (state.contents.length === 0) {
        return "请至少配置一条考核条件";
      }
      for (const [index, content] of state.contents.entries()) {
        if (!content.sourceRefId && !content.sourceRefName) {
          return `第 ${index + 1} 条条件请填写来源底稿`;
        }
        if (!content.items?.length) {
          return `第 ${index + 1} 条条件请至少配置一条计分规则`;
        }
        for (const item of content.items) {
          if (!item.calcType) {
            return `第 ${index + 1} 条条件请选择计分方式`;
          }
          if (!item.rangeConfig?.length) {
            return `第 ${index + 1} 条条件请至少配置一个计分区间`;
          }
        }
      }
      return undefined;
    };

    const submit = async (): Promise<void> => {
      const validation = validate();
      if (validation) {
        message.warning(validation);
        return;
      }
      saving.value = true;
      try {
        const payload: AppraisalRuleSaveCommand = {
          ...state,
          name: state.name.trim(),
          inspectionItem: state.inspectionItem.trim(),
          contents: state.contents.map((content, contentIndex) => withContentSort(content, contentIndex)),
        };
        if (mode.value === "edit" && state.id) {
          await getFormAuditClient().updateAppraisalRule(state.id, payload);
        } else {
          await getFormAuditClient().createAppraisalRule(payload);
        }
        message.success("保存成功");
        await router.push("/d/form-audit/assessment-rules");
      } catch (error) {
        message.error(errorMessage(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };

    void load();
    const pageTitle = computed(() => (mode.value === "add" ? "新增考核规则" : mode.value === "edit" ? "编辑考核规则" : "考核规则详情"));
    return () => (
      <PageLayout
        title={pageTitle.value}
        v-slots={{
          "layout-content": () => (
            <div class="form-audit-page" style={{ overflow: "auto", paddingBottom: "16px" }}>
              <Form model={state} labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                <h2 class="form-audit-section-title">基本信息</h2>
                <div class="form-audit-form-grid">
                  <FormItem label="规则名称" required>
                    <Input v-model:value={state.name} disabled={readonly.value} maxlength={80} />
                  </FormItem>
                  <FormItem label="检查项目" required>
                    <Input v-model:value={state.inspectionItem} disabled={readonly.value} maxlength={120} />
                  </FormItem>
                  <FormItem label="表单分组" required>
                    <TreeSelect
                      v-model:value={state.formGroupId}
                      disabled={readonly.value}
                      treeData={formGroups.value}
                      treeDefaultExpandAll
                      placeholder="请选择叶子分组"
                    />
                  </FormItem>
                  <FormItem label="考核周期" required>
                    <Select v-model:value={state.periodType} disabled={readonly.value} options={periodOptions} />
                  </FormItem>
                  <FormItem label="责任部门" required>
                    <Select
                      v-model:value={state.responsibleDepartmentIds}
                      mode="multiple"
                      disabled={readonly.value}
                      options={departments.value}
                      maxTagCount="responsive"
                    />
                  </FormItem>
                  <FormItem label="启用状态">
                    <Switch v-model:checked={state.enabled} disabled={readonly.value} checkedChildren="启用" unCheckedChildren="禁用" />
                  </FormItem>
                  <FormItem label="总分值" required>
                    <InputNumber v-model:value={state.totalScore} disabled={readonly.value} min={1} max={10000} style={{ width: "100%" }} />
                  </FormItem>
                  <FormItem label="抽查分值" required>
                    <InputNumber
                      v-model:value={state.spotCheckScore}
                      disabled={readonly.value}
                      min={0}
                      max={state.totalScore}
                      style={{ width: "100%" }}
                    />
                  </FormItem>
                  <FormItem label="检查分值">
                    <InputNumber value={state.inspectionScore} disabled style={{ width: "100%" }} />
                  </FormItem>
                </div>
                <div class="form-audit-actions" style={{ justifyContent: "space-between", marginTop: "10px" }}>
                  <h2 class="form-audit-section-title" style={{ margin: 0 }}>
                    考核条件
                  </h2>
                  {!readonly.value && (
                    <div class="form-audit-actions">
                      <Button onClick={() => state.contents.push(createContent("SPOT_CHECK"))}>新增抽查条件</Button>
                      <Button onClick={() => state.contents.push(createContent("INSPECTION"))}>新增检查条件</Button>
                    </div>
                  )}
                </div>
                {state.contents.map((content, contentIndex) => (
                  <section key={`${content.id ?? "new"}-${contentIndex}`} class="form-audit-rule-content">
                    <div class="form-audit-rule-content-head">
                      <span class="form-audit-rule-content-title">
                        {content.contentType === "SPOT_CHECK" ? "抽查条件" : "检查条件"} {contentIndex + 1}
                      </span>
                      {!readonly.value && (
                        <Button type="link" danger onClick={() => removeContent(contentIndex)}>
                          删除条件
                        </Button>
                      )}
                    </div>
                    <div class="form-audit-form-grid">
                      <FormItem label="来源类型" required>
                        <Select
                          v-model:value={content.sourceType}
                          disabled={readonly.value}
                          options={[
                            { label: "表单", value: "FORM" },
                            { label: "巡检", value: "INSPECT" },
                            { label: "维保", value: "MAINTAIN" },
                          ]}
                          onChange={() => changeSourceType(content)}
                        />
                      </FormItem>
                      <FormItem label="来源底稿" required>
                        <Select
                          value={content.sourceRefId}
                          disabled={readonly.value}
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          options={draftOptions.value[(content.sourceType ?? "FORM") as SourceType]}
                          placeholder="请选择来源底稿"
                          onChange={(value) => selectDraft(content, typeof value === "string" ? value : "")}
                        />
                      </FormItem>
                      <FormItem label="考核内容">
                        <Textarea v-model:value={content.contentDesc} disabled={readonly.value} rows={2} />
                      </FormItem>
                      <FormItem label="考核标准">
                        <Textarea v-model:value={content.standardDesc} disabled={readonly.value} rows={2} />
                      </FormItem>
                    </div>
                    {(content.items ?? []).map((item, itemIndex) => (
                      <div
                        key={`${item.id ?? "new"}-${itemIndex}`}
                        style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #edf0f5" }}
                      >
                        <div class="form-audit-range-row">
                          <Input v-model:value={item.itemName} disabled={readonly.value} placeholder="计分规则名称" />
                          {content.sourceType === "FORM" ? (
                            <Select
                              v-model:value={item.fieldKey}
                              disabled={readonly.value}
                              allowClear
                              options={fieldsByFormId.value[String(content.sourceRefId ?? "")] ?? []}
                              placeholder="请选择统计字段"
                            />
                          ) : (
                            <Input value="无需选择字段" disabled />
                          )}
                          <Select
                            v-model:value={item.calcType}
                            disabled={readonly.value}
                            options={[
                              { label: "记录数", value: "FORM_COUNT" },
                              { label: "字段值", value: "FIELD_VALUE" },
                              { label: "字段合计", value: "FIELD_SUM" },
                              { label: "字段平均", value: "FIELD_AVG" },
                              { label: "超时任务数", value: "TIMEOUT_TASK_COUNT" },
                            ]}
                          />
                          {!readonly.value && (
                            <Button type="link" danger onClick={() => removeRuleItem(content, itemIndex)}>
                              删除规则
                            </Button>
                          )}
                        </div>
                        {(item.rangeConfig ?? []).map((range, rangeIndex) => (
                          <div key={rangeIndex} class="form-audit-range-row">
                            <InputNumber
                              v-model:value={range.startValue}
                              disabled={readonly.value}
                              placeholder="区间起始"
                              style={{ width: "100%" }}
                            />
                            <InputNumber
                              v-model:value={range.endValue}
                              disabled={readonly.value}
                              placeholder="区间结束"
                              style={{ width: "100%" }}
                            />
                            <InputNumber
                              v-model:value={range.deductScore}
                              disabled={readonly.value}
                              placeholder="扣分"
                              min={0}
                              style={{ width: "100%" }}
                            />
                            {!readonly.value && (
                              <Button
                                type="link"
                                danger
                                disabled={(item.rangeConfig?.length ?? 0) <= 1}
                                onClick={() => removeRange(item, rangeIndex)}
                              >
                                删除区间
                              </Button>
                            )}
                          </div>
                        ))}
                        {!readonly.value && (
                          <Button type="link" onClick={() => addRange(item)}>
                            新增计分区间
                          </Button>
                        )}
                      </div>
                    ))}
                    {!readonly.value && (
                      <Button type="link" onClick={() => addRuleItem(content)}>
                        新增计分规则
                      </Button>
                    )}
                  </section>
                ))}
              </Form>
            </div>
          ),
          "footer-page": () => (
            <div class="form-audit-footer-actions">
              <Button onClick={() => void router.push("/d/form-audit/assessment-rules")}>返回</Button>
              {!readonly.value && (
                <Button type="primary" loading={saving.value} onClick={() => void submit()}>
                  保存
                </Button>
              )}
            </div>
          ),
        }}
      />
    );
  },
});
