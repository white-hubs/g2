import type { Key } from "ant-design-vue/es/vc-tree/interface";
import { defineComponent, reactive, ref, toRefs, watch, type PropType } from "vue";

import { getAreaTree } from "@/api";
import { Empty, Input, Spin, TabPane, Tabs, Tree } from "@/pc-ui-runtime";
import type { TabState, TreeState } from "@/types/fee";

export const TreeSearch = defineComponent({
  name: "TreeSearch",
  props: {
    tabs: {
      type: Object as PropType<TabState>,
      default: () => ({
        activeKey: "electricity_meter",
        list: [
          { key: "electricity_meter", name: "电" },
          { key: "water_meter", name: "水" },
          { key: "gas_meter", name: "燃气" },
          { key: "energy_meter", name: "能量" },
        ],
      }),
    },
  },
  emits: ["update:value", "tabChange", "treeExpand", "checkClick"],
  setup(props, { emit, expose }) {
    const state = reactive({
      activeTab: props.tabs.activeKey,
      areaName: "",
      treeLoading: false,
      treeData: [] as TreeState[],
      fieldNames: { key: "id", label: "areaName", children: "children" },
    });
    const selectedKeys = ref<(string | number)[]>([]);
    const expandedKeys = ref<(string | number)[]>([]);
    const checkedKeys = ref<{ checked: (string | number)[]; halfChecked: (string | number)[] } | (string | number)[]>({
      checked: [],
      halfChecked: [],
    });
    const autoExpandParent = ref(true);
    const { treeLoading, treeData, fieldNames, areaName, activeTab } = toRefs(state);
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    const treeFindPath = (
      tree: TreeState[],
      func: (data: TreeState) => boolean,
      path: Array<string | number> = [],
    ): Array<string | number> => {
      if (!tree) return [];
      for (const data of tree) {
        path.push(data.id || "");
        if (func(data)) return path;
        if (data.children) {
          const findChildren = treeFindPath(data.children, func, path);
          if (findChildren.length) return findChildren;
        }
        path.pop();
      }
      return [];
    };

    const treeDatainfo = (arr: Array<Record<string, unknown>>, pid: unknown = null): Array<Record<string, unknown>> => {
      if (!arr.length) return [];
      const newArr: Array<Record<string, unknown>> = [];
      arr.forEach((item) => {
        if (item.parentId === pid) {
          newArr.push({
            ...item,
            children: treeDatainfo(arr, item.id),
          });
        }
      });
      return newArr;
    };

    const getlist = (array: Array<Record<string, unknown>>) => {
      const data: Array<Record<string, unknown>> = [];
      const idarr = array.map((res) => res.id);
      array.forEach((ele) => {
        if (!idarr.includes(ele.parentId) && ele.parentId != null) data.push(ele);
      });
      return data;
    };

    const getTreeData = async () => {
      state.treeLoading = true;
      try {
        const result = (await getAreaTree({ instrumentType: state.activeTab, areaName: state.areaName })) as {
          data: TreeState[];
        };
        state.treeData = result.data || [];
        autoExpandParent.value = true;
        checkedKeys.value = (result.data || []).map((res) => res.id);
        emit("checkClick", result.data);
      } finally {
        state.treeLoading = false;
      }
    };

    const tabChange = (key: Key) => {
      state.activeTab = String(key);
      checkedKeys.value = { checked: [], halfChecked: [] };
      void getTreeData();
      emit("tabChange", key);
    };

    const onExpand = (keys: Key[]) => {
      expandedKeys.value = keys;
      autoExpandParent.value = false;
      emit("treeExpand", keys);
    };

    const searchHandle = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        void getTreeData();
        const ids = treeFindPath(state.treeData, (data) => data.areaName.indexOf(areaName.value) > -1);
        expandedKeys.value = ids;
        autoExpandParent.value = true;
      }, 1000);
    };

    const check = (_selectedKeys: unknown, info: { checkedNodes: Array<Record<string, unknown>> }) => {
      const deepArr = JSON.parse(JSON.stringify(info.checkedNodes)) as Array<Record<string, unknown>>;
      const arr = deepArr.map((res) => {
        res.children = [];
        return res;
      });
      const newArr = treeDatainfo(arr);
      emit("checkClick", [...getlist(info.checkedNodes), ...newArr]);
    };

    watch(
      () => checkedKeys.value,
      (value) => emit("update:value", value),
    );

    void getTreeData();
    expose({ tabChange, onExpand });

    return () => (
      <Spin spinning={treeLoading.value}>
        <Tabs v-model:activeKey={activeTab.value} size="small" type="card" onChange={tabChange}>
          {props.tabs.list.map((item) => (
            <TabPane key={String(item.key)} tab={item.name}>
              <Input v-model:value={areaName.value} placeholder="请输入" style="margin-bottom: 10px;" allowClear onChange={searchHandle} />
              {!treeData.value.length ? (
                <Empty />
              ) : (
                <Tree
                  v-model:expandedKeys={expandedKeys.value}
                  v-model:selectedKeys={selectedKeys.value}
                  v-model:checkedKeys={checkedKeys.value}
                  checkable
                  selectable={false}
                  treeData={treeData.value as never}
                  fieldNames={fieldNames.value}
                  autoExpandParent={autoExpandParent.value}
                  onExpand={onExpand}
                  onCheck={check}
                  v-slots={{
                    title: ({ areaName: title }: { areaName: string }) => {
                      if (title.indexOf(areaName.value) > -1) {
                        return (
                          <span>
                            {title.substring(0, title.indexOf(areaName.value))}
                            <span style="color: #f50">{areaName.value}</span>
                            {title.substring(title.indexOf(areaName.value) + areaName.value.length)}
                          </span>
                        );
                      }
                      return <span>{title}</span>;
                    },
                  }}
                />
              )}
            </TabPane>
          ))}
        </Tabs>
      </Spin>
    );
  },
});
