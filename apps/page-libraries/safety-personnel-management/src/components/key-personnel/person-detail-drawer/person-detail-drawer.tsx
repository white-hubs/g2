import { showApiError } from "../../../utils/api-error";
/** @jsxImportSource vue */
import type { KeyPersonDetailVO } from "@g2-contract/safety-personnel";
import { Drawer, Spin } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getKeyPersonDetail } from "../../../api/safety-personnel";
import { KEY_PERSON_REPORT_PAGE_SIZE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { toImageSrc } from "../../../utils/key-personnel/file-attachment";
import { GPagination } from "../../common/pagination";
import { FileAttachmentLink } from "../file-attachment-link/file-attachment-link";
import { RiskLevelTag } from "../risk-level-tag/risk-level-tag";
import { type ReportPaginationState, SupervisionReportList } from "../supervision-report-list/supervision-report-list";

import styles from "./person-detail-drawer.module.css";

export const PersonDetailDrawer = defineComponent({
  setup(_, { expose }) {
    const visible = ref(false);
    const loading = ref(false);
    const detail = ref<KeyPersonDetailVO | null>(null);
    const reportRefreshKey = ref(0);
    const reportListRef = ref<{ changePage: (page: number) => void } | null>(null);
    const reportPagination = reactive<ReportPaginationState>({
      total: 0,
      pageNumber: 1,
      pageSize: KEY_PERSON_REPORT_PAGE_SIZE,
    });

    const load = async (id: number): Promise<void> => {
      loading.value = true;
      try {
        detail.value = await useAuthRequest(() => getKeyPersonDetail(id));
      } catch (error) {
        showApiError(error);
      } finally {
        loading.value = false;
      }
    };

    const open = async (id: number): Promise<void> => {
      visible.value = true;
      reportRefreshKey.value += 1;
      reportPagination.total = 0;
      reportPagination.pageNumber = 1;
      await load(id);
    };

    const refreshReports = (): void => {
      reportRefreshKey.value += 1;
    };

    const onReportPaginationChange = (state: ReportPaginationState): void => {
      reportPagination.total = state.total;
      reportPagination.pageNumber = state.pageNumber;
      reportPagination.pageSize = state.pageSize;
    };

    const onReportPageChange = (page: number): void => {
      reportListRef.value?.changePage(page);
    };

    expose({ open, refreshReports, getPersonId: () => detail.value?.id ?? null });

    const photoUrl = (): string => {
      const f = detail.value?.photoFile;
      return f ? toImageSrc(f) : "";
    };

    const surnameChar = (): string => {
      const name = detail.value?.name?.trim() ?? "";
      return name ? name.charAt(0) : "?";
    };

    return () => (
      <Drawer
        open={visible.value}
        title="人员档案详情"
        placement="right"
        width={520}
        rootClassName="safety-personnel-key-personnel-detail-drawer"
        onClose={() => {
          visible.value = false;
        }}
        bodyStyle={{ padding: 0, overflow: "hidden" }}
        footer={
          reportPagination.total > 0 ? (
            <div class={styles.drawerFooter}>
              <GPagination
                total={reportPagination.total}
                current={reportPagination.pageNumber}
                pageSize={reportPagination.pageSize}
                onChange={onReportPageChange}
              />
            </div>
          ) : null
        }
      >
        <div class={styles.drawerBodyWrap}>
          {loading.value ? (
            <div class={styles.loadingMask}>
              <Spin />
            </div>
          ) : null}
          {detail.value ? (
            <div class={styles.drawerMain}>
              <div class={styles.drawerInner}>
                <div class={styles.topBlock}>
                  <div class={styles.profile}>
                    {photoUrl() ? (
                      <img class={styles.avatar} src={photoUrl()} alt="" />
                    ) : (
                      <div class={styles.avatarPlaceholder}>{surnameChar()}</div>
                    )}
                    <div class={styles.grid}>
                      <div>姓名：{detail.value.name}</div>
                      <div>编号：{detail.value.personCode}</div>
                      <div>手机：{detail.value.phone}</div>
                      <div>区域：{detail.value.areaName}</div>
                      <div>
                        风险：
                        <RiskLevelTag level={detail.value.riskLevel} />
                      </div>
                      <div>监管人员：{detail.value.supervisorName}</div>
                      <div class={styles.full}>身份证：{detail.value.idCard || "--"}</div>
                      <div class={styles.full}>监管原因：{detail.value.supervisionReason}</div>
                      <div class={styles.full}>
                        <span>人员附件：</span>
                        {(detail.value.personAttachmentFiles?.length ?? 0) > 0 ? (
                          <div class={styles.attachmentList}>
                            {detail.value.personAttachmentFiles?.map((f) => (
                              <FileAttachmentLink key={f.id} file={f} />
                            ))}
                          </div>
                        ) : (
                          <span>--</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div class={styles.reportSection}>
                  <SupervisionReportList
                    ref={reportListRef}
                    personId={detail.value.id}
                    refreshKey={reportRefreshKey.value}
                    hidePagination
                    onPaginationChange={onReportPaginationChange}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>
    );
  },
});
