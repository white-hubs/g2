/// <reference types="vite/client" />

declare module "*.module.less" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.less" {
  const css: string;
  export default css;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
