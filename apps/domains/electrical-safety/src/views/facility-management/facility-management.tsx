import {
  type DictionaryItem,
  type FacilityDetail,
  type FacilityListItem,
  type FacilityModifyRequest,
} from "@g2-contract/electrical-safety";
import type { Area } from "@g2-contract/electrical-safety/references";
import { AntModal, Button, Page, PageLayout, Space, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, shallowRef } from "vue";

import { FacilityDetailDrawer } from "./facility-detail-drawer";
import { type FacilityAreaTreeOption, FacilityModal, type FacilitySelectOption } from "./facility-modal";
import { getFireResistanceColor } from "./fire-resistance";
import {
  createFacility,
  deleteFacility,
  getFacility,
  listBusinessDictionaryItems,
  listFacilities,
  updateFacility,
} from "@/api/electrical-safety";
import { listAllArea, listUsers } from "@/api/references";
import { usePageName } from "@/utils/page-name";

import "../shared/page.less";
import "./facility-management.less";

const dictionaryOptions = (items: DictionaryItem[]): FacilitySelectOption[] =>
  items.map((item) => ({ label: item.name, value: item.code }));

const areaTreeOptions = (areas: Area[]): FacilityAreaTreeOption[] =>
  areas.map((area) => ({
    label: area.aliasName || area.name,
    value: String(area.id),
    children: areaTreeOptions(area.children ?? []),
  }));

