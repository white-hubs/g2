import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createUnit, getUnit, pageAreas, listWarningSignOptions, pageUnitTypes, updateUnit } from "@/api/server";
import { PersonPickerModal } from "@/components/person-picker-modal/person-picker-modal";
import { RiskGisMapEditor } from "@/components/risk-gis-map-editor/risk-gis-map-editor";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Col,
  Form,
  FormItem,
  Input,
  InputNumber,
  PopConfirm,
  Row,
  Select,
  SelectOption,
  Tag,
  Textarea,
  message,
  PageLayout as PcLayout,
} from "@/pc-ui-runtime";
import type { GeoPoint, OrgUserVO, UnitTypeVO, WarningSignVO, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { unwrapPageRecords } from "@/utils/page-records";
import { useLayoutTitle } from "@/utils/page-title";
import { mapUnitFromApi, mapUnitToApi, mapUnitTypeFromApi, mapWarningSignFromApi, mapZoneFromApi } from "@/utils/risk-control-mapper";

import styles from "@/styles/form-page.module.less";

export const UnitFormPage = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const layoutTitle = useLayoutTitle("单元新增/编辑");
    const unitId = computed(() => (route.query.id as string) ?? "");
    const isView = computed(() => route.query.mode === "view");
    const isEdit = computed(() => Boolean(unitId.value) && !isView.value);
    const loading = ref(false);
    const submitting = ref(false);
    const identifyPickerVisible = ref(false);
    const responsiblePickerVisible = ref(false);
    const gisValue = ref<{ point?: GeoPoint }>({});
    const zones = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);
    const warningSigns = ref<WarningSignVO[]>([]);

    const identifyUsers = ref<OrgUserVO[]>([]);
    const responsibleUser = ref<OrgUserVO | null>(null);

    const form = reactive({
      code: "",
      name: "",
      unitTypeId: undefined as string | undefined,
      zoneId: undefined as string | undefined,
      warningSignId: undefined as string | undefined,
      description: "",
      locationDesc: "",
      identifyCycleDays: 180,
    });

    const loadOptions = async (): Promise<void> => {
      try {
        const [areaPage, typePage, signPage] = await Promise.all([
          useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" })),
          useAuthRequest(() => pageUnitTypes({ pageNumber: 1, pageSize: 500, view: "option" })),
          useAuthRequest(() => listWarningSignOptions({ pageNumber: 1, pageSize: 500, enabled: true })),
        ]);
        zones.value = unwrapPageRecords(areaPage).map(mapZoneFromApi);
        unitTypes.value = unwrapPageRecords(typePage).map(mapUnitTypeFromApi);
        warningSigns.value = unwrapPageRecords(signPage).map(mapWarningSignFromApi);
      } catch (e) {
        showApiError(e);
      }
    };

    const loadDetail = async (): Promise<void> => {
      if (!unitId.value) return;
      loading.value = true;
      try {
        const vo = await useAuthRequest(() => getUnit(unitId.value));
        const unit = mapUnitFromApi(vo);
        form.code = unit.code;
        form.name = unit.name;
        form.unitTypeId = unit.unitTypeId || unitTypes.value.find((t) => t.name === unit.unitType)?.id || undefined;
        form.zoneId = unit.zoneId;
        form.warningSignId = unit.warningSignId;
        form.locationDesc = unit.locationDesc ?? unit.location?.address ?? "";
        form.description = unit.description ?? "";
        form.identifyCycleDays = unit.identifyCycleDays;
        identifyUsers.value = unit.identifyUserIds.map((id, i) => ({
          id,
          name: vo.identifierUsers?.[i]?.userName?.trim() || unit.identifyUsers[i] || id,
          department: "",
        }));
        responsibleUser.value = unit.responsibleUserId
          ? {
              id: unit.responsibleUserId,
              name: unit.responsibleUser || unit.responsibleUserId,
              department: "",
            }
          : null;
        gisValue.value = { point: unit.location };
      } catch (e) {
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadOptions();
      await loadDetail();
    });

    const onGisChange = (val: { point?: GeoPoint }): void => {
      gisValue.value = val;
      if (val.point?.address) {
        form.locationDesc = val.point.address;
      }
    };

    const onIdentifyConfirm = (users: OrgUserVO | OrgUserVO[]): void => {
      identifyUsers.value = Array.isArray(users) ? users : [users];
    };

    const onResponsibleConfirm = (user: OrgUserVO | OrgUserVO[]): void => {
      const u = Array.isArray(user) ? user[0] : user;
      responsibleUser.value = u ?? null;
    };

    const removeIdentifyUser = (id: string): void => {
      identifyUsers.value = identifyUsers.value.filter((u) => u.id !== id);
    };

    const goList = (): void => {
      void router.push({ name: "units" });
    };

    const handleSubmit = async (): Promise<void> => {
      const point = gisValue.value.point;
      if (
        !form.name.trim() ||
        !form.unitTypeId ||
        !form.zoneId ||
        !form.warningSignId ||
        point?.lng == null ||
        point?.lat == null ||
        !responsibleUser.value ||
        identifyUsers.value.length === 0
      ) {
        message.warning("请填写必填项");
        return;
      }
      submitting.value = true;
      try {
        const payload = mapUnitToApi(
          {
            code: form.code,
            name: form.name,
            unitTypeId: form.unitTypeId,
            zoneId: form.zoneId,
            warningSignId: form.warningSignId,
            description: form.description,
            locationDesc: form.locationDesc,
            identifyCycleDays: form.identifyCycleDays,
            identifyUsers: identifyUsers.value.map((u) => u.id),
            responsibleUser: responsibleUser.value.id,
          },
          gisValue.value.point,
        );
        if (isEdit.value) {
          await useAuthRequest(() => updateUnit(unitId.value, payload));
          message.success("保存成功");
        } else {
          await useAuthRequest(() => createUnit(payload));
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
      if (isView.value) return "查看风险单元";
      if (isEdit.value) return layoutTitle;
      return "新增风险单元";
    });

    const selectedZoneOverlay = computed((): ZoneVO[] => {
      if (!form.zoneId) return [];
      const zone = zones.value.find((z) => z.id === form.zoneId);
      return zone ? [zone] : [];
    });

    return (): JSX.Element => (
      <PcLayout
        title={pageTitleText.value}
        v-slots={{
          "layout-content": () => (
            <div class={styles.formContent}>
              <div class={[styles.sectionTitle, "g2-skin-section-title"]}>基础信息</div>
              <Form
                layout="horizontal"
                disabled={isView.value}
                labelCol={{ style: { width: "100px" } }}
                wrapperCol={{ style: { flex: 1 } }}
              >
                <Row gutter={[24, 0]} style={{ width: "100%" }}>
                  {unitId.value && (
                    <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                      <FormItem label="单元编号">
                        <Input v-model:value={form.code} disabled class={styles.fieldMd} />
                      </FormItem>
                    </Col>
                  )}
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="单元名称" required>
                      <Input
                        class={styles.fieldMd}
                        v-model:value={form.name}
                        disabled={isView.value}
                        maxlength={50}
                        showCount={false}
                        placeholder="请输入单元名称"
                      />
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="单元类型" required>
                      <Select
                        v-model:value={form.unitTypeId}
                        class={styles.fieldMd}
                        disabled={isView.value}
                        allowClear={!isView.value}
                        placeholder="请选择单元类型"
                      >
                        {unitTypes.value.map((t) => (
                          <SelectOption key={t.id} value={t.id}>
                            {t.name}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="所属区域" required>
                      <Select
                        v-model:value={form.zoneId}
                        class={styles.fieldMd}
                        disabled={isView.value}
                        allowClear={!isView.value}
                        placeholder="请选择所属区域"
                      >
                        {zones.value.map((z) => (
                          <SelectOption key={z.id} value={z.id}>
                            {z.name}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col xxl={8} xl={12} lg={24} md={24} sm={24} xs={24}>
                    <FormItem label="警示标志" required>
                      <Select
                        v-model:value={form.warningSignId}
                        class={styles.fieldMd}
                        disabled={isView.value}
                        allowClear={!isView.value}
                        placeholder="请选择警示标志"
                      >
                        {warningSigns.value.map((s) => (
                          <SelectOption key={s.id} value={s.id}>
                            {s.name}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="所在位置" required>
                      <div>
                        {gisValue.value.point?.address && (
                          <p style={{ marginBottom: "8px", color: "#666" }}>{gisValue.value.point.address}</p>
                        )}
                        <RiskGisMapEditor
                          mode={isView.value ? "readonly" : "point"}
                          height={300}
                          value={gisValue.value}
                          overlayZones={selectedZoneOverlay.value}
                          onChange={isView.value ? undefined : onGisChange}
                        />
                      </div>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="单元描述">
                      <Textarea
                        v-model:value={form.description}
                        disabled={isView.value}
                        rows={3}
                        maxlength={500}
                        showCount={!isView.value}
                        placeholder="描述该风险单元的构成和风险概况"
                      />
                    </FormItem>
                  </Col>
                </Row>
              </Form>

              <div class={[styles.sectionTitle, "g2-skin-section-title"]}>管理信息</div>
              <Form
                layout="horizontal"
                disabled={isView.value}
                labelCol={{ style: { width: "100px" } }}
                wrapperCol={{ style: { flex: 1 } }}
              >
                <Row gutter={[24, 0]} style={{ width: "100%" }}>
                  <Col span={24}>
                    <FormItem label="辨识人员" required>
                      <div class={styles.managerField}>
                        {identifyUsers.value.map((u) => (
                          <Tag key={u.id} closable={!isView.value} onClose={() => removeIdentifyUser(u.id)}>
                            {u.name}
                          </Tag>
                        ))}
                        {!isView.value && (
                          <Button
                            onClick={() => {
                              identifyPickerVisible.value = true;
                            }}
                          >
                            选择辨识人员
                          </Button>
                        )}
                      </div>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="辨识周期" required>
                      <div class={styles.compactControl}>
                        <InputNumber
                          v-model:value={form.identifyCycleDays}
                          disabled={isView.value}
                          min={1}
                          max={3650}
                          class={styles.fieldSm}
                        />
                        <span class={styles.fieldSuffix}>天</span>
                      </div>
                    </FormItem>
                  </Col>
                  <Col span={24}>
                    <FormItem label="责任人员" required>
                      <div class={styles.managerField}>
                        <span class={responsibleUser.value ? styles.managerName : styles.managerPlaceholder}>
                          {responsibleUser.value?.name ?? "请选择责任人员"}
                        </span>
                        {!isView.value && (
                          <>
                            <Button
                              onClick={() => {
                                responsiblePickerVisible.value = true;
                              }}
                            >
                              选择人员
                            </Button>
                            {responsibleUser.value && (
                              <Button
                                type="link"
                                onClick={() => {
                                  responsibleUser.value = null;
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
                </Row>
              </Form>

              <PersonPickerModal
                visible={identifyPickerVisible.value}
                multiple
                title="选择辨识人员"
                initialSelected={identifyUsers.value}
                onUpdate:visible={(v: boolean) => {
                  identifyPickerVisible.value = v;
                }}
                onConfirm={onIdentifyConfirm}
              />
              <PersonPickerModal
                visible={responsiblePickerVisible.value}
                title="选择责任人员"
                initialSelected={responsibleUser.value ? [responsibleUser.value] : []}
                onUpdate:visible={(v: boolean) => {
                  responsiblePickerVisible.value = v;
                }}
                onConfirm={onResponsibleConfirm}
              />
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              {isView.value ? (
                <Button onClick={goList}>返回</Button>
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
