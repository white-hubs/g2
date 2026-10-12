import type { PropType } from "vue";
import { computed, defineComponent } from "vue";

import "./roll-table.less";

enum Position {
  left = 0,
  center = 1,
  right = 2,
}

export interface RollTableColumn {
  title: string;
  dataIndex: string;
  width?: string | number;
  align?: Position | "left" | "center" | "right";
  slots?: { customRender?: string };
  customRender?: (value: unknown, record: Record<string, unknown>, index: number) => unknown;
}

export const RollTable = defineComponent({
  name: "RollTable",
  props: {
    column: { type: Array as PropType<RollTableColumn[]>, required: true },
    data: { type: Array as PropType<Record<string, unknown>[]>, required: true },
  },
  emits: ["clickRow"],
  setup(props, { emit, slots }) {
    const styleItem = computed(() => (item: RollTableColumn): Record<string, string> => {
      const style: Record<string, string> = {};
      if (item.width) {
        style.width = `${item.width}px`;
      } else {
        style.width = `calc((100 / ${props.column?.length}) * 1%)`;
      }
      if (item.align) {
        style.textAlign = String(item.align);
      }
      return style;
    });

    const clickTableRow = (tr: Record<string, unknown>) => {
      emit("clickRow", tr);
    };

    return () => (
      <div class="roll-table flex-column">
        <div class="header flex-between">
          {props.column.map((td, index) => (
            <div class="table-th" style={styleItem.value(td)} key={index}>
              {td.title}
            </div>
          ))}
        </div>
        <div class="scroll_warp">
          {props.data.map((tr, index) => (
            <div class="table-tr flex-between" key={String(tr?.key ?? index)} onClick={() => clickTableRow(tr)}>
              {props.column.map((td, j) => (
                <div class="table-td" key={`${index}-${j}`} style={styleItem.value(td)}>
                  {td.slots ? (
                    <div>
                      {td.customRender ? (
                        <span>{td.customRender(tr[td.dataIndex], tr, index) as never}</span>
                      ) : (
                        slots[td.slots.customRender ?? ""]?.({ record: tr })
                      )}
                    </div>
                  ) : (
                    <span>{tr[td.dataIndex] as never}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  },
});
