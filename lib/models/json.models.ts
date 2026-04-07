import z from "zod";

export type JsonValue = undefined | string | number | null | boolean | JsonObject | JsonArray;

export type JsonObject = {
	readonly [property: string]: JsonValue;
};

export type JsonArray = readonly JsonValue[];

/**
 * Runtime validator for the core SDK `JsonValue` type.
 *
 * Matches:
 * - string | number | boolean | null
 * - readonly JsonValue[]
 * - { readonly [property: string]: JsonValue }
 */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema).readonly(), z.record(z.string(), jsonValueSchema)]),
);
