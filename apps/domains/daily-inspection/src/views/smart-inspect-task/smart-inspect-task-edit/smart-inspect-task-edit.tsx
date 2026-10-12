// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { CubeLayout, joinIds } from "@/compat/app-design";
import { InspectContentTable, type DataSourceType } from "@/components/inspect-content-table/inspect-content-table";
import { SmartInspectDeviceRouteConfig } from "@/components/smart-inspect-device-route-config/smart-inspect-device-route-config";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Space, message } from "@/pc-ui-runtime";
import { SmartInspectBasicForm } from "@/views/smart-inspect-common/smart-inspect-basic-form";
import {
  createSmartInspectCommonSettingsValue,
  SmartInspectCommonSettings,
  type SmartInspectCommonSettingsValue,
} from "@/views/smart-inspect-common/smart-inspect-common-settings";
import { SmartInspectStepShell, type SmartInspectStepItem } from "@/views/smart-inspect-common/smart-inspect-step-shell";
import { SmartInspectTargetTypeSelect } from "@/views/smart-inspect-common/smart-inspect-target-type-select";
import {
  buildDroneInspectionConfigPayload,
  createDroneConfigFromTaskDetail,
  getInspectionModeByCategories,
  getSmartTargetCategories,
  hasCommonTargetCategory,
  mergeSmartTargetCategories,
  type SmartInspectCommonTargetCategory,
  type SmartInspectDeviceRouteConfigValue,
  type SmartInspectDroneTaskSummary,
  type SmartInspectSpecialTargetCategory,
  type SmartInspectTargetCategory,
} from "@/views/smart-inspect-common/types";

import styles from "@/views/smart-inspect-common/smart-inspect-page.module.css";

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value ? value.split(",").filter(Boolean) : [];
  return [];
};

const toBoolean = (value: unknown): boolean => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const getCommonCategories = (categories: SmartInspectTargetCategory[]): SmartInspectCommonTargetCategory[] => {
  return categories.filter((item) => item !== "DRONE" && item !== "ROBOT_DOG") as SmartInspectCommonTargetCategory[];
};

function flattenTargets(detail: InspectionRecord): DataSourceType[] {
  const typeTargets = detail.typeTargets;
  const raw = Array.isArray(typeTargets)
    ? typeTargets.flat()
    : Array.isArray(detail.taskTargetDTOList)
      ? detail.taskTargetDTOList
      : Array.isArray(detail.targets)
        ? detail.targets
        : [];
  return (raw as InspectionRecord[])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      targetId: String(item.targetId ?? item.id ?? ""),
      targetName: String(item.targetName ?? item.name ?? ""),
      targetCategory: String(item.targetCategory ?? item.type ?? ""),
      standardDTOList: Array.isArray(item.standardDTOList)
        ? item.standardDTOList
        : Array.isArray(item.standardVOS)
          ? item.standardVOS
          : item.standardId
            ? [{ id: item.standardId, name: item.standardName, standardItems: [] }]
            : [],
    }));
}

