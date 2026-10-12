import { defineComponent } from "vue";

import { ResourcePage } from "./resource-page";

export const ForkliftPage = defineComponent({
  name: "ForkliftPage",
  setup: () => () => <ResourcePage type="forklift" />,
});
