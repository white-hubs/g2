import type { FumigationArchiveDocument, FumigationArchiveDocumentPh3TrendPoint } from "@g2-contract/fumigation-operation";
import { Button, Spin, Table, Tag, message } from "@g2-platform/pc-ui";
import { downloadPDF } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { computed, defineComponent, ref, shallowRef, watch } from "vue";

import { EmptyBlock } from "./components";
import { formatDateTimeValue } from "./state";
import { getFumigationArchiveDocument } from "@/api/fumigation-client";

import "./fumigation.less";

const COMPLIANCE_STATEMENTS = [
  "《粮油储存安全责任暂行规定》——熏蒸作业须全流程记录留痕，磷化氢泄漏须可追溯可举证",
  "《安全生产法》（2021修正）第30条——特种作业人员须持证上岗",
  "《安全生产法》（2021修正）第43条——危险作业须审批并安排专人现场监护",
  "《工贸企业有限空间作业安全管理规定》（应急管理部令第13号）第6/10/12条——三步锁定、禁止单人、连续监测",
];

const formatNumber = (value?: number): string => {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${value}`;
};

const formatQuantity = (value?: number, unit?: string): string => {
  if (value == null) {
    return "--";
  }
  const formatted = value.toLocaleString("zh-CN");
  return unit ? `${formatted} ${unit}` : formatted;
};

const ph3BarColor = (value?: number): string => {
  if (value == null) {
    return "#94a3b8";
  }
  if (value >= 200) {
    return "#ef4444";
  }
  if (value >= 25) {
    return "#f59e0b";
  }
  return "#10b981";
};

export const ArchiveDocumentView = defineComponent({
  name: "ArchiveDocumentView",
  props: {
    archiveId: { type: String, required: true },
    showToolbar: { type: Boolean, default: true },
  },
  setup: (props) => {
    const loading = shallowRef(false);
    const exporting = shallowRef(false);
    const documentRef = ref<HTMLDivElement | null>(null);
    const archiveDocument = ref<FumigationArchiveDocument | null>(null);

    const ph3TrendMax = computed(() => {
      const trend = archiveDocument.value?.ph3Monitoring?.trend ?? [];
      return trend.reduce((max, point) => Math.max(max, point.valuePpm ?? 0), 1);
    });

    const loadDocument = async (archiveId: string): Promise<void> => {
      if (archiveId === "") {
        archiveDocument.value = null;
        return;
      }
      loading.value = true;
      try {
        archiveDocument.value = await getFumigationArchiveDocument(archiveId);
      } catch (error) {
        archiveDocument.value = null;
        message.error((error as Error).message || "获取合规档案失败");
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.archiveId,
      (archiveId) => {
        void loadDocument(archiveId);
      },
      { immediate: true },
    );

    const handleExportPdf = async (): Promise<void> => {
      if (documentRef.value == null || archiveDocument.value == null) {
        return;
      }
      exporting.value = true;
      try {
        const warehouse = archiveDocument.value.cover?.warehouseName ?? archiveDocument.value.summary?.warehouseName ?? "仓房";
        const dateLabel = dayjs(archiveDocument.value.generatedTime).format("YYYY-MM-DD");
        await downloadPDF(documentRef.value, `熏蒸作业合规档案_${warehouse}_${dateLabel}`);
        message.success("PDF 导出完成");
      } catch (error) {
        message.error((error as Error).message || "PDF 导出失败");
      } finally {
        exporting.value = false;
      }
    };

    const renderPh3Trend = (points: FumigationArchiveDocumentPh3TrendPoint[]): JSX.Element => {
      if (points.length === 0) {
        return <div class="fumigation-archive-ph3-chart-empty">暂无监测趋势数据</div>;
      }
      const max = ph3TrendMax.value;
      return (
        <div class="fumigation-archive-ph3-chart">
          {points.map((point, index) => {
            const value = point.valuePpm ?? 0;
            const height = Math.max(4, Math.round((value / max) * 96));
            return (
              <div
                class="fumigation-archive-ph3-bar"
                key={`${point.timeLabel ?? index}-${index}`}
                style={{ height: `${height}px`, background: ph3BarColor(value) }}
                title={`${point.timeLabel ?? ""} ${value}ppm`}
              />
            );
          })}
        </div>
      );
    };

    const renderDocumentBody = (doc: FumigationArchiveDocument): JSX.Element => {
      const cover = doc.cover;
      const summary = doc.summary;
      const prechecks = doc.prechecks;
      const ph3 = doc.ph3Monitoring;
      const completion = doc.completion;

      return (
        <div class="fumigation-archive-document-body" ref={documentRef}>
          <div class="fumigation-archive-cover">
            <div class="fumigation-archive-cover-label">熏蒸作业合规档案</div>
            <div class="fumigation-archive-cover-divider">━━━━━━━━━━━━━━━━━━━━━━</div>
            <div class="fumigation-archive-cover-grid">
              {cover?.warehouseName != null && cover.warehouseName !== "" ? (
                <>
                  <div class="fumigation-archive-cover-key">仓房编号</div>
                  <div>
                    <strong>{cover.warehouseCode ?? cover.warehouseName}</strong>
                  </div>
                </>
              ) : null}
              {cover?.grainVarietyName ? (
                <>
                  <div class="fumigation-archive-cover-key">粮食品种</div>
                  <div>
                    <strong>{cover.grainVarietyName}</strong>
                  </div>
                </>
              ) : null}
              {cover?.grainQuantity != null ? (
                <>
                  <div class="fumigation-archive-cover-key">粮食数量</div>
                  <div>
                    <strong>{formatQuantity(cover.grainQuantity, cover.grainQuantityUnit)}</strong>
                  </div>
                </>
              ) : null}
              {cover?.pesticideTypeName ? (
                <>
                  <div class="fumigation-archive-cover-key">药剂种类</div>
                  <div>
                    <strong>{cover.pesticideTypeName}</strong>
                  </div>
                </>
              ) : null}
              {cover?.pesticideDosage ? (
                <>
                  <div class="fumigation-archive-cover-key">药剂用量</div>
                  <div>
                    <strong>{cover.pesticideDosage}</strong>
                  </div>
                </>
              ) : null}
              {cover?.applicationMethodName ? (
                <>
                  <div class="fumigation-archive-cover-key">施药方式</div>
                  <div>
                    <strong>{cover.applicationMethodName}</strong>
                  </div>
                </>
              ) : null}
              {cover?.sealedDays != null ? (
                <>
                  <div class="fumigation-archive-cover-key">密闭时间</div>
                  <div>
                    <strong>{cover.sealedDays} 天</strong>
                  </div>
                </>
              ) : null}
              {cover?.workDateLabel ? (
                <>
                  <div class="fumigation-archive-cover-key">作业日期</div>
                  <div>
                    <strong>{cover.workDateLabel}</strong>
                  </div>
                </>
              ) : null}
            </div>
            <div class="fumigation-archive-cover-footer">
              档案编号：{doc.archiveNo ?? doc.archiveId}
              {"　｜　"}
              生成时间：{formatDateTimeValue(doc.generatedTime, "--", "YYYY-MM-DD HH:mm:ss")}
              {"　｜　"}
              数据完整，不可删除
            </div>
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">一、作业概要</div>
            <div class="fumigation-archive-metrics">
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value">{summary?.actualDurationLabel ?? "--"}</div>
                <div class="fumigation-archive-metric-label">实际时长</div>
              </div>
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value fumigation-archive-metric-green">{summary?.workerCount ?? "--"}人</div>
                <div class="fumigation-archive-metric-label">作业人员数量</div>
              </div>
            </div>
            <table class="fumigation-archive-info-table">
              <tbody>
                <tr>
                  <th>工单编号</th>
                  <td>{summary?.operationNo ?? doc.workCode ?? "--"}</td>
                  <th>申请人</th>
                  <td>{summary?.applicantName ?? "--"}</td>
                </tr>
                <tr>
                  <th>申请时间</th>
                  <td>{formatDateTimeValue(summary?.applyTime, "--", "YYYY-MM-DD HH:mm")}</td>
                  <th>仓房编号</th>
                  <td>{summary?.warehouseCode ?? summary?.warehouseName ?? "--"}</td>
                </tr>
                <tr>
                  <th>粮食品种</th>
                  <td>{summary?.grainVarietyName ?? "--"}</td>
                  <th>数量</th>
                  <td>{formatQuantity(summary?.grainQuantity, summary?.grainQuantityUnit)}</td>
                </tr>
                <tr>
                  <th>药剂种类</th>
                  <td>{summary?.pesticideTypeName ?? "--"}</td>
                  <th>用量</th>
                  <td>{summary?.pesticideDosage ?? "--"}</td>
                </tr>
                <tr>
                  <th>施药方式</th>
                  <td>{summary?.applicationMethodName ?? "--"}</td>
                  <th>密闭天数</th>
                  <td>{summary?.sealedDays != null ? `${summary.sealedDays} 天` : "--"}</td>
                </tr>
                <tr>
                  <th>最终状态</th>
                  <td>
                    <Tag>{summary?.finalStatusName ?? "已归档"}</Tag>
                  </td>
                  <th>归档时间</th>
                  <td>{formatDateTimeValue(summary?.archiveTime, "--", "YYYY-MM-DD HH:mm")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">二、审批链</div>
            <Table
              size="small"
              pagination={false}
              rowKey="index"
              dataSource={doc.approvals}
              columns={[
                { title: "序号", dataIndex: "index", width: 60 },
                {
                  title: "时间",
                  dataIndex: "approvalTime",
                  width: 150,
                  customRender: ({ text }: { text: string }) => formatDateTimeValue(text, "--", "YYYY-MM-DD HH:mm"),
                },
                { title: "审批人", dataIndex: "approverName", width: 90 },
                { title: "角色", dataIndex: "roleName", width: 100 },
                { title: "动作", dataIndex: "actionName", width: 80 },
                { title: "审批意见", dataIndex: "opinion" },
              ]}
            />
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">三、前置条件三步校验</div>
            {prechecks?.checkedTime ? (
              <div class="fumigation-archive-section-desc">
                校验时间：{formatDateTimeValue(prechecks.checkedTime, "--", "YYYY-MM-DD HH:mm")}
                {"　｜　"}
                校验结果：{prechecks.resultLabel ?? "--"}
              </div>
            ) : null}
            <Table
              size="small"
              pagination={false}
              rowKey={(record) => `${record.stepLabel ?? "step"}-${record.itemName ?? "item"}-${record.sensorCode ?? "sensor"}`}
              dataSource={prechecks?.rows ?? []}
              columns={[
                { title: "步骤", dataIndex: "stepLabel", width: 70 },
                { title: "校验项", dataIndex: "itemName" },
                { title: "检测值", dataIndex: "detectedValue", width: 100 },
                { title: "阈值要求", dataIndex: "thresholdRule", width: 110 },
                { title: "结果", dataIndex: "resultLabel", width: 100 },
                { title: "传感器编号", dataIndex: "sensorCode", width: 120 },
              ]}
            />
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">五、磷化氢监测数据</div>
            {ph3?.sampleCount != null ? (
              <div class="fumigation-archive-section-desc">
                总采样数：{ph3.sampleCount} 条{ph3.sensorCodes ? `　｜　监测传感器：${ph3.sensorCodes}` : ""}
              </div>
            ) : null}
            <div class="fumigation-archive-metrics fumigation-archive-metrics-4">
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value fumigation-archive-metric-green">{formatNumber(ph3?.indoorMaxPpm)}</div>
                <div class="fumigation-archive-metric-label">仓内最高 (ppm)</div>
              </div>
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value">{formatNumber(ph3?.indoorMinPpm)}</div>
                <div class="fumigation-archive-metric-label">仓内最低 (ppm)</div>
              </div>
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value">{formatNumber(ph3?.indoorAvgPpm)}</div>
                <div class="fumigation-archive-metric-label">仓内平均 (ppm)</div>
              </div>
              <div class="fumigation-archive-metric-card">
                <div class="fumigation-archive-metric-value">{formatNumber(ph3?.outdoorMaxPpm)}</div>
                <div class="fumigation-archive-metric-label">仓外最高 (ppm)</div>
              </div>
            </div>
            <div class="fumigation-archive-ph3-panel">
              <div class="fumigation-archive-ph3-panel-title">📈 仓内磷化氢浓度趋势（全程）</div>
              {renderPh3Trend(ph3?.trend ?? [])}
            </div>
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">六、告警记录</div>
            <Table
              size="small"
              pagination={false}
              rowKey={(record) => `${record.alarmId ?? `${record.alarmTime ?? "time"}-${record.alarmEventName ?? "event"}`}`}
              dataSource={doc.alarms}
              locale={{ emptyText: "作业时段内无报警记录" }}
              columns={[
                {
                  title: "时间",
                  dataIndex: "alarmTime",
                  width: 150,
                  customRender: ({ text }: { text: string }) => formatDateTimeValue(text, "--", "YYYY-MM-DD HH:mm:ss"),
                },
                { title: "告警事件", dataIndex: "alarmEventName", width: 160 },
                { title: "级别", dataIndex: "alarmLevelName", width: 90 },
                { title: "状态", dataIndex: "alarmStatusName", width: 90 },
                { title: "详情", dataIndex: "content" },
              ]}
            />
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">九、完工确认</div>
            <Table
              size="small"
              pagination={false}
              rowKey={(record) => `${record.itemName ?? "item"}-${record.confirmedTime ?? record.detail ?? "detail"}`}
              dataSource={completion?.rows ?? []}
              columns={[
                { title: "校验项", dataIndex: "itemName", width: 100 },
                { title: "详情", dataIndex: "detail" },
                { title: "结果", dataIndex: "resultLabel", width: 120 },
                {
                  title: "确认时间",
                  dataIndex: "confirmedTime",
                  width: 150,
                  customRender: ({ text }: { text: string }) => formatDateTimeValue(text, "--", "YYYY-MM-DD HH:mm:ss"),
                },
              ]}
            />
            {completion?.completionDesc ? <div class="fumigation-archive-completion-note">✅ {completion.completionDesc}</div> : null}
          </div>

          <div class="fumigation-archive-section">
            <div class="fumigation-archive-section-title">十、合规声明与签章</div>
            <div class="fumigation-archive-statements">
              <div>📜 本档案依据以下法规要求生成，确保熏蒸作业全流程记录留痕、可追溯、不可删除：</div>
              <div class="fumigation-archive-statements-list">
                {COMPLIANCE_STATEMENTS.map((item) => (
                  <div key={item}>· {item}</div>
                ))}
              </div>
            </div>
            <div class="fumigation-archive-document-footer">
              本档案由开河平台AI安全应急管理系统自动生成，数据来源为熏蒸作业全过程实时采集记录。
              <br />
              档案数据保留 ≥ 3年，不可删除。档案编号：{doc.archiveNo ?? doc.archiveId}
            </div>
          </div>
        </div>
      );
    };

    return (): JSX.Element => (
      <div class="fumigation-archive-view">
        {props.showToolbar ? (
          <div class="fumigation-archive-view-toolbar">
            <div class="fumigation-archive-view-toolbar-actions">
              <Button type="primary" loading={exporting.value} onClick={() => void handleExportPdf()}>
                📥 导出PDF
              </Button>
            </div>
          </div>
        ) : null}
        <Spin spinning={loading.value}>
          <div class="fumigation-archive-view-content">
            {archiveDocument.value == null && !loading.value ? (
              <EmptyBlock text="暂无档案数据" />
            ) : archiveDocument.value != null ? (
              renderDocumentBody(archiveDocument.value)
            ) : null}
          </div>
        </Spin>
      </div>
    );
  },
});
