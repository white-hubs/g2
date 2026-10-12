// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { LeftOutlined, RightOutlined } from "@ant-design/icons-vue";
import { computed, defineComponent, ref, watch } from "vue";

import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";
import { Input, SearchOutlined, Spin } from "@/pc-ui-runtime";

import styles from "./index.module.less";

export const EventListPanel = defineComponent({
  name: "EventListPanel",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    const listScrollRef = ref<HTMLDivElement | null>(null);

    const events = computed(() => props.state.events.value);
    const eventsLoading = computed(() => props.state.eventsLoading.value);
    const processingEventCount = computed(() => props.state.processingEventCount.value);
    const activeEventId = computed(() => props.state.activeEventId.value);
    const eventPageNumber = computed(() => props.state.eventPageNumber.value);
    const eventPages = computed(() => props.state.eventPages.value);
    const eventTotal = computed(() => props.state.eventTotal.value);
    const showPagination = computed(() => eventTotal.value > 0);
    const pageInputValue = ref(String(eventPageNumber.value));

    watch(eventPageNumber, (page) => {
      pageInputValue.value = String(page);
    });

    const handlePageChange = (page: number): void => {
      if (page < 1 || (eventPages.value > 0 && page > eventPages.value)) {
        return;
      }
      props.state.changeAlarmEventPage(page);
      listScrollRef.value?.scrollTo({ top: 0, behavior: "smooth" });
    };

    const commitPageInput = (): void => {
      const page = Number.parseInt(pageInputValue.value, 10);
      if (!Number.isFinite(page)) {
        pageInputValue.value = String(eventPageNumber.value);
        return;
      }
      handlePageChange(page);
    };

    return (): JSX.Element => (
      <div class={styles.panel}>
        <div class={styles.header}>
          <span class={styles.title}>应急事件</span>
          {processingEventCount.value > 0 ? <span class={styles.count}>{processingEventCount.value}个</span> : null}
        </div>
        <div class={styles.search}>
          <Input
            size="small"
            allowClear
            placeholder="请输入搜索"
            value={props.state.eventKeyword.value}
            suffix={<SearchOutlined style={{ cursor: "pointer", color: "#9ca3af" }} onClick={() => props.state.searchAlarmEvents()} />}
            onPressEnter={() => props.state.searchAlarmEvents()}
            onUpdate:value={(v: string) => {
              const next = v ?? "";
              const prev = props.state.eventKeyword.value;
              props.state.eventKeyword.value = next;
              if (prev.trim() && !next.trim()) {
                props.state.searchAlarmEvents();
              }
            }}
          />
        </div>
        <div class={styles.filters}>
          {props.state.alarmEventStatusFilterOptions.map((option) => {
            const active = props.state.eventStatusFilters.value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                class={[styles.filterBtn, active ? styles.filterBtnActive : ""].filter(Boolean).join(" ")}
                onClick={() => props.state.toggleEventStatusFilter(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div class={styles.listWrap}>
          {eventsLoading.value ? (
            <div class={styles.listLoading}>
              <Spin size="small" />
            </div>
          ) : null}
          <div ref={listScrollRef} class={styles.list}>
            {events.value.length === 0 && !eventsLoading.value ? <div class={styles.listState}>暂无报警记录</div> : null}
            {events.value.map((ev) => (
              <div
                key={ev.id}
                class={[styles.card, ev.id === activeEventId.value ? styles.cardActive : ""].filter(Boolean).join(" ")}
                onClick={() => props.state.selectEvent(ev.id)}
              >
                <div class={[styles.bar, styles[`bar--${ev.levelKey}`]].join(" ")} />
                <div class={styles.cardBody}>
                  <div class={styles.cardTop}>
                    <span>{ev.icon}</span>
                    <span class={styles.type}>{ev.type}</span>
                  </div>
                  <div class={styles.loc}>📍 {ev.location}</div>
                  <div class={styles.meta}>
                    <span class={[styles.level, styles[`level--${ev.levelKey}`]].join(" ")}>{ev.level}</span>
                    <span class={styles.time}>{ev.time.length > 5 ? ev.time.slice(5) : ev.time}</span>
                    <span class={[styles.status, styles[`status--${ev.status}`]].join(" ")}>● {ev.statusLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showPagination.value ? (
          <div class={styles.footer}>
            <button
              type="button"
              class={styles.pageBtn}
              disabled={eventPageNumber.value <= 1 || eventsLoading.value}
              onClick={() => handlePageChange(eventPageNumber.value - 1)}
            >
              <LeftOutlined />
            </button>
            <div class={styles.pageInfo}>
              <input
                type="text"
                inputMode="numeric"
                class={styles.pageInput}
                value={pageInputValue.value}
                disabled={eventsLoading.value}
                onKeydown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    commitPageInput();
                  }
                }}
                onBlur={commitPageInput}
                onInput={(e: Event) => {
                  const target = e.target as HTMLInputElement | null;
                  pageInputValue.value = target?.value ?? "";
                }}
              />
              <span class={styles.pageSep}>/</span>
              <span class={styles.pageTotal}>{eventPages.value}</span>
            </div>
            <button
              type="button"
              class={styles.pageBtn}
              disabled={eventsLoading.value || eventPageNumber.value >= eventPages.value}
              onClick={() => handlePageChange(eventPageNumber.value + 1)}
            >
              <RightOutlined />
            </button>
          </div>
        ) : null}
      </div>
    );
  },
});
