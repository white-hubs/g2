import type { DomainModule } from "@g2-composition/contract";

export const domainModule: DomainModule = {
  routes: [
    {
      path: "/poc-inline",
      name: "poc-inline",
      component: () => import("./poc-inline-view"),
    },
  ],
};

export default domainModule;
