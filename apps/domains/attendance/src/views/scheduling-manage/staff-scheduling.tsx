import { dayjs } from "@g2-platform/pc-ui";
import {
  AntModal,
  Button,
  Page,
  type PcTableColumn,
  PopOver,
  Tag,
  message,
  usePcForm,
  usePcQueryState,
  usePcTable,
} from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { staffSchedulingDownLoad, staffSchedulingExport, staffSchedulingPage, staffSchedulingRulehand } from "@/api/scheduling-manage";
import { getHolidayApi } from "@/api/staff-clock-in";
import { AttendanceGroupSelect } from "@/components/business/attendance-group-select/attendance-group-select";
import { ClassesSelectModal } from "@/components/business/classes-select-modal/classes-select-modal";
import { ImportSchedulingTemplate } from "@/components/business/import-scheduling-template/import-scheduling-template";
import { getCalendarData } from "@/hook/calendar";
import { useCtrlEvent } from "@/hook/use-ctrl-event";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
import { type ClassesType, classesColor } from "@/types/classes";

import style from "@/assets/style.module.less";

interface TableRow {
  staffId: string;
  staffName: string;
  schedulingRuleClassesList: { id: string; name: string; nickName: string; week: string; classesType: ClassesType }[];
  schedulingHandList: {
    classesId: string;
    classesName: string;
    classesNickName: string;
    schedulingDate: number;
    schedulingMonth: string;
    classesType: ClassesType;
  }[];
  schedulingWays: "FIXED" | "SHIFTS";
  legalHolidaysRest: boolean | null;
  groupId: string;
  ruleId: string;
}

interface SchedulingAction {
  month: string; // 2023-09
  hsStaffList: {
    staffId: string;
    staffName: string;
    groupId: string; // 考勤组ID
    ruleId: string; // 排班规则
    hsDateList: { date: string; classIdList?: string[] | undefined }[];
  }[];
}

interface Classes {
  id: string;
  name: string;
  nickName: string;
  classesType: ClassesType;
  startWorkTime: string;
  endWorkTime: string;
}

interface CellDate {
  date: string;
  weekday: number;
  weekdayChinese: string;
}

