import { defineAsyncComponent, type Component } from "vue";

import type { RuntimeCommonRemoteLoader } from "./index";

/** Vue adapter: common components remain async and never import a local fallback. */
export function defineAsyncRuntimeCommonComponent<TComponent extends Component>(
  loader: RuntimeCommonRemoteLoader,
  remoteName: string,
  exposed: string,
  member?: string,
): TComponent {
  return defineAsyncComponent(async () => {
    const module = (await loader(remoteName, exposed)) as { default?: Component } | Component;
    const component = member ? (module as Record<string, unknown>)[member] : "default" in module ? module.default : module;
    if (!component) throw new Error(`runtime common remote "${remoteName}" does not expose component "${member ?? "default"}"`);
    return component as Component;
  }) as unknown as TComponent;
}
