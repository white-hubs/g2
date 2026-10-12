import type { RuntimeCommonDiagnostic } from "@g2-runtime/common-loader";
import { defineComponent, ref } from "vue";

import styles from "./RuntimeCommonDiagnostics.module.css";

const STATE_LABELS: Record<RuntimeCommonDiagnostic["state"], string> = {
  pending: "加载中",
  ready: "已就绪",
  failed: "失败",
};

export default defineComponent({
  name: "RuntimeCommonDiagnostics",
  props: {
    diagnostics: { type: Array as () => RuntimeCommonDiagnostic[], default: () => [] },
  },
  setup(props) {
    const open = ref(false);

    return () => {
      if (!props.diagnostics.length) return null;
      return (
        <div class={styles.root}>
          <button
            type="button"
            class={styles.trigger}
            aria-label="公共模块诊断"
            aria-expanded={open.value}
            onClick={() => (open.value = !open.value)}
          >
            公共模块诊断
          </button>
          {open.value ? (
            <section class={styles.panel} role="dialog" aria-label="Runtime Common 加载诊断">
              <header class={styles.header}>
                <h2>Runtime Common</h2>
                <button type="button" class={styles.close} aria-label="关闭诊断面板" onClick={() => (open.value = false)}>
                  ×
                </button>
              </header>
              <ul class={styles.list}>
                {props.diagnostics.map((item) => (
                  <li class={styles.item} key={item.name}>
                    <div class={styles.itemHeader}>
                      <strong>{item.name}</strong>
                      <span class={[styles.state, styles[item.state]]}>{STATE_LABELS[item.state]}</span>
                    </div>
                    <div class={styles.version}>
                      运行时：{item.runtimeVersion ?? "—"} · API：{item.apiVersion ?? "—"}
                    </div>
                    {item.error ? <div class={styles.error}>{item.error}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      );
    };
  },
});
