import { Button, PageLayout } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import { formatAlarmTime } from "./normalize-page";
import type { GemPageProps } from "./page-props";

export default defineComponent({
  name: "GemAlarmSafetyDetail",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    alarmId: { type: String, default: "" },
    title: { type: String, default: "安全报警详情" },
  },
  setup(props) {
    const detail = ref<Record<string, unknown>>({});
    const error = ref("");
    onMounted(async () => {
      if (!props.alarmId) {
        error.value = "缺少报警 id";
        return;
      }
      try {
        const client = await props.getAlarmClient!();
        const raw = await client.getAlarmSafetyRecords({ pageNumber: 1, pageSize: 1, id: props.alarmId });
        const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
        const list = (data.list || data.records || []) as Record<string, unknown>[];
        detail.value = list[0] || { id: props.alarmId };
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      }
    });

    const slots = {
      "layout-content": () => (
        <div>
          {error.value ? <p style={{ color: "#c00" }}>{error.value}</p> : null}
          <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", marginTop: "12px" }}>
            <dt>报警时间</dt>
            <dd>{formatAlarmTime(detail.value.alarmTime)}</dd>
            <dt>类型</dt>
            <dd>{String(detail.value.alarmTypeName || "--")}</dd>
            <dt>描述</dt>
            <dd>{String(detail.value.alarmContent || detail.value.description || "--")}</dd>
            <dt>ID</dt>
            <dd>{String(detail.value.id || props.alarmId)}</dd>
          </dl>
        </div>
      ),
      "footer-btn": () => <Button onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmRecordSafety })}>返回</Button>,
    };

    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
