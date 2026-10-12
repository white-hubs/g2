import { parse as parseYaml } from "yaml";
import { z } from "zod";

const namedPackageRef = z.object({
  name: z.string().min(1),
  package: z.string().min(1),
});

const namedEntryRef = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
});

const platformItem = z.union([
  namedPackageRef.extend({ config: z.record(z.string(), z.unknown()).optional() }),
  namedEntryRef.extend({ config: z.record(z.string(), z.unknown()).optional() }),
]);

const coreRuntimeItem = namedEntryRef.extend({ apiVersion: z.string().min(1).optional() });

const inlineItem = z.object({
  name: z.string().min(1),
  package: z.string().min(1),
  basePath: z.string().min(1),
  allowOverride: z.boolean().default(false),
});

const remoteItem = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
  basePath: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const clientItem = z.union([namedPackageRef, namedEntryRef]);

/** 页面库：解析后有 entry，无 basePath（ADR-0059）。 */
const pageLibraryItem = z.union([namedPackageRef, namedEntryRef]);

export const compositionProfileSchema = z
  .object({
    facade: z.enum(["pc", "h5"]),
    env: z.string().min(1),
    sharedPolicy: z.string().optional(),
    // Optional for backwards-compatible loading of profiles published before
    // runtime-common remotes were introduced.
    coreRuntime: z.array(coreRuntimeItem).optional(),
    platform: z.array(platformItem).default([]),
    client: z.array(clientItem).default([]),
    pageLibrary: z.array(pageLibraryItem).default([]),
    inline: z.array(inlineItem).default([]),
    remotes: z.array(remoteItem).default([]),
  })
  .strict();

export type CompositionProfile = z.infer<typeof compositionProfileSchema>;

export type ValidateCompositionProfileResult = { ok: true; profile: CompositionProfile } | { ok: false; errors: string[] };

export function validateCompositionProfile(input: string | unknown): ValidateCompositionProfileResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = parseYaml(input);
    } catch (error) {
      return {
        ok: false,
        errors: [`yaml parse error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  const parsed = compositionProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    };
  }
  return { ok: true, profile: parsed.data };
}
