export interface TemplateDemoClient {
  listTemplateDemo: (params) => Promise<unknown>;
  getTemplateDemoDetail: (id) => Promise<unknown>;
  createTemplateDemo: (params) => Promise<unknown>;
  updateTemplateDemo: (params) => Promise<unknown>;
  deleteTemplateDemo: (id) => Promise<unknown>;
}