export const SmartInspectTaskEdit = defineComponent({
  name: "SmartInspectTaskEdit",
  props: {
    forceReadonly: { type: Boolean, default: false },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const state = reactive<{
      formState: InspectionRecord;
      commonSettings: SmartInspectCommonSettingsValue;
      tableData: DataSourceType[];
      selectedTargetCategories: SmartInspectTargetCategory[];
      droneConfig: SmartInspectDeviceRouteConfigValue | undefined;
      robotDogConfig: SmartInspectDeviceRouteConfigValue | undefined;
      loading: boolean;
    }>({
      formState: {},
      commonSettings: createSmartInspectCommonSettingsValue(),
      tableData: [],
      selectedTargetCategories: [],
      droneConfig: undefined,
      robotDogConfig: undefined,
      loading: false,
    });

    const title = computed(() => {
      const titleType = {
        info: "智慧巡检任务详情",
        create: "新增智慧巡检任务",
      };
      return titleType[String(route.query.type ?? "create") as keyof typeof titleType] ?? "新增智慧巡检任务";
    });
    const readonly = computed(
      () => props.forceReadonly || String(route.query.type ?? "") === "info" || String(route.name ?? "").includes("info"),
    );
    const basicInfoRef = ref<{
      handleSubmit: () => Promise<InspectionRecord>;
      getFormState: () => InspectionRecord;
      setFormValues: (values: InspectionRecord) => void;
    }>();
    const commonSettingsRef = ref<{ validate: () => Promise<SmartInspectCommonSettingsValue> }>();
    const patrolContentRef = ref<{
      validate: () => boolean;
      getApiParams: () => unknown[];
      getDataSource: () => DataSourceType[];
    }>();
    const droneRouteRef = ref<{ validate: () => Promise<SmartInspectDeviceRouteConfigValue | undefined> }>();
    const robotDogRouteRef = ref<{ validate: () => Promise<SmartInspectDeviceRouteConfigValue | undefined> }>();
    const activeStepKey = ref("basic");

    const commonCategories = computed(() => getCommonCategories(state.selectedTargetCategories));
    const hasCommonStep = computed(() => hasCommonTargetCategory(state.selectedTargetCategories));
    const hasDroneStep = computed(() => state.selectedTargetCategories.includes("DRONE"));
    const hasRobotDogStep = computed(() => state.selectedTargetCategories.includes("ROBOT_DOG"));
    const hasSpecialStep = computed(() => hasDroneStep.value || hasRobotDogStep.value);
    const shouldShowCommonStep = computed(() => hasCommonStep.value || (!readonly.value && !hasSpecialStep.value));

    const validateBasicStep = async (): Promise<InspectionRecord> => {
      const formValue = (await basicInfoRef.value?.handleSubmit()) as InspectionRecord;
      if (!state.selectedTargetCategories.length) {
        message.error("请至少选择一种巡检对象类型");
        activeStepKey.value = "basic";
        return Promise.reject(new Error("target category required"));
      }
      return formValue;
    };

    const validateCommonSettings = async (): Promise<SmartInspectCommonSettingsValue | undefined> => {
      if (!hasCommonStep.value) return createSmartInspectCommonSettingsValue();
      try {
        return await commonSettingsRef.value?.validate();
      } catch {
        activeStepKey.value = "common";
        return undefined;
      }
    };

    const validateCommonContent = (): unknown[] | undefined => {
      if (!hasCommonStep.value) return [];
      if (!patrolContentRef.value?.validate()) {
        activeStepKey.value = "common";
        return undefined;
      }
      const taskTargetDTOList = patrolContentRef.value?.getApiParams();
      if (!taskTargetDTOList?.length) {
        activeStepKey.value = "common";
        message.error("巡检内容不能为空");
        return undefined;
      }
      const noStandardList = taskTargetDTOList.filter((item) => !(item as InspectionRecord).standardId);
      if (noStandardList.length) {
        activeStepKey.value = "common";
        message.error("请选择巡检标准");
        return undefined;
      }
      const noInspectItemList = taskTargetDTOList.filter((item) => !(item as InspectionRecord).itemId);
      if (noInspectItemList.length) {
        activeStepKey.value = "common";
        message.error("请选择巡检项");
        return undefined;
      }
      return taskTargetDTOList;
    };

    const validateSpecialRoute = async (
      category: SmartInspectSpecialTargetCategory,
    ): Promise<SmartInspectDeviceRouteConfigValue | undefined> => {
      try {
        return category === "DRONE" ? await droneRouteRef.value?.validate() : await robotDogRouteRef.value?.validate();
      } catch (error) {
        activeStepKey.value = category === "DRONE" ? "drone" : "robotDog";
        throw error;
      }
    };

    const stepItems = computed((): SmartInspectStepItem[] => {
      const steps: SmartInspectStepItem[] = [
        {
          key: "basic",
          title: "基础信息与巡检对象类型",
          description: "填写任务信息，勾选本次巡检对象类型",
          render: () => (
            <div class={styles["step-content"]}>
              <div class={styles["section-title"]}>基础信息</div>
              <SmartInspectBasicForm initFormState={state.formState} mode="task" readonly={readonly.value} ref={basicInfoRef} />
              <SmartInspectTargetTypeSelect
                value={state.selectedTargetCategories}
                readonly={readonly.value}
                onUpdate:value={(value: SmartInspectTargetCategory[]) => {
                  state.selectedTargetCategories = value;
                }}
              />
            </div>
          ),
        },
      ];

      if (shouldShowCommonStep.value) {
        steps.push({
          key: "common",
          title: "配置巡检对象与内容",
          description: "选择具体对象，批量配置或删除巡检内容",
          render: () => (
            <div class={styles["step-content"]}>
              <div class={styles["section-title"]}>配置巡检对象与内容</div>
              <SmartInspectCommonSettings
                value={state.commonSettings}
                readonly={readonly.value}
                ref={commonSettingsRef}
                onUpdate:value={(value: SmartInspectCommonSettingsValue) => {
                  state.commonSettings = value;
                }}
              />
              <InspectContentTable
                dataSource={state.tableData}
                targetCategories={commonCategories.value}
                readonly={readonly.value}
                ref={patrolContentRef}
              />
            </div>
          ),
        });
      }

      if (hasDroneStep.value) {
        steps.push({
          key: "drone",
          title: "无人机巡检配置",
          description: "选择无人机设备、航线并配置航点内容",
          render: () => (
            <div class={styles["step-content"]}>
              <div class={styles["section-title"]}>无人机巡检配置</div>
              <SmartInspectDeviceRouteConfig method="DRONE" value={state.droneConfig} readonly={readonly.value} ref={droneRouteRef} />
            </div>
          ),
        });
      }

      if (hasRobotDogStep.value) {
        steps.push({
          key: "robotDog",
          title: "机器狗巡检配置",
          description: "选择机器狗设备、地面路线并配置路线点内容",
          render: () => (
            <div class={styles["step-content"]}>
              <div class={styles["section-title"]}>机器狗巡检配置</div>
              <SmartInspectDeviceRouteConfig
                method="ROBOT_DOG"
                value={state.robotDogConfig}
                readonly={readonly.value}
                ref={robotDogRouteRef}
              />
            </div>
          ),
        });
      }

      return steps;
    });

    const activeStepIndex = computed(() => {
      const index = stepItems.value.findIndex((item) => item.key === activeStepKey.value);
      return index >= 0 ? index : 0;
    });
    const isLastStep = computed(() => activeStepIndex.value >= stepItems.value.length - 1);

    watch(
      () => stepItems.value.map((item) => item.key).join(","),
      () => {
        if (stepItems.value.some((item) => item.key === activeStepKey.value)) return;
        activeStepKey.value = stepItems.value[0]?.key ?? "basic";
      },
    );

    const handlePrevStep = (): void => {
      const prevStep = stepItems.value[activeStepIndex.value - 1];
      if (prevStep) activeStepKey.value = prevStep.key;
    };

    const handleNextStep = async (): Promise<void> => {
      if (activeStepKey.value === "basic") {
        await validateBasicStep();
      }
      if (activeStepKey.value === "common") {
        const commonSettings = await validateCommonSettings();
        if (!commonSettings) return;
        const commonContent = validateCommonContent();
        if (!commonContent) return;
      }
      const nextStep = stepItems.value[activeStepIndex.value + 1];
      if (nextStep) activeStepKey.value = nextStep.key;
    };

    const handleSubmit = async (): Promise<void> => {
      const basicFormValue = await validateBasicStep();
      const commonSettings = await validateCommonSettings();
      if (!commonSettings) return;
      const formValue = { ...basicFormValue, ...commonSettings };
      const taskTargetDTOList = validateCommonContent();
      if (!taskTargetDTOList) return;

      const configs: Partial<Record<SmartInspectSpecialTargetCategory, SmartInspectDeviceRouteConfigValue>> = {};
      try {
        if (hasDroneStep.value) configs.DRONE = await validateSpecialRoute("DRONE");
        if (hasRobotDogStep.value) configs.ROBOT_DOG = await validateSpecialRoute("ROBOT_DOG");
      } catch {
        return;
      }

      try {
        state.loading = true;
        await getDailyInspectionClient().createTask({
          ...formValue,
          ...(route.query.id && !readonly.value ? { id: String(route.query.id) } : {}),
          taskTargetDTOList,
          receiveIds: joinIds(formValue.receiveIds),
          checkUserIds: toArray(formValue.checkUserIds).join(","),
          validBeginTime: formValue.beginTime,
          validEndTime: formValue.endTime,
          cronId: formValue.cronId === "custom" ? "" : formValue.cronId,
          enable: 1,
          inspectionMode: getInspectionModeByCategories(state.selectedTargetCategories),
          targetCategories: state.selectedTargetCategories,
          droneConfig: buildDroneInspectionConfigPayload(configs.DRONE),
          robotDogConfig: buildDroneInspectionConfigPayload(configs.ROBOT_DOG),
          businessType: "SMART_INSPECT",
        });
        message.success("保存成功");
        router.back();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败，请检查填写内容后重试");
      } finally {
        state.loading = false;
      }
    };

    const getDetails = async (): Promise<void> => {
      const id = String(route.query.id ?? "");
      if (!id) return;
      try {
        const res = await getDailyInspectionClient().getTask({ id });
        state.tableData = flattenTargets(res);
        state.formState = { ...res };
        state.commonSettings = {
          ...createSmartInspectCommonSettingsValue(),
          isCheck: toBoolean(res.isCheck),
          method: String(res.method || ""),
          checkUserType: String(res.checkUserType || "1"),
          checkUserIds: toArray(res.checkUserIds),
          checkRoleIds: res.checkRoleIds,
          checkPostIds: res.checkPostIds,
          checkDeptIds: res.checkDeptIds,
        };
        state.selectedTargetCategories = mergeSmartTargetCategories(
          getSmartTargetCategories(res),
          state.tableData.map((item) => item.targetCategory),
        );
        state.droneConfig = createDroneConfigFromTaskDetail(res.droneInspection as SmartInspectDroneTaskSummary | undefined);
        state.robotDogConfig = createDroneConfigFromTaskDetail(
          res.robotDogInspection as SmartInspectDroneTaskSummary | undefined,
          [],
          "ROBOT_DOG",
        );
      } catch {
        message.error("智慧巡检任务详情加载失败");
      }
    };

    onMounted(() => {
      void getDetails();
    });

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles["page-content"]}>
          <SmartInspectStepShell
            steps={stepItems.value}
            activeKey={activeStepKey.value}
            clickable={readonly.value}
            onChange={(key: string) => {
              activeStepKey.value = key;
            }}
          />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Space>
          <Button onClick={() => router.back()}>返回</Button>
          {!readonly.value && activeStepIndex.value > 0 && <Button onClick={handlePrevStep}>上一步</Button>}
          {!readonly.value && !isLastStep.value && (
            <Button type="primary" onClick={() => void handleNextStep()}>
              下一步
            </Button>
          )}
          {!readonly.value && isLastStep.value && (
            <Button type="primary" loading={state.loading} onClick={() => void handleSubmit()}>
              保存
            </Button>
          )}
        </Space>
      ),
    };

    return (): JSX.Element => <CubeLayout title={title.value} v-slots={layoutSlots} />;
  },
});

export const SmartInspectTaskInfo = defineComponent({
  name: "SmartInspectTaskInfo",
  setup() {
    return () => <SmartInspectTaskEdit forceReadonly />;
  },
});