export const FacilityManagement = defineComponent({
  name: "FacilityManagement",
  setup: () => {
    const { pageTitle } = usePageName();
    const filters = reactive({
      keyword: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const facilityModalOpen = shallowRef(false);
    const facilitySubmitting = shallowRef(false);
    const facilityDetailLoading = shallowRef(false);
    const selectedFacility = shallowRef<FacilityDetail | null>(null);
    const editingFacility = shallowRef<FacilityDetail | null>(null);
    const areaOptions = shallowRef<FacilityAreaTreeOption[]>([]);
    const responsibleOptions = shallowRef<FacilitySelectOption[]>([]);
    const fireRatingOptions = shallowRef<FacilitySelectOption[]>([]);
    const fireResistanceOptions = shallowRef<FacilitySelectOption[]>([]);

    const loadDetail = async (record: FacilityListItem): Promise<FacilityDetail | null> => {
      try {
        return await getFacility(record.id);
      } catch {
        return null;
      }
    };

    const toFacilityDetail = (record: FacilityListItem): FacilityDetail => ({
      id: record.id,
      facilityName: record.facilityName,
      areaId: record.areaId,
      areaName: record.areaName,
      floorArea: record.floorArea,
      fireRatingCode: record.fireRatingCode,
      fireRatingName: record.fireRatingName,
      fireResistanceLevelCode: record.fireResistanceLevelCode,
      fireResistanceLevelName: record.fireResistanceLevelName,
      responsibleId: record.responsibleId,
      responsibleName: record.responsibleName,
      remark: null,
    });

    const openDetail = (record: FacilityListItem): void => {
      selectedFacility.value = toFacilityDetail(record);
      facilityDetailLoading.value = true;
      void loadDetail(record)
        .then((detail) => {
          if (detail && String(selectedFacility.value?.id) === String(record.id)) {
            selectedFacility.value = detail;
          }
        })
        .finally(() => {
          if (String(selectedFacility.value?.id) === String(record.id)) {
            facilityDetailLoading.value = false;
          }
        });
    };

    const openEdit = (record: FacilityListItem): void => {
      editingFacility.value = toFacilityDetail(record);
      facilityModalOpen.value = true;
      facilityDetailLoading.value = true;
      void loadDetail(record)
        .then((detail) => {
          if (detail && facilityModalOpen.value && String(editingFacility.value?.id) === String(record.id)) {
            editingFacility.value = detail;
          }
        })
        .finally(() => {
          if (facilityModalOpen.value && String(editingFacility.value?.id) === String(record.id)) {
            facilityDetailLoading.value = false;
          }
        });
    };

    const columns = [
      {
        title: "设施名称",
        dataIndex: "facilityName",
        width: 180,
        customRender: ({ record }: { record: FacilityListItem }): JSX.Element => (
          <Button type="link" onClick={() => openDetail(record)}>
            {record.facilityName}
          </Button>
        ),
      },
      {
        title: "所属区域",
        dataIndex: "areaName",
        width: 200,
        customRender: ({ text }: { text: string | null }) => text || "--",
      },
      {
        title: "面积（㎡）",
        dataIndex: "floorArea",
        width: 105,
        customRender: ({ text }: { text: number | null }) => text ?? "--",
      },
      {
        title: "火灾危险性",
        dataIndex: "fireRatingName",
        width: 120,
        customRender: ({ record }: { record: FacilityListItem }): JSX.Element => (
          <Tag color="orange">{record.fireRatingName || record.fireRatingCode}</Tag>
        ),
      },
      {
        title: "耐火等级",
        dataIndex: "fireResistanceLevelName",
        width: 110,
        customRender: ({ record }: { record: FacilityListItem }): JSX.Element | string => {
          const label = record.fireResistanceLevelName || record.fireResistanceLevelCode;
          return label ? <Tag color={getFireResistanceColor(label)}>{label}</Tag> : "--";
        },
      },
      {
        title: "责任人",
        dataIndex: "responsibleName",
        width: 110,
        customRender: ({ text }: { text: string | null }) => text || "--",
      },
      {
        title: "设备概况",
        dataIndex: "devices",
        width: 250,
        customRender: ({ record }: { record: FacilityListItem }): JSX.Element => (
          <Space>
            <Tag color="blue">电气 {record.electricalDeviceCount}</Tag>
            <Tag color="green">环境 {record.environmentDeviceCount}</Tag>
            <Tag>视频 {record.videoDeviceCount}</Tag>
          </Space>
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 210,
        fixed: "right" as const,
        customRender: ({ record }: { record: FacilityListItem }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => openDetail(record)}>
              配置/详情
            </Button>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                AntModal.confirm({
                  okText: "确定",
                  cancelText: "取消",
                  title: `确认删除设施“${record.facilityName}”？`,
                  content: "删除后无法恢复，请确认该设施及其设备关联不再使用。",
                  onOk: async () => {
                    await deleteFacility(record.id);
                    message.success("设施已删除");
                    if (selectedFacility.value && String(selectedFacility.value.id) === String(record.id)) {
                      selectedFacility.value = null;
                    }
                    await tableApi.query();
                  },
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-facility-management",
      rowKey: "id",
      columns,
      pagination: false,
      fetchApi: async () => {
        try {
          const normalizedKeyword = filters.keyword.trim();
          return await listFacilities({
            pageNumber: filters.pageNumber,
            pageSize: filters.pageSize,
            ...(normalizedKeyword ? { keyword: normalizedKeyword } : {}),
          });
        } catch {
          return { total: 0, pages: 0, records: [] };
        }
      },
      fetchLoaded: (result) => {
        filters.total = result.total;
      },
    });

    const [CubeForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键词",
          defaultValue: "",
          componentProps: {
            placeholder: "搜索设施名称",
          },
        },
      ],
      handleSubmit: (values) => {
        filters.keyword = typeof values.keyword === "string" ? values.keyword : "";
        filters.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        filters.keyword = "";
        filters.pageNumber = 1;
        tableApi.query();
      },
    });

    const loadFireRatingOptions = async (): Promise<void> => {
      try {
        fireRatingOptions.value = dictionaryOptions(await listBusinessDictionaryItems("FIRE_RATING"));
      } catch {
        fireRatingOptions.value = [];
      }
    };

    const loadFireResistanceOptions = async (): Promise<void> => {
      try {
        fireResistanceOptions.value = dictionaryOptions(await listBusinessDictionaryItems("FIRE_RESISTANCE_LEVEL"));
      } catch {
        fireResistanceOptions.value = [];
      }
    };

    const loadAreaOptions = async (): Promise<void> => {
      try {
        areaOptions.value = areaTreeOptions(await listAllArea());
      } catch {
        areaOptions.value = [];
      }
    };

    const loadResponsibleOptions = async (): Promise<void> => {
      try {
        const users = await listUsers({ pageNumber: 1, pageSize: 1000 });
        responsibleOptions.value = users.records.map((user) => ({
          label: user.name || user.username,
          value: String(user.id),
        }));
      } catch {
        responsibleOptions.value = [];
      }
    };

    const loadOptions = (): void => {
      void loadFireRatingOptions();
      void loadFireResistanceOptions();
      void loadAreaOptions();
      void loadResponsibleOptions();
    };

    onMounted(loadOptions);

    const openCreate = (): void => {
      editingFacility.value = null;
      facilityModalOpen.value = true;
    };

    const saveFacility = async (payload: FacilityModifyRequest): Promise<void> => {
      facilitySubmitting.value = true;
      try {
        const editing = editingFacility.value;
        if (editing) {
          await updateFacility(editing.id, payload);
          message.success("设施信息已更新");
        } else {
          await createFacility(payload);
          message.success("设施已新增");
        }
        facilityModalOpen.value = false;
        editingFacility.value = null;
        await tableApi.query();
      } catch {
        // 网关已展示失败提示，保留弹窗供用户修正输入。
      } finally {
        facilitySubmitting.value = false;
      }
    };

    const slots = {
      "layout-header": (): JSX.Element => (
        <div class="page-header">
          <div class="page-toolbar">
            <span class="muted">设施与设备统一管理 · 共 {filters.total} 个设施</span>
          </div>
          <Button type="primary" onClick={openCreate}>
            新增设施
          </Button>
        </div>
      ),
      "layout-content": (): JSX.Element => (
        <div class="electrical-page facility-management-page">
          <CubeForm />
          <div class="content-card">
            <CubeTable />
          </div>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          cachePageQuery={false}
          current={filters.pageNumber}
          pageSize={filters.pageSize}
          total={filters.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            filters.pageNumber = pageNumber;
            filters.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle.value} v-slots={slots} />
        <FacilityModal
          open={facilityModalOpen.value}
          facility={editingFacility.value}
          areaOptions={areaOptions.value}
          responsibleOptions={responsibleOptions.value}
          fireRatingOptions={fireRatingOptions.value}
          fireResistanceOptions={fireResistanceOptions.value}
          submitting={facilitySubmitting.value}
          loading={facilityDetailLoading.value}
          onClose={() => {
            facilityModalOpen.value = false;
            facilityDetailLoading.value = false;
          }}
          onSave={(payload: FacilityModifyRequest) => void saveFacility(payload)}
        />
        <FacilityDetailDrawer
          open={Boolean(selectedFacility.value)}
          facility={selectedFacility.value}
          onClose={() => {
            selectedFacility.value = null;
            facilityDetailLoading.value = false;
          }}
          onChanged={() => void tableApi.query()}
        />
      </>
    );
  },
});
