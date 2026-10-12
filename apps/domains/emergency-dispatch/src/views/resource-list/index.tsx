// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent, onMounted, ref } from "vue";

import {
  createResourceRef,
  deleteResourceRef,
  getAreaTree,
  getResourceRefStatistics,
  listResourceRefs,
  pageResourceCandidates,
  pageResourceRefs,
  type AreaTreeNode,
  type ResourceCandidate,
  type ResourceRefType,
  type ResourceRefVO,
  typeText,
} from "@/api/resource-list";
import { Button, Input, Modal, Page, PageLayout, Select, Space, Table, Tag, TreeSelect, message, type ColumnType } from "@/pc-ui-runtime";

import "./index.less";

const RESOURCE_TYPES: Array<{ key: ResourceRefType; label: string; icon: string }> = [
  { key: "DEVICE", label: "设备", icon: "🔧" },
  { key: "PERSON", label: "人员", icon: "👤" },
  { key: "MATERIAL", label: "物资", icon: "📦" },
];

const CANDIDATE_TYPE_OPTIONS = [
  { label: "设备", value: "DEVICE" },
  { label: "人员", value: "PERSON" },
  { label: "物资", value: "MATERIAL" },
];

const PAGE_SIZE = 10;
const CANDIDATE_PAGE_SIZE = 10;

