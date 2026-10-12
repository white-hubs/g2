/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
