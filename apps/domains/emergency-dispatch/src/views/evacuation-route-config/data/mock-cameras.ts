import type { CameraDevice } from "./types";

export const mockCameraDevices: CameraDevice[] = [
  { id: "DEV-001", name: "Cam-01 东侧通道", category: "摄像机", area: "A区" },
  { id: "DEV-002", name: "Cam-02 西侧楼梯口", category: "摄像机", area: "A区" },
  { id: "DEV-003", name: "Cam-03 北侧出口", category: "摄像机", area: "A区" },
  { id: "DEV-004", name: "Cam-04 大厅入口", category: "摄像机", area: "A区" },
  { id: "DEV-005", name: "Cam-05 会议室通道", category: "摄像机", area: "B区" },
  { id: "DEV-006", name: "Cam-06 仓库区", category: "摄像机", area: "B区" },
  { id: "DEV-007", name: "WVP监控-地下室B1F", category: "摄像机", area: "C区" },
  { id: "DEV-008", name: "WVP监控-地下室B2F", category: "摄像机", area: "C区" },
  { id: "DEV-009", name: "粮仓温度传感器-01", category: "传感器", area: "D区" },
  { id: "DEV-010", name: "WVP监控-配电房", category: "摄像机", area: "A区" },
];
