export interface TransformerLink {
  id: string;
  transformer: string;
  highVoltageDevice: string;
}

export interface CollectionConfig {
  cycle: string;
  meterTime: string;
  transformerLinks: TransformerLink[];
}

export interface DiagnosisRecord {
  id: string;
  deviceName: string;
  problemName: string;
  facilityName: string;
  diagnosedAt: string;
  severity: "critical" | "warning" | "notice";
  status: "pending" | "processing" | "resolved";
  description: string;
  evidence: string[];
  causes: { name: string; probability: number }[];
  suggestions: string[];
}

export interface InspectionRow {
  id: string;
  facilityName: string;
  inspectedAt: string;
  temperature: string;
  humidity: string;
  waterLeak: string;
  values: Record<string, string>;
}
