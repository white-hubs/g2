export type {
  FumigationDispatchMapConfig as DispatchMapConfig,
  FumigationMonitorPersonnelLocation as MonitorPersonnelLocation,
} from "@/api/fumigation-client";

export const gpsToMapPosition = (
  gps: { lng: number; lat: number },
  mapConfig: { center: { lng: number; lat: number }; radius: number } | null,
): { left: string; top: string } => {
  const center = mapConfig?.center ?? gps;
  const radius = mapConfig?.radius ?? 500;
  const dx = (gps.lng - center.lng) * 111320 * Math.cos((center.lat * Math.PI) / 180);
  const dy = (gps.lat - center.lat) * 110540;
  const x = 50 + (dx / radius) * 42;
  const y = 50 - (dy / radius) * 42;
  return {
    left: `${Math.min(88, Math.max(12, x))}%`,
    top: `${Math.min(88, Math.max(12, y))}%`,
  };
};
