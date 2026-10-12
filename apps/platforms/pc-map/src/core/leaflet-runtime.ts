import L from "leaflet";

(globalThis as unknown as { L: typeof L }).L = L;

export default L;
