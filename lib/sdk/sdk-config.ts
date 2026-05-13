import { z } from "zod/mini";

export const nilUuid = "00000000-0000-0000-0000-000000000000";

export const kontentUuidSchema = z.union([z.uuid({ version: "v4" }), z.literal(nilUuid)]);

export const strictCodenameSchema = z.string().check(
	z.regex(/^[a-z][a-z0-9_]*$/, {
		error: "Codename must start with a lowercase letter and contain only lowercase letters, digits, and underscores",
	}),
);

/**
 * Builds a Zod schema for a codename field.
 *
 * The generic type parameter `TCodenames` is a **TypeScript-only hint** - it
 * narrows the schema's output type for consumers (e.g.
 * `codenameOf<"article" | "product">()` returns `z.ZodMiniType<"article" | "product">`
 * for autocomplete and downstream type inference) but is not enforced at runtime.
 *
 * At runtime the schema only checks that the value is a string. Two reasons:
 *
 * 1. Codenames are not a closed set - editors can add a new content type,
 *    taxonomy term, language, etc. at any time. A `z.literal(codenames)` schema
 *    would reject newly-added codenames once they appear in API responses, even
 *    though those values are perfectly valid.
 * 2. Format-checking every codename on every response is unnecessary cost - the
 *    Kontent.ai API contract guarantees the format, so the SDK trusts it.
 *
 * If you need strict format validation (e.g. for inputs in Management SDK), use `strictCodenameSchema` schema instead.
 */
export function codenameOf<TCodenames extends string = string>(): z.ZodMiniType<TCodenames> {
	return z.custom<TCodenames>((value) => typeof value === "string", {
		error: "Invalid codename",
	});
}
