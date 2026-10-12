import type { Key } from "ant-design-vue/es/_util/type";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";

import { AreaTree, RouteTree } from "@/api";
import { Empty, Input, SearchOutlined, TabPane, Tabs, Tree } from "@/pc-ui-runtime";

interface TreeNode {
  id: string;
  parentId?: string | null;
  areaName?: string;
  routeName?: string;
  children?: TreeNode[];
  [key: string]: unknown;
}

/** 负荷预测左侧分区/支路树，对齐旧仓 cTree */
export const CTree = defineComponent({
  name: "CTree",
  props: {
    instrumentType: { type: String, default: "" },
    showroute: { type: Boolean, default: true },
    activeKey: { type: String, default: "route" },
    disabled: { type: Boolean, default: false },
  },
  emits: ["areaClick", "routeClick", "allList"],
  setup(props, { emit, expose }) {
    const activeKey = ref(props.activeKey);
    const routercheckedKeys = ref<Key[]>([]);
    const areacheckedKeys = ref<Key[]>([]);
    const routelist = ref<TreeNode[]>([]);
    const arealist = ref<TreeNode[]>([]);
    const searchName = reactive({ routerName: "", areaName: "" });
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    const treeData = (arr: TreeNode[], pid: string | null = null): TreeNode[] => {
      if (!arr.length) return [];
      return arr
        .filter((item) => item.parentId === pid)
        .map((item) => ({
          ...item,
          children: treeData(arr, item.id),
        }));
    };

    const getlist = (array: TreeNode[]) => {
      const idarr = array.map((res) => res.id);
      return array.filter((ele) => !idarr.includes(String(ele.parentId)) && ele.parentId != null);
    };

    const getcheckedKeys = () => (activeKey.value === "route" ? routelist.value : arealist.value);

    const getData = async (instrumentType: string) => {
      const { data: RouteList } = await RouteTree(searchName.routerName, instrumentType);
      const { data: AreaList } = await AreaTree(searchName.areaName, instrumentType);
      routelist.value = (RouteList as TreeNode[]) || [];
      arealist.value = (AreaList as TreeNode[]) || [];
      routercheckedKeys.value = routelist.value.map((res) => res.id);
      areacheckedKeys.value = arealist.value.map((res) => res.id);
      emit("allList", getcheckedKeys());
    };

    const tabchange = (data: string | number) => {
      const key = String(data);
      activeKey.value = key;
      routercheckedKeys.value = routelist.value.map((res) => res.id);
      areacheckedKeys.value = arealist.value.map((res) => res.id);
      if (key === "area") {
        emit("areaClick", areacheckedKeys.value, arealist.value);
      } else {
        emit("routeClick", routercheckedKeys.value, routelist.value);
      }
    };

    const areaselect = (_selectedKeys: Key[] | { checked: Key[]; halfChecked: Key[] }, info: { checkedNodes: TreeNode[] }) => {
      const deepArr = JSON.parse(JSON.stringify(info.checkedNodes)) as TreeNode[];
      const arr = deepArr.map((res) => ({ ...res, children: [] }));
      const ids = info.checkedNodes.map((res) => res.id);
      const map = new Map();
      const newArr = treeData(arr).filter((v) => !map.has(v.id) && map.set(v.id, 1));
      emit("areaClick", ids, [...newArr, ...getlist(info.checkedNodes)]);
    };

    const routeselect = (_selectedKeys: Key[] | { checked: Key[]; halfChecked: Key[] }, info: { checkedNodes: TreeNode[] }) => {
      const deepArr = JSON.parse(JSON.stringify(info.checkedNodes)) as TreeNode[];
      const arr = deepArr.map((res) => ({ ...res, children: [] }));
      const ids = info.checkedNodes.map((res) => res.id);
      const map = new Map();
      const newArr = treeData(arr).filter((v) => !map.has(v.id) && map.set(v.id, 1));
      emit("routeClick", ids, [...getlist(info.checkedNodes), ...newArr]);
    };

    onMounted(async () => {
      activeKey.value = props.activeKey;
      await getData(props.instrumentType);
      activeKey.value = props.activeKey;
    });

    watch(
      () => props.instrumentType,
      (n) => {
        void getData(n);
      },
    );

    expose({ activeKey, getcheckedKeys });

    return () => (
      <Tabs activeKey={activeKey.value} size="small" type="card" onChange={tabchange}>
        <TabPane key="area" tab="分区">
          <Input
            value={searchName.areaName}
            placeholder="搜索"
            onChange={(e) => {
              searchName.areaName = (e.target as HTMLInputElement).value;
              clearTimeout(searchTimer);
              searchTimer = setTimeout(() => void getData(props.instrumentType), 1000);
            }}
            v-slots={{
              suffix: () => <SearchOutlined style={{ color: "rgba(0, 0, 0, 0.45)" }} />,
            }}
          />
          <div style={{ marginTop: "15px" }}>
            {!arealist.value.length ? (
              <Empty />
            ) : (
              <Tree
                checkedKeys={areacheckedKeys.value}
                disabled={props.disabled}
                checkable
                treeData={arealist.value as never[]}
                fieldNames={{ children: "children", title: "areaName", key: "id" }}
                onCheck={areaselect as never}
                onUpdate:checkedKeys={(keys: Key[]) => {
                  areacheckedKeys.value = keys;
                }}
              />
            )}
          </div>
        </TabPane>
        {props.showroute ? (
          <TabPane key="route" tab="支路">
            <Input
              value={searchName.routerName}
              placeholder="搜索"
              onChange={(e) => {
                searchName.routerName = (e.target as HTMLInputElement).value;
                void getData(props.instrumentType);
              }}
              v-slots={{
                suffix: () => <SearchOutlined style={{ color: "rgba(0, 0, 0, 0.45)" }} />,
              }}
            />
            <div style={{ marginTop: "15px" }}>
              {!routelist.value.length ? (
                <Empty />
              ) : (
                <Tree
                  checkedKeys={routercheckedKeys.value}
                  disabled={props.disabled}
                  checkable
                  treeData={routelist.value as never[]}
                  fieldNames={{ children: "children", title: "routeName", key: "id" }}
                  onCheck={routeselect as never}
                  onUpdate:checkedKeys={(keys: Key[]) => {
                    routercheckedKeys.value = keys;
                  }}
                />
              )}
            </div>
          </TabPane>
        ) : null}
      </Tabs>
    );
  },
});
