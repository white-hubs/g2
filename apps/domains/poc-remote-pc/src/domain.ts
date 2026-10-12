import type { DomainModule } from "@g2-composition/contract";

const domainModule: DomainModule = {
  routes: [
    {
      path: "/poc-remote",
      name: "poc-remote",
      component: () => import("./poc-remote-view"),
    },
  ],
};

export default domainModule;
