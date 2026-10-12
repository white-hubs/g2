import { defineComponent, type PropType } from "vue";

import type { FireHostId, FireHostOption } from "../models";

import styles from "../fire-host-control.module.css";

export const HostNavigator = defineComponent({
  name: "HostNavigator",
  props: {
    hosts: { type: Array as PropType<FireHostOption[]>, required: true },
    currentHostId: { type: [String, Number] as PropType<FireHostId>, required: true },
    total: { type: Number, required: true },
    loading: { type: Boolean, required: true },
    loadingMore: { type: Boolean, required: true },
    hasMore: { type: Boolean, required: true },
  },
  emits: { change: (_id: FireHostId) => true, loadMore: () => true },
  setup(props, { emit }) {
    const handleScroll = (event: Event): void => {
      const target = event.currentTarget as HTMLElement;
      if (props.hasMore && !props.loadingMore && target.scrollTop + target.clientHeight >= target.scrollHeight - 32) {
        emit("loadMore");
      }
    };
    return () => (
      <aside class={styles.hostNavigator} aria-label="消防主机列表">
        <div class={styles.hostNavigatorTitle}>
          <span class={styles.navigatorDot} />
          消防主机 <b>{props.total}</b>
        </div>
        <div class={styles.hostNavigatorList} onScroll={handleScroll}>
          {props.hosts.map((host) => (
            <button
              key={host.id}
              type="button"
              class={[styles.hostNavCard, String(host.id) === String(props.currentHostId) && styles.hostNavCardActive]}
              onClick={() => emit("change", host.id)}
            >
              <div class={styles.hostNavName}>
                <span class={[styles.hostOnlineDot, !host.online && styles.hostOfflineDot]} />
                {host.deviceName}
              </div>
              <div class={styles.hostNavMeta}>
                {host.deviceCode} · {host.areaName}
              </div>
              <div class={styles.hostNavStats}>
                {host.fireCount ? <span class={styles.fireStat}>火警 {host.fireCount}</span> : <span>无火警</span>}
                {host.faultCount ? <span class={styles.faultStat}>故障 {host.faultCount}</span> : <span>无故障</span>}
              </div>
            </button>
          ))}
          {props.loading ? <div class={styles.listLoading}>正在加载消防主机...</div> : null}
          {props.loadingMore ? <div class={styles.listLoading}>正在加载更多...</div> : null}
          {!props.loading && !props.hosts.length ? <div class={styles.navigatorEmpty}>暂无消防主机</div> : null}
          {!props.loading && props.hosts.length && !props.hasMore ? <div class={styles.listEnd}>已加载全部主机</div> : null}
        </div>
      </aside>
    );
  },
});
