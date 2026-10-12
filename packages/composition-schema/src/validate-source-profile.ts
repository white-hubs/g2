import { parse as parseYaml } from "yaml";
import { z } from "zod";

const sourcePlatformItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Runtime-common remotes are registered before domain remotes. */
const sourceCoreRuntimeItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
    apiVersion: z.string().min(1).optional(),
  })
  .strict();

const sourceInlineItem = z
  .object({
    name: z.string().min(1),
    package: z.string().min(1),
    basePath: z.string().min(1),
    allowOverride: z.boolean().default(false),
  })
  .strict();

const sourceRemoteItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
    basePath: z.string().min(1),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** 服务 Client 槽位（ADR-0057）：与 platform 同形（name + logicalName），无 config/basePath。 */
const sourceClientItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
  })
  .strict();

/** 页面库槽位（ADR-0059/0060）：纯 exposes，无 basePath。 */
const sourcePageLibraryItem = z
  .object({
    name: z.string().min(1),
    logicalName: z.string().min(1),
  })
  .strict();

const displayGroupItem = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    order: z.number().default(0),
  })
  .strict();

export const sourceProfileSchema = z
  .object({
    facade: z.enum(["pc", "h5"]),
    env: z.string().min(1),
    sharedPolicy: z.string().optional(),
    displayGroups: z.array(displayGroupItem).default([]),
    coreRuntime: z.array(sourceCoreRuntimeItem).default([]),
    platform: z.array(sourcePlatformItem).default([]),
    client: z.array(sourceClientItem).default([]),
    pageLibrary: z.array(sourcePageLibraryItem).default([]),
    inline: z.array(sourceInlineItem).default([]),
    remotes: z.array(sourceRemoteItem).default([]),
  })
  .strict();

export type SourceProfileParsed = z.infer<typeof sourceProfileSchema>;
export type ValidateSourceProfileResult = { ok: true; profile: SourceProfileParsed } | { ok: false; errors: string[] };

export function validateSourceProfile(input: string | unknown): ValidateSourceProfileResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = parseYaml(input);
    } catch (error) {
      return { ok: false, errors: [`yaml parse error: ${error instanceof Error ? error.message : String(error)}`] };
    }
  }
  const parsed = sourceProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
  }
  return { ok: true, profile: parsed.data };
}
