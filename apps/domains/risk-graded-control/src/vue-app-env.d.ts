declare module "*.module.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

interface ImportMetaEnv {
  readonly VITE_APPLICATION_CODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
