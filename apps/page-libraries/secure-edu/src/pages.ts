import type { Component } from "vue";

import { CONFIG } from "./config";
import { createList } from "./list";
import { Messages } from "./messages";
import { Overview } from "./overview";
export const pages: Record<string, Component> = {
  ...Object.fromEntries(Object.keys(CONFIG).map((slug) => [slug, createList(slug)])),
  message: Messages,
  "over-view": Overview,
};
