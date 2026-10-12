import { defineComponent } from "vue";

import { ResourcePage } from "./resource-page";

export const WarehousePage = defineComponent({
  name: "WarehousePage",
  setup: () => () => <ResourcePage type="warehouse" />,
});
