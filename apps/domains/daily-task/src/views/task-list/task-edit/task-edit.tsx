// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import {
  type DailyTaskTarget,
  DailyTaskType,
  type DailyTaskTypeValue,
  type OSSFile,
  type ParticipateModel,
  type StandardRetItem,
  type TaskFeedbackRecordVO,
  getCurrentDailyType,
  setCurrentDailyType,
} from "@g2-client/daily-task/client";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { BasicInfo } from "./components/basic-info";
import { DistributeWizard } from "./components/distribute-wizard";
import { type DistributeData, DistributeSchemeType } from "./components/distribute-wizard/schemes/types";
import { ExecutionRecord } from "./components/execution-record";
import { FeedbackRecord } from "./components/feedback-record";
import { cubeDailyTaskService } from "@/api/server";
import { DailyTaskResponsibleObjectList, type ResponsibleObjectItem, TargetType, UserSelectModal } from "@/components/daily-task-widgets";
import { StandardItemView } from "@/components/standard-item-view/standard-item-view";
import { TargetContentShowView } from "@/components/target-content-show-view/target-content-show-view";
import { TargetContentView } from "@/components/target-content-view/target-content-view";
import { Button, Checkbox, InputNumber, Space, Textarea, message } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";
import {
  type ContentModeConfig,
  ContentType,
  type ContentTypeValue,
  TASK_TYPE_PREFIX_MAP,
  buildParticipateList,
  calculateAllowedProgressOptions,
  convertParticipateListToResponsibleObjectList,
  getErrorMessage,
  handleProgressInputBlur,
  validateAndAdjustProgress,
} from "@/utils/daily-task-edit-common";

import styles from "./task-edit.module.css";

