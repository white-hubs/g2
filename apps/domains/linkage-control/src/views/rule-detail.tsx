import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLinkageControlClient } from "../domain-context";
import { Button, PageLayout, Space, Tabs, TabPane, message } from "../pc-ui-runtime";

const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";
const shown = (value: unknown): string => value === undefined || value === null || value === "" ? "--" : String(value);

export const LinkageRuleDetailPage = defineComponent({
  name: "LinkageRuleDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const activeKey = ref("event");
    const detail = reactive<Record<string, unknown>>({});
    const related = reactive({ devices: [] as Record<string, unknown>[], deviceRecords: [] as Record<string, unknown>[], videos: [] as Record<string, unknown>[], videoRecords: [] as Record<string, unknown>[], videoFiles: [] as Record<string, unknown>[], messages: [] as Record<string, unknown>[] });
    async function load(): Promise<void> {
      const id = String(route.params.id ?? "");
      if (!id) { message.error("缺少事件 ID"); return; }
      loading.value = true;
      try {
        const client = getLinkageControlClient();
        Object.assign(detail, await client.getEvent(id));
        const results = await Promise.allSettled([
          client.getEventDevices(id), client.getEventDeviceRecords(id), client.getEventVideos(id),
          client.getEventVideoRecords(id), client.getEventVideoFiles(id), client.getEventMessageRecords(id),
        ]);
        const keys = ["devices", "deviceRecords", "videos", "videoRecords", "videoFiles", "messages"] as const;
        results.forEach((result, index) => { if (result.status === "fulfilled") related[keys[index]!] = result.value; });
      }
      catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }
    onMounted(() => { void load(); });
    const recordList = (rows: Record<string, unknown>[]) => rows.length
      ? <div style={{ display: "grid", gap: "8px", padding: "16px" }}>{rows.map((row, index) => <div key={String(row.id ?? index)} style={{ border: "1px solid #eee", borderRadius: "4px", padding: "12px", overflowWrap: "anywhere" }}>
          {Object.entries(row).filter(([, value]) => value !== null && value !== undefined && typeof value !== "object").map(([key, value]) => <span key={key} style={{ marginRight: "20px" }}>{key}：{String(value)}</span>)}
        </div>)}</div>
      : <div style={{ padding: "24px", color: "#999" }}>暂无记录</div>;
    const getRuleConfig = (): unknown => {
      if (typeof detail.ruleConfig !== "string") return detail.ruleConfig;
      try { return JSON.parse(detail.ruleConfig); } catch { return []; }
    };
    return () => <PageLayout title="事件详情" aria-busy={loading.value} v-slots={{
      "layout-content": () => <div aria-busy={loading.value}>
        <Tabs activeKey={activeKey.value} onUpdate:activeKey={(value: string | number) => activeKey.value = String(value)}>
          <TabPane key="event" tab="事件详情">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(180px,1fr))", gap: "16px", padding: "20px" }}>
              <div>事件名称：{shown(detail.name)}</div><div>触发时间：{shown(detail.triggerTime)}</div><div>操作人：{shown(detail.operatorName)}</div>
            </div>
            {Array.isArray(getRuleConfig()) && (getRuleConfig() as Record<string, unknown>[]).map((rule, index) => <div key={index} style={{ padding: "10px 20px" }}>
              {index + 1}. {shown(rule.name)}　条件：{shown(rule.propName)} {shown(rule.opName ?? rule.op)} {shown(rule.oprand)}
            </div>)}
          </TabPane>
          <TabPane key="device-actions" tab={`设备联动 (${related.devices.length})`}>{recordList(related.devices)}</TabPane>
          <TabPane key="device-records" tab={`设备执行记录 (${related.deviceRecords.length})`}>{recordList(related.deviceRecords)}</TabPane>
          <TabPane key="video-actions" tab={`监控联动 (${related.videos.length})`}>{recordList(related.videos)}</TabPane>
          <TabPane key="video-files" tab={`监控文件 (${related.videoFiles.length})`}>{recordList(related.videoFiles)}</TabPane>
          <TabPane key="video-records" tab={`监控执行记录 (${related.videoRecords.length})`}>{recordList(related.videoRecords)}</TabPane>
          <TabPane key="messages" tab={`消息记录 (${related.messages.length})`}>{recordList(related.messages)}</TabPane>
        </Tabs>
      </div>,
      "footer-page": () => <Space><Button onClick={() => void router.back()}>返回</Button></Space>,
    }} />;
  },
});
