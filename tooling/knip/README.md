# `@g2-tooling/knip`

Dead-code / unused-dependency hygiene for the monorepo (ADR-0056).

## Why some packages are ignored

| Item                         | Reason                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `vue-router`                 | Declared for MF `shared` singleton in vite configs even when not imported in src (ADR-0018). |
| `tailwindcss`                | Pulled by `@tailwindcss/vite`; not always a direct import (ADR-0051).                        |
| `@g2-composition/schema`     | Used from shell `predev` / release CLI via `bun run --filter`, not static imports.           |
| `@g2-composition/registry`   | Type-only / generate-time consumers; keep declared for workspace resolution.                 |
| `@module-federation/runtime` | Resolved via `require.resolve` in `@g2-tooling/mf-vite` (ADR-0054).                          |

`check:knip` reports `files`, `dependencies`, `unlisted`, `binaries`, `unresolved` only (not unused exports — MF public APIs are too noisy).
