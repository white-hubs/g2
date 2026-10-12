import type { FireEventType } from "@/utils/fire-event";

export interface FireEventRecord {
  id: string;
  eventCode: string;
  eventName: string;
  eventType: FireEventType;
  hostId: string;
  hostName: string;
  circuit: string;
  address: string;
  code: string;
  pointName: string;
  location: string;
  eventTime: string;
}

export interface EventRecordFilters {
  hostId: string;
  eventCode: string;
  circuit: string;
  address: string;
  code: string;
  period: string[];
}

export const DEFAULT_EVENT_RECORD_FILTERS: EventRecordFilters = {
  hostId: "",
  eventCode: "",
  circuit: "",
  address: "",
  code: "",
  period: [],
};
