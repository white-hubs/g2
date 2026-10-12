import type { CompositionProfile } from "@g2-composition/schema";

export interface PackageRef {
  name: string;
  kind: "package";
  package: string;
  basePath?: string;
}
export interface EntryRef {
  name: string;
  kind: "entry";
  entry: string;
  basePath?: string;
}
export type CompositionRef = PackageRef | EntryRef;

export interface DomainPackageRef extends PackageRef {
  basePath: string;
}
export interface DomainEntryRef extends EntryRef {
  basePath: string;
}

export interface CompositionPlan {
  facade: CompositionProfile["facade"];
  env: string;
  coreRuntime: EntryRef[];
  platforms: CompositionRef[];
  clients: CompositionRef[];
  pageLibraries: CompositionRef[];
  inline: DomainPackageRef[];
  remotes: DomainEntryRef[];
}

function toPlatformRef(item: { name: string; package: string } | { name: string; entry: string }): CompositionRef {
  if ("package" in item) {
    return { name: item.name, kind: "package", package: item.package };
  }
  return { name: item.name, kind: "entry", entry: item.entry };
}

type BuildCompositionProfile = Omit<CompositionProfile, "pageLibrary" | "coreRuntime"> & {
  pageLibrary?: CompositionProfile["pageLibrary"];
  coreRuntime?: CompositionProfile["coreRuntime"];
};

export function buildCompositionPlan(profile: BuildCompositionProfile): CompositionPlan {
  return {
    facade: profile.facade,
    env: profile.env,
    coreRuntime: (profile.coreRuntime ?? []).map((item) => ({ name: item.name, kind: "entry", entry: item.entry })),
    platforms: profile.platform.map(toPlatformRef),
    clients: (profile.client ?? []).map(toPlatformRef),
    pageLibraries: (profile.pageLibrary ?? []).map(toPlatformRef),
    inline: profile.inline.map((item) => ({
      name: item.name,
      kind: "package",
      package: item.package,
      basePath: item.basePath,
    })),
    remotes: profile.remotes.map((item) => ({
      name: item.name,
      kind: "entry",
      entry: item.entry,
      basePath: item.basePath,
    })),
  };
}
