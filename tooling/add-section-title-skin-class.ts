import { readFileSync, writeFileSync } from "node:fs";

const files = [
  "apps/domains/daily-task/src/views/task-list/task-edit/task-edit.tsx",
  "apps/domains/daily-task/src/views/task-plan/task-plan-edit/task-plan-edit.tsx",
  "apps/domains/daily-task/src/views/task-config/standard-item-form/standard-item-form.tsx",
  "apps/domains/daily-inspection/src/views/inspect-task/inspect-task-edit/inspect-task-edit.tsx",
  "apps/domains/daily-inspection/src/views/inspect-task/inspect-task-edit/inspect-task-info.tsx",
  "apps/domains/daily-inspection/src/views/inspect-archive/archive-info/archive-info.tsx",
  "apps/domains/daily-inspection/src/views/inspect-config/inspect-items-form/inspect-items-form.tsx",
  "apps/domains/daily-inspection/src/views/inspect-config/inspect-standard-form/inspect-standard-form.tsx",
  "apps/domains/risk-graded-control/src/views/identification/identification-entry/identification-entry.tsx",
  "apps/domains/risk-graded-control/src/views/zone/zone-form/zone-form.tsx",
  "apps/domains/risk-graded-control/src/views/unit/unit-form/unit-form.tsx",
  "apps/domains/risk-graded-control/src/views/evaluation-plan/plan-form/plan-form.tsx",
];

for (const file of files) {
  let t = readFileSync(file, "utf8");
  let next = t.replaceAll("class={styles.title}", 'class={[styles.title, "g2-skin-section-title"]}');
  next = next.replaceAll("class={styles.sectionTitle}", 'class={[styles.sectionTitle, "g2-skin-section-title"]}');
  next = next.replaceAll("class={formStyles.sectionTitle}", 'class={[formStyles.sectionTitle, "g2-skin-section-title"]}');
  if (next !== t) {
    writeFileSync(file, next);
    console.log("updated", file);
  } else {
    console.log("no change", file);
  }
}
