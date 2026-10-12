import type { MonitoringFacility } from "@g2-contract/electrical-safety";
import { Input, PcIcon, Spin, Tooltip } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

import { ScadaPlaceholder } from "@/views/shared/scada-placeholder";

export const FacilitySidebar = defineComponent({
  name: "FacilitySidebar",
  props: {
    facilities: { type: Array as PropType<MonitoringFacility[]>, required: true },
    activeFacilityId: { type: String, default: "" },
    keyword: { type: String, default: "" },
    loading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: false },
  },
  emits: {
    "update:keyword": (_value: string): boolean => true,
    search: (): boolean => true,
    select: (_facilityId: string): boolean => true,
    loadMore: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const listRef = shallowRef<HTMLDivElement | null>(null);
    const sentinelRef = shallowRef<HTMLDivElement | null>(null);
    let observer: IntersectionObserver | null = null;

    const bindObserver = (): void => {
      observer?.disconnect();
      if (!listRef.value || !sentinelRef.value || !props.hasMore) {
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting && !props.loading && props.hasMore) {
            emit("loadMore");
          }
        },
        { root: listRef.value, rootMargin: "0px 0px 80px", threshold: 0 },
      );
      observer.observe(sentinelRef.value);
    };

    onMounted(bindObserver);
    onBeforeUnmount(() => observer?.disconnect());
    watch(() => [listRef.value, sentinelRef.value, props.hasMore, props.loading, props.facilities.length] as const, bindObserver, {
      flush: "post",
    });

    return (): JSX.Element => (
      <aside class="facility-panel">
        <div class="facility-panel-title">设施列表</div>
        <div class="facility-panel-search">
          <Input
            value={props.keyword}
            placeholder="搜索设施"
            showCount
            maxlength={20}
            onPressEnter={() => emit("search")}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return emit("update:keyword", value);
            }}
          />
        </div>
        <div ref={listRef} class="facility-list">
          {props.facilities.map((item) => (
            <button
              type="button"
              class={["facility-item", String(item.id) === props.activeFacilityId && "is-active"]}
              key={String(item.id)}
              onClick={() => emit("select", String(item.id))}
            >
              <span class="facility-item-copy">
                <strong>{item.facilityName}</strong>
                <small>{item.electricalDeviceCount}台设备</small>
              </span>
              {item.hasActiveAlarm && (
                <Tooltip title="有告警" class="facility-alarm-icon is-flashing">
                  <PcIcon iconClass="icon-gaojing" size={20} />
                </Tooltip>
              )}
            </button>
          ))}
          {props.facilities.length === 0 && !props.loading && (
            <div class="facility-empty">
              <ScadaPlaceholder description="暂无设施" copy="没有找到可检测的设施" />
            </div>
          )}
          {props.loading && (
            <div class="facility-loading">
              <Spin spinning />
            </div>
          )}
          <div ref={sentinelRef} class="facility-load-sentinel" aria-hidden="true" />
          {!props.hasMore && props.facilities.length > 0 && <div class="facility-finished">没有更多设施</div>}
        </div>
      </aside>
    );
  },
});
