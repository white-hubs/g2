import type { DutyId, DutySignaturePreviewAssignmentVO, DutySignaturePreviewVO, DutySignatureVO } from "@g2-contract/safety-personnel";
import { computed, defineComponent, onMounted, ref } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import { getDutySignPreview, signDutyAssignment } from "@/api/server";
import { PageLayout, Button, Checkbox, Empty, Modal, Tag, message } from "@/pc-ui-runtime";
import { formatDutyPeriodRange, formatText, periodLabel, showApiError } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

export const DutySignaturePage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const loading = ref(false);
    const signing = ref(false);
    const confirmed = ref(false);
    const confirmOpen = ref(false);
    const preview = ref<DutySignaturePreviewVO>();
    const signedRecords = ref<DutySignatureVO[]>([]);

    const assignments = computed<DutySignaturePreviewAssignmentVO[]>(() => preview.value?.assignments ?? []);
    const isValidDutyId = (id: unknown): id is DutyId =>
      (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && id.trim().length > 0);
    const assignmentIds = computed<DutyId[]>(() => {
      const ids = preview.value?.assignmentIds?.filter(isValidDutyId) ?? [];
      if (ids.length > 0) {
        return ids;
      }
      return assignments.value.map((item) => item.assignmentId).filter(isValidDutyId);
    });
    const canSign = computed(() => !preview.value?.alreadySigned && assignmentIds.value.length > 0);

    const loadPreview = async (): Promise<void> => {
      loading.value = true;
      try {
        preview.value = await useAuthRequest(() => getDutySignPreview());
        confirmed.value = false;
      } catch (e) {
        showApiError(e, "查询签收确认失败");
        preview.value = undefined;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadPreview();
    });

    const requestSign = (): void => {
      if (!canSign.value) {
        message.warning("暂无待签收清单");
        return;
      }
      if (!confirmed.value) {
        message.warning("请先勾选签收声明");
        return;
      }
      confirmOpen.value = true;
    };

    const submitSign = async (): Promise<void> => {
      signing.value = true;
      try {
        signedRecords.value = await useAuthRequest(() =>
          signDutyAssignment({
            assignmentIds: assignmentIds.value,
            confirmed: true,
          }),
        );
        message.success(`已签收 ${signedRecords.value.length || assignmentIds.value.length} 份周期清单`);
        confirmOpen.value = false;
        await loadPreview();
      } catch (e) {
        showApiError(e, "签收失败");
      } finally {
        signing.value = false;
      }
    };

    const renderAssignment = (assignment: DutySignaturePreviewAssignmentVO): JSX.Element => (
      <div class={styles.assignment} key={assignment.assignmentId}>
        <div class={styles.assignmentHeader}>
          <div>
            <div class={styles.title}>
              {formatText(assignment.roleName)} · {periodLabel(assignment.periodType)}责任清单
            </div>
            <div class={styles.meta}>
              {formatText(assignment.responsibleUserName || preview.value?.userName)} ·{" "}
              {formatDutyPeriodRange(assignment.periodStartTime, assignment.periodEndTime)}
            </div>
          </div>
          <Tag color="blue">
            {assignment.groups?.reduce((sum, group) => sum + (group.itemCount ?? group.items?.length ?? 0), 0) ?? 0} 项
          </Tag>
        </div>
        {(assignment.groups ?? []).map((group) => (
          <div class={styles.group} key={`${assignment.assignmentId}-${group.periodType}`}>
            <div class={styles.groupTitle}>
              <Tag color="blue">{periodLabel(group.periodType)}</Tag>
              <span>{group.itemCount ?? group.items?.length ?? 0} 项</span>
            </div>
            <div class={styles.taskList}>
              {(group.items ?? []).map((item) => (
                <div
                  class={[styles.taskItem, item.mandatory ? styles.mandatoryItem : ""]}
                  key={`${assignment.assignmentId}-${group.periodType}-${item.clauseNo}-${item.taskDescription}`}
                >
                  <div>
                    <div class={styles.taskTitle}>{formatText(item.taskDescription)}</div>
                    <div class={styles.meta}>
                      {formatText(item.clauseNo)} · {periodLabel(item.periodType)}
                    </div>
                  </div>
                  {item.mandatory ? <Tag color="red">强制</Tag> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    const layoutSlots = {
      "layout-header": (): null => null,
      "layout-content": (): JSX.Element => (
        <>
          {assignments.value.length === 0 && !loading.value ? (
            <Empty description="暂无待签收清单" />
          ) : (
            assignments.value.map((assignment) => renderAssignment(assignment))
          )}
          <div class={styles.statement}>
            <Checkbox checked={confirmed.value} disabled={!canSign.value} onUpdate:checked={(value: boolean) => (confirmed.value = value)}>
              我已详细阅读并理解以上责任清单的全部内容，确认本人将按照法规要求和执行周期履行职责。
            </Checkbox>
          </div>
          <div class={styles.actions}>
            <Button type="primary" disabled={!canSign.value || !confirmed.value} loading={signing.value} onClick={requestSign}>
              确认签收
            </Button>
          </div>
        </>
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} showFooter={false} v-slots={layoutSlots} />
        <Modal
          open={confirmOpen.value}
          title="确认签收"
          width={420}
          confirmLoading={signing.value}
          onUpdate:open={(value: boolean) => (confirmOpen.value = value)}
          onOk={() => void submitSign()}
        >
          <div class={styles.confirmText}>签收后将生成不可删除的签收记录（含时间戳和操作人信息），确认签收？</div>
        </Modal>
      </>
    );
  },
});
