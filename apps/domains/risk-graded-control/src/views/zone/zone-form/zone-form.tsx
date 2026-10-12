import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getOrganizationTree } from "@/api/ouaa";
import { createArea, getArea, updateArea } from "@/api/server";
import { PersonPickerModal } from "@/components/person-picker-modal/person-picker-modal";
import { RiskGisMapEditor, type GisDrawingSubmitValidation } from "@/components/risk-gis-map-editor/risk-gis-map-editor";
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
  Textarea,
  TreeSelect,
  message,
} from "@/pc-ui-runtime";
import type { OrgUserVO, PolygonGeo } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { mapOrganizationsToTreeData, type OrganizationTreeNode } from "@/utils/organization-tree";
import { useLayoutTitle } from "@/utils/page-title";
import { mapZoneFromApi, mapZoneToApi } from "@/utils/risk-control-mapper";

import styles from "@/styles/form-page.module.less";

export const ZoneFormPage = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const layoutTitle = useLayoutTitle("区域新增/编辑");
    const zoneId = computed(() => (route.query.id as string) ?? "");
    const isView = computed(() => route.query.mode === "view");
    const isEdit = computed(() => Boolean(zoneId.value) && !isView.value);
    const pickerVisible = ref(false);
    const loading = ref(false);
    const submitting = ref(false);
    const gisValue = ref<{ polygon?: PolygonGeo }>({});
    const gisEditorRef = ref<{ validateDrawingForSubmit?: () => GisDrawingSubmitValidation } | null>(null);
    const deptTree = ref<OrganizationTreeNode[]>([]);

    const manager = ref<OrgUserVO | null>(null);

    const form = reactive({
      code: "",
      name: "",
      departmentId: undefined as string | undefined,
      scopeText: "",
      remark: "",
    });

    const loadDeptTree = async (): Promise<void> => {
      try {
        const orgs = await useAuthRequest(() => getOrganizationTree({ enabled: true }));
        deptTree.value = mapOrganizationsToTreeData(orgs);
      } catch (e) {
        showApiError(e);
        deptTree.value = [];
      }
    };

    const loadDetail = async (): Promise<void> => {
      if (!zoneId.value) return;
      loading.value = true;
      try {
        const vo = await useAuthRequest(() => getArea(zoneId.value));
        const zone = mapZoneFromApi(vo);
        form.code = zone.code;
        form.name = zone.name;
        form.departmentId = zone.departmentId || undefined;
        form.scopeText = zone.scopeText;
        form.remark = zone.remark ?? "";
        manager.value = zone.managerId
          ? {
              id: zone.managerId,
              name: zone.manager || zone.managerId,
              department: zone.department,
            }
          : null;
        gisValue.value = { polygon: zone.polygon };
      } catch (e) {
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadDeptTree();
      await loadDetail();
    });

    const onGisChange = (val: { polygon?: PolygonGeo }): void => {
      gisValue.value = { ...gisValue.value, ...val };
      if (val.polygon?.description) {
        form.scopeText = val.polygon.description;
      } else if (val.polygon?.points?.length) {
        form.scopeText = val.polygon.points.map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join("；");
      } else if (val.polygon === undefined) {
        form.scopeText = "";
      }
    };

    const resolveSubmitPolygon = (): { polygon?: PolygonGeo; blocked: boolean } => {
      const check = gisEditorRef.value?.validateDrawingForSubmit?.() ?? {
        complete: true as const,
        polygon: gisValue.value.polygon,
      };
      if (!check.complete) {
        message.warning(check.message);
        return { blocked: true };
      }
      return { polygon: check.polygon, blocked: false };
    };

    const onPersonConfirm = (user: OrgUserVO | OrgUserVO[]): void => {
      const u = Array.isArray(user) ? user[0] : user;
      manager.value = u ?? null;
    };

    const goList = (): void => {
      void router.push({ name: "zones" });
    };

    const goBack = (): void => {
      if (isView.value && route.query.from === "four-color-map") {
        void router.push({ name: "four-color-map" });
        return;
      }
      goList();
    };

    const handleSubmit = async (): Promise<void> => {
      const { polygon, blocked } = resolveSubmitPolygon();
      if (blocked) return;
      if (polygon && !form.scopeText.trim() && polygon.description) {
        form.scopeText = polygon.description;
      }
      if (!form.name.trim() || !form.departmentId || !form.scopeText.trim()) {
        message.warning("请填写必填项");
        return;
      }
      submitting.value = true;
      try {
        const payload = mapZoneToApi(
          {
            ...form,
            department: form.departmentId,
            manager: manager.value?.id,
          },
          polygon,
        );
        if (isEdit.value) {
          await useAuthRequest(() => updateArea(zoneId.value, payload));
          message.success("保存成功");
        } else {
          await useAuthRequest(() => createArea(payload));
          message.success("新增成功");
        }
        goList();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const pageTitleText = computed(() => {
      if (isView.value) return "查看风险区域";
      return isEdit.value ? layoutTitle : "新增风险区域";
    });

    return (): JSX.Element => (
      <PcLayout
        title={pageTitleText.value}
        v-slots={{
          "layout-content": () => (
            <div class={styles.formContent}>
              <div class={[styles.sectionTitle, "g2-skin-section-title"]}>基础信息</div>
              <Form layout="horizontal" labelCol={{ style: { width: "100px" } }} wrapperCol={{ style: { flex: 1 } }}>
                <Row gutter={[24, 0]} style={{ width: "100%" }}>
                  {zoneId.value && (
                    <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                      <FormItem label="区域编号">
                        <Input v-model:value={form.code} disabled class={styles.fieldMd} />
                      </FormItem>
                    </Col>
                  )}
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="区域名称" required={!isView.value}>
                      <Input
                        class={styles.fieldMd}
                        v-model:value={form.name}
                        maxlength={50}
                        showCount={false}
                        disabled={isView.value}
                        placeholder="请输入区域名称"
                      />
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="所属部门" required={!isView.value}>
                      <TreeSelect
                        class={styles.fieldMd}
                        v-model:value={form.departmentId}
                        placeholder="请选择所属部门"
                        allowClear={!isView.value}
                        disabled={isView.value}
                        showSearch={!isView.value}
                        treeDefaultExpandAll
                        treeData={deptTree.value}
                        treeNodeFilterProp="title"
                      />
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="区域范围" required={!isView.value}>
                      <Input
                        v-model:value={form.scopeText}
                        maxlength={200}
                        showCount={false}
                        disabled={isView.value}
                        placeholder="文字描述或地图绘制后自动回填"
                      />
                      <div style={{ marginTop: "12px" }}>
                        <RiskGisMapEditor
                          ref={gisEditorRef}
                          mode={isView.value ? "readonly" : "polygon"}
                          height={320}
                          busy={submitting.value || loading.value}
                          modelValue={gisValue.value}
                          onUpdate:modelValue={isView.value ? undefined : onGisChange}
                        />
                      </div>
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="负责人">
                      <div class={styles.managerField}>
                        <span class={manager.value ? styles.managerName : styles.managerPlaceholder}>
                          {manager.value?.name ?? "请选择负责人"}
                        </span>
                        {!isView.value && (
                          <>
                            <Button
                              onClick={() => {
                                pickerVisible.value = true;
                              }}
                            >
                              选择人员
                            </Button>
                            {manager.value && (
                              <Button
                                type="link"
                                onClick={() => {
                                  manager.value = null;
                                }}
                              >
                                清除
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="备注">
                      <Textarea
                        v-model:value={form.remark}
                        rows={3}
                        maxlength={500}
                        showCount={!isView.value}
                        disabled={isView.value}
                        placeholder="请输入备注"
                      />
                    </FormItem>
                  </Col>
                </Row>
              </Form>
              <PersonPickerModal
                visible={pickerVisible.value}
                title="选择区域负责人"
                initialSelected={manager.value ? [manager.value] : []}
                onUpdate:visible={(v: boolean) => {
                  pickerVisible.value = v;
                }}
                onConfirm={onPersonConfirm}
              />
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              {isView.value ? (
                <Button onClick={goBack}>返回</Button>
              ) : (
                <>
                  <PopConfirm title="确定取消？未保存的内容将丢失" onConfirm={goList}>
                    <Button>取消</Button>
                  </PopConfirm>
                  <Button
                    type="primary"
                    loading={submitting.value || loading.value}
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    提交
                  </Button>
                </>
              )}
            </div>
          ),
        }}
      />
    );
  },
});
