import type { EmployeeCertVO } from "@g2-contract/safety-personnel";
import { Button, Descriptions, DescriptionsItem, Drawer, Empty, Image, Spin } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, ref, watch } from "vue";

import { getCubeFileService } from "../../api/file-service";
import { getCertificate } from "../../api/safety-personnel";
import { useAuthRequest } from "../../hooks/use-auth-request";
import { showApiError } from "../../utils/api-error";
import { formatReviewStatus } from "../../utils/cert-review";
import { formatCertStatusLabel, formatRemainingDays } from "../../utils/cert-status";
import { toImageSrc } from "../../utils/file-url";
import { remainingDaysFromValidEnd } from "../../utils/mappers";
import { maskPhone } from "../../utils/mask-phone";

import styles from "./cert-detail-drawer.module.css";

export const CertDetailDrawer = defineComponent({
  props: {
    typeNameMap: { type: Object as () => Map<string, string>, default: () => new Map() },
  },
  setup(props, { expose }) {
    const open = ref(false);
    const loading = ref(false);
    const cert = ref<EmployeeCertVO | null>(null);
    const imageUrl = ref("");

    const loadImage = async (fileId?: string): Promise<void> => {
      imageUrl.value = "";
      if (!fileId) {
        return;
      }
      try {
        const info = await getCubeFileService().getFileInfo(fileId);
        imageUrl.value = toImageSrc({
          path: info.path ?? undefined,
          endpointPath: (info as { endpointPath?: string }).endpointPath,
        });
      } catch {
        imageUrl.value = "";
      }
    };

    watch(
      () => cert.value?.attachmentFile ?? cert.value?.attachmentFileId,
      (attachment) => {
        if (attachment && typeof attachment === "object") {
          const url = toImageSrc(attachment);
          if (url) {
            imageUrl.value = url;
            return;
          }
        }
        void loadImage(attachment != null && typeof attachment !== "object" ? String(attachment) : cert.value?.attachmentFileId);
      },
    );

    const show = async (id: string): Promise<void> => {
      open.value = true;
      loading.value = true;
      cert.value = null;
      try {
        cert.value = await useAuthRequest(() => getCertificate(id));
      } catch (e) {
        showApiError(e);
        cert.value = null;
      } finally {
        loading.value = false;
      }
    };

    expose({ open: show });

    const typeName = (): string => {
      if (cert.value?.typeName) {
        return cert.value.typeName;
      }
      const id = cert.value?.typeId;
      return id != null ? (props.typeNameMap.get(String(id)) ?? String(id)) : "--";
    };

    const hasAttachment = (): boolean => Boolean(cert.value?.attachmentFile?.path || cert.value?.attachmentFileId);

    const remainingDays = (): number => cert.value?.remainingDays ?? remainingDaysFromValidEnd(cert.value?.validEnd);

    const descriptionProps = {
      column: 1 as const,
      bordered: true,
      size: "small" as const,
      class: styles.detailDescriptions,
      labelStyle: { width: "128px", whiteSpace: "nowrap" as const },
    };

    const renderSection = (title: string, content: import("vue").VNodeChild) => (
      <div class={styles.section}>
        <div class={styles.sectionTitle}>{title}</div>
        {content}
      </div>
    );

    return () => (
      <Drawer
        open={open.value}
        title="证书详情"
        width={520}
        onClose={() => {
          open.value = false;
        }}
        v-slots={{
          footer: () => (
            <div class={styles.drawerFooter}>
              <Button
                class={styles.closeBtn}
                onClick={() => {
                  open.value = false;
                }}
              >
                关闭
              </Button>
            </div>
          ),
        }}
      >
        {loading.value ? (
          <Spin />
        ) : !cert.value ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            {renderSection(
              "基本信息",
              <Descriptions {...descriptionProps}>
                <DescriptionsItem label="证书类型">{typeName()}</DescriptionsItem>
                <DescriptionsItem label="证书名称">{cert.value.certName ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="证书编号">{cert.value.certNo ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="发证机构">{cert.value.issueOrg ?? "--"}</DescriptionsItem>
              </Descriptions>,
            )}
            {renderSection(
              "员工信息",
              <Descriptions {...descriptionProps}>
                <DescriptionsItem label="员工姓名">{cert.value.userName ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="手机号">{maskPhone(cert.value.phone ?? "")}</DescriptionsItem>
              </Descriptions>,
            )}
            {renderSection(
              "有效期信息",
              <Descriptions {...descriptionProps}>
                <DescriptionsItem label="发证日期">{cert.value.issueDate ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="有效期开始">{cert.value.validStart ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="有效期结束">{cert.value.validEnd ?? "--"}</DescriptionsItem>
                <DescriptionsItem label="剩余到期时间">{formatRemainingDays(remainingDays())}</DescriptionsItem>
              </Descriptions>,
            )}
            {renderSection(
              "复审信息",
              <Descriptions {...descriptionProps}>
                <DescriptionsItem label="是否需要复审">{cert.value.needReview ? "是" : "否"}</DescriptionsItem>
                <DescriptionsItem label="复审状态">{formatReviewStatus(cert.value)}</DescriptionsItem>
                <DescriptionsItem label="证书状态">{formatCertStatusLabel(cert.value)}</DescriptionsItem>
              </Descriptions>,
            )}
            {renderSection(
              "证书预览",
              <div class={styles.imageWrap}>
                {imageUrl.value ? (
                  <Image src={imageUrl.value} style={{ maxWidth: "100%" }} />
                ) : (
                  <Empty description={hasAttachment() ? "图片加载失败" : "暂无证书图片"} />
                )}
              </div>,
            )}
          </>
        )}
      </Drawer>
    );
  },
});
