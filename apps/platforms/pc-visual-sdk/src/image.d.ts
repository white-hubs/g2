declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.bmp";
declare module "*.tiff";
declare module "*.hdr";

interface ImportMeta {
  glob: (pattern: string, options?: { eager?: boolean }) => Record<string, { default: unknown }>;
}
declare module "*.module.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
