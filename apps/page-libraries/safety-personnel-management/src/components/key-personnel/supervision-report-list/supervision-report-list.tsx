import { showApiError } from "../../../utils/api-error";
/** @jsxImportSource vue */
import type { KeyPersonReportVO } from "@g2-contract/safety-personnel";
import { dayjs } from "@g2-platform/pc-ui";
import { Empty, Spin } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref, watch } from "vue";

import { pageKeyPersonReports } from "../../../api/safety-personnel";
import { KEY_PERSON_REPORT_PAGE_SIZE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { FileAttachmentLink } from "../file-attachment-link/file-attachment-link";

import styles from "./supervision-report-list.module.css";

export interface ReportPaginationState {
  total: number;
  pageNumber: number;
  pageSize: number;
}

export const SupervisionReportList = defineComponent({
  props: {
    personId: { type: Number as PropType<number | null>, default: null },
    refreshKey: { type: Number, default: 0 },
    /** 分页由抽屉底部固定展示时设为 true */
    hidePagination: { type: Boolean, default: false },
  },
  emits: ["paginationChange"],
  setup(props, { emit, expose }) {
    const loading = ref(false);
    const records = ref<KeyPersonReportVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);

    const emitPagination = (): void => {
      emit("paginationChange", {
        total: total.value,
        pageNumber: pageNumber.value,
        pageSize: KEY_PERSON_REPORT_PAGE_SIZE,
      } satisfies ReportPaginationState);
    };

    const load = async (): Promise<void> => {
      if (!props.personId) {
        records.value = [];
        total.value = 0;
        emitPagination();
        return;
      }
      loading.value = true;
      try {
        const res = await useAuthRequest(() =>
          pageKeyPersonReports({
            personId: props.personId!,
            pageNumber: pageNumber.value,
            pageSize: KEY_PERSON_REPORT_PAGE_SIZE,
          }),
        );
        records.value = res.records ?? [];
        total.value = res.total ?? 0;
        emitPagination();
      } catch (error) {
        showApiError(error);
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.personId, props.refreshKey, pageNumber.value],
      () => {
        void load();
      },
      { immediate: true },
    );

    const changePage = (page: number): void => {
      pageNumber.value = page;
    };

    expose({ changePage, total, pageNumber });

    return () => (
      <div class={[styles.container, props.hidePagination ? styles.containerInDrawer : styles.containerStandalone]}>
        <div class={styles.titleBar}>
          <h3 class={styles.title}>监管上报记录</h3>
        </div>
        <div class={[styles.body, !props.hidePagination && styles.bodyScroll]}>
          <Spin spinning={loading.value}>
            {!loading.value && records.value.length === 0 ? (
              <Empty description="暂无监管上报记录" />
            ) : (
              <div class={styles.recordList}>
                {records.value.map((record) => (
                  <div class={styles.recordItem} key={record.id}>
                    <div class={styles.recordHeader}>
                      <span class={styles.time}>{record.reportTime ? dayjs(record.reportTime).format("YYYY-MM-DD HH:mm:ss") : "--"}</span>
                      <span class={styles.tag}>上报</span>
                    </div>
                    <p class={styles.content}>{record.content}</p>
                    {(record.reportAttachmentFiles?.length ?? 0) > 0 ? (
                      <div class={styles.attachmentRow}>
                        {record.reportAttachmentFiles?.map((f) => (
                          <FileAttachmentLink key={f.id} file={f} previewImage />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Spin>
        </div>
      </div>
    );
  },
});
