import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createAssessmentPlan, getAssessmentPlan, pageUnits, updateAssessmentPlan } from "@/api/server";
import { PersonPickerModal } from "@/components/person-picker-modal/person-picker-modal";
import { PLAN_CYCLES } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Col,
  Form,
  FormItem,
  Input,
  PageLayout as PcLayout,
  PopConfirm,
  Row,
  Select,
  SelectOption,
  Tag,
  message,
} from "@/pc-ui-runtime";
import type { OrgUserVO, UnitVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { useLayoutTitle } from "@/utils/page-title";
import { mapEvaluationPlanToApi, mapUnitFromApi } from "@/utils/risk-control-mapper";

import styles from "@/styles/form-page.module.less";

export const PlanFormPage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("计划配置");
    const route = useRoute();
    const router = useRouter();
    const planId = (route.query.id ?? "") as string;
    const isEdit = Boolean(planId);

    const name = ref("");
    const unitId = ref<string>();
    const cycle = ref<string>();
    const notifyUsers = ref<OrgUserVO[]>([]);
    const units = ref<UnitVO[]>([]);
    const pickerVisible = ref(false);
    const submitting = ref(false);
    const loading = ref(false);

    const loadUnits = async (): Promise<void> => {
      try {
        const page = await useAuthRequest(() => pageUnits({ pageNumber: 1, pageSize: 500, view: "option" }));
        units.value = page.records.map(mapUnitFromApi);
      } catch (e) {
        showApiError(e);
      }
    };

    const loadDetail = async (): Promise<void> => {
      if (!isEdit) return;
      loading.value = true;
      try {
        const vo = await useAuthRequest(() => getAssessmentPlan(planId));
        name.value = vo.planName ?? vo.name ?? "";
        cycle.value = vo.cycleType ?? "";
        unitId.value = vo.unitId != null ? String(vo.unitId) : undefined;
        const ids = (vo.notifyUserIds ?? []).map(String);
        notifyUsers.value = ids.map((id, i) => ({
          id,
          name: vo.notifyUsers?.[i]?.userName?.trim() || id,
          department: "",
        }));
      } catch (e) {
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadUnits();
      await loadDetail();
    });

    const onPickConfirm = (users: OrgUserVO | OrgUserVO[]): void => {
      notifyUsers.value = Array.isArray(users) ? users : [users];
    };

    const removeUser = (id: string): void => {
      notifyUsers.value = notifyUsers.value.filter((u) => u.id !== id);
    };

    const goList = (): void => {
      void router.push({ name: "evaluation-plans" });
    };

    const onSubmit = async (): Promise<void> => {
      if (!name.value.trim()) {
        message.warning("请输入计划名称");
        return;
      }
      if (!unitId.value) {
        message.warning("请选择评估单元");
        return;
      }
      if (!cycle.value) {
        message.warning("请选择评估周期");
        return;
      }
      if (notifyUsers.value.length === 0) {
        message.warning("请选择通知人员");
        return;
      }
      submitting.value = true;
      try {
        const payload = mapEvaluationPlanToApi({
          name: name.value,
          unitId: unitId.value,
          cycle: cycle.value,
          notifyUserIds: notifyUsers.value.map((u) => u.id),
        });
        if (isEdit) {
          await useAuthRequest(() => updateAssessmentPlan(planId, payload));
          message.success("计划已更新");
        } else {
          await useAuthRequest(() => createAssessmentPlan(payload));
          message.success("计划已创建");
        }
        goList();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const pageTitleText = computed(() => (isEdit ? layoutTitle : "新建评估计划"));

    return (): JSX.Element => (
      <PcLayout
        title={pageTitleText.value}
        v-slots={{
          "layout-content": (): JSX.Element => (
            <div class={styles.formContent}>
              <div class={[styles.sectionTitle, "g2-skin-section-title"]}>基础信息</div>
              <Form layout="horizontal" labelCol={{ style: { width: "100px" } }} wrapperCol={{ style: { flex: 1 } }}>
                <Row gutter={[24, 0]} style={{ width: "100%" }}>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="计划名称" required>
                      <Input
                        class={styles.fieldMd}
                        v-model:value={name.value}
                        placeholder="请输入计划名称"
                        maxlength={50}
                        showCount={false}
                      />
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="评估单元" required>
                      <Select v-model:value={unitId.value} class={styles.fieldMd} placeholder="请选择评估单元" allowClear>
                        {units.value.map((u) => (
                          <SelectOption key={u.id} value={u.id}>
                            {u.name}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="评估周期" required>
                      <Select v-model:value={cycle.value} class={styles.fieldMd} placeholder="请选择评估周期" allowClear>
                        {PLAN_CYCLES.map((c) => (
                          <SelectOption key={c.value} value={c.value}>
                            {c.label}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="通知人员" required>
                      <div class={styles.managerField}>
                        {notifyUsers.value.map((u) => (
                          <Tag key={u.id} closable onClose={() => removeUser(u.id)}>
                            {u.name}
                          </Tag>
                        ))}
                        <Button
                          onClick={() => {
                            pickerVisible.value = true;
                          }}
                        >
                          选择人员
                        </Button>
                      </div>
                    </FormItem>
                  </Col>
                </Row>
              </Form>
              <PersonPickerModal
                visible={pickerVisible.value}
                multiple
                title="选择通知人员"
                initialSelected={notifyUsers.value}
                onUpdate:visible={(v: boolean) => {
                  pickerVisible.value = v;
                }}
                onConfirm={onPickConfirm}
              />
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              <PopConfirm title="确定取消？未保存的内容将丢失" onConfirm={goList}>
                <Button>取消</Button>
              </PopConfirm>
              <Button
                type="primary"
                loading={submitting.value || loading.value}
                onClick={() => {
                  void onSubmit();
                }}
              >
                提交
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
