import type { HazardActionHandlers } from "./actions";
import { renderHazardActionButtons } from "./actions";
import type { HazardRecord } from "./data";
import { levelColor, levelText, statusColor, statusText, workflowNodes } from "./data";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Progress,
  Space,
  Tag,
  TimeLine,
  TimeLineItem,
  type ColumnType,
} from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

export function LevelTag(props: { level: HazardRecord["level"] }): JSX.Element {
  return <Tag color={levelColor[props.level]}>{levelText[props.level]}</Tag>;
}

export function StatusTag(props: { status: HazardRecord["status"] }): JSX.Element {
  return <Tag color={statusColor[props.status]}>{statusText[props.status]}</Tag>;
}

export function StatCard(props: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "orange" | "blue" | "green" | "red";
}): JSX.Element {
  return (
    <div class={["hazard-stat", props.tone ? `hazard-stat-${props.tone}` : ""].join(" ")}>
      <div class="hazard-stat-label">{props.label}</div>
      <div class="hazard-stat-value">{props.value}</div>
      <div class="hazard-stat-hint">{props.hint}</div>
    </div>
  );
}

export function PageHeaderActions(props: {
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}): JSX.Element {
  return (
    <Space>
      {props.secondary ? <Button onClick={props.onSecondary}>{props.secondary}</Button> : null}
      {props.primary ? (
        <Button type="primary" onClick={props.onPrimary}>
          {props.primary}
        </Button>
      ) : null}
    </Space>
  );
}

export function DetailHero(props: { record: HazardRecord; extra?: JSX.Element }): JSX.Element {
  const record = props.record;
  return (
    <div class="hazard-detail-hero">
      <div class="hazard-detail-hero-main">
        <Space>
          <LevelTag level={record.level} />
          <StatusTag status={record.status} />
          {record.overdueDays > 0 ? <Tag color="red">超期 {record.overdueDays} 天</Tag> : <Tag color="green">时限正常</Tag>}
        </Space>
        <h2>{record.title}</h2>
        <div class="hazard-detail-hero-meta">
          <span>{record.id}</span>
          <span>{record.location}</span>
          <span>{record.source}</span>
          <span>责任人：{record.owner}</span>
        </div>
      </div>
      {props.extra ? <div class="hazard-detail-hero-extra">{props.extra}</div> : null}
    </div>
  );
}

