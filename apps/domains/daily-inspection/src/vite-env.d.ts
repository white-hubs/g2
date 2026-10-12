/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "@amap/amap-jsapi-loader" {
  const AMapLoader: { load: (options: Record<string, unknown>) => Promise<any> };
  export default AMapLoader;
}
