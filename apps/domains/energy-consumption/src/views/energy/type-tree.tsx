import type { Key } from "ant-design-vue/es/_util/type";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";

import { AreaProjectTree, EnergyProjectTree, getMeterDeviceList } from "@/api";
import { Empty, Input, SearchOutlined, TabPane, Tabs, Tree } from "@/pc-ui-runtime";

/** 用量分析左侧分项/区域/设备树 */
export const TypeTree = defineComponent({
  name: "TypeTree",
  props: {
    instrumentType: { type: String, default: "" },
    activeKey: { type: String, default: "ITEM" },
  },
  emits: ["checkedItem"],
  setup(props, { emit }) {
    const activeKey = ref(props.activeKey || "ITEM");
    const searchType = reactive<{
      subItemProjectIds: Key[];
      areaProjectIds: Key[];
      deviceProjectIds: Key[];
    }>({
      subItemProjectIds: [],
      areaProjectIds: [],
      deviceProjectIds: [],
    });
    const searchName = reactive({ subItemName: "", areaName: "", deviceName: "" });
    const subItemOptions = ref<Record<string, unknown>[]>([]);
    const areaOptions = ref<Record<string, unknown>[]>([]);
    const deviceOptions = ref<Record<string, unknown>[]>([]);

    const getSubItemTree = async (type: string) => {
      const { data } = await EnergyProjectTree({
        projectName: searchName.subItemName,
        instrumentType: type,
      });
      subItemOptions.value = (data as Record<string, unknown>[]) || [];
    };

    const geAreaTree = async (type: string) => {
      const { data } = await AreaProjectTree({
        areaName: searchName.areaName,
        instrumentType: type,
      });
      areaOptions.value = (data as Record<string, unknown>[]) || [];
    };

    const getDeviceTree = async (type: string) => {
      const { data } = await getMeterDeviceList({
        keyword: searchName.deviceName,
        instrumentType: type,
      });
      deviceOptions.value = (data as Record<string, unknown>[]) || [];
    };

    const normalizeKeys = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => (Array.isArray(checked) ? checked : checked.checked);

    const changeTreeSelect = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
      searchType.subItemProjectIds = normalizeKeys(checked);
      emit("checkedItem", searchType.subItemProjectIds, activeKey.value);
    };

    const changeAreaTreeSelect = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
      searchType.areaProjectIds = normalizeKeys(checked);
      emit("checkedItem", searchType.areaProjectIds, activeKey.value);
    };

    const changeDeviceTreeSelect = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
      searchType.deviceProjectIds = normalizeKeys(checked);
      emit("checkedItem", searchType.deviceProjectIds, activeKey.value);
    };

    const tabChange = (data: string | number) => {
      const key = String(data);
      activeKey.value = key;
      if (key === "ITEM") emit("checkedItem", searchType.subItemProjectIds, key);
      else if (key === "AREA") emit("checkedItem", searchType.areaProjectIds, key);
      else emit("checkedItem", searchType.deviceProjectIds, key);
    };

    onMounted(() => {
      activeKey.value = props.activeKey;
      emit("checkedItem", searchType.subItemProjectIds, activeKey.value);
    });

    watch(
      () => props.instrumentType,
      () => {
        void getSubItemTree(props.instrumentType);
        void geAreaTree(props.instrumentType);
        void getDeviceTree(props.instrumentType);
      },
      { immediate: true },
    );

    return () => (
      <Tabs activeKey={activeKey.value} size="small" type="card" onChange={tabChange} class="energy-type-tree">
        <TabPane key="ITEM" tab="分项">
          <Input
            value={searchName.subItemName}
            placeholder="搜索"
            onPressEnter={() => void getSubItemTree(props.instrumentType)}
            onChange={(e) => {
              searchName.subItemName = (e.target as HTMLInputElement).value;
            }}
            v-slots={{
              suffix: () => <SearchOutlined style={{ color: "rgba(0, 0, 0, 0.45)" }} />,
            }}
          />
          <div class="energy-mt-15 energy-tree-list">
            {!subItemOptions.value.length ? (
              <Empty />
            ) : (
              <Tree
                checkedKeys={searchType.subItemProjectIds}
                checkable
                treeData={subItemOptions.value as never[]}
                fieldNames={{ children: "children", title: "projectName", key: "id" }}
                onCheck={changeTreeSelect as never}
              />
            )}
          </div>
        </TabPane>
        <TabPane key="AREA" tab="区域">
          <Input
            value={searchName.areaName}
            placeholder="搜索"
            onPressEnter={() => void geAreaTree(props.instrumentType)}
            onChange={(e) => {
              searchName.areaName = (e.target as HTMLInputElement).value;
            }}
            v-slots={{
              suffix: () => <SearchOutlined style={{ color: "rgba(0, 0, 0, 0.45)" }} />,
            }}
          />
          <div class="energy-mt-15 energy-tree-list">
            {!areaOptions.value.length ? (
              <Empty />
            ) : (
              <Tree
                checkedKeys={searchType.areaProjectIds}
                checkable
                treeData={areaOptions.value as never[]}
                fieldNames={{ children: "children", title: "areaName", key: "id" }}
                onCheck={changeAreaTreeSelect as never}
              />
            )}
          </div>
        </TabPane>
        <TabPane key="DEVICE" tab="设备">
          <Input
            value={searchName.deviceName}
            placeholder="搜索"
            onPressEnter={() => void getDeviceTree(props.instrumentType)}
            onChange={(e) => {
              searchName.deviceName = (e.target as HTMLInputElement).value;
            }}
            v-slots={{
              suffix: () => <SearchOutlined style={{ color: "rgba(0, 0, 0, 0.45)" }} />,
            }}
          />
          <div class="energy-mt-15 energy-tree-list">
            {!deviceOptions.value.length ? (
              <Empty />
            ) : (
              <Tree
                selectedKeys={searchType.deviceProjectIds}
                treeData={deviceOptions.value as never[]}
                fieldNames={{ children: "children", title: "value", key: "key" }}
                onSelect={changeDeviceTreeSelect as never}
              />
            )}
          </div>
        </TabPane>
      </Tabs>
    );
  },
});

export default TypeTree;
