import { h } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { Tag, message } from "@/pc-ui-runtime";

const pad = (value: number): string => String(value).padStart(2, "0");

const formatTimestamp = (value: number): string | undefined => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000 || date.getFullYear() > 2100) {
    return undefined;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const formatText = (value?: string | number | null): string => {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  if (typeof value === "number") {
    return formatTimestamp(value) ?? String(value);
  }
  return String(value);
};

const parseDateTime = (value?: string | number | null): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const date = typeof value === "number" ? new Date(value) : new Date(String(value).trim().replace(" ", "T"));
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000 || date.getFullYear() > 2100) {
    return undefined;
  }
  return date;
};

const isMidnight = (date: Date): boolean => date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;

const formatDateTime = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const normalizeDutyPeriodEndTime = (endTime?: string | number | null): string | number | null | undefined => {
  const end = parseDateTime(endTime);
  if (!end || !isMidnight(end)) {
    return endTime;
  }
  return formatDateTime(new Date(end.getTime() - 1000));
};

const formatDutyPeriodTime = (value?: string | number | null): string => {
  const date = parseDateTime(value);
  return date ? formatDateTime(date) : formatText(value);
};

export const formatDutyPeriodRange = (startTime?: string | number | null, endTime?: string | number | null): string => {
  if (!startTime && !endTime) {
    return "";
  }
  return `${formatDutyPeriodTime(startTime)} 至 ${formatDutyPeriodTime(normalizeDutyPeriodEndTime(endTime))}`;
};

export const toPercentNumber = (value?: number | null): number | undefined => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return undefined;
  }
  const numeric = Number(value);
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
};

export const formatPercent = (value?: number | null): string => {
  const percent = toPercentNumber(value);
  return percent === undefined ? "--" : `${percent.toFixed(2)}%`;
};

export const periodLabel = (periodType?: string): string => {
  const map: Record<string, string> = { MONTH: "月度", QUARTER: "季度", YEAR: "年度", DAY: "日", WEEK: "周" };
  return periodType ? (map[periodType] ?? periodType) : "--";
};

export const signStatusLabel = (status?: string): string => {
  const map: Record<string, string> = { UNSIGNED: "待签收", SIGNED: "已签收" };
  return status ? (map[status] ?? status) : "--";
};

export const itemStatusLabel = (status?: string): string => {
  const map: Record<string, string> = { PENDING: "待执行", PEDING: "待执行", COMPLETED: "已完成", OVERDUE: "超期" };
  return status ? (map[status] ?? status) : "--";
};

export const reportStatusLabel = (status?: string): string => {
  const map: Record<string, string> = { GENERATING: "生成中", GENERATED: "已生成", FAILED: "生成失败" };
  return status ? (map[status] ?? status) : "--";
};

export const methodLabel = (method?: string): string => {
  const map: Record<string, string> = { AUTO: "系统自动", MANUAL: "手动生成" };
  return method ? (map[method] ?? method) : "--";
};

export const statusTag = (status?: string): JSX.Element => {
  const colorMap: Record<string, string> = {
    SIGNED: "green",
    UNSIGNED: "orange",
    COMPLETED: "green",
    PENDING: "blue",
    PEDING: "blue",
    OVERDUE: "red",
    GENERATED: "green",
    GENERATING: "blue",
    FAILED: "red",
  };
  const labelMap: Record<string, string> = {
    SIGNED: "已签收",
    UNSIGNED: "待签收",
    COMPLETED: "已完成",
    PENDING: "待执行",
    PEDING: "待执行",
    OVERDUE: "超期",
    GENERATED: "已生成",
    GENERATING: "生成中",
    FAILED: "生成失败",
  };
  const label = status ? (labelMap[status] ?? status) : "--";
  return h(Tag, { color: status ? colorMap[status] : undefined }, () => label);
};

export const showApiError = (error: unknown, fallback = "操作失败"): void => {
  const err = error as { errorMessage?: string; message?: string };
  message.error(err?.errorMessage || err?.message || fallback);
};
