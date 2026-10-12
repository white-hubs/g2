// @bun
// src/build-composition-plan.ts
function toPlatformRef(item) {
  if ("package" in item) {
    return { name: item.name, kind: "package", package: item.package };
  }
  return { name: item.name, kind: "entry", entry: item.entry };
}
function buildCompositionPlan(profile) {
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
      basePath: item.basePath
    })),
    remotes: profile.remotes.map((item) => ({
      name: item.name,
      kind: "entry",
      entry: item.entry,
      basePath: item.basePath
    }))
  };
}
// src/detect-slot-conflicts.ts
function detectStaticSlotConflicts(claimants) {
  const bySlot = new Map;
  for (const claimant of claimants) {
    for (const slot of claimant.slots) {
      const owners = bySlot.get(slot) ?? [];
      owners.push(claimant.name);
      bySlot.set(slot, owners);
    }
  }
  const conflicts = [];
  for (const [slot, owners] of bySlot) {
    if (owners.length > 1) {
      conflicts.push({ slot, claimants: owners });
    }
  }
  return conflicts;
}
function formatSlotConflictError(conflict) {
  return `slot "${conflict.slot}" claimed by multiple platforms: ${conflict.claimants.join(", ")} \u2014 remove one, or confirm whether these should be the same platform`;
}
export {
  formatSlotConflictError,
  detectStaticSlotConflicts,
  buildCompositionPlan
};
