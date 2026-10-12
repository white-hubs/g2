export type { DomainContext, DomainInstall, DomainModule, DomainRoutes, MenuContributionNode } from "./types";
export { assertDomainModule, type AssertDomainModuleResult } from "./assert-domain-module";
export { assertMenuOverlay, mergeMenuContribution, type AssertMenuOverlayResult, type MenuOverlayNode } from "./menu-overlay";
export type {
  AuthHeaderProvider,
  EventBus,
  EventName,
  FunctionCodeProvider,
  PageLibraryLoader,
  PlatformContext,
  PlatformInstall,
  PlatformLoader,
  PlatformModule,
  ServiceClientEnsurer,
} from "./types";
export { assertPlatformModule, type AssertPlatformModuleResult } from "./assert-platform-module";
export {
  createFakeApp,
  createFakeBus,
  createFakeDomainContext,
  createFakePlatformContext,
  createFakeRouter,
  type FakeBus,
} from "./test-harness";
