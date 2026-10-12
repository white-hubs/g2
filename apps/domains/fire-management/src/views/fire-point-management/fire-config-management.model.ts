import type { FireHostIndicatorButtonRecord, FirePointRecord } from "@g2-contract/fire-management";

export type FireConfigTabKey = "point" | "button" | "video";

export interface HostButtonRecord {
  id: string | number;
  methodCode: string;
  name: string;
  type: string;
  icon: string;
  order: number;
  enabled: boolean;
  remark: string;
}

export interface HostButtonCandidate {
  id: string;
  methodCode: string;
  name: string;
  type: string;
  description: string;
}

export interface VideoDeviceRecord {
  id: string | number;
  code: string;
  name: string;
  categoryCode: string;
  category: string;
  productName: string;
  brand: string;
  areaId?: string | number;
  areaName: string;
}

export interface LocalPage<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface PointCoordinateRecord {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface PointCoordinateUpdate {
  id: string;
  x: number;
  y: number;
}

export interface BatchCoordinateModalExpose {
  openModal: (points: PointCoordinateRecord[]) => void;
}

export interface MultiLinePanelStyle {
  mode: 2 | 3;
  lightButtons: [FireHostIndicatorButtonRecord, FireHostIndicatorButtonRecord, FireHostIndicatorButtonRecord];
}

export interface MultiLineStyleModalExpose {
  openModal: (config: MultiLinePanelStyle) => void;
}

export interface ModalOpenExpose {
  openModal: () => void;
}

export interface PointEditModalExpose {
  openModal: (point: FirePointRecord) => void;
}

export interface PointControlConfigModalExpose {
  openModal: (point: FirePointRecord) => Promise<void>;
}

export interface DeviceCenterPointCandidate {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  productName: string;
  brandName: string;
  areaName: string;
}

export interface AreaTreeNode {
  id: string;
  name: string;
  aliasName?: string;
  children?: AreaTreeNode[];
}
