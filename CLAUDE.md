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
- The main entry point (everything outside `lib/schema/**` and `lib/schema_api.ts`) must never import zod or expose zod types (enforced by biome `noRestrictedImports`); utilities that accept a schema from a caller (`resolveSchema`, `validatePayloads`) type it as `StandardSchemaV1` from `@standard-schema/spec` (`import type`), so consumers can pass a schema built with any Standard Schema library and this package never forces a schema library into their bundle
- Shared Kontent.ai schemas use **Zod Mini** (`import * as z from "@zod/mini"`, functional API: `z.optional(...)`, `z.readonly(...)`, `.check(z.minLength(...))`) and live only in `lib/schema/**`, exported from `lib/schema_api.ts` (`@kontent-ai/core-sdk/schema`); `@zod/mini` is an optional peer dependency used only by that entry point and tests
- Payload types used by the main entry point (e.g. `ErrorResponseData`) are hand-written; their zod schema in `lib/schema/**` must be checked against them with `satisfies z.ZodMiniType<T>` so the two cannot drift

## Exports

- All API queries and API-related models must be exported from `lib/public_api.ts` (shared zod schemas from `lib/schema_api.ts`) — nothing is part of the public API unless it appears there

# Tooling

- After making code changes, run `pnpm run biome:fix` to auto-format and fix lint issues