/** 员工排班 */
export const StaffScheduling = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const formState = reactive<{ keyword: string; yearMonth: string; groupId?: string }>({
      keyword: "",
      yearMonth: dayjs().format("YYYY-MM"),
      groupId: undefined,
    });
    const queryDefaults: Record<string, unknown> = {
      keyword: "",
      yearMonth: dayjs().format("YYYY-MM"),
      groupId: undefined,
      pageNumber: 1,
      pageSize: 10,
    };
    const cachedQuery = usePcQueryState({ initialState: queryDefaults, storage: "url" });
    const readQuery = () => ({
      keyword: formState.keyword,
      yearMonth: formState.yearMonth,
      groupId: formState.groupId,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const restoreQuery = (next: Record<string, unknown>) => {
      formState.keyword = (next.keyword as string) ?? "";
      formState.yearMonth = (next.yearMonth as string) ?? dayjs().format("YYYY-MM");
      formState.groupId = next.groupId as string | undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const permission = appFunctionCodes.attendanceStaffScheduling;
    const exportLoading = ref(false);
    const downLoading = ref(false);
    const holidayData = ref<{ date: string; isHoliday: boolean; status: string | undefined }[]>([]);
    /** 班次集合 */
    const classes = ref<Classes[]>([]);
    const classesSelectModalRef = ref<{ openModal: () => void }>();
    useCtrlEvent({
      onKeyDown: (): void => {
        changePathStatus(true);
      },
      onKeyUp: (): void => {
        openPatch.value = false;
      },
    });

    /** 导出 */
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await staffSchedulingExport({ ...formState })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${KEYWORD_ALIAS.staff}排班.xlsx`);
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
          })
          .catch((res) => {
            const fileReader = new FileReader();
            fileReader.readAsText(res.response.data, "utf8");
            fileReader.onload = function (): void {
              const result: string = fileReader.result as string;
              const msg = result ? JSON.parse(result).message : "未查询到数据，无法导出";
              message.warn(msg);
            };
          });
      } catch (error) {
        logger.error(error);
      } finally {
        exportLoading.value = false;
      }
    };

    /** 下载 */
    const download = async (): Promise<void> => {
      if (downLoading.value) {
        return;
      }
      try {
        downLoading.value = true;
        await staffSchedulingDownLoad({ ...formState })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${KEYWORD_ALIAS.staff}排班.xlsx`);
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
          })
          .catch((res) => {
            const fileReader = new FileReader();
            fileReader.readAsText(res.response.data, "utf8");
            fileReader.onload = function (): void {
              const result: string = fileReader.result as string;
              const msg = result ? JSON.parse(result).message : "未查询到数据，无法导出";
              message.warn(msg);
            };
          });
      } catch (error) {
        logger.error(error);
      } finally {
        downLoading.value = false;
      }
    };

    /** 批量操作状态 */
    const openPatch = ref(false);
    const changePathStatus = (patchStatus?: boolean): void => {
      openPatch.value = patchStatus ?? !openPatch.value;
      if (!openPatch.value) {
        selectCells.value.length = 0;
      }
    };
    /** 选中单元格集合 */
    const selectCells = ref<
      { staffId: string; staffName: string; date: string; weekday: number; weekdayChinese: string; groupId: string; ruleId: string }[]
    >([]);
    /** 选中单元格事件 */
    const clickCell = (record: TableRow, cellDate: CellDate): void => {
      const item = {
        staffId: record.staffId,
        staffName: record.staffName,
        ...cellDate,
        groupId: record.groupId,
        ruleId: record.ruleId,
      };
      if (!openPatch.value) {
        selectCells.value = [item];
        return;
      }
      const findIndex = selectCells.value.findIndex((e) => e.staffId === record.staffId && e.date === cellDate.date);
      if (findIndex !== -1) {
        selectCells.value.splice(findIndex, 1);
      } else {
        selectCells.value.push(item);
      }
    };
    const updating = ref(false);
    const handleUpdate = async (action: "empty" | "remove" | "insert", selectedClass?: { id: string; name: string }): Promise<void> => {
      const params: SchedulingAction = {
        month: formState.yearMonth,
        hsStaffList: [],
      };
      selectCells.value.forEach((cell) => {
        const findStaff = params.hsStaffList.find((e) => e.staffId === cell.staffId);
        if (!findStaff) {
          params.hsStaffList.push({
            staffId: cell.staffId,
            staffName: cell.staffName,
            groupId: cell.groupId,
            ruleId: cell.ruleId,
            hsDateList: [],
          });
        }
      });

      params.hsStaffList.forEach((staff) => {
        selectCells.value.forEach((cell) => {
          const record = dataSource.value.find((e) => e.staffId === staff.staffId);
          // 当前选择的班次
          const handClassIdList = selectedClass?.id && action === "insert" ? [selectedClass.id] : [];
          // 历史手动排班数据
          record?.schedulingHandList.forEach((e) => {
            let condition = dayjs(e.schedulingDate).isSame(dayjs(cell.date)) && Boolean(e.classesId);
            if (action === "remove") {
              condition = condition && selectedClass?.id !== e.classesId;
            }
            if (condition) {
              handClassIdList.push(e.classesId);
            }
          });

          // 删除特殊处理 如果选择删除规则生成的排班 则会进入这个校验
          if (record?.schedulingHandList.length === 0 && action === "remove") {
            record.schedulingRuleClassesList.forEach((e) => {
              const condition = selectedClass?.id !== e.id && cell.weekday === parseInt(e.week);
              if (condition) {
                handClassIdList.push(e.id);
              }
            });
          }

          // 数据插入
          if (cell.staffId === staff.staffId) {
            staff.hsDateList.push({
              date: cell.date,
              classIdList: action === "empty" ? undefined : handClassIdList,
            });
          }
        });
      });

      if (updating.value) {
        return;
      }
      updating.value = true;
      try {
        await staffSchedulingRulehand(params);
      } catch (error) {
        logger.error(error);
      } finally {
        await getTableData();
        updating.value = false;
      }
    };
    /** 选中班次 tag */
    const clickClassesTag = async (tag: { id: string; name: string }): Promise<void> => {
      if (selectCells.value.length === 0) {
        message.warn("请先选中单元格");
        return;
      }
      handleUpdate("insert", tag);
    };
    /** 清空单元格 */
    const clearCell = async (): Promise<void> => {
      if (selectCells.value.length > 0) {
        AntModal.confirm({
          title: "清空前确认",
          content: "是否清空选中单元格的所有班次",
          okText: "确认",
          cancelText: "取消",
          centered: true,
          onOk: async () => handleUpdate("empty"),
        });
      } else {
        message.warn("请先选中单元格");
      }
    };
    /** 单元格标签删除 */
    const cellTagRemove = async (
      record: TableRow,
      dateData: CellDate,
      removeClass: { id: string; name: string; rule?: boolean },
    ): Promise<void> => {
      openPatch.value = false; // 清除多选状态
      clickCell(record, dateData);
      const content = removeClass.rule ? "是否删除选中单元格的中规则生成的班次信息" : `是否删除选中单元格的${removeClass.name}`;
      AntModal.confirm({
        title: "删除前确认",
        content,
        okText: "确认",
        cancelText: "取消",
        centered: true,
        onOk: async () => handleUpdate("remove", removeClass),
      });
    };
    /** 单元格回显内容 */
    const cellContent = computed(() => (record: TableRow, dateData: CellDate): VNode => {
      // 规则排班
      const defaultClass: JSX.Element[] = [];
      if (record.schedulingWays === "FIXED" && !dayjs(dateData.date).startOf("date").isBefore(dayjs().startOf("date"))) {
        /** 当前匹配的规则List */
        const rulesList = record.schedulingRuleClassesList.filter(
          (item) => item.week === (dateData.weekday.toString() == "0" ? "7" : dateData.weekday.toString()),
        );
        /** 法定工作日 */
        const isSpecialWorkDay = holidayData.value.find((e) => e.date === dateData.date)?.status === "2" || false;
        /** 法定节假日 */
        const isHoliday = holidayData.value.find((e) => e.date === dateData.date)?.status === "1" || false;

        if (isSpecialWorkDay && rulesList.length === 0 && record.schedulingRuleClassesList.length && record.legalHolidaysRest) {
          const firstRow = record.schedulingRuleClassesList[0];
          record.schedulingRuleClassesList
            .filter((e) => e.week === firstRow.week)
            .forEach((ele) => {
              rulesList.push({ ...ele, week: dateData.weekday.toString() });
            });
        }
        if (isHoliday && record.legalHolidaysRest) {
          rulesList.length = 0;
        }

        rulesList.forEach((item) => {
          const color = classesColor.find((e) => e.value === item.classesType)?.color ?? "";
          defaultClass.push(
            <Tag
              color={color}
              class={style["cell-classes-tag"]}
              closable
              onClose={async () => cellTagRemove(record, dateData, { ...item, rule: true })}
            >
              {item?.nickName}
            </Tag>,
          );
        });
      }

      // 手动排班
      const handClass: JSX.Element[] = [];
      record.schedulingHandList.forEach((item) => {
        if (dayjs(item.schedulingDate).format("YYYY-MM-DD") === dateData.date) {
          const color = classesColor.find((e) => e.value === item.classesType)?.color ?? "";
          defaultClass.length = 0;
          if (item.classesId) {
            handClass.push(
              <Tag
                color={color}
                class={style["cell-classes-tag"]}
                closable
                onClose={async () => cellTagRemove(record, dateData, { id: item.classesId, name: item.classesName })}
              >
                {item?.classesNickName ?? item.classesName}
              </Tag>,
            );
          }
        }
      });

      const res = <>{...defaultClass}
        {...handClass}</>;
      return defaultClass.length || handClass.length ? (
        res
      ) : (
        <>
          <Tag color="green" class={style["cell-classes-tag"]}>
            休息
          </Tag>
        </>
      );
    });

    const getTableColumns = (): PcTableColumn[] => {
      const calendar = getCalendarData(
        dayjs(formState.yearMonth).startOf("month").format("YYYY-MM-DD"),
        dayjs(formState.yearMonth).endOf("month").format("YYYY-MM-DD"),
      );
      const calendarColumns = calendar.map((e) => ({
        title: e.date,
        dataIndex: e.date,
        ellipsis: true,
        calendar: true,
        date: dayjs(e.date).format("MM-DD"),
        week: e.weekdayChinese,
        width: 120,
        customRender: ({ record }: { record: TableRow }): VNode => {
          const cssClass: Record<string, boolean> = {};
          cssClass[style["scheduling-item"]] = true;
          cssClass[style["scheduling-item-active"]] = !!selectCells.value.find(
            (item) => item.staffId === record.staffId && item.date === e.date,
          );
          return (
            <div
              class={cssClass}
              onClick={() => {
                clickCell(record, e);
              }}
            >
              {cellContent.value(record, e)}
            </div>
          );
        },
      }));
      return [
        {
          title: `${KEYWORD_ALIAS.staff}姓名`,
          dataIndex: "staffName",
          ellipsis: true,
          width: 120,
          align: "center" as const,
          fixed: "left",
          customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        ...calendarColumns,
      ];
    };
    const tableColumns = ref<PcTableColumn[]>([]);

    const loading = ref(false);
    const dataSource = ref<TableRow[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });

    let queryVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++queryVersion;
      const query = { ...formState, pageNumber: pagination.value.pageNumber, pageSize: pagination.value.pageSize };
      try {
        tableColumns.value = getTableColumns();
        loading.value = true;
        selectCells.value.length = 0;
        const year = dayjs(query.yearMonth).year();
        const month = dayjs(query.yearMonth).month() + 1;
        const holidayRes = await getHolidayApi(year, month);
        if (version !== queryVersion) {
          return;
        }
        if (holidayRes.data === null) {
          const calendar = getCalendarData(
            dayjs(query.yearMonth).startOf("month").format("YYYY-MM-DD"),
            dayjs(query.yearMonth).endOf("month").format("YYYY-MM-DD"),
          );
          holidayData.value = calendar.map((e) => ({
            month: dayjs(e.date).format("MM"),
            date: e.date,
            isHoliday: [0, 6].includes(e.weekday),
            status: [0, 6].includes(e.weekday) ? "1" : "2",
          }));
        } else {
          holidayData.value = holidayRes.data[0].almanac
            .map((e) => {
              const item = e as unknown as { year: string; month: string; day: string; status?: string };
              return {
                month: e.month,
                date: dayjs()
                  .year(parseInt(item.year))
                  .month(parseInt(item.month) - 1)
                  .date(parseInt(item.day))
                  .format("YYYY-MM-DD"),
                isHoliday: item.status === "1" || item.status === "2",
                status: item.status,
              };
            })
            .filter((e) => parseInt(e.month) - 1 === dayjs(query.yearMonth).month());
        }

        const res = await staffSchedulingPage({
          ...query,
          keyword: query.keyword || undefined,
        });
        if (version !== queryVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records as TableRow[];
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
      } finally {
        if (version === queryVersion) {
          loading.value = false;
        }
      }
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        cachedQuery.update(readQuery());
      });
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      cachedQuery.update(readQuery());
    };
    const reset = async (): Promise<void> => {
      restoreQuery(queryDefaults);
      cachedQuery.update(queryDefaults);
      formApi.setFormValues(formState);
      await getTableData();
    };

    onMounted(async () => {
      restoreQuery(cachedQuery.getSnapshot());
      formApi.setFormValues(formState);
      await getTableData();
    });

    const [PcForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      syncStateRef: formState,
      schema: [
        {
          fieldName: "groupId",
          label: "考勤组",
          component: AttendanceGroupSelect,
          componentProps: { placeholder: "请选择考勤组", style: { width: "223px" } },
        },
        {
          fieldName: "yearMonth",
          label: "选择月份",
          component: "DatePicker",
          defaultValue: dayjs().format("YYYY-MM"),
          componentProps: { picker: "month", valueFormat: "YYYY-MM", allowClear: false, placeholder: "请选择年月" },
        },
        {
          fieldName: "keyword",
          label: KEYWORD_ALIAS.staff,
          component: "Input",
          defaultValue: "",
          componentProps: { placeholder: `请输入${KEYWORD_ALIAS.staff}姓名` },
        },
      ],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const [PcTable, tableApi] = usePcTable({
      columns: tableColumns.value,
      rowKey: "staffId",
      tableCode: "attendance-staff-scheduling",
      autoFetch: false,
      headerCell: ({ column, title }) => {
        const field = String(column.dataIndex ?? "").replace(/^calendar-/, "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(field)) {
          return title;
        }
        const date = dayjs(field);
        const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.day()];
        return (
          <div class={style["calendar-tabel-header"]}>
            <span>{date.format("MM-DD")}</span>
            <span>{week}</span>
          </div>
        );
      },
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value || updating.value;
    });

    const layoutSlots = {
      "layout-header": (): VNode => (
        <div>
          {hasPermission(permission.download) && (
            <Button type="primary" style="margin-left:10px" onClick={download} loading={downLoading.value}>
              下载排班模板
            </Button>
          )}
          {hasPermission(permission.import) && <ImportSchedulingTemplate onSuccess={reset} />}
          {hasPermission(permission.export) && (
            <Button type="primary" style="margin-left:10px" onClick={exportExcel} loading={exportLoading.value}>
              导出排班表
            </Button>
          )}
        </div>
      ),
      "layout-content": (): VNode => (
        <>
          <PcForm />
          <div class={style["patch-action"]}>
            <div class={style.btns}>
              <Button type="primary" disabled={updating.value} onClick={() => changePathStatus()}>
                {openPatch.value ? "单个" : "批量"}排班
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={clearCell}>
                清空
              </Button>
            </div>
            <div class={style.classes}>
              <span style="margin-top:2px;white-space: nowrap;">可选班次:</span>
              <div class={style["classes-items"]}>
                {classes.value.map((e) => {
                  const color = classesColor.find((ele) => ele.value === e.classesType)?.color ?? "";
                  return (
                    <Tag
                      color={color}
                      class={style["clasess-item-tag"]}
                      key={e.id}
                      onClick={() => {
                        clickClassesTag(e);
                      }}
                    >
                      {e.nickName}：{e.name}{" "}
                      <span style="margin-left:5px">
                        {e.startWorkTime}-{e.endWorkTime}
                      </span>
                    </Tag>
                  );
                })}
                <Button style={{ marginLeft: "10px" }} size="small" type="primary" onClick={() => classesSelectModalRef.value?.openModal()}>
                  选择班次
                </Button>
                <ClassesSelectModal
                  ref={classesSelectModalRef}
                  value={classes.value}
                  v-model:value={classes.value}
                  groupId={formState.groupId}
                />
              </div>
            </div>
          </div>
          <PcTable class="scheduling-table" />
        </>
      ),
      "footer-page": (): VNode => (
        <Page
          cachePageQuery={false}
          current={pagination.value.pageNumber}
          pageSize={pagination.value.pageSize}
          total={pagination.value.total}
          onPageChange={pageChange}
        />
      ),
    };
    return (): VNode => <Layout title={pageTitle ?? `${KEYWORD_ALIAS.staff}排班`} v-slots={layoutSlots} class={style["clock-in-table"]} />;
  },
});
