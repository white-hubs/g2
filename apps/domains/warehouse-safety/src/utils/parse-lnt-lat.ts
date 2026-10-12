export const parseLntAndLat = (value: string | undefined): { lng: number; lat: number } | null => {
  const [lng, lat] = String(value || "")
    .split(",")
    .map(Number);
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return { lng, lat };
  }
  return null;
};
