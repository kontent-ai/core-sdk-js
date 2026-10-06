# Code Style

## Functional Programming

- Prefer functional style: pure functions, immutable data, expressions over statements
- Small, single-purpose functions — if a function does more than one thing, split it
- `const` everywhere; never use `let` unless mutation is genuinely unavoidable, never use `var`
- `readonly` on all type properties, function parameters, and array types (`readonly T[]`); exception: a mutable array used as a local accumulator within a single function body (built with `.push()`, never returned or exposed as mutable) is acceptable when the immutable alternative would cause repeated full-array copies — e.g. `[...acc, item]` inside a loop or recursion allocates a new array on every iteration (O(n) per step), whereas `.push()` is O(1) amortised
- Avoid side effects — functions should return values, not mutate external state
- Prefer `map`, `filter`, `reduce`, and other higher-order functions over imperative loops
- Prefer early returns over nested conditionals

## No Magic Strings

- Do not use magic strings unless absolutely necessary (e.g. a one-off literal with no meaning outside its single use)
- Values that carry meaning (header names, URLs, keys, error codes, config values) must live in a properly named `const` and be referenced through it
- When a string refers to another type or property (property names, method names, union members), narrow it with `satisfies` so it is checked against the source type and breaks at compile time when that type changes:
  - `vi.spyOn(httpService, "request" satisfies keyof HttpService)`
  - `header.name !== ("X-KC-SDKID" satisfies KnownHeaderName)`
- Never use `as` to type such a string; it widens the type and skips the check

## Libraries

- Use **ts-pattern** for non-trivial `switch`/`if-else` chains — anything beyond a simple 2-branch condition should use `match()` from `ts-pattern`
- Use standard **Zod** (`import * as z from "zod"`, chaining API) to define schemas for all API response payloads and API endpoint inputs — the Zod schema is the source of truth; TypeScript types are always derived via `z.infer<>`, never written by hand alongside a schema
- Shared utilities that accept a schema from a caller (`resolveSchema`, `parseResponse`) type it against Zod's flavor-agnostic core type (`import type { $ZodType } from "zod/v4/core"`), not `zod`'s or `zod/mini`'s own `ZodType`/`ZodMiniType` — this lets consumers (e.g. delivery/management SDKs) pass a schema built with either `zod` or `zod/mini`, so this package never forces a bundle-size/DX tradeoff onto them

## Exports

- All API queries and API-related models must be exported from `lib/public_api.ts` — nothing is part of the public API unless it appears there

# Tooling

- After making code changes, run `pnpm run biome:fix` to auto-format and fix lint issues