export const TaskEdit = defineComponent({
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
      savingDraft: boolean;
      submitting: boolean;
      normalTaskRecord: {
        dailyType: string;
        executorId: string;
        executorName: string;
        executionTime: number;
        executionResult: string;
        fileList: OSSFile[];
        taskId: string;
        taskName: string;
        remark: string;
      } | null;
      continuity: boolean;
      feedbackRecordList: TaskFeedbackRecordVO[];
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
      savingDraft: false,
      submitting: false,
      normalTaskRecord: null,
      continuity: false,
      feedbackRecordList: [],
    });

    const title = computed(() => {
      const typePrefix = TASK_TYPE_PREFIX_MAP[currentDailyType.value] ?? "日常";

      const titleType = {
        detail: `${typePrefix}任务详情`,
        edit: `编辑${typePrefix}任务`,
        create: `新增${typePrefix}任务`,
        copy: `新增${typePrefix}任务`,
      };
      return titleType[type as keyof typeof titleType] ?? `新增${typePrefix}任务`;
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
    // 响应式的 dailyType，初始值为 sessionStorage 中的值或默认值
    const currentDailyType = ref<DailyTaskTypeValue>(getCurrentDailyType());
    // 判断是否只能使用对象任务
    const isObjectTaskOnly = computed(() => [DailyTaskType.Inspection, DailyTaskType.SmallInspection].includes(currentDailyType.value));
    // 判断是否扫码处理
    const isScanCode = computed(() => currentDailyType.value !== DailyTaskType.SmallInspection);
    // 根据任务类型计算允许显示的目标类型
    const allowedTargetTypes = computed(() => {
      if (currentDailyType.value === DailyTaskType.SmallInspection) {
        return [TargetType.SMALL_ENGINEERING];
      } else if (currentDailyType.value === DailyTaskType.GridTask) {
        // 网格类型不显示区域类型
        return Object.values(TargetType).filter((targetType) => targetType !== TargetType.AREA) as TargetType[];
      }
      return undefined;
    });
    const isDetail = computed((): boolean => type === "detail");

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

    // 提取负责人名字列表
    const extractResponsibleNames = (participates: ParticipateModel[]): string[] => {
      const responsibleNames: string[] = [];
      if (participates && participates.length > 0) {
        participates.forEach((item) => {
          if (item.targetName && !responsibleNames.includes(item.targetName)) {
            responsibleNames.push(item.targetName);
          }
        });
      }
      return responsibleNames;
    };

    // 内容模式配置
    const contentModeConfigs: ContentModeConfig[] = [
      {
        key: ContentType.TARGET,
        label: "对象模式",
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
        renderContent: ({ isEdit, tableData, taskContentRef: contentRef, taskId }): JSX.Element => {
          if (isEdit) {
            return (
              <TargetContentView
                ref={contentRef}
                isEdit={isEdit}
                dataSource={tableData}
                onUpdate:dataSource={(newData) => {
                  state.tableData = newData;
                }}
                {...(allowedTargetTypes.value ? { allowedTargetTypes: allowedTargetTypes.value } : {})}
              />
            );
          }
          return taskId ? <TargetContentShowView taskId={taskId} /> : <div />;
        },
      },
      {
        key: ContentType.STANDARD,
        label: "标准项模式",
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
              maxlength={200}
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

    const handleSaveDraft = async (): Promise<void> => {
      try {
        state.savingDraft = true;
        const formValue = (await basicInfoRef.value?.handleSubmit()) as Record<string, unknown>;
        const standardItemIds = standardContentRef.value?.getStandardItemIds() || [];
        const targetContentData = taskContentRef.value?.getTargetContentData() || [];

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
          draft: true,
          ...(type === "create" ? {} : { id: id as string }),
        };

        await cubeDailyTaskService.saveDraft(params);
        message.success("操作成功");
        handleBack();
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        state.savingDraft = false;
      }
    };

    const handleSubmit = async (): Promise<void> => {
      try {
        state.submitting = true;
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

        const formValue = (await basicInfoRef.value?.handleSubmit()) as Record<string, unknown>;
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

        if (type === "create") {
          await cubeDailyTaskService.addDailyTask(params);
        } else {
          await cubeDailyTaskService.saveDraft({ ...params, id: id as string, draft: false });
        }
        message.success("操作成功");
        handleBack();
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        state.submitting = false;
      }
    };

    onMounted(() => {
      getDetails();
    });

    const getDetails = async (): Promise<void> => {
      if (!id) {
        return;
      }
      try {
        const res = await cubeDailyTaskService.getDailyTaskDetail({ id });
        // 如果任务详情中有 dailyType，将其保存到 sessionStorage 并更新响应式 ref
        if (res.dailyType && Object.values(DailyTaskType).includes(res.dailyType as DailyTaskTypeValue)) {
          const validDailyType = res.dailyType as DailyTaskTypeValue;
          setCurrentDailyType(validDailyType);
          currentDailyType.value = validDailyType;
        }
        state.formState = {
          dailyType: res.dailyType ?? currentDailyType.value,
          name: res.name,
          status: res.status,
          taskCategoryId: res.taskCategoryId,
          taskCategoryName: res.taskCategoryName,
          urgencyId: res.urgencyId,
          urgencyName: res.urgencyName,
          timeLimit: {
            day: res.taskDay,
            hour: res.taskHour,
            minute: res.taskMinute,
          },
          fileList: res.fileList,
          allowTransfer: res.allowTransfer,
          allowDistribute: res.allowDistribute,
        };
        state.normalTaskRecord = res.normalTaskRecord;
        state.continuity = Boolean(res.continuity);
        state.feedbackRecordList = [];
        if (isDetail.value) {
          state.formState.responsibleNames = extractResponsibleNames(res.participateList);
          if (state.continuity) {
            state.feedbackRecordList = await cubeDailyTaskService.getDailyTaskFeedbackList({ taskId: id });
          }
        } else {
          state.responsibleObjectList = convertParticipateListToResponsibleObjectList(res.targetResultList);
        }
        state.normalTaskContent = res.description || "";
        state.standardTableData = res.taskItemList;
        state.oneTimeAllocation = res.isOnDuty;
        state.objectTaskMustScan = res.method === "SCAN_CODE";
        state.targetTaskProgress = res.requireProgress ? res.requireProgress * 100 : null;
        state.enableTargetTaskProgress = res.requireProgress !== undefined && res.requireProgress !== null;

        // 根据 taskType 设置 activeContent
        activeContent.value = res.taskType as ContentTypeValue;

        // 只有当是对象模式且不是详情模式时，才调用 getDailyTaskTargets 接口
        if (activeContent.value === ContentType.TARGET && !isDetail.value) {
          try {
            const targetsData = await cubeDailyTaskService.getDailyTaskTargets({ taskId: id });
            state.tableData = targetsData as unknown as Record<string, DailyTaskTarget[]>;
            // 更新对象数量
            objectTotalCount.value = Object.values(state.tableData).flat().length;
          } catch (error) {
            message.error(getErrorMessage(error));
          }
        }
      } catch (error) {
        message.error(getErrorMessage(error));
      }
    };

    const handleBack = (): void => {
      router.back();
    };

    const isAssignable = computed<boolean>(() => Boolean(state.formState.allowDistribute));

    const isTransfer = computed<boolean>(() => Boolean(state.formState.allowTransfer));

    const distributeWizardRef = ref<{ openModal: () => void }>();
    const userSelectModalRef = ref<{ openModal: () => void }>();
    const currentOperation = ref<"assignable" | "transfer" | null>(null);

    const showExecutionRecord = computed(
      () => isDetail.value && Boolean(state.normalTaskRecord) && [ContentType.STANDARD, ContentType.NORMAL].includes(activeContent.value),
    );
    const showFeedbackRecord = computed(() => isDetail.value && state.continuity);

    // 处理分发
    const handleAssignable = (): void => {
      if (!isAssignable.value) {
        message.error("当前任务状态不能分发");
        return;
      }
      currentOperation.value = "assignable";
      distributeWizardRef.value?.openModal();
    };

    // 处理分发确认
    const handleDistributeConfirm = async (data: DistributeData): Promise<void> => {
      try {
        if (data.schemeType === DistributeSchemeType.SCHEME_ONE) {
          // 方案一：按对象分发
          if (!data.targetList || data.targetList.length === 0) {
            message.error("请选择需要分发的处理目标");
            return;
          }
          if (!data.userId) {
            message.error("请选择处理人员");
            return;
          }
          await cubeDailyTaskService.distributeDailyTask({
            taskId: id,
            transferUserId: data.userId,
            taskTargetIdList: data.targetList.map((item) => item.id),
            dailyType: currentDailyType.value,
          });
          message.success("分发成功");
          getDetails();
        } else if (data.schemeType === DistributeSchemeType.SCHEME_TWO) {
          // 方案二：按对象个数分发
          if (!data.userCountList || data.userCountList.length === 0) {
            message.error("请选择处理人员并设置对象个数");
            return;
          }
          const assignUser = data.userCountList
            .filter((item) => item.count !== undefined && item.count !== null && item.count > 0)
            .map((item) => ({
              userId: item.userId,
              taskPercent: item.count as number,
            }));
          await cubeDailyTaskService.distributeDailyTaskByPercent({
            taskId: id,
            dailyType: currentDailyType.value,
            assignUserParams: assignUser,
          });
          message.success("分发成功");
          getDetails();
        }
      } catch (error) {
        message.error(getErrorMessage(error));
        throw error;
      }
    };

    // 处理移交
    const handleUserSelectData = async (data: { id: string; name: string }[]): Promise<void> => {
      if (data.length === 0) {
        message.error("请选择处理人");
        return;
      }
      const userId = data[0].id;

      try {
        if (currentOperation.value === "transfer") {
          await cubeDailyTaskService.transferDailyTask({
            taskIdList: [id],
            transferUserId: userId,
            dailyType: currentDailyType.value,
          });
          message.success("移交成功");
          handleBack();
        } else {
          message.error("未知操作类型");
        }
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        currentOperation.value = null;
      }
    };

    const handleTransfer = (): void => {
      if (!isTransfer.value) {
        message.error("当前任务状态不能移交");
        return;
      }
      currentOperation.value = "transfer";
      userSelectModalRef.value?.openModal();
    };

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles["edit-content"]}>
          <div class={[styles.title, "g2-skin-section-title"]}>基础信息</div>
          <BasicInfo initFormState={state.formState} ref={basicInfoRef} />
          <div class={styles["section-header"]}>
            <div class={[styles.title, "g2-skin-section-title"]}>任务内容</div>
            {!isDetail.value && !isObjectTaskOnly.value && (
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
          <div>
            {contentModeConfigs.map((config) => (
              <div key={config.key} v-show={activeContent.value === config.key}>
                {config.renderContent?.({
                  isEdit: !isDetail.value,
                  tableData: state.tableData,
                  standardTableData: state.standardTableData,
                  normalTaskContent: state.normalTaskContent,
                  onNormalTaskContentChange: (value: string) => {
                    state.normalTaskContent = value;
                  },
                  taskContentRef,
                  standardContentRef,
                  taskId: id,
                })}
              </div>
            ))}
          </div>
          {showFeedbackRecord.value && (
            <div class={styles["task-distribution-section"]}>
              <div class={[styles.title, "g2-skin-section-title"]}>反馈记录</div>
              <FeedbackRecord dataSource={state.feedbackRecordList} />
            </div>
          )}
          {/* 执行记录：只在详情模式下，且为标准任务或普通任务时显示 */}
          {showExecutionRecord.value && (
            <div class={styles["task-distribution-section"]}>
              <div class={[styles.title, "g2-skin-section-title"]}>执行记录</div>
              <ExecutionRecord
                executorName={state.normalTaskRecord!.executorName}
                executionTime={state.normalTaskRecord!.executionTime}
                executionResult={state.normalTaskRecord!.executionResult}
                remark={state.normalTaskRecord!.remark}
                fileList={state.normalTaskRecord!.fileList}
              />
            </div>
          )}
          {/* 任务发放：只在标准任务和普通任务时显示，详情模式下不显示 */}
          {!isDetail.value && (activeContent.value === ContentType.STANDARD || activeContent.value === ContentType.NORMAL) && (
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

              {/* 选项2和3：只在对象任务时显示 */}
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
          {isAssignable.value && (
            <Button type="primary" onClick={handleAssignable}>
              分发
            </Button>
          )}
          {isTransfer.value && (
            <Button type="primary" onClick={handleTransfer}>
              移交
            </Button>
          )}
          {!isDetail.value && (
            <Button type="primary" loading={state.savingDraft} disabled={state.savingDraft || state.submitting} onClick={handleSaveDraft}>
              保存草稿箱
            </Button>
          )}
          {!isDetail.value && (
            <Button type="primary" loading={state.submitting} disabled={state.savingDraft || state.submitting} onClick={handleSubmit}>
              发布
            </Button>
          )}
        </Space>
      ),
    };
    return (): JSX.Element => (
      <PageLayout title={title.value} v-slots={layoutSlots}>
        {type === "detail" && id && (
          <>
            <DistributeWizard ref={distributeWizardRef} taskId={id} onConfirm={handleDistributeConfirm} />
            <UserSelectModal ref={userSelectModalRef} title="选择处理人" onEnter={handleUserSelectData} />
          </>
        )}
      </PageLayout>
    );
  },
});
