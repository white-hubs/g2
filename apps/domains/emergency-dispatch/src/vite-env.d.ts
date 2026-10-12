declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.css" {}

declare module "*.module.less" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.less" {}
