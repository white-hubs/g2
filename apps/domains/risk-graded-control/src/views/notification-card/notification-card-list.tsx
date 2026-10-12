import { defineComponent, nextTick, reactive, ref, toRef } from "vue";

import { getNoticeCard, pageNoticeCards } from "@/api/server";
import { NotificationCardPreview } from "@/components/notification-card-preview/notification-card-preview";
import { NotificationCardContent } from "@/components/notification-card/notification-card-content";
import { LIST_SEARCH_INPUT_PROPS, RISK_LEVEL_LABEL } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { useListSearchClearReload } from "@/hooks/use-list-search-clear-reload";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import {
  Button,
  Card,
  Empty,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout as PcLayout,
  Select,
  SelectOption,
  Space,
  message,
} from "@/pc-ui-runtime";
import type { NotificationCardVO, RiskLevel } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { downloadPDF, useLayoutTitle } from "@/utils/page-title";
import { mapNotificationCardFromApi, mapRiskLevelToApi } from "@/utils/risk-control-mapper";

import styles from "./notification-card-list.module.less";

export const NotificationCardListPage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("风险告知卡");
    const cards = ref<NotificationCardVO[]>([]);
    const loading = ref(false);
    const previewVisible = ref(false);
    const previewCard = ref<NotificationCardVO | null>(null);
    const outputCard = ref<NotificationCardVO | null>(null);
    const outputRef = ref<HTMLDivElement | null>(null);
    const outputLoading = ref(false);
    const filters = reactive({
      keyword: "",
      riskLevel: "" as "" | RiskLevel,
    });
    const {
      pageNumber,
      pageSize,
      total,
      resetPage,
      onPageChange: bindPageChange,
      scheduleInitialLoad,
      rewindIfEmpty,
    } = useServerPagedList();

    const loadList = async (): Promise<void> => {
      loading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pageNoticeCards({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            keyword: filters.keyword.trim() || undefined,
            riskLevel: mapRiskLevelToApi(filters.riskLevel || undefined) || undefined,
          }),
        );
        cards.value = page.records.map(mapNotificationCardFromApi);
        total.value = page.total ?? 0;
        await rewindIfEmpty(cards.value.length, loadList);
      } catch (e) {
        showApiError(e);
        cards.value = [];
        total.value = 0;
      } finally {
        loading.value = false;
      }
    };

    scheduleInitialLoad(loadList);
    const onPageChange = bindPageChange(loadList);
    const onSearch = (): void => {
      resetPage();
      void loadList();
    };

    useListSearchClearReload(toRef(filters, "keyword"), onSearch);

    const onReset = (): void => {
      filters.keyword = "";
      filters.riskLevel = "";
      resetPage();
      void loadList();
    };

    const openPreview = async (card: NotificationCardVO): Promise<void> => {
      try {
        previewCard.value = await loadCardDetail(card);
        previewVisible.value = true;
      } catch (e) {
        showApiError(e);
      }
    };

    const loadCardDetail = async (card: NotificationCardVO): Promise<NotificationCardVO> => {
      const vo = await useAuthRequest(() => getNoticeCard(card.id));
      return mapNotificationCardFromApi(vo);
    };

    const prepareOutputCard = async (card: NotificationCardVO): Promise<NotificationCardVO> => {
      const detail = await loadCardDetail(card);
      outputCard.value = detail;
      await nextTick();
      return detail;
    };

    const printCard = async (card: NotificationCardVO): Promise<void> => {
      outputLoading.value = true;
      try {
        await prepareOutputCard(card);
        window.print();
      } catch (e) {
        showApiError(e);
      } finally {
        outputLoading.value = false;
      }
    };

    const exportPdf = async (card: NotificationCardVO): Promise<void> => {
      outputLoading.value = true;
      try {
        const detail = await prepareOutputCard(card);
        if (!outputRef.value) {
          message.warning("告知卡内容未准备完成");
          return;
        }
        await downloadPDF(outputRef.value, `${detail.unitName || "风险告知卡"}-风险告知卡`);
      } catch (e) {
        showApiError(e);
      } finally {
        outputLoading.value = false;
      }
    };

    const previewPrint = (): void => {
      if (previewCard.value) {
        void printCard(previewCard.value);
      }
    };

    const previewExportPdf = (): void => {
      if (previewCard.value) {
        void exportPdf(previewCard.value);
      }
    };

    const renderActions = (card: NotificationCardVO): JSX.Element => (
      <>
        <Button
          size="small"
          class={styles.headerButton}
          onClick={() => {
            void openPreview(card);
          }}
        >
          预览
        </Button>
        <Button
          size="small"
          class={styles.headerButton}
          loading={outputLoading.value}
          onClick={() => {
            void printCard(card);
          }}
        >
          打印
        </Button>
        <Button
          size="small"
          class={styles.headerButton}
          loading={outputLoading.value}
          onClick={() => {
            void exportPdf(card);
          }}
        >
          导出PDF
        </Button>
      </>
    );

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        v-slots={{
          "layout-content": (): JSX.Element => (
            <div>
              <Form layout="inline" data-layout-toolbar>
                <FormItem label="关键词">
                  <Input
                    {...LIST_SEARCH_INPUT_PROPS}
                    v-model:value={filters.keyword}
                    placeholder="单元名称"
                    allowClear
                    style={{ width: "200px" }}
                    onPressEnter={onSearch}
                  />
                </FormItem>
                <FormItem label="现状风险等级">
                  <Select v-model:value={filters.riskLevel} allowClear placeholder="全部" style={{ width: "140px" }}>
                    <SelectOption value="">全部</SelectOption>
                    {Object.entries(RISK_LEVEL_LABEL).map(([value, label]) => (
                      <SelectOption key={value} value={value}>
                        {label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem>
                  <Space>
                    <Button type="primary" onClick={onSearch}>
                      查询
                    </Button>
                    <Button onClick={onReset}>重置</Button>
                  </Space>
                </FormItem>
              </Form>
              {loading.value && cards.value.length === 0 ? (
                <Card loading />
              ) : cards.value.length === 0 ? (
                <Empty description="暂无告知卡数据" />
              ) : (
                <div class={styles.cardList}>
                  {cards.value.map((card) => (
                    <NotificationCardContent key={card.id} card={card} actions={() => renderActions(card)} />
                  ))}
                </div>
              )}
              <NotificationCardPreview
                visible={previewVisible.value}
                card={previewCard.value}
                onUpdate:visible={(v: boolean) => {
                  previewVisible.value = v;
                }}
                onPrint={previewPrint}
                onExportPdf={previewExportPdf}
              />
              <div class={styles.printHost}>
                {outputCard.value && (
                  <div ref={outputRef} class={styles.printPage}>
                    <NotificationCardContent card={outputCard.value} />
                  </div>
                )}
              </div>
            </div>
          ),
          "footer-page": () => (
            <Page current={pageNumber.value} pageSize={pageSize.value} total={total.value} onPageChange={onPageChange} />
          ),
        }}
      />
    );
  },
});
