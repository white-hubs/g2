#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { join } from "node:path";

import { diffSorted, extractClientGwBffUrls, extractControllerRoutes } from "./extract";

const ROOT = join(import.meta.dir, "../../..");
const OLD = process.env.OLD_CUBE_SERVICES ?? "/Users/dg/work-ghy/ghcloud/prod/cube-services";

const oldControllers = join(OLD, "gateway/src/controllers");
const newControllers = join(ROOT, "bff/src/controllers");
const oldClient = join(OLD, "client/src");
const newClients = join(ROOT, "apps/clients");

if (!existsSync(oldControllers) || !existsSync(newControllers)) {
  console.error("missing controller trees", { oldControllers, newControllers });
  process.exit(2);
}

const oldRoutes = extractControllerRoutes(oldControllers);
const newRoutes = extractControllerRoutes(newControllers);
const routeDiff = diffSorted(oldRoutes, newRoutes);

const oldUrls = extractClientGwBffUrls(oldClient);
const newUrls = extractClientGwBffUrls(newClients);
// New clients may be a superset (auth etc.); require all old URLs present (prefix-tolerant via *)
const missingClientUrls = oldUrls.filter((u) => {
  if (newUrls.includes(u)) return false;
  // const-prefix paths in old clients (e.g. "/gw-bff/access-control") are covered by longer URLs
  if (newUrls.some((n) => n === u || n.startsWith(`${u}/`) || n.startsWith(`${u}?`))) return false;
  const re = new RegExp(`^${u.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("\\*", "[^/]+")}$`);
  return !newUrls.some((n) => re.test(n));
});

let failed = false;
if (routeDiff.missing.length || routeDiff.extra.length) {
  failed = true;
  console.error("BFF controller route parity FAILED");
  if (routeDiff.missing.length) console.error("  missing in g2:\n   ", routeDiff.missing.join("\n    "));
  if (routeDiff.extra.length) console.error("  extra in g2:\n   ", routeDiff.extra.join("\n    "));
} else {
  console.log(`BFF routes OK (${newRoutes.length})`);
}

if (missingClientUrls.length) {
  failed = true;
  console.error("Client /gw-bff URL parity FAILED — missing in apps/clients:\n   ", missingClientUrls.join("\n    "));
} else {
  console.log(`Client /gw-bff URLs OK (old=${oldUrls.length}, new=${newUrls.length})`);
}

process.exit(failed ? 1 : 0);
