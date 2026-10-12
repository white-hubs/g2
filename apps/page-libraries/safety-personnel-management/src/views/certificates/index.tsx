import type { CertTypeVO } from "@g2-contract/safety-personnel";
import { Button, Empty, Form, FormItem, Input, PopConfirm, Select, SelectOption, Space, Table, message } from "@g2-platform/pc-ui";

import layoutStyles from "../../layout.module.css";
/** @jsxImportSource vue */
import { defineComponent, onMounted, reactive, ref } from "vue";

import { deleteCertificate, exportCertificates, getCertCategoryTree, pageCertTypes, pageCertificates } from "../../api/safety-personnel";
import { CertStatusTag } from "../../components/cert-status-tag/cert-status-tag";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { EXPIRE_STATUS_OPTIONS, REVIEW_STATUS_OPTIONS, TABLE_PAGE_SIZE } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import { useLayoutTableScroll } from "../../hooks/use-layout-table-scroll";
import type { CertRowUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { getExpireDisplay } from "../../utils/cert-status";
import { downloadBlob } from "../../utils/download-blob";
import { buildCategoryNameMap, mapCertRow } from "../../utils/mappers";
import { usePageName } from "../../utils/page-name";
import { resolvePageNumberWhenCurrentEmpty } from "../../utils/pagination";
import { CertDetailDrawer } from "./cert-detail-drawer";
import { CertFormDrawer } from "./cert-form-drawer";

import styles from "./index.module.css";

const CERT_TABLE_SCROLL_X = 980;

export const CertificatesPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const { scrollY, recalc } = useLayoutTableScroll();
    const records = ref<CertRowUI[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const certTypes = ref<CertTypeVO[]>([]);
    const typeNameMap = ref(new Map<string, string>());
    const formRef = ref<{ open: (types: CertTypeVO[]) => void; openEdit: (types: CertTypeVO[], id: string) => void } | null>(null);
    const detailRef = ref<{ open: (id: string) => Promise<void> } | null>(null);
    const filters = reactive({
      certTypeId: "",
      expireStatus: "",
      reviewStatus: "",
      keyword: "",
    });

    const loadTypes = async (): Promise<void> => {
      try {
        const [typePage, categories] = await useAuthRequest(() =>
          Promise.all([pageCertTypes({ pageNumber: 1, pageSize: 200 }), getCertCategoryTree()]),
        );
        certTypes.value = typePage.records;
        const catMap = buildCategoryNameMap(categories);
        typeNameMap.value = new Map(typePage.records.map((t) => [String(t.id ?? ""), t.typeName ?? ""]));
        void catMap;
      } catch {
        certTypes.value = [];
      }
    };

    const loadList = async (): Promise<void> => {
      try {
        const page = await useAuthRequest(() =>
          pageCertificates({
            pageNumber: pageNumber.value,
            pageSize: TABLE_PAGE_SIZE,
            typeId: filters.certTypeId || undefined,
            keyword: filters.keyword.trim() || undefined,
            expireStatus: filters.expireStatus || undefined,
            reviewStatus: filters.reviewStatus || undefined,
          }),
        );
        records.value = page.records.map((r) => mapCertRow(r, typeNameMap.value.get(String(r.typeId ?? "")) ?? ""));
        total.value = page.total ?? 0;
        const nextPage = resolvePageNumberWhenCurrentEmpty(pageNumber.value, records.value.length, total.value, TABLE_PAGE_SIZE);
        if (nextPage !== pageNumber.value) {
          pageNumber.value = nextPage;
          await loadList();
          return;
        }
      } catch (e) {
        showApiError(e);
        records.value = [];
        total.value = 0;
      } finally {
        recalc();
      }
    };

    onMounted(() => {
      void loadTypes();
      void loadList();
      recalc();
    });

    const onExport = async (): Promise<void> => {
      try {
        const blob = await useAuthRequest(() =>
          exportCertificates({
            pageNumber: 1,
            pageSize: 10000,
            typeId: filters.certTypeId || undefined,
            keyword: filters.keyword.trim() || undefined,
            expireStatus: filters.expireStatus || undefined,
            reviewStatus: filters.reviewStatus || undefined,
          }),
        );
        downloadBlob(blob, "员工证书.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e, "导出失败");
      }
    };

    const onDelete = async (certId: string): Promise<void> => {
      try {
        await useAuthRequest(() => deleteCertificate(certId));
        message.success("删除成功");
        void loadList();
      } catch (e) {
        showApiError(e, "删除失败");
      }
    };

    const columns = [
      {
        title: "序号",
        width: 72,
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (pageNumber.value - 1) * TABLE_PAGE_SIZE + index + 1,
      },
      { title: "证书类型", dataIndex: "certTypeName", width: 120, ellipsis: true },
      { title: "员工", dataIndex: "employeeName", width: 96, ellipsis: true },
      { title: "手机号", dataIndex: "phone", width: 124 },
      { title: "证书名称", dataIndex: "certName", width: 160, ellipsis: true },
      { title: "复审状态", dataIndex: "reviewStatus", width: 96, ellipsis: true },
      {
        title: "剩余到期",
        width: 128,
        customRender: ({ record }: { record: CertRowUI }) => {
          const d = (record.expireStatus as ReturnType<typeof getExpireDisplay>) || getExpireDisplay(record.remainingDays);
          return (
            <span>
              <CertStatusTag status={d} />
              {record.remainingDays >= 0 ? ` ${record.remainingDays} 天` : ""}
            </span>
          );
        },
      },
      {
        title: "操作",
        width: 160,
        fixed: "right" as const,
        customRender: ({ record }: { record: CertRowUI }) => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                detailRef.value?.open(record.certId);
              }}
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                formRef.value?.openEdit(certTypes.value, record.certId);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="是否确定删除该证书？"
              okText="确定"
              cancelText="取消"
              onConfirm={() => {
                void onDelete(record.certId);
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    return () => {
      const layoutSlots = {
        "layout-header": () => (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                void onExport();
              }}
            >
              导出
            </Button>
            <Button
              type="primary"
              onClick={() => {
                formRef.value?.open(certTypes.value);
              }}
            >
              新增
            </Button>
          </Space>
        ),
        "layout-content": () => (
          <>
            <Form layout="inline" class={styles.searchForm} data-layout-toolbar>
              <FormItem label="证书类型" class={styles.searchItem}>
                <Select
                  allowClear
                  placeholder="请选择"
                  style={{ width: "160px" }}
                  value={filters.certTypeId}
                  onUpdate:value={(value) => {
                    const v = typeof value === "string" ? value : undefined;
                    filters.certTypeId = v ?? "";
                  }}
                >
                  <SelectOption value="">全部</SelectOption>
                  {certTypes.value.map((t) => (
                    <SelectOption key={t.id} value={String(t.id)}>
                      {t.typeName}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
              <FormItem label="到期状态" class={styles.searchItem}>
                <Select
                  allowClear
                  placeholder="请选择"
                  style={{ width: "120px" }}
                  value={filters.expireStatus}
                  onUpdate:value={(value) => {
                    const v = typeof value === "string" ? value : undefined;
                    filters.expireStatus = v ?? "";
                  }}
                >
                  {EXPIRE_STATUS_OPTIONS.map((o) => (
                    <SelectOption key={o.value || "all"} value={o.value}>
                      {o.label}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
              <FormItem label="复审状态" class={styles.searchItem}>
                <Select
                  allowClear
                  placeholder="请选择"
                  style={{ width: "120px" }}
                  value={filters.reviewStatus}
                  onUpdate:value={(value) => {
                    const v = typeof value === "string" ? value : undefined;
                    filters.reviewStatus = v ?? "";
                  }}
                >
                  {REVIEW_STATUS_OPTIONS.map((o) => (
                    <SelectOption key={o.value || "all"} value={o.value}>
                      {o.label}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
              <FormItem class={styles.searchItem}>
                <Input
                  placeholder="员工姓名 / 证书名称"
                  style={{ width: "220px" }}
                  showCount={false}
                  value={filters.keyword}
                  allowClear
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    filters.keyword = v;
                  }}
                  onPressEnter={() => {
                    void loadList();
                  }}
                />
              </FormItem>
              <FormItem class={styles.searchItem}>
                <Button
                  type="primary"
                  onClick={() => {
                    void loadList();
                  }}
                >
                  查询
                </Button>
                <Button
                  style={{ marginLeft: "10px" }}
                  onClick={() => {
                    filters.certTypeId = "";
                    filters.expireStatus = "";
                    filters.reviewStatus = "";
                    filters.keyword = "";
                    void loadList();
                  }}
                >
                  重置
                </Button>
              </FormItem>
            </Form>
            <div class="tableWrap">
              <Table
                class={`safety-personnel-management-table ${styles.certTable}`}
                rowKey="certId"
                columns={columns}
                dataSource={records.value}
                scroll={{ x: CERT_TABLE_SCROLL_X, y: scrollY.value }}
                tableLayout="fixed"
                pagination={false}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
              />
            </div>
          </>
        ),
        "footer-page": () => (
          <GPagination
            total={total.value}
            current={pageNumber.value}
            pageSize={TABLE_PAGE_SIZE}
            onChange={(p) => {
              pageNumber.value = p;
              void loadList();
            }}
          />
        ),
      };

      return (
        <div class={layoutStyles.route}>
          <PageShell title={pageTitle.value} v-slots={layoutSlots} />
          <CertFormDrawer
            ref={formRef}
            onSaved={() => {
              void loadList();
            }}
          />
          <CertDetailDrawer ref={detailRef} typeNameMap={typeNameMap.value} />
        </div>
      );
    };
  },
});
