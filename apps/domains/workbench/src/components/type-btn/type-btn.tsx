import { defineComponent, reactive } from "vue";

import WorkbenchIcon from "../icon/workbench-icon";

import "./type-btn.less";

interface TypeBtnState {
  active: string;
}

export default defineComponent({
  name: "TypeBtn",
  emits: ["change"],
  setup(props, { emit }) {
    const state = reactive<TypeBtnState>({
      active: "electricity_meter",
    });

    const handleClick = (item: string): void => {
      state.active = item;
      emit("change", item);
    };

    const renderTypeItem = (type: string, icon: string, label: string) => (
      <div class="type-item">
        <div
          class={["item-icon", state.active === type ? "primary-color" : ""]}
          onClick={() => {
            handleClick(type);
          }}
        >
          <WorkbenchIcon iconClass={icon} />
        </div>
        <div class="item-label">{label}</div>
      </div>
    );

    return () => (
      <div class="typeBtn">
        {renderTypeItem("electricity_meter", "icon-dian", "电")}
        {renderTypeItem("water_meter", "icon-shui", "水")}
        {renderTypeItem("gas_meter", "icon-qi", "气")}
      </div>
    );
  },
});
