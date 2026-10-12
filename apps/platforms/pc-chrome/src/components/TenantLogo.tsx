import { computed, defineComponent } from "vue";

import { BIMOPS_CUBE_ICON, resolveStaticResourceUrl } from "../resource-api";

import "./TenantLogo.css";

export default defineComponent({
  name: "TenantLogo",
  props: {
    tenantName: { type: String, required: true },
    logoUrl: { type: String, required: false },
  },
  setup(props) {
    const logoSrc = computed(() => resolveStaticResourceUrl(props.logoUrl || BIMOPS_CUBE_ICON));

    return () => (
      <div class="pc-chrome-tenant-logo">
        <img src={logoSrc.value} class="pc-chrome-tenant-logo-img" alt="" />
        <span class="pc-chrome-tenant-logo-name">{props.tenantName}</span>
      </div>
    );
  },
});
