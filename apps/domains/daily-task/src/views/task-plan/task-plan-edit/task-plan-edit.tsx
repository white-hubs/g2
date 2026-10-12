// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyTaskTarget, DailyTaskType, type StandardRetItem, getCurrentDailyType } from "@g2-client/daily-task/client";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { BasicInfo } from "./components/basic-info";
import { cubeDailyTaskService } from "@/api/server";
import { DailyTaskResponsibleObjectList, type ResponsibleObjectItem, TargetType } from "@/components/daily-task-widgets";
import { StandardItemView } from "@/components/standard-item-view/standard-item-view";
import { TargetContentView } from "@/components/target-content-view/target-content-view";
import { Button, Checkbox, InputNumber, Space, Textarea, message } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import {
  type ContentModeConfig,
  ContentType,
  type ContentTypeValue,
  TASK_TYPE_PREFIX_MAP,
  buildParticipateList,
  calculateAllowedProgressOptions,
  convertParticipateListToResponsibleObjectList,
  handleProgressInputBlur,
  validateAndAdjustProgress,
} from "@/utils/daily-task-edit-common";

import styles from "./task-plan-edit.module.css";

const createType = ["create", "copy"];

export const TaskPlanEdit = defineComponent({
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const { type, id } = route.query as { type: string; id: string };

    const state = reactive<{
      formState: Record<string, unknown>;
      tableData: Record<string, DailyTaskTarget[]>;
      standardTableData: StandardRetItem[];
      normalTaskContent: string;
      responsibleObjectList: ResponsibleObjectItem[];
      // 一次性拨款发放给在岗人员
      oneTimeAllocation: boolean;
      // 对象任务必须扫码处理
      objectTaskMustScan: boolean;
      // 目标任务进度达百分比
      targetTaskProgress: number | null;
      // 是否启用目标任务进度
      enableTargetTaskProgress: boolean;
      loading: boolean;
    }>({
      formState: {},
      tableData: {},
      standardTableData: [],
      normalTaskContent: "",
      responsibleObjectList: [],
      oneTimeAllocation: false,
      objectTaskMustScan: false,
      targetTaskProgress: null,
      enableTargetTaskProgress: false,
      loading: false,
    });

    const title = computed(() => {
      const currentType = getCurrentDailyType();
      const typePrefix = TASK_TYPE_PREFIX_MAP[currentType] ?? "日常";

      const titleType = {
        detail: `${typePrefix}任务计划详情`,
        edit: `编辑${typePrefix}任务计划`,
        create: `新增${typePrefix}任务计划`,
        copy: `新增${typePrefix}任务计划`,
      };
      return titleType[type as keyof typeof titleType] ?? `新增${typePrefix}任务计划`;
    });
    const basicInfoRef = ref<{ handleSubmit: () => Promise<Record<string, unknown>> }>();
    const taskContentRef = ref<{
      getTargetContentData: () => {
        targetCategory: string;
        targetId: string;
        standardList: { id: string; name: string }[];
      }[];
      getTotalCount: () => number;
    }>();
    const standardContentRef = ref<{ getStandardItemIds: () => string[] }>();
    const responsibleObjectListRef = ref<{ validate: () => { valid: boolean; message?: string } }>();
    const activeContent = ref<ContentTypeValue>(ContentType.TARGET);

    // 对象总数和可输入的百分比选项
    const objectTotalCount = ref<number>(0);
    const allowedProgressOptions = computed(() => calculateAllowedProgressOptions(objectTotalCount.value));

    // 监听对象数量变化
    watch(
      () => state.tableData,
      () => {
        // 直接从 tableData 计算对象总数
        objectTotalCount.value = Object.values(state.tableData).flat().length;
        // 如果当前输入的百分比不在允许的选项中，重置为第一个选项或 null
        if (state.enableTargetTaskProgress && state.targetTaskProgress !== null) {
          const adjustedValue = validateAndAdjustProgress(state.targetTaskProgress, allowedProgressOptions.value);
          state.targetTaskProgress = adjustedValue;
        }
      },
      { deep: true },
    );
    // 判断是否只能使用对象任务
    const isObjectTaskOnly = computed(() => {
      const currentType = getCurrentDailyType();
      return [DailyTaskType.Inspection, DailyTaskType.SmallInspection].includes(currentType);
    });
    // 判断是否扫码处理
    const isScanCode = computed(() => {
      const currentType = getCurrentDailyType();
      return currentType !== DailyTaskType.SmallInspection;
    });
    // 根据任务类型计算允许显示的目标类型
    const allowedTargetTypes = computed(() => {
      const currentType = getCurrentDailyType();
      if (currentType === DailyTaskType.SmallInspection) {
        return [TargetType.SMALL_ENGINEERING];
      } else if (currentType === DailyTaskType.GridTask) {
        // 网格类型不显示区域类型
        return Object.values(TargetType).filter((targetType) => targetType !== TargetType.AREA) as TargetType[];
      }
      return undefined;
    });
    const isDetail = computed((): boolean => type === "detail");

    // 内容模式配置
    const contentModeConfigs: ContentModeConfig[] = [
      {
        key: ContentType.TARGET,
        label: "对象任务",
        validate: ({ targetContentData }): { valid: boolean; errorMessage?: string } => {
          if (targetContentData.length === 0) {
            return { valid: false, errorMessage: "计划对象不能为空" };
          }
          const valid = targetContentData.every((item) => Array.isArray(item.standardList) && item.standardList.length > 0);
          if (!valid) {
            return { valid: false, errorMessage: "请完成所有对象的标准选择" };
          }
          return { valid: true };
        },
        buildParams: ({ targetContentData, targetTaskProgress, objectTaskMustScan }) => ({
          targetResultList: targetContentData,
          requireProgress: targetTaskProgress ? targetTaskProgress / 100 : undefined,
          method: objectTaskMustScan ? "SCAN_CODE" : "",
        }),
        renderContent: ({ isEdit, tableData, taskContentRef: contentRef }) => (
          <TargetContentView
            ref={contentRef}
            isEdit={isEdit}
            dataSource={tableData}
            onUpdate:dataSource={(newData) => {
              state.tableData = newData;
            }}
            {...(allowedTargetTypes.value ? { allowedTargetTypes: allowedTargetTypes.value } : {})}
          />
        ),
      },
      {
        key: ContentType.STANDARD,
        label: "标准任务",
        validate: ({ standardItemIds }): { valid: boolean; errorMessage?: string } => {
          if (standardItemIds.length === 0) {
            return { valid: false, errorMessage: "请选择标准项" };
          }
          // 验证责任对象列表
          if (responsibleObjectListRef.value?.validate) {
            const validateResult = responsibleObjectListRef.value.validate();
            if (!validateResult.valid) {
              return { valid: false, errorMessage: validateResult.message || "请完善任务发放配置" };
            }
          }
          return { valid: true };
        },
        buildParams: ({ standardItemIds, responsibleObjectList }) => ({
          taskItemIdList: standardItemIds,
          participateList: buildParticipateList(responsibleObjectList),
        }),
        renderContent: ({ isEdit, standardTableData, standardContentRef: contentRef }) => (
          <StandardItemView ref={contentRef} isEdit={isEdit} dataSource={standardTableData} />
        ),
      },
      {
        key: ContentType.NORMAL,
        label: "普通任务",
        validate: ({ normalTaskContent }): { valid: boolean; errorMessage?: string } => {
          if (!normalTaskContent || !normalTaskContent.trim()) {
            return { valid: false, errorMessage: "请输入任务内容" };
          }
          // 验证责任对象列表
          if (responsibleObjectListRef.value?.validate) {
            const validateResult = responsibleObjectListRef.value.validate();
            if (!validateResult.valid) {
              return { valid: false, errorMessage: validateResult.message || "请完善任务发放配置" };
            }
          }
          return { valid: true };
        },
        buildParams: ({ normalTaskContent, responsibleObjectList }) => ({
          description: normalTaskContent,
          participateList: buildParticipateList(responsibleObjectList),
        }),
        renderContent: ({ isEdit, normalTaskContent, onNormalTaskContentChange }) => (
          <div class={styles["normal-task-content"]}>
            <div class={styles["normal-task-label"]}>任务内容</div>
            <Textarea
              v-model:value={normalTaskContent}
              onUpdate:value={onNormalTaskContentChange}
              placeholder="请输入任务内容"
              disabled={!isEdit}
              rows={8}
              showCount
              maxlength={2000}
              class={styles["normal-task-textarea"]}
            />
          </div>
        ),
      },
    ];

    // 当前激活的模式配置
    const activeModeConfig = computed(
      () => contentModeConfigs.find((config) => config.key === activeContent.value) || contentModeConfigs[0],
    );

    const handleSubmit = async (): Promise<void> => {
      try {
        state.loading = true;
        const formValue = (await basicInfoRef.value?.handleSubmit()) as Record<string, unknown>;
        const standardItemIds = standardContentRef.value?.getStandardItemIds() || [];
        const targetContentData = taskContentRef.value?.getTargetContentData() || [];

        // 使用配置的验证逻辑
        const validationResult = activeModeConfig.value.validate?.({
          targetContentData,
          standardItemIds,
          normalTaskContent: state.normalTaskContent,
        });

        if (validationResult && !validationResult.valid) {
          message.error(validationResult.errorMessage || "验证失败");
          return;
        }

        // 使用配置的参数构建逻辑
        const params: Record<string, unknown> = {
          taskType: activeContent.value,
          ...formValue,
          ...activeModeConfig.value.buildParams?.({
            targetContentData,
            standardItemIds,
            normalTaskContent: state.normalTaskContent,
            responsibleObjectList: state.responsibleObjectList,
            targetTaskProgress: state.targetTaskProgress,
            objectTaskMustScan: state.objectTaskMustScan,
          }),
          isOnDuty: state.oneTimeAllocation,
        };

        if (createType.includes(type)) {
          await cubeDailyTaskService.addDailyPlan(params);
        } else {
          await cubeDailyTaskService.updateDailyPlan({ ...params, id: id as string });
        }
        message.success("操作成功");
        handleBack();
      } catch (error) {
        const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
        message.error(errorMessage || "请求失败");
      } finally {
        state.loading = false;
      }
    };
    onMounted(() => {
      getDetails();
      // 初始化对象数量
      objectTotalCount.value = Object.values(state.tableData).flat().length;
    });

    const getDetails = async (): Promise<void> => {
      if (!id) {
        return;
      }
      try {
        const res = await cubeDailyTaskService.getDailyPlan({ id });
        state.formState = {
          dailyType: res.dailyType ?? getCurrentDailyType(),
          name: type === "copy" ? `${res.name}-副本-${dayjs().format("YYYY-MM-DD")}` : res.name,
          startTime: res.startTime,
          endTime: res.endTime,
          taskCategoryId: res.taskCategoryId,
          taskCategoryName: res.taskCategoryName,
          urgencyId: res.urgencyId,
          urgencyName: res.urgencyName,
          cronId: res.cronId || "",
          cronName: res.cronName,
          specifiedType: res.specifiedType,
          specifiedDays: res.specifiedDays?.split(",") || [],
          specifiedTime: res.specifiedTime,
          timeLimit: {
            day: res.taskDay,
            hour: res.taskHour,
            minute: res.taskMinute,
          },
          description: res.description || "",
          fileList: res.fileList,
        };
        state.oneTimeAllocation = res.isOnDuty;
        state.objectTaskMustScan = res.method === "SCAN_CODE";
        state.targetTaskProgress = res.requireProgress ? res.requireProgress * 100 : null;
        state.enableTargetTaskProgress = res.requireProgress !== undefined && res.requireProgress !== null;
        state.tableData = res.targetTypeResultMap || {};
        state.standardTableData = res.taskItemList || [];
        state.responsibleObjectList = res.participateList ? convertParticipateListToResponsibleObjectList(res.participateList) : [];
        state.normalTaskContent = res.description || "";
        activeContent.value = res.taskType as ContentTypeValue;
        // 更新对象数量
        objectTotalCount.value = Object.values(state.tableData).flat().length;
      } catch (error) {
        const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
        message.error(errorMessage || "请求失败");
      }
    };

    const handleBack = (): void => {
      router.back();
    };

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles["edit-content"]}>
          <div class={[styles.title, "g2-skin-section-title"]}>基础信息</div>
          <BasicInfo initFormState={state.formState} ref={basicInfoRef} />
          <div class={styles["section-header"]}>
            <div class={[styles.title, "g2-skin-section-title"]}>任务内容</div>
            {createType.includes(type) && !isObjectTaskOnly.value && (
              <div class={styles["content-actions"]}>
                <Space>
                  {contentModeConfigs.map((config) => (
                    <Button
                      key={config.key}
                      type={activeContent.value === config.key ? "primary" : "default"}
                      onClick={() => {
                        activeContent.value = config.key;
                      }}
                    >
                      {config.label}
                    </Button>
                  ))}
                </Space>
              </div>
            )}
          </div>
          {activeModeConfig.value.renderContent?.({
            isEdit: !isDetail.value,
            tableData: state.tableData,
            standardTableData: state.standardTableData,
            normalTaskContent: state.normalTaskContent,
            onNormalTaskContentChange: (value: string) => {
              state.normalTaskContent = value;
            },
            taskContentRef,
            standardContentRef,
          })}
          {/* 任务发放：只在标准计划和普通计划时显示 */}
          {(activeContent.value === ContentType.STANDARD || activeContent.value === ContentType.NORMAL) && (
            <div class={styles["task-distribution-section"]}>
              <div class={[styles.title, "g2-skin-section-title"]}>任务发放</div>
              <DailyTaskResponsibleObjectList
                ref={responsibleObjectListRef}
                v-model:value={state.responsibleObjectList}
                disabled={isDetail.value}
              />
            </div>
          )}
          {/* 其他 */}
          <div class={styles["other-section"]}>
            <div class={[styles.title, "g2-skin-section-title"]}>其他</div>
            <div class={styles["other-options"]}>
              {/* 选项1：仅发放给在岗人员 - 所有模式都显示 */}
              <div class={styles["other-option-item"]}>
                <Checkbox v-model:checked={state.oneTimeAllocation} disabled={isDetail.value}>
                  仅发放给在岗人员
                </Checkbox>
              </div>

              {/* 选项2和3：只在对象计划时显示 */}
              {activeContent.value === ContentType.TARGET && (
                <>
                  {/* 对象任务必须扫码处理：当 dailyType 不是 SmallInspection 时显示 */}
                  {isScanCode.value && (
                    <div class={styles["other-option-item"]}>
                      <Checkbox v-model:checked={state.objectTaskMustScan} disabled={isDetail.value}>
                        对象任务必须扫码处理
                      </Checkbox>
                    </div>
                  )}
                  <div class={styles["other-option-item"]}>
                    <Checkbox
                      checked={state.enableTargetTaskProgress}
                      disabled={isDetail.value}
                      onUpdate:checked={(checked: boolean) => {
                        state.enableTargetTaskProgress = checked;
                        if (!checked) {
                          state.targetTaskProgress = null;
                        } else if (state.targetTaskProgress === null) {
                          state.targetTaskProgress = 0;
                        }
                      }}
                    >
                      对象任务进度达
                    </Checkbox>
                    <div style={{ width: "100px", margin: "0 8px" }}>
                      <InputNumber
                        v-model:value={state.targetTaskProgress}
                        min={0}
                        max={100}
                        precision={0}
                        disabled={!state.enableTargetTaskProgress || isDetail.value}
                        placeholder={allowedProgressOptions.value.length > 0 ? "请输入" : "请先选择对象"}
                        onBlur={() => {
                          const adjustedValue = handleProgressInputBlur({
                            enableTargetTaskProgress: state.enableTargetTaskProgress,
                            targetTaskProgress: state.targetTaskProgress,
                            allowedOptions: allowedProgressOptions.value,
                          });
                          if (adjustedValue !== null && adjustedValue !== state.targetTaskProgress) {
                            state.targetTaskProgress = adjustedValue;
                          }
                        }}
                      />
                    </div>
                    <span>%，即任务为已完成</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ),

      "footer-page": (): JSX.Element => (
        <Space>
          <Button
            onClick={() => {
              handleBack();
            }}
          >
            返回
          </Button>
          {!isDetail.value && (
            <Button type="primary" loading={state.loading} onClick={handleSubmit}>
              发布
            </Button>
          )}
        </Space>
      ),
    };
    return (): JSX.Element => <PageLayout title={title.value} v-slots={layoutSlots} />;
  },
});