export const ResourceList = defineComponent({
  name: "ResourceList",
  setup: () => {
    const loading = ref(false);
    const refs = ref<ResourceRefVO[]>([]);
    const typeCounts = ref<Record<ResourceRefType, number>>({ DEVICE: 0, PERSON: 0, MATERIAL: 0 });
    const selectedType = ref<ResourceRefType>("DEVICE");
    const draftKeyword = ref("");
    const draftAreaId = ref<string>();
    const keyword = ref("");
    const areaId = ref<string>();
    const pageNumber = ref(1);
    const pageSize = ref(PAGE_SIZE);
    const total = ref(0);
    const areaTree = ref<AreaTreeNode[]>([]);

    const modalOpen = ref(false);
    const candidateLoading = ref(false);
    const candidateKeyword = ref("");
    const candidateType = ref<ResourceRefType>("DEVICE");
    const candidatePageNumber = ref(1);
    const candidateTotal = ref(0);
    const candidates = ref<ResourceCandidate[]>([]);
    const selectedCandidateIds = ref<Record<string, boolean>>({});
    const linkedCandidateIds = ref<Set<string>>(new Set());
    let lastCandidateRequestKey = "";

    const selectedCandidateCount = computed(
      () => Object.entries(selectedCandidateIds.value).filter(([id, selected]) => selected && !linkedCandidateIds.value.has(id)).length,
    );

    async function loadStatistics(): Promise<void> {
      const statistics = await getResourceRefStatistics();
      typeCounts.value = {
        DEVICE: statistics.counts?.DEVICE ?? 0,
        PERSON: statistics.counts?.PERSON ?? 0,
        MATERIAL: statistics.counts?.MATERIAL ?? 0,
      };
    }

    async function loadAreaTree(): Promise<void> {
      try {
        areaTree.value = await getAreaTree();
      } catch {
        areaTree.value = [];
      }
    }

    async function loadRefs(resetPage = true): Promise<void> {
      loading.value = true;
      try {
        if (resetPage) {
          pageNumber.value = 1;
        }
        const page = await pageResourceRefs({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          refType: selectedType.value,
          keyword: keyword.value || undefined,
          areaId: areaId.value || undefined,
        });
        refs.value = page.records ?? [];
        total.value = page.total ?? refs.value.length;
      } catch {
        message.error("资源清单加载失败");
      } finally {
        loading.value = false;
      }
    }

    async function removeRef(record: ResourceRefVO): Promise<void> {
      try {
        await deleteResourceRef(record.id);
        message.success("已删除资源");
        await loadStatistics();
        await loadRefs();
      } catch {
        message.error("删除资源失败");
      }
    }

    function openBindModal(): void {
      modalOpen.value = true;
      candidateType.value = "DEVICE";
      candidateKeyword.value = "";
      candidatePageNumber.value = 1;
      selectedCandidateIds.value = {};
      linkedCandidateIds.value = new Set();
      lastCandidateRequestKey = "";
      void loadCandidates();
    }

    function submitSearch(): void {
      keyword.value = draftKeyword.value.trim();
      areaId.value = draftAreaId.value;
      void loadRefs();
    }

    function resetSearch(): void {
      draftKeyword.value = "";
      draftAreaId.value = undefined;
      keyword.value = "";
      areaId.value = undefined;
      void loadRefs();
    }

    function handlePageChange(nextPageNumber: number, nextPageSize: number): void {
      pageNumber.value = nextPageNumber;
      pageSize.value = nextPageSize;
      void loadRefs(false);
    }

    function closeBindModal(): void {
      modalOpen.value = false;
      selectedCandidateIds.value = {};
      linkedCandidateIds.value = new Set();
      lastCandidateRequestKey = "";
    }

    async function loadCandidates(): Promise<void> {
      const requestKey = JSON.stringify({
        type: candidateType.value,
        keyword: candidateKeyword.value.trim(),
        pageNumber: candidatePageNumber.value,
        pageSize: CANDIDATE_PAGE_SIZE,
      });
      if (requestKey === lastCandidateRequestKey) {
        return;
      }
      lastCandidateRequestKey = requestKey;
      candidateLoading.value = true;
      try {
        const page = await pageResourceCandidates({
          type: candidateType.value,
          keyword: candidateKeyword.value.trim() || undefined,
          pageNumber: candidatePageNumber.value,
          pageSize: CANDIDATE_PAGE_SIZE,
        });
        const nextCandidates = page.records ?? [];
        candidates.value = nextCandidates;
        candidateTotal.value = page.total ?? candidates.value.length;
        await loadLinkedCandidates(nextCandidates);
      } catch {
        lastCandidateRequestKey = "";
        candidates.value = [];
        linkedCandidateIds.value = new Set();
        candidateTotal.value = 0;
        message.error("资源库加载失败");
      } finally {
        candidateLoading.value = false;
      }
    }

    async function loadLinkedCandidates(nextCandidates: ResourceCandidate[]): Promise<void> {
      const refIds = nextCandidates.map((item) => item.id);
      if (refIds.length === 0) {
        linkedCandidateIds.value = new Set();
        selectedCandidateIds.value = {};
        return;
      }
      const linkedRefs = await listResourceRefs({ refType: candidateType.value, refIds });
      const linkedIds = new Set(linkedRefs.map((item) => item.refId));
      linkedCandidateIds.value = linkedIds;
      selectedCandidateIds.value = Object.fromEntries(nextCandidates.map((item) => [item.id, linkedIds.has(item.id)]));
    }

    function toggleCandidate(id: string): void {
      if (linkedCandidateIds.value.has(id)) {
        return;
      }
      selectedCandidateIds.value = { ...selectedCandidateIds.value, [id]: !selectedCandidateIds.value[id] };
    }

    async function confirmBind(): Promise<void> {
      const selectedIds = Object.keys(selectedCandidateIds.value).filter(
        (key) => selectedCandidateIds.value[key] && !linkedCandidateIds.value.has(key),
      );
      if (selectedIds.length === 0) {
        message.warning("请选择需要关联的资源");
        return;
      }
      try {
        const boundType = candidateType.value;
        await createResourceRef(selectedIds.map((refId) => ({ refType: candidateType.value, refId })));
        message.success(`已关联 ${selectedIds.length} 个资源`);
        closeBindModal();
        selectedType.value = boundType;
        draftKeyword.value = "";
        keyword.value = "";
        draftAreaId.value = undefined;
        areaId.value = undefined;
        await loadStatistics();
        await loadRefs();
      } catch {
        message.error("关联资源失败");
      }
    }

    function typeTag(type: ResourceRefType): JSX.Element {
      const color = type === "PERSON" ? "purple" : type === "MATERIAL" ? "warning" : "processing";
      return <Tag color={color}>{typeText(type)}</Tag>;
    }

    const columns: ColumnType[] = [
      {
        title: "资源名称",
        dataIndex: "resourceName",
        customRender: ({ record }: { record: ResourceRefVO }) => (
          <div class="resource-name-cell">
            <div>{record.resourceName || "-"}</div>
            <span>{record.resourceType || typeText(record.refType)}</span>
          </div>
        ),
      },
      { title: "编号", dataIndex: "resourceCode", width: 180 },
      {
        title: "类型",
        dataIndex: "refType",
        width: 120,
        customRender: ({ text }: { text: ResourceRefType }) => typeTag(text),
      },
      { title: "区域", dataIndex: "area", width: 180 },
      {
        title: "操作",
        dataIndex: "actions",
        width: 120,
        customRender: ({ record }: { record: ResourceRefVO }) => (
          <Button type="link" danger size="small" onClick={() => void removeRef(record)}>
            删除
          </Button>
        ),
      },
    ];

    onMounted(() => {
      void loadAreaTree();
      void loadStatistics();
      void loadRefs();
    });

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openBindModal}>
          关联资源
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="resource-list-page__body">
          <aside class="resource-type-panel">
            <div class="resource-type-panel__title">资源类型</div>
            {RESOURCE_TYPES.map((type) => (
              <button
                key={type.key}
                class={["resource-type-panel__item", selectedType.value === type.key ? "resource-type-panel__item--active" : ""]}
                onClick={() => {
                  if (selectedType.value === type.key) {
                    return;
                  }
                  selectedType.value = type.key;
                  void loadRefs();
                }}
              >
                <span>
                  {type.icon} {type.label}
                </span>
                <em>{typeCounts.value[type.key]}</em>
              </button>
            ))}
          </aside>
          <main class="resource-list-card">
            <div class="resource-list-card__title">资源列表</div>
            <div class="resource-list-card__filters">
              <span>区域</span>
              <TreeSelect
                allowClear
                class="resource-list-card__area"
                value={draftAreaId.value}
                treeData={areaTree.value}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                placeholder="全部区域"
                onUpdate:value={(value: string | undefined) => {
                  draftAreaId.value = value;
                }}
              />
              <span>名称/编号</span>
              <Input
                allowClear
                class="resource-list-card__keyword"
                placeholder="请输入资源名称或编号"
                value={draftKeyword.value}
                onUpdate:value={(value: string) => {
                  draftKeyword.value = value;
                }}
                onPressEnter={submitSearch}
              />
              <Button type="primary" onClick={submitSearch}>
                查询
              </Button>
              <Button onClick={resetSearch}>重置</Button>
              <span class="resource-list-card__total">共 {total.value} 条</span>
            </div>
            <Table
              rowKey="id"
              loading={loading.value}
              columns={columns}
              dataSource={refs.value}
              pagination={false}
              locale={{ emptyText: "暂无资源" }}
            />
          </main>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={pageNumber.value} pageSize={pageSize.value} total={total.value} onPageChange={handlePageChange} />
      ),
    };

    return (): JSX.Element => (
      <div class="resource-list-page">
        <PageLayout title="资源清单" v-slots={slots} />

        <Modal
          open={modalOpen.value}
          title="关联资源"
          width={640}
          onCancel={closeBindModal}
          footer={
            <div class="resource-bind-modal__footer">
              <Button onClick={closeBindModal}>取消</Button>
              <Button type="primary" onClick={() => void confirmBind()}>
                确认关联
              </Button>
            </div>
          }
        >
          <div class="resource-bind-modal">
            <div class="resource-bind-modal__desc">从应急资源库选择需要关联到清单的设备/人员/物资</div>
            <div class="resource-bind-modal__toolbar">
              <Input
                allowClear
                placeholder="搜索名称或编号..."
                value={candidateKeyword.value}
                onUpdate:value={(value: string) => {
                  candidateKeyword.value = value;
                  candidatePageNumber.value = 1;
                  void loadCandidates();
                }}
              />
              <Select
                class="resource-bind-modal__type"
                value={candidateType.value}
                options={CANDIDATE_TYPE_OPTIONS}
                onUpdate:value={(value: ResourceRefType) => {
                  if (candidateType.value === value) {
                    return;
                  }
                  candidateType.value = value;
                  candidatePageNumber.value = 1;
                  selectedCandidateIds.value = {};
                  linkedCandidateIds.value = new Set();
                  void loadCandidates();
                }}
              />
            </div>
            <div class="resource-bind-modal__meta">
              <span>应急资源库</span>
              <span>已选 {selectedCandidateCount.value} 项</span>
            </div>
            <div class="resource-bind-modal__list">
              {candidateLoading.value ? (
                <div class="resource-bind-modal__empty">加载中...</div>
              ) : candidates.value.length === 0 ? (
                <div class="resource-bind-modal__empty">暂无资源</div>
              ) : (
                candidates.value.map((item) => {
                  const linked = linkedCandidateIds.value.has(item.id);
                  return (
                    <div
                      class={["resource-bind-row", linked ? "resource-bind-row--disabled" : ""]}
                      key={`${item.type}-${item.id}`}
                      onClick={() => toggleCandidate(item.id)}
                    >
                      <input type="checkbox" checked={Boolean(selectedCandidateIds.value[item.id]) || linked} disabled={linked} readOnly />
                      <div class="resource-bind-row__main">
                        <strong>{item.name}</strong>
                        <span>{item.code}</span>
                        {typeTag(item.type)}
                        {linked ? <Tag>已关联</Tag> : null}
                      </div>
                      <span class="resource-bind-row__area">{item.area || "-"}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div class="resource-bind-modal__pager">
              <span>共 {candidateTotal.value} 条</span>
              <Space>
                <Button
                  size="small"
                  disabled={candidatePageNumber.value <= 1}
                  onClick={() => {
                    candidatePageNumber.value -= 1;
                    void loadCandidates();
                  }}
                >
                  &lt;
                </Button>
                <Button
                  size="small"
                  disabled={candidatePageNumber.value * CANDIDATE_PAGE_SIZE >= candidateTotal.value}
                  onClick={() => {
                    candidatePageNumber.value += 1;
                    void loadCandidates();
                  }}
                >
                  &gt;
                </Button>
              </Space>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
});
