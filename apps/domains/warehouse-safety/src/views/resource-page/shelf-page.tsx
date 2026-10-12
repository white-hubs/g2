import { defineComponent } from "vue";

import { ResourcePage } from "./resource-page";

export const ShelfPage = defineComponent({
  name: "ShelfPage",
  setup: () => () => <ResourcePage type="shelf" />,
});