export function MetricStrip(props: {
  items: Array<{ label: string; value: string | number; tone?: "orange" | "blue" | "green" | "red" }>;
}): JSX.Element {
  return (
    <div class="hazard-metric-strip">
      {props.items.map((item) => (
        <div class={["hazard-metric", item.tone ? `hazard-metric-${item.tone}` : ""].join(" ")} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function HazardSummary(props: { record: HazardRecord }): JSX.Element {
  const record = props.record;
  return (
    <Descriptions column={2} bordered size="small">
      <DescriptionsItem label="隐患编号">{record.id}</DescriptionsItem>
      <DescriptionsItem label="等级">
        <LevelTag level={record.level} />
      </DescriptionsItem>
      <DescriptionsItem label="状态">
        <StatusTag status={record.status} />
      </DescriptionsItem>
      <DescriptionsItem label="来源">{record.source}</DescriptionsItem>
      <DescriptionsItem label="位置">{record.location}</DescriptionsItem>
      <DescriptionsItem label="发现时间">{formatTime(record.foundAt)}</DescriptionsItem>
      <DescriptionsItem label="发现人">{record.foundBy}</DescriptionsItem>
      <DescriptionsItem label="责任人">{record.owner}</DescriptionsItem>
      <DescriptionsItem label="关联风险点">{record.riskPoint}</DescriptionsItem>
      <DescriptionsItem label="整改时限">{formatTime(record.deadline)}</DescriptionsItem>
      <DescriptionsItem label="隐患描述" span={2}>
        {record.title}
      </DescriptionsItem>
      <DescriptionsItem label="AI处置建议" span={2}>
        {record.aiAdvice}
      </DescriptionsItem>
    </Descriptions>
  );
}

export function EvidenceCompare(props: { before: string; after: string; result: string }): JSX.Element {
  return (
    <div class="hazard-evidence-compare">
      <div>
        <span>整改前</span>
        <strong>{props.before}</strong>
      </div>
      <div>
        <span>整改后</span>
        <strong>{props.after}</strong>
      </div>
      <Alert type="success" showIcon message={props.result} />
    </div>
  );
}

export function HazardTimeline(props: { record: HazardRecord }): JSX.Element {
  const activeIndex = Math.max(1, Math.round(props.record.progress / 18));
  return (
    <TimeLine>
      {workflowNodes.map((node, index) => (
        <TimeLineItem key={node} color={index <= activeIndex ? "green" : "gray"}>
          <div class="hazard-timeline-title">{node}</div>
          <div class="hazard-muted">{index <= activeIndex ? "已生成流程记录" : "等待上一节点完成"}</div>
        </TimeLineItem>
      ))}
    </TimeLine>
  );
}

export function ActionPanel(props: {
  title: string;
  tips: string[];
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}): JSX.Element {
  return (
    <Card title={props.title} class="hazard-panel hazard-action-panel">
      <div class="hazard-action-tips">
        {props.tips.map((tip) => (
          <div key={tip}>{tip}</div>
        ))}
      </div>
      <Space class="hazard-action-buttons">
        {props.secondary ? <Button onClick={props.onSecondary}>{props.secondary}</Button> : null}
        {props.primary ? (
          <Button type="primary" onClick={props.onPrimary}>
            {props.primary}
          </Button>
        ) : null}
      </Space>
    </Card>
  );
}

export function ReadonlyBlock(props: { title: string; rows: Array<{ label: string; value: string | JSX.Element }> }): JSX.Element {
  return (
    <Card title={props.title} class="hazard-panel">
      <div class="hazard-readonly-list">
        {props.rows.map((row) => (
          <div class="hazard-readonly-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ProgressPanel(props: { record: HazardRecord }): JSX.Element {
  return (
    <Card title="整改进度" class="hazard-panel">
      <Progress percent={props.record.progress} status={props.record.overdueDays > 0 ? "exception" : "active"} />
      <div class="hazard-progress-meta">
        <span>责任人：{props.record.owner}</span>
        <span>截止：{formatTime(props.record.deadline)}</span>
        <span>{props.record.overdueDays > 0 ? `已超期 ${props.record.overdueDays} 天` : "时限正常"}</span>
      </div>
    </Card>
  );
}

export const hazardColumns = (handlers: HazardActionHandlers<HazardRecord>): ColumnType[] => [
  {
    title: "隐患编号",
    dataIndex: "id",
    width: 150,
    customRender: ({ record }: { record: HazardRecord }) => (
      <Button type="link" size="small" onClick={() => handlers.VIEW?.(record)}>
        {record.id}
      </Button>
    ),
  },
  { title: "隐患描述", dataIndex: "title", ellipsis: true },
  { title: "位置", dataIndex: "location", width: 150 },
  { title: "等级", dataIndex: "level", width: 90, customRender: ({ text }: { text: HazardRecord["level"] }) => <LevelTag level={text} /> },
  {
    title: "状态",
    dataIndex: "status",
    width: 110,
    customRender: ({ text }: { text: HazardRecord["status"] }) => <StatusTag status={text} />,
  },
  { title: "来源", dataIndex: "source", width: 120 },
  { title: "发现时间", dataIndex: "foundAt", width: 150, customRender: ({ text }: { text?: string | number }) => formatTime(text) },
  {
    title: "状态",
    dataIndex: "status",
    width: 110,
    customRender: ({ text }: { text: HazardRecord["status"] }) => <StatusTag status={text} />,
  },
  { title: "来源", dataIndex: "source", width: 120 },
  { title: "发现时间", dataIndex: "foundAt", width: 150 },
  {
    title: "操作",
    dataIndex: "action",
    width: 190,
    customRender: ({ record }: { record: HazardRecord }) => renderHazardActionButtons(record, record.actions, handlers),
  },
];
