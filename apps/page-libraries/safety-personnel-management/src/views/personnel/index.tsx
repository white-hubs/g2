import { Button, Input, PopConfirm, Space, TabPane, Table, Tabs, message } from "@g2-platform/pc-ui";

import layoutStyles from "../../layout.module.css";
/** @jsxImportSource vue */
import { defineComponent, onMounted, ref } from "vue";

import { deletePerson, exportPersons, pagePersons } from "../../api/safety-personnel";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { PERSON_CATEGORY_TABS, PERSON_CATEGORY_TYPE_CODE, type PersonCategoryTab, TABLE_PAGE_SIZE } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import { useLayoutTableScroll } from "../../hooks/use-layout-table-scroll";
import type { PersonnelCardUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { downloadBlob } from "../../utils/download-blob";
import { mapPersonCard } from "../../utils/mappers";
import { maskPhone } from "../../utils/mask-phone";
import { usePageName } from "../../utils/page-name";
import { resolvePageNumberWhenCurrentEmpty } from "../../utils/pagination";
import { PersonAddModal } from "./components/person-add-modal";
import { SafetyResumeDrawer } from "./components/safety-resume-drawer";

import styles from "./index.module.css";

const PERSONNEL_TABLE_SCROLL_X = 950;

export const PersonnelPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const { scrollY, recalc } = useLayoutTableScroll();
    const activeTab = ref<PersonCategoryTab>("safety");
    const keyword = ref("");
    const records = ref<PersonnelCardUI[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const loading = ref(false);
    const addOpen = ref(false);
    const resumeRef = ref<{ open: (person: PersonnelCardUI) => void } | null>(null);

    const loadList = async (): Promise<void> => {
      loading.value = true;
      try {
        const typeCode = PERSON_CATEGORY_TYPE_CODE[activeTab.value];
        const page = await useAuthRequest(() =>
          pagePersons({
            pageNumber: pageNumber.value,
            pageSize: TABLE_PAGE_SIZE,
            keyword: keyword.value.trim() || undefined,
            typeCode: typeCode === "ALL" ? "ALL" : typeCode,
          }),
        );
        records.value = page.records.map(mapPersonCard);
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
        loading.value = false;
        recalc();
      }
    };

    onMounted(() => {
      void loadList();
      recalc();
    });

    const onTabChange = (key: string | number): void => {
      activeTab.value = key as PersonCategoryTab;
      keyword.value = "";
      pageNumber.value = 1;
      void loadList();
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      void loadList();
    };

    const onReset = (): void => {
      keyword.value = "";
      onSearch();
    };

    const onExport = async (): Promise<void> => {
      try {
        const typeCode = PERSON_CATEGORY_TYPE_CODE[activeTab.value];
        const blob = await useAuthRequest(() =>
          exportPersons({
            pageNumber: 1,
            pageSize: 10000,
            keyword: keyword.value.trim() || undefined,
            typeCode: typeCode === "ALL" ? "ALL" : typeCode,
          }),
        );
        downloadBlob(blob, "安全人员台账.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e, "导出失败");
      }
    };

    const onRemove = async (person: PersonnelCardUI): Promise<void> => {
      try {
        await useAuthRequest(() => deletePerson(person.personId));
        message.success("已移除");
        void loadList();
      } catch (e) {
        showApiError(e, "移除失败");
      }
    };

    const columns = [
      { title: "姓名", dataIndex: "name", width: 100, ellipsis: true },
      {
        title: "手机号",
        dataIndex: "phone",
        width: 130,
        customRender: ({ record }: { record: PersonnelCardUI }) => maskPhone(record.phone),
      },
      { title: "单位", dataIndex: "company", width: 140, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "部门", dataIndex: "dept", width: 140, ellipsis: true },
      { title: "岗位", dataIndex: "post", width: 120, ellipsis: true },
      {
        title: "人员类型",
        dataIndex: "personTypes",
        width: 160,
        ellipsis: true,
        customRender: ({ record }: { record: PersonnelCardUI }) => (
          <span class={styles.ellipsis} title={record.personTypes.join("、")}>
            {record.personTypes.join("、") || "--"}
          </span>
        ),
      },
      {
        title: "操作",
        width: 160,
        fixed: "right" as const,
        customRender: ({ record }: { record: PersonnelCardUI }) => (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => {
                resumeRef.value?.open(record);
              }}
            >
              安全履历
            </Button>
            <PopConfirm
              title="确认移除该人员？"
              onConfirm={() => {
                void onRemove(record);
              }}
            >
              <Button type="link" size="small" danger>
                移除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

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
              addOpen.value = true;
            }}
          >
            新增人员
          </Button>
        </Space>
      ),
      "layout-content": () => (
        <div class={styles.pageBody}>
          <div data-layout-tabs class={styles.typeTabs}>
            <Tabs activeKey={activeTab.value} onChange={onTabChange}>
              {PERSON_CATEGORY_TABS.map((t) => (
                <TabPane key={t.key} tab={t.label} />
              ))}
            </Tabs>
          </div>
          <div class="toolbar" data-layout-toolbar>
            <Input
              value={keyword.value}
              showCount={false}
              onUpdate:value={(value) => {
                const v = String(value ?? "");
                keyword.value = v;
              }}
              placeholder="姓名 / 手机号 / 部门 / 岗位"
              style={{ width: "240px" }}
              allowClear
              onPressEnter={onSearch}
            />
            <Button type="primary" onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </div>
          <div class="tableWrap">
            <Table
              class="safety-personnel-management-table"
              loading={loading.value}
              rowKey="personId"
              columns={columns}
              dataSource={records.value}
              scroll={{ x: PERSONNEL_TABLE_SCROLL_X, y: scrollY.value }}
              pagination={false}
              tableLayout="fixed"
            />
          </div>
        </div>
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

    return () => (
      <div class={layoutStyles.route}>
        <PageShell title={pageTitle.value} v-slots={layoutSlots} />
        <PersonAddModal
          open={addOpen.value}
          activeTab={activeTab.value}
          onUpdate:open={(v: boolean) => {
            addOpen.value = v;
          }}
          onSuccess={() => {
            void loadList();
          }}
        />
        <SafetyResumeDrawer ref={resumeRef} />
      </div>
    );
  },
});
