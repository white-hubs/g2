import type { DomainContext } from "@g2-composition/contract";
import type { SecureEduClient } from "@g2-contract/secure-edu";
import type { Component } from "vue";

import { installContext } from "./context";
export interface SecureEduPages {
  getPage(slug: string): Component;
  createEditor(slug: string): Component;
}
export async function create(ctx: DomainContext, client: SecureEduClient): Promise<SecureEduPages> {
  installContext(ctx, client);
  const [lists, editors] = await Promise.all([import("./pages"), import("./editor")]);
  return {
    getPage: (slug) => {
      const page = lists.pages[slug];
      if (!page) {
        throw new Error(`安全教育页面未注册：${slug}`);
      }
      return page;
    },
    createEditor: editors.createEditor,
  };
}
