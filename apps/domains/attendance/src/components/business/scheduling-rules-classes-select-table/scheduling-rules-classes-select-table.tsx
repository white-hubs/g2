import { Button, Checkbox, PopConfirm, PopOver, Table, dayjs } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watch } from "vue";

import { ClassesSelectModal } from "../classes-select-modal/classes-select-modal";
import { HolidayModal } from "./holiday-modal";
import type { RulesClassesList } from "@/api/scheduling-manage";
import { getHolidayApi } from "@/api/staff-clock-in";

interface Props {
  /** 排班方式 */
  schedulingWay: string;
  readonly: boolean;
  value: { legalHolidaysRest: boolean; rulesClassesList: RulesClassesList[] };
}

interface ClassesRow {
  week: number;
  weekName: string;
  id: string;
  name: string;
}

/** 排版规则-班次选择组件 */
export const SchedulingRulesClassesSelectTable = defineComponent({
  props: ["schedulingWay", "readonly", "value"],
  emits: ["update:value"],
  setup(props: Props, { emit }) {
    const showHolidayLabel = ref(false);
    const weekToChinese = (week: number): string => {
      const chineseText = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
      return chineseText[week];
    };
    const initFixedClasses = (): ClassesRow[] => [
      { week: 1, weekName: weekToChinese(0), id: "", name: "休息" },
      { week: 2, weekName: weekToChinese(1), id: "", name: "休息" },
      { week: 3, weekName: weekToChinese(2), id: "", name: "休息" },
      { week: 4, weekName: weekToChinese(3), id: "", name: "休息" },
      { week: 5, weekName: weekToChinese(4), id: "", name: "休息" },
      { week: 6, weekName: weekToChinese(5), id: "", name: "休息" },
      { week: 7, weekName: weekToChinese(6), id: "", name: "休息" },
    ];

    /** 固定班次数据 排班制 */
    const classesData = ref<ClassesRow[]>(initFixedClasses());
    /** 表格数据 */
    const classDataSource = computed(() => {
      if (isFixed.value) {
        const res: (ClassesRow & { classesList: { id: string; name: string }[] })[] = [];
        for (const item of classesData.value) {
          const findItem = res.find((e) => e.week === item.week);
          if (findItem) {
            findItem.classesList.push({ id: item.id, name: item.name });
          } else {
            res.push({
              week: item.week,
              weekName: weekToChinese(item.week - 1),
              id: item.id,
              name: item.name,
              classesList: item.id ? [{ id: item.id, name: item.name }] : [],
            });
          }
        }
        return res.toSorted((a, b) => {
          const aIndex = a.week - 1;
          const bIndex = b.week - 1;
          return aIndex - bIndex;
        });
      }
      return classesData.value;
    });
    /** 法定节假日是否排休 */
    const legalHolidaysRest = ref(props.value.legalHolidaysRest ?? false);
    const classesSelectModalRef = ref<{ openModal: (val: unknown[]) => void }>();
    const openModal = (val: unknown[]): void => {
      classesSelectModalRef.value?.openModal(val);
    };
    const emitValue = (): void => {
      if (props.readonly) {
        return;
      }
      const res = {
        rulesClassesList: classesData.value,
        legalHolidaysRest: legalHolidaysRest.value,
      };
      emit("update:value", res);
    };

    /** 当前是否为固定班制 */
    const isFixed = computed(() => props.schedulingWay === "FIXED");
    watch(
      () => isFixed.value,
      () => {
        if (props.readonly) {
          return;
        }
        if (isFixed.value) {
          classesData.value = initFixedClasses();
        } else {
          classesData.value.length = 0;
        }
        emitValue();
      },
    );

    const showHolidayModal = ref(false);

    /** 倒班制删除 */
    const delRow = (index: number): void => {
      classesData.value.splice(index, 1);
      emitValue();
    };
    const columns = computed(() => {
      /** 固定班制 */
      const columnsForGd = [
        {
          title: "时间",
          dataIndex: "weekName",
          customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        {
          title: "班次",
          dataIndex: "name",
          align: "center" as const,
          ellipsis: true,
          customRender: ({ record }: { record: ClassesRow & { classesList: { id: string; name: string }[] } }): VNode[] | string => {
            const classesList = record.classesList.map((e) => (
              <span key={`${e.id}-${record.week}`} style="display:block">
                {e.name}
              </span>
            ));
            const res = record.classesList.length > 0 ? (classesList as VNode[]) : ("休息" as string);
            return res;
          },
        },
        {
          title: "操作",
          dataIndex: "action",
          align: "center" as const,
          customRender: ({ record }: { record: { week: number; id: string; name: string } }): VNode => (
            <>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  changeClasses(record);
                }}
              >
                更改班次
              </Button>
            </>
          ),
        },
      ];
      /** 倒班制 */
      const columnsForPb = [
        {
          title: "序号",
          customRender: ({ index }: { index: number }): string => `${index + 1}`,
        },
        {
          title: "班次",
          dataIndex: "name",
          align: "center" as const,
          ellipsis: true,
          customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        {
          title: "操作",
          dataIndex: "action",
          align: "center" as const,
          customRender: ({ index }: { index: number }): VNode => (
            <>
              <PopConfirm
                okText="确定"
                cancelText="取消"
                title="确认移除该项？"
                onConfirm={() => {
                  delRow(index);
                }}
              >
                <Button type="link" size="small" danger>
                  移除
                </Button>
              </PopConfirm>
            </>
          ),
        },
      ];
      if (props.readonly) {
        columnsForGd.pop();
        columnsForPb.pop();
      }
      return isFixed.value ? columnsForGd : columnsForPb;
    });

    /** 更改班次 */
    const nowEditItem = ref();
    const changeClasses = (record: { week: number; id: string; name: string }): void => {
      nowEditItem.value = record;
      const classes = classesData.value.filter((e) => e.week === record.week && e.id).map((e) => ({ id: e.id, name: e.name }));
      openModal(classes);
    };

    /** 弹窗确认事件 */
    const classesSelectModalOnOk = (value: { id: string; name: string }[]): void => {
      if (isFixed.value) {
        const week = (nowEditItem.value as { week: number }).week;
        const dataSource = classesData.value.filter((e) => e.week !== week);
        const classes = value.map((e) => ({ week, weekName: weekToChinese(week), id: e.id, name: e.name }));
        if (classes.length === 0) {
          classes.push({ week, weekName: weekToChinese(week), id: "", name: "休息" });
        }
        classesData.value = [...dataSource, ...classes];
      } else {
        const classes = value.map((e) => ({ week: -1, weekName: "", id: e.id, name: e.name }));
        classesData.value = [...classesData.value, ...classes];
        const res: {
          week: number;
          weekName: string;
          id: string;
          name: string;
        }[] = [];
        classesData.value.forEach((e) => {
          if (res.findIndex((item) => item.id === e.id) === -1) {
            res.push({ week: -1, weekName: "", id: e.id, name: e.name });
          }
        });
        classesData.value = res;
      }
      emitValue();
    };
    watch(
      () => props.value,
      () => {
        if (props.value?.rulesClassesList === (classesData.value as unknown)) {
          return;
        }
        if (props.value) {
          legalHolidaysRest.value = props.value.legalHolidaysRest ?? false;
          const classes = props.value.rulesClassesList.map((e) => ({
            ...e,
            week: parseInt(e.week),
            weekName: weekToChinese(parseInt(e.week)),
          }));
          if (isFixed.value) {
            const dataSource = initFixedClasses().filter((e) => {
              let find = false;
              classes.forEach((item) => {
                if (item.week === e.week) {
                  find = true;
                }
              });
              return !find;
            });
            classesData.value = [...dataSource, ...classes];
          } else {
            classesData.value = [...classes];
          }
        }
      },
      { deep: true, immediate: true },
    );

    onMounted(async () => {
      const res = await getHolidayApi(dayjs().year(), dayjs().month() + 1);
      if (res.data !== null) {
        showHolidayLabel.value = true;
      }
    });

    return (): VNode => {
      const header =
        !isFixed.value && !props.readonly ? (
          <div style="margin-bottom:15px;margin-top:5px">
            <Button
              type="primary"
              shape="round"
              onClick={() => {
                openModal(classesData.value);
              }}
            >
              选择班次
            </Button>
          </div>
        ) : (
          ""
        );

      const body = (
        <>
          {isFixed.value && <span>按周选择班次，系统可根据配置自动生成排班</span>}
          <Table columns={columns.value} dataSource={classDataSource.value} pagination={false} size="small" scroll={{ y: 440 }} />
        </>
      );

      return (
        <>
          {header}
          {body}
          {!props.readonly ? <ClassesSelectModal ref={classesSelectModalRef} onUpdate:value={classesSelectModalOnOk} /> : ""}
          {isFixed.value && showHolidayLabel.value && (
            <>
              <Checkbox
                style="margin-top:5px"
                disabled={props.readonly}
                v-model:checked={legalHolidaysRest.value}
                onUpdate:checked={emitValue}
              >
                法定节假日自动排休
              </Checkbox>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  showHolidayModal.value = true;
                }}
              >
                查看法定节假日
              </Button>
            </>
          )}
          <HolidayModal
            show={showHolidayModal.value}
            onUpdate:show={(value) => {
              showHolidayModal.value = value;
            }}
          />
        </>
      );
    };
  },
});
