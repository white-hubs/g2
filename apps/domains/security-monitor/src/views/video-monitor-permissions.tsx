import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getSecurityMdataClient, getSecurityMetadataClient, getSecurityOuaaClient, getVideoMonitorClient } from "../domain-context";
import { callSecurityPcUi, defineAsyncSecurityPcUiComponent, securityPcUiMessage as message } from "./pc-ui-runtime";
import {
  type AuthGrantTarget,
  type AuthScope,
  type DeviceAuth,
  type RecordMap,
  asArray,
  asPage,
  asRecord,
  safeText,
} from "./video-monitor-types";

import styles from "./security-monitor.module.css";

const Button = defineAsyncSecurityPcUiComponent("Button");
const Card = defineAsyncSecurityPcUiComponent("Card");
const Checkbox = defineAsyncSecurityPcUiComponent("Checkbox");
const CheckboxGroup = defineAsyncSecurityPcUiComponent("CheckboxGroup");
const Empty = defineAsyncSecurityPcUiComponent("Empty");
const Input = defineAsyncSecurityPcUiComponent("Input");
const Modal = defineAsyncSecurityPcUiComponent("Modal");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const Pagination = defineAsyncSecurityPcUiComponent("Pagination");
const Select = defineAsyncSecurityPcUiComponent("Select");
const Space = defineAsyncSecurityPcUiComponent("Space");
const TabPane = defineAsyncSecurityPcUiComponent("TabPane");
const Table = defineAsyncSecurityPcUiComponent("Table");
const Tabs = defineAsyncSecurityPcUiComponent("Tabs");
const Tag = defineAsyncSecurityPcUiComponent("Tag");
const Tree = defineAsyncSecurityPcUiComponent("Tree");

const SCOPE_LABEL: Record<AuthScope["scopeType"], string> = {
  DEVICE_AREA: "区域",
  DEVICE_GROUP: "分组",
  DEVICE: "设备",
};
const SCOPE_COLOR: Record<AuthScope["scopeType"], string> = {
  DEVICE_AREA: "blue",
  DEVICE_GROUP: "purple",
  DEVICE: "green",
};
const TARGET_LABEL: Record<AuthGrantTarget["targetType"], string> = {
  DEPARTMENT: "部门",
  ROLE: "角色",
  USER: "人员",
};

function idOf(value: RecordMap): string {
  return safeText(value.id, "");
}

function nameOf(value: RecordMap): string {
  return safeText(value.aliasName ?? value.name ?? value.userName ?? value.roleName, safeText(value.id));
}

function flattenTree(value: unknown): RecordMap[] {
  const result: RecordMap[] = [];
  const visit = (items: unknown): void => {
    for (const item of asArray<RecordMap>(items)) {
      result.push(item);
      visit(item.children);
    }
  };
  visit(value);
  return result;
}

async function resolveTargetNames(rows: DeviceAuth[]): Promise<Map<string, string>> {
  const ids = { DEPARTMENT: new Set<string>(), ROLE: new Set<string>(), USER: new Set<string>() };
  for (const row of rows) {
    for (const target of row.grantTargets ?? []) {
      for (const id of target.targetIds ?? []) {
        ids[target.targetType].add(id);
      }
    }
  }
  const api = await getSecurityOuaaClient();
  const names = new Map<string, string>();
  const [departments, roles, users] = await Promise.allSettled([
    ids.DEPARTMENT.size > 0 ? api.getOrganizations({ ids: [...ids.DEPARTMENT] }) : Promise.resolve([]),
    ids.ROLE.size > 0 ? api.getRoles() : Promise.resolve([]),
    ids.USER.size > 0 ? api.getUsersByIds([...ids.USER].join(",")) : Promise.resolve([]),
  ]);
  for (const response of [departments, roles, users]) {
    if (response.status !== "fulfilled") {
      continue;
    }
    for (const item of asArray<RecordMap>(asRecord(response.value).records ?? response.value)) {
      names.set(idOf(item), nameOf(item));
    }
  }
  return names;
}

