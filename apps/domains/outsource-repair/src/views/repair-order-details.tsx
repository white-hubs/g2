import type { OutsourceTicket } from "@g2-client/outsource-repair/client";
import { Button, PageLayout, Spin, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ProcessEventModal } from "./process-event-modal";
import { ProcessSteps } from "./process-steps";
import { ProcessTaskModal } from "./process-task-modal";
import { getOutsourceRepairClient, getOutsourceRepairRuntime } from "@/domain-context";
import { formatDateTime } from "@/utils/date";

import styles from "./detail-form.module.css";

/** 旧 `views/repair/repairOrder/details.vue`。 */
export const OutsourceRepairOrderDetails = defineComponent({
  name: "OutsourceRepairOrderDetails",
  props: {
    /** 宿主可直接传入工单 ID；未传时回落到路由 query.id（与旧页一致）。 */
    id: { type: String, default: "" },
  },
  setup(props) {
    const client = getOutsourceRepairClient();
    const { basePath } = getOutsourceRepairRuntime();
    const route = useRoute();
    const router = useRouter();
    const detail = ref<OutsourceTicket>({});
    const loading = ref(false);
    const eventOpen = ref(false);
    const eventId = ref("");
    const taskOpen = ref(false);

    const ticketId = computed(() => props.id || (typeof route.query.id === "string" ? route.query.id : ""));

    const load = async (): Promise<void> => {
      if (!ticketId.value) {
        return;
      }
      loading.value = true;
      try {
        detail.value = (await client.getTicket(ticketId.value)) ?? {};
      } catch (error) {
        message.error(error instanceof Error ? error.message : "工单详情加载失败");
      } finally {
        loading.value = false;
      }
    };

    watch(ticketId, () => void load(), { immediate: true });

    const goBack = (): void => {
      void router.back();
    };

    /**
     * 旧页「委外维修单」是跳转维修单详情的链接。维修单详情尚未注册路由，
     * 因此先判断目标 path 是否可解析，不可解析时退化为纯文本，避免产生死链。
     */
    const receiptPath = `${basePath}/repair-list-details`;
    const receiptRoutable = computed(() => router.resolve(receiptPath).matched.length > 0);

    const openReceipt = (): void => {
      void router.push({ path: receiptPath, query: { type: "detail", id: String(detail.value.applicationReceiptId ?? "") } });
    };

    const openEvent = (id: string): void => {
      eventId.value = id;
      eventOpen.value = true;
    };

    const field = (label: string, value: unknown, full = false): JSX.Element => (
      <div class={[styles.item, full ? styles.itemFull : ""]}>
        <span class={styles.label}>{label}</span>
        <span class={styles.value}>{value}</span>
      </div>
    );

    const receiptCell = (): JSX.Element | string => {
      const name = detail.value.repairReceiptName;
      if (!name) {
        return "--";
      }
      if (!detail.value.applicationReceiptId || !receiptRoutable.value) {
        return String(name);
      }
      return (
        <Button type="link" class={styles.modalLink} onClick={openReceipt}>
          {String(name)}
        </Button>
      );
    };

    const stepTitle = (event: { handleUserName?: string; action?: string }): string =>
      `${event.handleUserName ? `【${event.handleUserName}】` : ""}${event.action ?? ""}`;

    const slots = {
      "layout-content": () => {
        const ticket = detail.value;
        const acceptanceVisible = ticket.status === "WAIT_ACCEPTANCE" || ticket.status === "COMPLETED";
        return (
          <Spin spinning={loading.value}>
            <div class={styles.detailForm}>
              <div class={styles.sectionTitle}>委外维修单信息</div>
              <div class={styles.gridTwo}>
                {field("工单编号", ticket.code ? String(ticket.code) : "--")}
                {field("委外维修单", receiptCell())}
                {field("工单时间", formatDateTime(ticket.createTime))}
              </div>
              <div class={styles.sectionTitle}>工单流程</div>
              <ProcessSteps events={ticket.checkProcessEvent ?? []} titleOf={stepTitle} emptyText="暂无工单流程" onDetail={openEvent} />
              {acceptanceVisible ? <div class={styles.sectionTitle}>工单验收</div> : null}
            </div>
          </Spin>
        );
      },
      "footer-page": () => (
        <>
          <Button onClick={goBack}>返回</Button>
          {detail.value.status === "WAIT_ACCEPTANCE" ? (
            <Button
              type="primary"
              loading={loading.value}
              onClick={() => {
                taskOpen.value = true;
              }}
            >
              验收审批
            </Button>
          ) : null}
        </>
      ),
    };

    return () => (
      <>
        <PageLayout title="委外工单详情" v-slots={slots} />
        <ProcessEventModal
          open={eventOpen.value}
          eventId={eventId.value}
          onUpdate:open={(value: boolean) => {
            eventOpen.value = value;
          }}
        />
        <ProcessTaskModal
          open={taskOpen.value}
          taskId={String(detail.value.taskId ?? "")}
          title="验收审批"
          submitMode="formValues"
          onUpdate:open={(value: boolean) => {
            taskOpen.value = value;
          }}
          onDone={() => void load()}
        />
      </>
    );
  },
});
