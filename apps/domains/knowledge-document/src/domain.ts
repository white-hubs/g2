import type { KnowledgeDocumentClient } from "@g2-client/knowledge-document/client";
import type { DomainModule } from "@g2-composition/contract";

import { installKnowledgeDocumentContext } from "./domain-context";
import { installKnowledgeDocumentPcUi } from "./pc-ui-runtime";

const BASE = "/d/knowledge-document";

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "knowledge-document-home", meta: { title: "知识文档" }, redirect: `${BASE}/knowledge-document` },
    {
      path: `${BASE}/knowledge-document`,
      name: "knowledge-document-list",
      meta: { title: "知识文档" },
      component: () => import("./views/document-page").then((module) => module.KnowledgeDocumentPage),
    },
    {
      path: `${BASE}/knowledge-document-type`,
      name: "knowledge-document-type",
      meta: { title: "文档类型" },
      component: () => import("./views/type-page").then((module) => module.KnowledgeDocumentTypePage),
    },
  ],
  menuContribution: [
    {
      label: "知识文档",
      iconKey: "knowledge-document",
      children: [
        { label: "知识文档", entry: "knowledge-document", path: `${BASE}/knowledge-document` },
        { label: "文档类型", entry: "knowledge-document-type", path: `${BASE}/knowledge-document-type` },
      ],
    },
  ],
  async install(_app, context) {
    await installKnowledgeDocumentPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<KnowledgeDocumentClient>("knowledgeDocumentClient");
    installKnowledgeDocumentContext(context, client);
  },
};

export default domainModule;