export const VideoMonitorPermissionListPage = defineComponent({
  name: "VideoMonitorPermissionListPage",
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const rows = ref<DeviceAuth[]>([]);
    const selected = ref<string[]>([]);
    const targetNames = ref(new Map<string, string>());
    const tableViewportRef = ref<HTMLElement>();
    const tableBodyHeight = ref(320);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
    let tableResizeObserver: ResizeObserver | undefined;

    const updateTableBodyHeight = (): void => {
      const tableViewport = tableViewportRef.value;
      if (!(tableViewport instanceof HTMLElement)) {
        return;
      }
      const header = tableViewport.querySelector(".ant-table-thead");
      const headerHeight = header instanceof HTMLElement ? header.getBoundingClientRect().height : 55;
      tableBodyHeight.value = Math.max(160, Math.floor(tableViewport.clientHeight - headerHeight));
    };
    const scopeDetail = reactive({
      open: false,
      keyword: "",
      scopes: [] as AuthScope[],
    });

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = asPage<DeviceAuth>(
          await (
            await getVideoMonitorClient()
          ).listAuthGroup({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: query.keyword.trim() || undefined,
          }),
        );
        rows.value = result.records;
        query.total = result.total;
        targetNames.value = await resolveTargetNames(result.records);
        selected.value = [];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载监控权限失败");
      } finally {
        loading.value = false;
        await nextTick();
        updateTableBodyHeight();
      }
    };

    const remove = (ids: string[]): void => {
      void callSecurityPcUi("Modal", "confirm", {
        title: ids.length > 1 ? "确认批量删除所选权限？" : "确认删除该监控权限？",
        content: "删除后无法恢复，请确认。",
        async onOk() {
          await Promise.all(ids.map((id) => getVideoMonitorClient().then((api) => api.deleteCameraAuth(id))));
          message.success("删除成功");
          await load();
        },
      });
    };

    const renderScopeTag = (scope: AuthScope) => (
      <Tag color={SCOPE_COLOR[scope.scopeType]}>
        {SCOPE_LABEL[scope.scopeType]}：{scope.scopeName}
      </Tag>
    );

    const openScopeDetail = (scopes: AuthScope[]): void => {
      scopeDetail.scopes = scopes;
      scopeDetail.keyword = "";
      scopeDetail.open = true;
    };

    const filteredScopeDetails = computed(() => {
      const keyword = scopeDetail.keyword.trim();
      if (!keyword) {
        return scopeDetail.scopes;
      }
      return scopeDetail.scopes.filter((scope) => `${SCOPE_LABEL[scope.scopeType]}：${scope.scopeName}`.includes(keyword));
    });

    const columns = [
      {
        title: "监控范围",
        width: 380,
        customRender: ({ record }: { record: DeviceAuth }) => {
          const scopes = record.authScopes ?? [];
          return (
            <div class={styles.permissionScopeCell}>
              <Space wrap size={[4, 4]}>
                {scopes.slice(0, 10).map((scope) => renderScopeTag(scope))}
              </Space>
              {scopes.length > 10 ? (
                <Button class={styles.permissionScopeMore} type="link" onClick={() => openScopeDetail(scopes)}>
                  查看更多（{scopes.length}）
                </Button>
              ) : null}
            </div>
          );
        },
      },
      { title: "涉及设备数", dataIndex: "deviceCount", width: 120, align: "center" as const },
      {
        title: "权限归属",
        width: 360,
        customRender: ({ record }: { record: DeviceAuth }) => (
          <Space wrap size={[4, 4]}>
            {(record.grantTargets ?? []).flatMap((target) =>
              (target.targetIds ?? []).slice(0, 10).map((id) => (
                <Tag color={target.targetType === "USER" ? "green" : target.targetType === "ROLE" ? "purple" : "blue"}>
                  {TARGET_LABEL[target.targetType]}：{targetNames.value.get(id) ?? id}
                </Tag>
              )),
            )}
          </Space>
        ),
      },
      {
        title: "操作",
        width: 250,
        fixed: "right" as const,
        customRender: ({ record }: { record: DeviceAuth }) => (
          <Space>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/permissions/${record.id}/edit`)}>
              编辑
            </Button>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/permissions/new?copyFrom=${record.id}`)}>
              复制
            </Button>
            <Button type="link" onClick={() => router.push(`/d/security-monitor/permissions/${record.id}/detail`)}>
              详情
            </Button>
            <Button type="link" danger onClick={() => remove([record.id])}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    onMounted(async () => {
      await nextTick();
      updateTableBodyHeight();
      if (tableViewportRef.value) {
        tableResizeObserver = new ResizeObserver(() => updateTableBodyHeight());
        tableResizeObserver.observe(tableViewportRef.value);
      }
      window.addEventListener("resize", updateTableBodyHeight);
      void load();
    });
    onBeforeUnmount(() => {
      tableResizeObserver?.disconnect();
      window.removeEventListener("resize", updateTableBodyHeight);
    });
    return () => {
      const slots = {
        "layout-header": () => (
          <Button type="primary" onClick={() => router.push("/d/security-monitor/permissions/new")}>
            新增
          </Button>
        ),
        "layout-content": () => (
          <div class={styles.permissionListContent}>
            <div class={styles.filterBar}>
              <Input
                class={styles.search}
                value={query.keyword}
                allowClear
                placeholder="请输入监控范围"
                onUpdate:value={(value: string) => (query.keyword = value)}
                onPressEnter={() => void load()}
              />
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  query.keyword = "";
                  query.pageNumber = 1;
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <div ref={tableViewportRef} class={styles.permissionListTable}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows.value}
                loading={loading.value}
                pagination={false}
                scroll={{ x: 1150, y: tableBodyHeight.value }}
                rowSelection={{
                  selectedRowKeys: selected.value,
                  onChange: (keys: (string | number)[]) => (selected.value = keys.map(String)),
                }}
              />
            </div>
            <Modal open={scopeDetail.open} title="监控范围详情" footer={null} width={600} onCancel={() => (scopeDetail.open = false)}>
              <Input
                class={styles.permissionScopeSearch}
                value={scopeDetail.keyword}
                allowClear
                placeholder="请输入关键字搜索"
                onUpdate:value={(value: string) => (scopeDetail.keyword = value)}
              />
              <div class={styles.permissionScopeDetailList}>
                <Space wrap size={[8, 10]}>
                  {filteredScopeDetails.value.map((scope) => renderScopeTag(scope))}
                </Space>
              </div>
            </Modal>
          </div>
        ),
        "footer-btn": () => (
          <Button danger disabled={selected.value.length === 0} onClick={() => remove(selected.value)}>
            批量删除
          </Button>
        ),
        "footer-page": () => (
          <Pagination
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={query.total}
            showSizeChanger
            showTotal={(total: number) => `共 ${total} 条`}
            onChange={(page: number, size: number) => {
              query.pageNumber = page;
              query.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return <PageLayout title="监控权限" v-slots={slots} />;
    };
  },
});

interface OptionItem {
  label: string;
  value: string;
}

interface ScopeTreeNode {
  key: string;
  title: string;
  children?: ScopeTreeNode[];
}

interface DeviceInfo {
  id: string;
  code: string;
  name: string;
  region: string;
}

interface DeviceDisplay extends DeviceInfo {
  fromScope: string;
}

type ScopeTab = "area" | "group" | "device";

function toRecords(value: unknown): RecordMap[] {
  if (Array.isArray(value)) {
    return value as RecordMap[];
  }
  const source = asRecord(value);
  return asArray<RecordMap>(source.records ?? source.data ?? source.content);
}

function toCheckedKeys(keys: unknown): string[] {
  if (Array.isArray(keys)) {
    return keys.map(String);
  }
  if (keys && typeof keys === "object" && Array.isArray((keys as { checked?: unknown }).checked)) {
    return (keys as { checked: unknown[] }).checked.map(String);
  }
  return [];
}

function toScopeTree(areas: unknown[]): ScopeTreeNode[] {
  return asArray<RecordMap>(areas)
    .map((area) => {
      const key = idOf(area);
      const node: ScopeTreeNode = {
        key,
        title: safeText(area.aliasName ?? area.name ?? area.label, key),
      };
      const children = asArray(area.children);
      if (children.length > 0) {
        node.children = toScopeTree(children);
      }
      return node;
    })
    .filter((node) => node.key);
}

function buildKeyMap(data: ScopeTreeNode[], map = new Map<string, ScopeTreeNode>()): Map<string, ScopeTreeNode> {
  for (const node of data) {
    map.set(node.key, node);
    if (node.children) {
      buildKeyMap(node.children, map);
    }
  }
  return map;
}

function filterScopeTree(nodes: ScopeTreeNode[], keyword: string): ScopeTreeNode[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) {
    return nodes;
  }
  const visit = (items: ScopeTreeNode[]): ScopeTreeNode[] => {
    const result: ScopeTreeNode[] = [];
    for (const node of items) {
      const children = node.children ? visit(node.children) : [];
      if (node.title.toLowerCase().includes(needle) || children.length > 0) {
        result.push({ ...node, children: children.length > 0 ? children : undefined });
      }
    }
    return result;
  };
  return visit(nodes);
}

