/** @jsxImportSource vue */
import type { Dayjs } from "@g2-platform/pc-ui";
import { dayjs } from "@g2-platform/pc-ui";
import { Button, Empty, RangePicker as DateRangePicker, message } from "@g2-platform/pc-ui";
import { defineComponent, ref } from "vue";

import { exportPersonResume, getPersonResumeTimeline } from "../../../../api/safety-personnel";
import { useAuthRequest } from "../../../../hooks/use-auth-request";
import type { ResumeItemUI } from "../../../../types/ui";
import { showApiError } from "../../../../utils/api-error";
import { isDateRangeInvalid } from "../../../../utils/date-validate";
import { downloadBlob } from "../../../../utils/download-blob";
import { formatDate } from "../../../../utils/format-time";
import { mapResumeItem, timelineSummary } from "../../../../utils/mappers";
import { openResumeDetail } from "../../../../utils/resume-detail-navigation";

import styles from "./drawer.module.css";

export const TimelineTab = defineComponent({
  props: {
    personId: { type: String, required: true },
  },
  setup(props) {
    const dateRange = ref<[Dayjs, Dayjs] | null>(null);
    const days = ref<
      {
        date: string;
        summary: string;
        expanded: boolean;
        details: ResumeItemUI[];
      }[]
    >([]);
    const loading = ref(false);

    const load = async (): Promise<void> => {
      if (dateRange.value && isDateRangeInvalid(dateRange.value[0], dateRange.value[1])) {
        message.warning("开始日期不能晚于结束日期");
        return;
      }
      loading.value = true;
      try {
        const query = dateRange.value
          ? {
              startDate: dateRange.value[0].format("YYYY-MM-DD"),
              endDate: dateRange.value[1].format("YYYY-MM-DD"),
            }
          : undefined;
        const groups = await useAuthRequest(() => getPersonResumeTimeline(props.personId, query));
        days.value = groups.map((g) => ({
          date: formatDate(g.date),
          summary: timelineSummary(g),
          expanded: false,
          details: (g.records ?? []).map((r) => mapResumeItem(r)),
        }));
      } catch (e) {
        showApiError(e);
        days.value = [];
      } finally {
        loading.value = false;
      }
    };

    void load();

    const toggle = (d: { expanded: boolean }): void => {
      d.expanded = !d.expanded;
      days.value = [...days.value];
    };

    const onExport = async (): Promise<void> => {
      if (dateRange.value && isDateRangeInvalid(dateRange.value[0], dateRange.value[1])) {
        message.warning("开始日期不能晚于结束日期");
        return;
      }
      try {
        const query = dateRange.value
          ? {
              startDate: dateRange.value[0].format("YYYY-MM-DD"),
              endDate: dateRange.value[1].format("YYYY-MM-DD"),
            }
          : undefined;
        const blob = await useAuthRequest(() => exportPersonResume(props.personId, query));
        downloadBlob(blob, "履职记录.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e, "导出失败");
      }
    };

    return () => (
      <div class={styles.timelineTab}>
        <div class={styles.timelineFilter}>
          <div class={styles.dateRangeField}>
            <DateRangePicker
              value={dateRange.value ?? undefined}
              onUpdate:value={(v) => {
                dateRange.value = v as [Dayjs, Dayjs] | null;
              }}
            />
          </div>
          <Button
            type="primary"
            loading={loading.value}
            onClick={() => {
              void load();
            }}
          >
            查询
          </Button>
          <Button
            type="primary"
            onClick={() => {
              void onExport();
            }}
          >
            导出履职记录
          </Button>
        </div>
        {days.value.length === 0 && !loading.value ? (
          <Empty description="暂无履职记录" />
        ) : (
          days.value.map((d) => (
            <div
              class={styles.timeCard}
              key={d.date}
              onClick={() => {
                toggle(d);
              }}
            >
              <div class={styles.timeCardHead}>
                <strong>{d.date}</strong>
                <span>{d.summary}</span>
              </div>
              {d.expanded && d.details.length > 0 && (
                <ul class={styles.detailList}>
                  {d.details.map((item) => (
                    <li key={item.id || `${item.taskTime}-${item.title}`}>
                      {item.taskTime} · {item.title}
                      <Button
                        type="link"
                        size="small"
                        onClick={(e: Event) => {
                          e.stopPropagation();
                          openResumeDetail(item);
                        }}
                      >
                        查看详情
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
        {!dateRange.value && <p class={styles.hint}>默认展示最近 5 天（{dayjs().subtract(4, "day").format("YYYY-MM-DD")} 起）</p>}
      </div>
    );
  },
});
