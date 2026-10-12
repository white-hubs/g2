export interface SlotClaimant {
  name: string;
  slots: string[];
}

export interface SlotConflict {
  slot: string;
  claimants: string[];
}

export function detectStaticSlotConflicts(claimants: SlotClaimant[]): SlotConflict[] {
  const bySlot = new Map<string, string[]>();
  for (const claimant of claimants) {
    for (const slot of claimant.slots) {
      const owners = bySlot.get(slot) ?? [];
      owners.push(claimant.name);
      bySlot.set(slot, owners);
    }
  }
  const conflicts: SlotConflict[] = [];
  for (const [slot, owners] of bySlot) {
    if (owners.length > 1) {
      conflicts.push({ slot, claimants: owners });
    }
  }
  return conflicts;
}

export function formatSlotConflictError(conflict: SlotConflict): string {
  return `slot "${conflict.slot}" claimed by multiple platforms: ${conflict.claimants.join(", ")} — remove one, or confirm whether these should be the same platform`;
}