function findNodeKeyByTitle(title: string, nodeMap: Map<string, ScopeTreeNode>): string | null {
  for (const [key, node] of nodeMap.entries()) {
    if (node.title === title) {
      return key;
    }
  }
  return null;
}

function toDeviceInfo(device: RecordMap): DeviceInfo {
  return {
    id: idOf(device),
    code: safeText(device.code ?? device.deviceCode, ""),
    name: safeText(device.name ?? device.deviceName, ""),
    region: safeText(device.thirdPartyId ?? device.areaName ?? device.areaPathName, ""),
  };
}

function toOptions(items: RecordMap[]): OptionItem[] {
  return items.map((item) => ({ label: nameOf(item), value: idOf(item) })).filter((item) => item.value);
}

function mergeOptions(current: OptionItem[], incoming: OptionItem[]): OptionItem[] {
  const map = new Map(current.map((item) => [item.value, item]));
  for (const item of incoming) {
    if (item.value) {
      map.set(item.value, item);
    }
  }
  return [...map.values()];
}

function filterOptions(options: OptionItem[], keyword: string): OptionItem[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) {
    return options;
  }
  return options.filter((item) => item.label.toLowerCase().includes(needle));
}

export const VideoMonitorPermissionEditorPage = defineComponent({
  name: "VideoMonitorPermissionEditorPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const routeId = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
    const copyFrom = computed(() => (typeof route.query.copyFrom === "string" ? route.query.copyFrom : ""));
    const readonly = computed(() => route.path.endsWith("/detail"));
    const sourceId = computed(() => routeId.value || copyFrom.value);
    const loading = ref(false);
    const scopeTab = ref<ScopeTab>("area");
    const areaTreeData = ref<ScopeTreeNode[]>([]);
    const areaNodeMap = ref(new Map<string, ScopeTreeNode>());
    const groupTreeData = ref<ScopeTreeNode[]>([]);
    const groupNodeMap = ref(new Map<string, ScopeTreeNode>());
    const deviceList = ref<DeviceInfo[]>([]);
    const deviceDictionary = ref<Record<string, DeviceInfo>>({});
    const selectedAreaKeys = ref<string[]>([]);
    const selectedGroupKeys = ref<string[]>([]);
    const selectedDeviceKeys = ref<string[]>([]);
    const areaDevices = ref<DeviceDisplay[]>([]);
    const groupDevices = ref<DeviceDisplay[]>([]);
    const derivedDevices = ref<DeviceDisplay[]>([]);
    const selectedDepartments = ref<string[]>([]);
    const selectedRoles = ref<string[]>([]);
    const selectedStaffs = ref<string[]>([]);
    const departmentOptions = ref<OptionItem[]>([]);
    const roleOptions = ref<OptionItem[]>([]);
    const userOptions = ref<OptionItem[]>([]);
    const loadingDepartments = ref(false);
    const loadingRoles = ref(false);
    const loadingUsers = ref(false);
    const areaSearchKeyword = ref("");
    const groupSearchKeyword = ref("");
    const deviceSearchKeyword = ref("");
    const departmentSearchKeyword = ref("");
    const roleSearchKeyword = ref("");
    const userSearchKeyword = ref("");
    let syncAreaDevicesTimer: ReturnType<typeof setTimeout> | null = null;
    let syncGroupDevicesTimer: ReturnType<typeof setTimeout> | null = null;

    const pageTitle = computed(() => {
      if (readonly.value) {
        return "权限详情";
      }
      if (routeId.value) {
        return "编辑监控权限";
      }
      return "新增监控权限";
    });

    const rememberDevices = (devices: DeviceInfo[]): void => {
      const next = { ...deviceDictionary.value };
      for (const device of devices) {
        if (device.id) {
          next[device.id] = device;
        }
      }
      deviceDictionary.value = next;
    };

    const mergeDerivedDevices = (nextArea: DeviceDisplay[], nextGroup: DeviceDisplay[]): void => {
      const union = new Map<string, DeviceDisplay>();
      nextArea.forEach((device) => union.set(device.id, device));
      nextGroup.forEach((device) => union.set(device.id, device));
      derivedDevices.value = Array.from(union.values());
    };

    const queryDevicesByAreas = async (areaIds: string[]): Promise<DeviceDisplay[]> => {
      if (areaIds.length === 0) {
        return [];
      }
      try {
        const api = await getVideoMonitorClient();
        const devices = toRecords(await api.queryVideoMonitorDeviceByAreaOrGroupAndTag({ areaIds })).map((item) => toDeviceInfo(item));
        rememberDevices(devices);
        return devices
          .filter((device) => device.id)
          .map((device) => {
            const matchedAreaId = areaIds.find((id) => areaNodeMap.value.has(id));
            const node = matchedAreaId ? areaNodeMap.value.get(matchedAreaId) : undefined;
            return Object.assign({}, device, { fromScope: `区域 · ${node?.title || areaIds[0]}` });
          });
      } catch {
        return [];
      }
    };

    const queryDevicesByGroups = async (groupIds: string[]): Promise<DeviceDisplay[]> => {
      if (groupIds.length === 0) {
        return [];
      }
      try {
        const api = await getVideoMonitorClient();
        const devices = toRecords(await api.queryVideoMonitorDeviceByAreaOrGroupAndTag({ groupIds })).map((item) => toDeviceInfo(item));
        rememberDevices(devices);
        return devices
          .filter((device) => device.id)
          .map((device) => {
            const matchedGroupId = groupIds.find((id) => groupNodeMap.value.has(id));
            const node = matchedGroupId ? groupNodeMap.value.get(matchedGroupId) : undefined;
            return Object.assign({}, device, { fromScope: `分组 · ${node?.title || groupIds[0]}` });
          });
      } catch {
        return [];
      }
    };

    const queryDevicesByIds = async (deviceIds: string[]): Promise<DeviceDisplay[]> => {
      if (deviceIds.length === 0) {
        return [];
      }
      try {
        const api = await getVideoMonitorClient();
        const devices = toRecords(await api.queryVideoMonitorDeviceByAreaOrGroupAndTag({ deviceIds })).map((item) => toDeviceInfo(item));
        rememberDevices(devices);
        return devices.filter((device) => device.id).map((device) => Object.assign({}, device, { fromScope: "直接选择" }));
      } catch {
        return [];
      }
    };

    const syncAreaDevices = async (): Promise<void> => {
      const nextArea = await queryDevicesByAreas(selectedAreaKeys.value);
      areaDevices.value = nextArea;
      mergeDerivedDevices(nextArea, groupDevices.value);
    };

    const syncGroupDevices = async (): Promise<void> => {
      const nextGroup = await queryDevicesByGroups(selectedGroupKeys.value);
      groupDevices.value = nextGroup;
      mergeDerivedDevices(areaDevices.value, nextGroup);
    };

    const applyAreaResponse = (response: unknown): boolean => {
      const tree = toScopeTree(toRecords(response));
      if (tree.length === 0) {
        return false;
      }
      areaTreeData.value = tree;
      areaNodeMap.value = buildKeyMap(tree);
      return true;
    };

    const loadAreaTreeData = async (): Promise<void> => {
      const sources: (() => Promise<unknown>)[] = [
        async () => (await getSecurityMdataClient()).getAreaList({}),
        async () => (await getSecurityMdataClient()).getAreaTree({}),
        async () => (await getSecurityMetadataClient()).listAllArea(),
      ];
      for (const load of sources) {
        try {
          if (applyAreaResponse(await load())) {
            return;
          }
        } catch {
          continue;
        }
      }
      message.error("加载区域数据失败");
    };

    const loadGroupTreeData = async (): Promise<void> => {
      try {
        const response = await (await getVideoMonitorClient()).listVideoMonitorGroup({ pageNumber: 1, pageSize: 1000 });
        groupTreeData.value = asPage<RecordMap>(response)
          .records.map((group) => ({
            key: idOf(group),
            title: nameOf(group),
          }))
          .filter((node) => node.key);
        groupNodeMap.value = buildKeyMap(groupTreeData.value);
      } catch {
        message.error("加载监控分组数据失败");
      }
    };

    const loadDeviceList = async (): Promise<void> => {
      try {
        const response = await (await getVideoMonitorClient()).listVideoMonitorDevice({ pageNumber: 1, pageSize: 1000 });
        const devices = asPage<RecordMap>(response)
          .records.map(toDeviceInfo)
          .filter((device) => device.id);
        deviceList.value = devices;
        rememberDevices(devices);
      } catch {
        message.error("加载设备列表失败");
      }
    };

    const loadDepartments = async (keyword?: string): Promise<void> => {
      if (loadingDepartments.value) {
        return;
      }
      loadingDepartments.value = true;
      try {
        const orgs = flattenTree(await (await getSecurityOuaaClient()).getOrganizations({ enabled: true, name: keyword }));
        const selected = departmentOptions.value.filter((item) => selectedDepartments.value.includes(item.value));
        departmentOptions.value = mergeOptions(selected, toOptions(orgs));
      } catch {
        message.error("加载部门列表失败");
      } finally {
        loadingDepartments.value = false;
      }
    };

    const loadRoles = async (): Promise<void> => {
      if (loadingRoles.value) {
        return;
      }
      loadingRoles.value = true;
      try {
        const roles = toRecords(await (await getSecurityOuaaClient()).getRoles()).filter((role) => role.enabled !== false);
        roleOptions.value = toOptions(roles);
      } catch {
        message.error("加载角色列表失败");
      } finally {
        loadingRoles.value = false;
      }
    };

    const loadUsers = async (keyword?: string): Promise<void> => {
      if (loadingUsers.value) {
        return;
      }
      loadingUsers.value = true;
      try {
        const users = asPage<RecordMap>(await (await getSecurityOuaaClient()).listUsers({ keyword, pageSize: 100 })).records;
        userOptions.value = mergeOptions(userOptions.value, toOptions(users));
      } catch {
        message.error("加载人员列表失败");
      } finally {
        loadingUsers.value = false;
      }
    };

    const loadSelectedDepartments = async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }
      try {
        const orgs = flattenTree(await (await getSecurityOuaaClient()).getOrganizations({ ids }));
        departmentOptions.value = mergeOptions(departmentOptions.value, toOptions(orgs));
      } catch {
        // 保留已加载的候选部门。
      }
    };

    const loadSelectedRoles = async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }
      try {
        const roles = toRecords(await (await getSecurityOuaaClient()).getRoles());
        roleOptions.value = mergeOptions(roleOptions.value, toOptions(roles.filter((role) => ids.includes(idOf(role)))));
      } catch {
        // 保留已加载的候选角色。
      }
    };

    const loadSelectedUsers = async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }
      try {
        const users = toRecords(await (await getSecurityOuaaClient()).getUsersByIds(ids.join(",")));
        userOptions.value = mergeOptions(userOptions.value, toOptions(users));
      } catch {
        // 保留已加载的候选人员。
      }
    };

    const matchScopeKeys = (scopes: AuthScope[], nodeMap: Map<string, ScopeTreeNode>): string[] => {
      const matched = scopes
        .map((scope) => (nodeMap.get(scope.scopeId) ? scope.scopeId : findNodeKeyByTitle(scope.scopeName, nodeMap)))
        .filter((key): key is string => Boolean(key));
      return matched.length > 0 ? matched : scopes.map((scope) => scope.scopeId);
    };

    const loadDetailData = async (): Promise<void> => {
      if (!sourceId.value) {
        return;
      }
      loading.value = true;
      try {
        const data = asRecord(await (await getVideoMonitorClient()).getCameraAuth(sourceId.value)) as unknown as DeviceAuth;
        const areaScopes = (data.authScopes ?? []).filter((scope) => scope.scopeType === "DEVICE_AREA");
        const groupScopes = (data.authScopes ?? []).filter((scope) => scope.scopeType === "DEVICE_GROUP");
        const deviceScopes = (data.authScopes ?? []).filter((scope) => scope.scopeType === "DEVICE");
        if (areaScopes.length > 0) {
          scopeTab.value = "area";
        } else if (groupScopes.length > 0) {
          scopeTab.value = "group";
        } else if (deviceScopes.length > 0) {
          scopeTab.value = "device";
        }
        await nextTick();
        selectedAreaKeys.value = matchScopeKeys(areaScopes, areaNodeMap.value);
        selectedGroupKeys.value = matchScopeKeys(groupScopes, groupNodeMap.value);
        selectedDeviceKeys.value = deviceScopes.map((scope) => scope.scopeId);
        if (deviceScopes.length > 0) {
          await queryDevicesByIds(deviceScopes.map((scope) => scope.scopeId));
        }
        const deptTargets = (data.grantTargets ?? []).filter((target) => target.targetType === "DEPARTMENT");
        const roleTargets = (data.grantTargets ?? []).filter((target) => target.targetType === "ROLE");
        const userTargets = (data.grantTargets ?? []).filter((target) => target.targetType === "USER");
        selectedDepartments.value = deptTargets.flatMap((target) => target.targetIds ?? []);
        selectedRoles.value = roleTargets.flatMap((target) => target.targetIds ?? []);
        selectedStaffs.value = userTargets.flatMap((target) => target.targetIds ?? []);
        if (selectedDepartments.value.length > 0) {
          await loadSelectedDepartments(selectedDepartments.value);
        }
        if (selectedRoles.value.length > 0) {
          await loadSelectedRoles(selectedRoles.value);
        }
        if (selectedStaffs.value.length > 0) {
          await loadSelectedUsers(selectedStaffs.value);
        }
      } catch {
        message.error("加载数据失败");
      } finally {
        loading.value = false;
      }
    };

    const buildAuthScopes = (): AuthScope[] => {
      const scopes: AuthScope[] = [];
      selectedAreaKeys.value.forEach((key) => {
        const node = areaNodeMap.value.get(key);
        if (node) {
          scopes.push({ scopeType: "DEVICE_AREA", scopeName: node.title, scopeId: key });
        }
      });
      selectedGroupKeys.value.forEach((key) => {
        const node = groupNodeMap.value.get(key);
        if (node) {
          scopes.push({ scopeType: "DEVICE_GROUP", scopeName: node.title, scopeId: key });
        }
      });
      selectedDeviceKeys.value.forEach((deviceId) => {
        const device = deviceDictionary.value[deviceId];
        if (device) {
          scopes.push({ scopeType: "DEVICE", scopeName: device.name, scopeId: deviceId });
        }
      });
      return scopes;
    };

    const buildGrantTargets = (): AuthGrantTarget[] => {
      const targets: AuthGrantTarget[] = [];
      if (selectedDepartments.value.length > 0) {
        targets.push({ targetType: "DEPARTMENT", targetIds: selectedDepartments.value });
      }
      if (selectedRoles.value.length > 0) {
        targets.push({ targetType: "ROLE", targetIds: selectedRoles.value });
      }
      if (selectedStaffs.value.length > 0) {
        targets.push({ targetType: "USER", targetIds: selectedStaffs.value });
      }
      return targets;
    };

    const manualDevices = computed<DeviceDisplay[]>(() =>
      selectedDeviceKeys.value
        .map((id) => deviceDictionary.value[id])
        .filter((item): item is DeviceInfo => Boolean(item))
        .map((item) => Object.assign({}, item, { fromScope: "直接选择" })),
    );
    const totalDevices = computed<DeviceDisplay[]>(() => {
      const union = new Map<string, DeviceDisplay>();
      derivedDevices.value.forEach((device) => union.set(device.id, device));
      manualDevices.value.forEach((device) => union.set(device.id, device));
      return Array.from(union.values());
    });
    const displayedDevices = computed<DeviceDisplay[]>(() => {
      if (scopeTab.value === "device") {
        return manualDevices.value;
      }
      if (scopeTab.value === "group") {
        return groupDevices.value;
      }
      return areaDevices.value;
    });
    const scopeSummary = computed(() => ({
      areaCount: selectedAreaKeys.value.length,
      groupCount: selectedGroupKeys.value.length,
      deviceCount: manualDevices.value.length,
    }));
    const filteredAreaTreeData = computed(() => filterScopeTree(areaTreeData.value, areaSearchKeyword.value));
    const filteredGroupTreeData = computed(() => {
      const keyword = groupSearchKeyword.value.trim().toLowerCase();
      if (!keyword) {
        return groupTreeData.value;
      }
      return groupTreeData.value.filter((node) => node.title.toLowerCase().includes(keyword));
    });
    const filteredDeviceList = computed(() => {
      const keyword = deviceSearchKeyword.value.trim().toLowerCase();
      if (!keyword) {
        return deviceList.value;
      }
      return deviceList.value.filter(
        (device) =>
          device.name.toLowerCase().includes(keyword) ||
          device.code.toLowerCase().includes(keyword) ||
          device.region.toLowerCase().includes(keyword),
      );
    });
    const filteredDepartmentOptions = computed(() => filterOptions(departmentOptions.value, departmentSearchKeyword.value));
    const filteredRoleOptions = computed(() => filterOptions(roleOptions.value, roleSearchKeyword.value));
    const filteredUserOptions = computed(() => filterOptions(userOptions.value, userSearchKeyword.value));
    const allowManualActions = computed(() => scopeTab.value === "device" && !readonly.value);
    const allowManualClear = computed(() => scopeTab.value === "device" && manualDevices.value.length > 0 && !readonly.value);

    const handleRemoveManualDevice = (deviceId: string): void => {
      if (readonly.value) {
        return;
      }
      selectedDeviceKeys.value = selectedDeviceKeys.value.filter((id) => id !== deviceId);
    };

    const handleClearManualDevices = (): void => {
      if (readonly.value) {
        return;
      }
      selectedDeviceKeys.value = [];
    };

    const handleClearScopes = (): void => {
      if (readonly.value) {
        return;
      }
      selectedAreaKeys.value = [];
      selectedGroupKeys.value = [];
      selectedDeviceKeys.value = [];
      areaDevices.value = [];
      groupDevices.value = [];
      derivedDevices.value = [];
    };

    const handleSave = async (): Promise<void> => {
      if (readonly.value) {
        await router.push("/d/security-monitor/permissions");
        return;
      }
      if (totalDevices.value.length === 0) {
        message.warning("请先选择监控范围");
        return;
      }
      const authScopes = buildAuthScopes();
      const grantTargets = buildGrantTargets();
      if (grantTargets.length === 0) {
        message.warning("请至少选择一个权限归属");
        return;
      }
      loading.value = true;
      try {
        const api = await getVideoMonitorClient();
        if (routeId.value) {
          await api.updateCameraAuth(routeId.value, { authScopes, grantTargets });
          message.success("更新成功");
        } else {
          await api.createCameraAuth({ authScopes, grantTargets });
          message.success("创建成功");
        }
        await router.push("/d/security-monitor/permissions");
      } catch {
        message.error(routeId.value ? "更新失败" : "创建失败");
      } finally {
        loading.value = false;
      }
    };

    const handleCancel = (): void => {
      void router.push("/d/security-monitor/permissions");
    };

    watch(
      selectedAreaKeys,
      () => {
        if (syncAreaDevicesTimer) {
          clearTimeout(syncAreaDevicesTimer);
        }
        syncAreaDevicesTimer = setTimeout(() => {
          void syncAreaDevices();
          syncAreaDevicesTimer = null;
        }, 100);
      },
      { deep: true },
    );
    watch(
      selectedGroupKeys,
      () => {
        if (syncGroupDevicesTimer) {
          clearTimeout(syncGroupDevicesTimer);
        }
        syncGroupDevicesTimer = setTimeout(() => {
          void syncGroupDevices();
          syncGroupDevicesTimer = null;
        }, 100);
      },
      { deep: true },
    );
    watch(
      selectedDeviceKeys,
      () => {
        if (selectedDeviceKeys.value.length === 0) {
          return;
        }
        void queryDevicesByIds(selectedDeviceKeys.value);
      },
      { deep: true },
    );
    watch(scopeTab, async (tab) => {
      if (tab === "device" && deviceList.value.length === 0) {
        await loadDeviceList();
      }
      if (tab === "group" && groupTreeData.value.length === 0) {
        await loadGroupTreeData();
      }
    });

    onMounted(async () => {
      await Promise.all([loadAreaTreeData(), loadGroupTreeData(), loadDepartments(), loadRoles(), loadUsers()]);
      if (sourceId.value) {
        await loadDetailData();
      }
    });
    onBeforeUnmount(() => {
      if (syncAreaDevicesTimer) {
        clearTimeout(syncAreaDevicesTimer);
      }
      if (syncGroupDevicesTimer) {
        clearTimeout(syncGroupDevicesTimer);
      }
    });

    const renderTree = (data: ScopeTreeNode[], checked: string[], onChange: (keys: string[]) => void) => (
      <Tree
        checkable
        blockNode
        disabled={readonly.value}
        checkedKeys={checked}
        treeData={data}
        onCheck={(keys: unknown) => {
          if (readonly.value) {
            return;
          }
          onChange(toCheckedKeys(keys));
        }}
      />
    );

    return () => {
      const slots = {
        "layout-content": () => (
          <div class={styles.permissionEditor}>
            <div class={styles.permissionEditorScope}>
              <div class={styles.permissionEditorScopeHeader}>
                <Space>
                  <div>监控范围</div>
                  <Tag>区域 {scopeSummary.value.areaCount}</Tag>
                  <Tag color="blue">分组 {scopeSummary.value.groupCount}</Tag>
                  <Tag color="green">设备 {scopeSummary.value.deviceCount}</Tag>
                </Space>
                <Button type="link" disabled={readonly.value} onClick={handleClearScopes}>
                  清空选择
                </Button>
              </div>
              <div class={styles.permissionEditorScopeBody}>
                <div class={styles.permissionEditorScopeLeft}>
                  <Tabs
                    class={styles.permissionEditorTabs}
                    activeKey={scopeTab.value}
                    onChange={(key: string | number) => {
                      scopeTab.value = String(key) as ScopeTab;
                    }}
                  >
                    <TabPane key="area" tab="区域">
                      <div class={styles.permissionEditorPane}>
                        <div class={styles.permissionEditorSearch}>
                          <Input
                            placeholder="搜索区域"
                            value={areaSearchKeyword.value}
                            allowClear
                            onUpdate:value={(value: string) => (areaSearchKeyword.value = value)}
                          />
                        </div>
                        <div class={styles.permissionEditorTree}>
                          {renderTree(filteredAreaTreeData.value, selectedAreaKeys.value, (keys) => {
                            selectedAreaKeys.value = keys;
                          })}
                        </div>
                      </div>
                    </TabPane>
                    <TabPane key="group" tab="监控分组">
                      <div class={styles.permissionEditorPane}>
                        <div class={styles.permissionEditorSearch}>
                          <Input
                            placeholder="搜索分组"
                            value={groupSearchKeyword.value}
                            allowClear
                            onUpdate:value={(value: string) => (groupSearchKeyword.value = value)}
                          />
                        </div>
                        <div class={styles.permissionEditorTree}>
                          {renderTree(filteredGroupTreeData.value, selectedGroupKeys.value, (keys) => {
                            selectedGroupKeys.value = keys;
                          })}
                        </div>
                      </div>
                    </TabPane>
                    <TabPane key="device" tab="设备">
                      <div class={styles.permissionEditorPane}>
                        <div class={styles.permissionEditorSearch}>
                          <Input
                            placeholder="搜索设备（名称/编号/区域）"
                            value={deviceSearchKeyword.value}
                            allowClear
                            onUpdate:value={(value: string) => (deviceSearchKeyword.value = value)}
                          />
                        </div>
                        <div class={styles.permissionEditorTree}>
                          <CheckboxGroup
                            value={selectedDeviceKeys.value}
                            onUpdate:value={(vals: unknown) => {
                              if (readonly.value) {
                                return;
                              }
                              selectedDeviceKeys.value = Array.isArray(vals) ? vals.filter((value) => typeof value === "string") : [];
                            }}
                          >
                            <Space direction="vertical" style={{ width: "100%" }}>
                              {filteredDeviceList.value.map((device) => (
                                <Checkbox key={device.id} value={device.id} disabled={readonly.value}>
                                  <div class={styles.permissionEditorDeviceOption}>
                                    <span>
                                      {device.name || "未知设备"}（{device.code || device.id || "未知编号"}）
                                    </span>
                                    {device.region ? <span class={styles.permissionEditorDeviceRegion}>{device.region}</span> : null}
                                  </div>
                                </Checkbox>
                              ))}
                            </Space>
                          </CheckboxGroup>
                        </div>
                      </div>
                    </TabPane>
                  </Tabs>
                </div>
                <div class={styles.permissionEditorScopeRight}>
                  <Card
                    class={styles.permissionEditorSelectedCard}
                    size="small"
                    title={`已选设备（${displayedDevices.value.length}）`}
                    extra={
                      allowManualClear.value ? (
                        <Button type="link" onClick={handleClearManualDevices}>
                          清空
                        </Button>
                      ) : null
                    }
                  >
                    {displayedDevices.value.length > 0 ? (
                      displayedDevices.value.map((item) => (
                        <div key={item.id} class={styles.permissionEditorDeviceItem}>
                          <div class={styles.permissionEditorDeviceMeta}>
                            <div class={styles.permissionEditorDeviceTitle}>
                              {item.name || "未知设备"}（{item.code || item.id || "未知编号"}）
                            </div>
                            <div class={styles.permissionEditorDeviceDesc}>{[item.region, item.fromScope].filter(Boolean).join(" · ")}</div>
                          </div>
                          {allowManualActions.value ? (
                            <Button type="link" danger size="small" onClick={() => handleRemoveManualDevice(item.id)}>
                              移除
                            </Button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <Empty description={scopeTab.value === "device" ? "请选择设备" : "请选择左侧区域或分组"} />
                    )}
                  </Card>
                </div>
              </div>
            </div>
            <Card class={styles.permissionEditorOwnership} title="权限归属">
              {!readonly.value || selectedDepartments.value.length > 0 ? (
                <div class={styles.permissionEditorOwnershipItem}>
                  <div class={styles.permissionEditorOwnershipLabel}>部门</div>
                  <Select
                    class={styles.permissionEditorOwnershipSelect}
                    mode="multiple"
                    allowClear
                    showSearch
                    filterOption={false}
                    placeholder="请选择部门（支持搜索）"
                    disabled={readonly.value}
                    loading={loadingDepartments.value}
                    value={selectedDepartments.value}
                    options={filteredDepartmentOptions.value}
                    searchValue={departmentSearchKeyword.value}
                    onSearch={(value: string) => {
                      departmentSearchKeyword.value = value;
                      if (value) {
                        void loadDepartments(value);
                      }
                    }}
                    onFocus={() => {
                      if (departmentOptions.value.length === 0) {
                        void loadDepartments();
                      }
                    }}
                    onUpdate:value={(value: unknown) => {
                      selectedDepartments.value = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
                    }}
                  />
                </div>
              ) : null}
              {!readonly.value || selectedRoles.value.length > 0 ? (
                <div class={styles.permissionEditorOwnershipItem}>
                  <div class={styles.permissionEditorOwnershipLabel}>角色</div>
                  <Select
                    class={styles.permissionEditorOwnershipSelect}
                    mode="multiple"
                    allowClear
                    showSearch
                    filterOption={(input: string, option?: { label?: string }) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    placeholder="请选择角色（支持搜索）"
                    disabled={readonly.value}
                    loading={loadingRoles.value}
                    value={selectedRoles.value}
                    options={filteredRoleOptions.value}
                    searchValue={roleSearchKeyword.value}
                    onSearch={(value: string) => {
                      roleSearchKeyword.value = value;
                    }}
                    onFocus={() => {
                      if (roleOptions.value.length === 0) {
                        void loadRoles();
                      }
                    }}
                    onUpdate:value={(value: unknown) => {
                      selectedRoles.value = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
                    }}
                  />
                </div>
              ) : null}
              {!readonly.value || selectedStaffs.value.length > 0 ? (
                <div class={styles.permissionEditorOwnershipItem}>
                  <div class={styles.permissionEditorOwnershipLabel}>人员</div>
                  <Select
                    class={styles.permissionEditorOwnershipSelect}
                    mode="multiple"
                    allowClear
                    showSearch
                    filterOption={false}
                    placeholder="请选择人员（支持搜索）"
                    disabled={readonly.value}
                    loading={loadingUsers.value}
                    value={selectedStaffs.value}
                    options={filteredUserOptions.value}
                    searchValue={userSearchKeyword.value}
                    onSearch={(value: string) => {
                      userSearchKeyword.value = value;
                      if (value) {
                        void loadUsers(value);
                      }
                    }}
                    onFocus={() => {
                      if (userOptions.value.length === 0) {
                        void loadUsers();
                      }
                    }}
                    onUpdate:value={(value: unknown) => {
                      selectedStaffs.value = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
                    }}
                  />
                </div>
              ) : null}
            </Card>
          </div>
        ),
        "footer-btn": () => (
          <Space>
            <Button onClick={handleCancel} disabled={loading.value}>
              {readonly.value ? "返回" : "取消"}
            </Button>
            <Button type="primary" disabled={readonly.value || loading.value} loading={loading.value} onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        ),
      };
      return <PageLayout title={pageTitle.value} v-slots={slots} />;
    };
  },
});
